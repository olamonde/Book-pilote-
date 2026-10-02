import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { authRouter } from "./server/routes/authRoutes";
import { bookRouter } from "./server/routes/bookRoutes";
import { requireAuth } from "./server/middleware/auth";
import { QuotaService } from "./server/services/quotaService";
import { AuthorizationService } from "./server/services/authorizationService";
import { aiRateLimiter } from "./server/middleware/rateLimiter";
import {
  BookConceptSchema,
  GenerateOutlineSchema,
  GenerateChapterSchema,
  GenerateChaptersBatchSchema,
  CopilotTransformSchema,
  CoverChatInterpretSchema,
  GenerateCoverImageSchema,
  TranscribeAudioSchema,
  ExportBookSchema
} from "./server/validation/apiSchemas";
import { analyzeImagePrompt, buildTailoredSvgPrompt, buildNeutralImagePrompt } from "./src/services/imagePromptService";
import {
  TEXT_GENERATION_PROVIDER,
  IMAGE_GENERATION_PROVIDER,
  IMAGE_PROVIDER,
  IMAGE_PROVIDER_CONFIG,
  executeImageGeneration
} from "./src/services/imageGenerationProvider";
import {
  BookExportEngine,
  formatExportFilename,
  getMimeTypeForFormat
} from "./src/services/bookExportEngine";
import { Book, ExportOptions } from "./src/types";

// Internal SVG Sanitizer for generated covers
function sanitizeCoverSvg(rawSvg: string): string {
  let cleaned = (rawSvg || "").trim();

  // Strip markdown fences
  if (cleaned.startsWith("```xml")) cleaned = cleaned.replace(/^```xml\s*/i, "").replace(/\s*```$/i, "");
  else if (cleaned.startsWith("```svg")) cleaned = cleaned.replace(/^```svg\s*/i, "").replace(/\s*```$/i, "");
  else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/, "");

  const svgStart = cleaned.indexOf("<svg");
  const svgEnd = cleaned.lastIndexOf("</svg>");
  if (svgStart === -1 || svgEnd === -1) {
    return rawSvg;
  }

  cleaned = cleaned.substring(svgStart, svgEnd + 6);

  // Remove rogue text tags from artwork background
  cleaned = cleaned.replace(/<text[\s\S]*?<\/text>/gi, "");
  cleaned = cleaned.replace(/<text[^>]*?\/>/gi, "");

  // Remove translucent rectangular panels & cards
  cleaned = cleaned.replace(/<rect([^>]*?)(?:\/>|>[\s\S]*?<\/rect>)/gi, (match, attrs) => {
    const isFullCanvas =
      /(?:width=["'](?:100%|800)["'].*?height=["'](?:100%|1200)["'])|(?:x=["']0["'].*?y=["']0["'].*?width=["'](?:100%|800)["'])/i.test(
        attrs
      );

    const isOpaqueFullBg = isFullCanvas && !attrs.includes("rx=") && !attrs.includes("ry=") &&
      !/opacity=["']0?\.[0-8]/i.test(attrs) && !/fill-opacity=["']0?\.[0-8]/i.test(attrs) &&
      !/fill=["'](?:rgba|hsla)\([^)]*,\s*0?\.[0-8]/i.test(attrs);

    if (isOpaqueFullBg) {
      return match;
    }

    const hasCardClassOrId = /(?:class|id)=["'][^"']*(?:card|panel|overlay|box|glass|backdrop|text-bg|banner|frame|container|modal)[^"']*["']/i.test(attrs);
    const hasTranslucency =
      /opacity=["'](?:0?\.[0-9]+)["']/i.test(attrs) ||
      /fill-opacity=["'](?:0?\.[0-9]+)["']/i.test(attrs) ||
      /fill=["'](?:rgba|hsla)\(/i.test(attrs) ||
      /style=["'][^"']*(?:opacity|fill-opacity)\s*:\s*0?\.[0-9]+/i.test(attrs);
    const hasCardRounding = /r[xy]=["'](?:[4-9]|[1-9][0-9]+)["']/i.test(attrs);

    if (hasCardClassOrId || (hasTranslucency && !isFullCanvas) || (hasCardRounding && (hasTranslucency || !isFullCanvas))) {
      return "";
    }
    return match;
  });

  // Remove group wrappers with opacity containing rect
  cleaned = cleaned.replace(/<g[^>]*opacity=["']0?\.[0-9]+["'][^>]*>\s*<rect[^>]*\/>\s*<\/g>/gi, "");

  // Ensure root attributes
  const rootTagMatch = cleaned.match(/<svg([^>]*)>/i);
  if (rootTagMatch) {
    let rootAttrs = rootTagMatch[1];
    if (!/viewBox=/i.test(rootAttrs)) {
      rootAttrs += ' viewBox="0 0 800 1200"';
    }
    if (/overflow=["'][^"']*["']/i.test(rootAttrs)) {
      rootAttrs = rootAttrs.replace(/overflow=["'][^"']*["']/i, 'overflow="hidden"');
    } else {
      rootAttrs += ' overflow="hidden"';
    }
    if (/preserveAspectRatio=/i.test(rootAttrs)) {
      rootAttrs = rootAttrs.replace(/preserveAspectRatio=["'][^"']*["']/i, 'preserveAspectRatio="xMidYMid slice"');
    } else {
      rootAttrs += ' preserveAspectRatio="xMidYMid slice"';
    }
    if (!/width=/i.test(rootAttrs)) rootAttrs += ' width="100%"';
    if (!/height=/i.test(rootAttrs)) rootAttrs += ' height="100%"';
    cleaned = cleaned.replace(/<svg[^>]*>/i, `<svg${rootAttrs}>`);
  }

  // Wrap in clipPath ONLY IF not already clipped
  const alreadyClipped = cleaned.includes("pilot-canvas-clip");
  if (!alreadyClipped) {
    const openTagEnd = cleaned.indexOf(">");
    const closeTagStart = cleaned.lastIndexOf("</svg>");
    if (openTagEnd !== -1 && closeTagStart !== -1 && closeTagStart > openTagEnd) {
      const innerContent = cleaned.substring(openTagEnd + 1, closeTagStart);
      const clipDefId = "pilot-canvas-clip-" + Math.random().toString(36).substring(2, 7);
      const guardedContent = `
        <defs>
          <clipPath id="${clipDefId}">
            <rect x="0" y="0" width="800" height="1200" />
          </clipPath>
        </defs>
        <g clip-path="url(#${clipDefId})">
          ${innerContent}
        </g>
      `;
      cleaned = cleaned.substring(0, openTagEnd + 1) + guardedContent + "</svg>";
    }
  }

  return cleaned;
}

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Tailored JSON body limits: standard 1MB for general routes, with larger 25MB permitted for audio transcription and book exports
  app.use((req, res, next) => {
    const isLargePayloadRoute = req.path === '/api/transcribe-audio' || req.path === '/api/export-book' || req.path.startsWith('/api/books');
    const limit = isLargePayloadRoute ? '25mb' : '1mb';
    express.json({ limit })(req, res, next);
  });
  app.use(cookieParser());

  // Mount real authentication routes
  app.use("/api/auth", authRouter);

  // Mount real book storage routes (strictly scoped to authenticated session)
  app.use("/api/books", bookRouter);

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok"
    });
  });

  // Client initialization for Gemini API
  function getGeminiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }

  // Modèles avec cascade de repli résiliente en cas de surcharge ou d'épuisement de quota
  const GEMINI_TEXT_MODELS = [
    "gemini-3.1-flash-lite", // Ultra-rapide, pool de quota indépendant
    "gemini-flash-latest",   // Alias Flash standard
    "gemini-3.8-flash",      // Modèle Flash haute performance
    "gemini-3.1-pro-preview" // Repli Pro haute capacité
  ];

  // Resilient Gemini text & JSON generation helper
  async function callGemini(
    prompt: string,
    options?: {
      systemInstruction?: string;
      jsonMode?: boolean;
      temperature?: number;
    }
  ): Promise<string> {
    const ai = getGeminiClient();
    let lastErr: any = null;

    for (const model of GEMINI_TEXT_MODELS) {
      try {
        const config: any = {};
        if (options?.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }
        if (options?.jsonMode) {
          config.responseMimeType = "application/json";
        }
        if (typeof options?.temperature === "number") {
          config.temperature = options.temperature;
        }

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config
        });

        const text = response.text?.trim() || "";
        if (text) {
          return text;
        }
      } catch (err: any) {
        console.warn(`[AI Engine] Modèle ${model} en échec (${err?.message || err}). Tentative avec le modèle suivant...`);
        lastErr = err;
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("overload") || err?.status === 429 || err?.status === 503) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }

    throw lastErr || new Error("SERVICE_UNAVAILABLE");
  }

  // User-facing neutral error formatter
  function formatUserErrorMessage(err: any, fallbackMessage: string): string {
    const msg = String(err?.message || "").toLowerCase();
    const status = err?.status || err?.statusCode || err?.code;

    if (msg.includes("gemini_api_key_missing") || msg.includes("api_key") || status === 401 || status === 403) {
      return "Le service d'intelligence artificielle est en cours de configuration. Veuillez réessayer dans quelques instants.";
    }
    if (msg.includes("quota") || msg.includes("resource_exhausted") || status === 429) {
      return "Le moteur de rédaction est très sollicité. Veuillez patienter quelques secondes avant de relancer la génération.";
    }
    if (msg.includes("unavailable") || msg.includes("demand") || msg.includes("timeout") || msg.includes("econnreset") || status === 503) {
      return "Le service de rédaction rencontre une forte affluence. Veuillez relancer la génération.";
    }
    return fallbackMessage;
  }

  function parseJsonFromLlm(raw: string): any {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    }
    cleaned = cleaned.trim();

    // 1. Try standard JSON.parse first
    try {
      return JSON.parse(cleaned);
    } catch (err1) {
      // 2. Use jsonrepair to fix unescaped internal quotes, trailing commas, or truncated brackets
      try {
        const repaired = jsonrepair(cleaned);
        return JSON.parse(repaired);
      } catch (err2) {
        // 3. Try isolating the outermost { ... } or [ ... ]
        const firstBrace = cleaned.indexOf("{");
        const firstBracket = cleaned.indexOf("[");
        let startIdx = -1;
        let isObj = true;
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
          startIdx = firstBrace;
          isObj = true;
        } else if (firstBracket !== -1) {
          startIdx = firstBracket;
          isObj = false;
        }

        if (startIdx !== -1) {
          const endChar = isObj ? "}" : "]";
          const lastEnd = cleaned.lastIndexOf(endChar);
          const sliced = lastEnd > startIdx ? cleaned.substring(startIdx, lastEnd + 1) : cleaned.substring(startIdx);
          try {
            const repSlice = jsonrepair(sliced);
            return JSON.parse(repSlice);
          } catch (err3) {
            // fall through
          }
        }
        throw err1;
      }
    }
  }

  // Fallback regex extractor for chapters if JSON parsing encounters severely malformed syntax
  function extractChaptersFromRawText(raw: string, targetCount: number): any[] {
    const chapters: any[] = [];
    const titleRegex = /"title"\s*:\s*"([^"]+)"/g;
    const descRegex = /"description"\s*:\s*"([^"]+)"/g;
    const keyPointsBlockRegex = /"keyPoints"\s*:\s*\[([\s\S]*?)\]/g;

    const titles: string[] = [];
    let m;
    while ((m = titleRegex.exec(raw)) !== null) {
      titles.push(m[1].trim());
    }

    const descs: string[] = [];
    while ((m = descRegex.exec(raw)) !== null) {
      descs.push(m[1].trim());
    }

    const allKeyPoints: string[][] = [];
    while ((m = keyPointsBlockRegex.exec(raw)) !== null) {
      const rawBlock = m[1];
      const itemMatches = rawBlock.match(/"([^"]+)"/g);
      if (itemMatches) {
        allKeyPoints.push(itemMatches.map((k) => k.replace(/^"|"$/g, "").trim()));
      }
    }

    const count = Math.max(titles.length, targetCount);
    for (let i = 0; i < Math.min(count, targetCount); i++) {
      const order = i + 1;
      const title = titles[i] || `Chapitre ${order}`;
      const description = descs[i] || `Exploration et mise en application des fondamentaux du chapitre ${order}.`;
      const keyPoints = allKeyPoints[i] && allKeyPoints[i].length > 0
        ? allKeyPoints[i]
        : ["Concepts et mécanismes clés", "Méthode pas à pas", "Mise en pratique opérationnelle"];

      chapters.push({
        id: `ch-${order}-${Date.now()}-${i}`,
        order,
        title: /^chapitre\s+\d+/i.test(title) ? title : `Chapitre ${order} : ${title}`,
        description,
        keyPoints
      });
    }

    return chapters;
  }

  // Fallback outline generator derived contextually from the book concept
  function generateContextualFallbackOutline(concept: any, targetCount: number): any[] {
    const title = concept.title || "Guide Pratique";
    const themes = [
      { name: "Fondations & Enjeux Essentiels", desc: `Comprendre les piliers et les opportunités majeures autour de "${title}".` },
      { name: "Stratégies Fondamentales", desc: "Les principes clés et méthodologies incontournables à maîtriser." },
      { name: "Mise en Œuvre & Pratique Pas-à-Pas", desc: "Guide opérationnel et étapes concrètes d'application." },
      { name: "Optimisation & Résolution des Obstacles", desc: "Comment surmonter les difficultés récurrentes et maximiser l'efficacité." },
      { name: "Cas Concrets & Exemples Réels", desc: "Analyse d'études de cas, d'illustrations pratiques et d'enseignements." },
      { name: "Plan d'Action & Perspectives d'Avenir", desc: "Votre feuille de route finale et les prochaines étapes pour pérenniser vos acquis." },
      { name: "Ressources & Outils Avancés", desc: "La boîte à outils indispensable et les ressources pour aller plus loin." },
      { name: "Synthèse & Maîtrise Complète", desc: "Bilan global et consolidation des compétences développées." }
    ];

    return Array.from({ length: targetCount }).map((_, idx) => {
      const order = idx + 1;
      const theme = themes[idx % themes.length];
      return {
        id: `ch-${order}-${Date.now()}-${idx}`,
        order,
        title: `Chapitre ${order} : ${theme.name}`,
        description: theme.desc,
        keyPoints: [
          "Compréhension approfondie du sujet",
          "Protocole d'application immédiate",
          "Recommandations d'experts et points de vigilance"
        ]
      };
    });
  }

  // 1. Endpoint: Generate Book Concept
  app.post("/api/generate-book-concept", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = BookConceptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données du concept invalides."
      });
    }

    const { idea, language, bookType, tone, length, targetAudience, author, customInstructions } = parseResult.data;

    // Check and consume 1 AI generation quota atomically in PostgreSQL
    const quotaResult = await QuotaService.consumeAiGeneration(req.user!.id, 1);
    if (!quotaResult.allowed) {
      return res.status(403).json({
        success: false,
        error: "AI_QUOTA_EXCEEDED",
        message: "Votre quota de générations IA est épuisé pour votre formule actuelle.",
        quota: quotaResult
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      await QuotaService.refundAiGeneration(req.user!.id, 1);
      return res.status(503).json({
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message: "Le service d'intelligence artificielle est temporairement indisponible."
      });
    }

    try {
      const requestedLang = language || "Français";

      const systemPrompt = `Tu es le directeur éditorial principal de Book Pilot, une plateforme d'élite de création d'e-books professionnels.
Ton rôle est de transformer l'idée brute de l'auteur en un concept d'e-book captivant, solide, original et commercialement attractif.
Tu DOIS répondre EXCLUSIVEMENT sous forme d'un objet JSON strict valide sans texte avant ni après.
La langue de rédaction du titre, sous-titre, description et public cible DOIT être impérativement : ${requestedLang}.

RÈGLE CRITIQUE DE SYNTAXE JSON :
- Ne JAMAIS insérer de guillemets doubles non échappés (") à l'intérieur des chaînes de texte.
- Utilise des guillemets français « » ou des apostrophes ' pour toute citation ou terme entre guillemets.

Format JSON attendu :
{
  "title": "Titre marquant, évocateur et percutant",
  "subtitle": "Sous-titre engageant explicitant la promesse de valeur",
  "description": "Présentation complète et soignée du livre (4e de couverture) en 2 à 3 paragraphes immersifs et engageants",
  "targetAudience": "Description précise du lectorat cible",
  "tone": "Ton d'écriture recommandé (ex: Inspirant & Méthodique)",
  "genre": "Genre littéraire précis",
  "coverStyle": "luxury" | "minimal" | "business" | "technology" | "modern" | "fantasy" | "editorial" | "cinematic",
  "primaryColor": "#0f172a",
  "secondaryColor": "#8b5cf6",
  "accentColor": "#38bdf8",
  "pattern": "geometric" | "radial" | "lines" | "stars" | "cubes" | "minimal" | "waves",
  "estimatedChapters": 6
}`;

      const userPrompt = `Idée originelle de l'auteur :
"${idea.trim()}"
${bookType ? `- Type / Genre souhaité : ${bookType}` : ""}
${tone ? `- Tonalité souhaitée : ${tone}` : ""}
${targetAudience ? `- Public cible souhaité : ${targetAudience}` : ""}
${author ? `- Nom de plume / Auteur : ${author}` : ""}
${length ? `- Format souhaité : ${length === "short" ? "Court (4 chapitres)" : length === "long" ? "Long (8 chapitres)" : "Standard (6 chapitres)"}` : ""}
${customInstructions ? `- Consignes personnalisées de l'auteur : ${customInstructions}` : ""}`;

      const rawJson = await callGemini(
        userPrompt,
        {
          systemInstruction: systemPrompt,
          jsonMode: true,
          temperature: 0.7
        }
      );

      let parsed: any = {};
      try {
        parsed = parseJsonFromLlm(rawJson);
      } catch (e) {
        console.warn("[AI Engine] Concept JSON parse error, creating contextual fallback...", e);
        parsed = {
          title: idea.slice(0, 50),
          subtitle: "Un guide d'excellence et de référence",
          description: `Un ouvrage complet et captivant explorant en détail ${idea}.`,
          targetAudience: targetAudience || "Lecteurs passionnés et professionnels",
          tone: tone || "Inspirant & Professionnel",
          genre: bookType || "Guide Pratique",
          coverStyle: "modern",
          primaryColor: "#0f172a",
          secondaryColor: "#8b5cf6",
          accentColor: "#38bdf8",
          pattern: "geometric",
          estimatedChapters: length === "short" ? 4 : length === "long" ? 8 : 6
        };
      }

      const estimatedChapters =
        typeof parsed.estimatedChapters === "number" && parsed.estimatedChapters >= 3 && parsed.estimatedChapters <= 12
          ? parsed.estimatedChapters
          : length === "short"
          ? 4
          : length === "long"
          ? 8
          : 6;

      const validStyles = ["luxury", "minimal", "business", "technology", "modern", "fantasy", "editorial", "cinematic"];
      const coverStyle = validStyles.includes(parsed.coverStyle) ? parsed.coverStyle : "modern";

      const validPatterns = ["geometric", "radial", "lines", "stars", "cubes", "minimal", "waves"];
      const pattern = validPatterns.includes(parsed.pattern) ? parsed.pattern : "geometric";

      function ensureString(val: any, fallback: string): string {
        if (typeof val === "string" && val.trim()) return val.trim();
        if (val && typeof val === "object") {
          if (typeof val.résumé === "string") return val.résumé.trim();
          if (typeof val.summary === "string") return val.summary.trim();
          if (typeof val.description === "string") return val.description.trim();
          const strings = Object.values(val).filter((v) => typeof v === "string");
          if (strings.length > 0) return strings.join("\n\n");
        }
        return fallback;
      }

      const concept = {
        title: ensureString(parsed.title, idea.slice(0, 50)),
        subtitle: ensureString(parsed.subtitle, "Un guide complet et inspirant"),
        description: ensureString(parsed.description, `Un ouvrage passionnant consacré à ${idea}.`),
        targetAudience: ensureString(parsed.targetAudience, targetAudience || "Lecteurs passionnés et professionnels"),
        tone: ensureString(parsed.tone, tone || "Inspirant & Professionnel"),
        genre: ensureString(parsed.genre, bookType || "Guide Pratique"),
        coverStyle,
        primaryColor: parsed.primaryColor || "#0f172a",
        secondaryColor: parsed.secondaryColor || "#8b5cf6",
        accentColor: parsed.accentColor || "#38bdf8",
        pattern,
        estimatedChapters
      };

      return res.json({
        success: true,
        concept
      });
    } catch (err: any) {
      console.error("[AI Engine] Concept generation error:", err);
      // Refund quota on definitive AI failure
      if (req.user?.id) {
        await QuotaService.refundAiGeneration(req.user.id, 1).catch(() => {});
      }
      return res.status(500).json({
        success: false,
        error: "GENERATION_FAILED",
        message: formatUserErrorMessage(err, "La synthèse du concept par l'IA a rencontré une difficulté. Veuillez réessayer.")
      });
    }
  });

  // 2. Endpoint: Generate Outline (Table of Contents)
  app.post("/api/generate-outline", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = GenerateOutlineSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données du plan invalides."
      });
    }

    const { concept, options } = parseResult.data;

    // Check and consume 1 AI generation quota atomically in PostgreSQL
    const quotaResult = await QuotaService.consumeAiGeneration(req.user!.id, 1);
    if (!quotaResult.allowed) {
      return res.status(403).json({
        success: false,
        error: "AI_QUOTA_EXCEEDED",
        message: "Votre quota de générations IA est épuisé pour votre formule actuelle.",
        quota: quotaResult
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      await QuotaService.refundAiGeneration(req.user!.id, 1);
      return res.status(503).json({
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message: "Le service d'intelligence artificielle est temporairement indisponible."
      });
    }

    try {
      const requestedLang = options?.language || "Français";
      const targetCount = concept.estimatedChapters || 6;

      const systemPrompt = `Tu es l'architecte éditorial principal de Book Pilot.
Ta mission est de concevoir le plan détaillé (Table des Matières) sur mesure de l'e-book.
Le plan doit comporter exactement ${targetCount} chapitres organisés selon une progression logique, rythmée, pédagogique et captivante :
- Le Chapitre 1 doit servir d'introduction captivante et poser les fondations du sujet.
- Les chapitres intermédiaires doivent développer la méthode et les compétences pas à pas.
- Le dernier chapitre doit offrir une conclusion stratégique, un plan d'action et une synthèse inspirante.

Tu DOIS répondre EXCLUSIVEMENT sous forme d'un objet JSON strict valide contenant une clé "chapters".
La langue de rédaction de TOUS les titres et descriptions DOIT être impérativement : ${requestedLang}.

RÈGLES CRITIQUES DE SYNTAXE JSON :
- Ne jamais insérer de guillemets doubles non échappés (") à l'intérieur des chaînes de texte.
- Pour toute citation, terme mis en avant ou nom d'outil dans un titre ou une description, utilise EXCLUSIVEMENT des guillemets français « » ou des apostrophes ' (ex: « Agile » et JAMAIS "Agile").
- Ne mets pas de virgule traînante après le dernier élément d'un tableau ou objet.

Format JSON attendu :
{
  "chapters": [
    {
      "order": 1,
      "title": "Titre marquant du chapitre (ex: Chapitre 1 : Les Fondations du Projet)",
      "description": "Synthèse en 1 ou 2 phrases concrètes de ce que le lecteur va découvrir et apprendre dans ce chapitre.",
      "keyPoints": [
        "Premier point clé concret et actionnable",
        "Deuxième point clé concret et actionnable",
        "Troisième point clé concret et actionnable"
      ]
    }
  ]
}`;

      const userPrompt = `Livre à structurer :
- Titre : "${concept.title}"
- Sous-titre : "${concept.subtitle}"
- Genre : ${concept.genre} | Ton : ${concept.tone}
- Public cible : ${concept.targetAudience}
- Description : ${concept.description}
${options?.idea ? `- Idée d'origine : ${options.idea}` : ""}
${options?.customInstructions ? `- Directives complémentaires : ${options.customInstructions}` : ""}`;

      let rawChapters: any[] = [];
      try {
        const rawJson = await callGemini(
          userPrompt,
          {
            systemInstruction: systemPrompt,
            jsonMode: true,
            temperature: 0.6
          }
        );

        try {
          const parsed = parseJsonFromLlm(rawJson);
          if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
            rawChapters = parsed.chapters;
          } else if (Array.isArray(parsed) && parsed.length > 0) {
            rawChapters = parsed;
          }
        } catch (jsonErr) {
          console.warn("[AI Engine] JSON parse error in outline, attempting regex fallback extraction...", jsonErr);
          rawChapters = extractChaptersFromRawText(rawJson, targetCount);
        }
      } catch (chatErr) {
        console.warn("[AI Engine] Outline generation call failed, generating contextual outline...", chatErr);
      }

      // If still empty or insufficient chapters, use contextual fallback derived from the concept
      if (!rawChapters || rawChapters.length < 2) {
        rawChapters = generateContextualFallbackOutline(concept, targetCount);
      }

      const lowerReq = (requestedLang || "").toLowerCase();
      let defaultPrefix = "Chapitre";
      if (lowerReq.includes("en") || lowerReq.includes("english") || lowerReq.includes("anglais")) {
        defaultPrefix = "Chapter";
      } else if (lowerReq.includes("es") || lowerReq.includes("español") || lowerReq.includes("spanish")) {
        defaultPrefix = "Capítulo";
      } else if (lowerReq.includes("pt") || lowerReq.includes("português") || lowerReq.includes("portuguese")) {
        defaultPrefix = "Capítulo";
      } else if (lowerReq.includes("de") || lowerReq.includes("deutsch") || lowerReq.includes("german")) {
        defaultPrefix = "Kapitel";
      } else if (lowerReq.includes("it") || lowerReq.includes("italiano") || lowerReq.includes("italian")) {
        defaultPrefix = "Capitolo";
      }

      const outline = rawChapters.slice(0, targetCount).map((ch: any, idx: number) => {
        const order = typeof ch.order === "number" ? ch.order : idx + 1;
        let title = String(ch.title || `${defaultPrefix} ${order}`).trim();
        if (!/^chapitre\s+\d+/i.test(title) && !/^chapter\s+\d+/i.test(title) && !/^cap[ií]tulo\s+\d+/i.test(title) && !/^kapitel\s+\d+/i.test(title)) {
          title = `${defaultPrefix} ${order} : ${title}`;
        }
        return {
          id: `ch-${order}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          order,
          title,
          description: String(ch.description || `Développement approfondi de ${title}.`).trim(),
          keyPoints: Array.isArray(ch.keyPoints) && ch.keyPoints.length > 0
            ? ch.keyPoints.map((k: any) => String(k).trim())
            : ["Concepts fondamentaux", "Méthodologie concrète", "Mise en pratique immédiate"]
        };
      });

      return res.json({
        success: true,
        outline
      });
    } catch (err: any) {
      console.error("[AI Engine] Outline generation error:", err);
      // Even in catch block, provide safe contextual outline rather than hard 500 error
      const targetCount = concept?.estimatedChapters || 6;
      const safeFallback = generateContextualFallbackOutline(concept || {}, targetCount);
      return res.json({
        success: true,
        outline: safeFallback
      });
    }
  });

  // 3. Endpoint: Generate Full Chapter Content (Independent & Context-Aware)
  app.post("/api/generate-chapter", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = GenerateChapterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données du chapitre invalides."
      });
    }

    const {
      bookConcept,
      outlineItem,
      chapterIndex,
      previousSummaries,
      customInstructions,
      language,
      fullOutline,
      totalChapters: paramTotalChapters
    } = parseResult.data;

    // Check and consume 1 AI generation quota atomically in PostgreSQL
    const quotaResult = await QuotaService.consumeAiGeneration(req.user!.id, 1);
    if (!quotaResult.allowed) {
      return res.status(403).json({
        success: false,
        error: "AI_QUOTA_EXCEEDED",
        message: "Votre quota de générations IA est épuisé pour votre formule actuelle.",
        quota: quotaResult
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      await QuotaService.refundAiGeneration(req.user!.id, 1);
      return res.status(503).json({
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message: "Le service d'intelligence artificielle est temporairement indisponible."
      });
    }

    try {
      const requestedLang = language || "Français";
      const totalChapters = Number(paramTotalChapters) || (Array.isArray(fullOutline) ? fullOutline.length : (bookConcept.estimatedChapters || 6));
      const currentIdx = typeof chapterIndex === "number" ? chapterIndex : 0;
      const isFirstChapter = currentIdx === 0;
      const isLastChapter = currentIdx === totalChapters - 1;

      let structuralRole = "Ce chapitre est un CHAPITRE DE DÉVELOPPEMENT MÉTHODIQUE. Rentre directement dans le vif du sujet technique, sans refaire une introduction globale à l'ensemble du livre.";
      if (isFirstChapter) {
        structuralRole = "Ce chapitre est le PREMIER CHAPITRE (INTRODUCTION & FONDATIONS). Accroche puissamment le lecteur, pose les enjeux fondamentaux de l'ouvrage, explicite la grande promesse et énonce le cap avec brio.";
      } else if (isLastChapter) {
        structuralRole = "Ce chapitre est le DERNIER CHAPITRE (CONCLUSION, SYNTHÈSE & PLAN D'ACTION). Récapitule les grands enseignements, offre une perspective stratégique à long terme et donne une feuille de route concrète pour passer à l'action.";
      }

      const systemPrompt = `Tu es un auteur d'élite et rédacteur d'exception pour Book Pilot.
Ta mission est de rédiger l'intégralité du contenu d'un chapitre d'e-book en Markdown de haute qualité littéraire et technique.

Rôle structurel du chapitre dans l'ouvrage :
${structuralRole}

Exigences impératives :
1. Rédige un texte complet, substantiel, développé et immersif (prose riche, exemples vivants, explications rigoureuses, aucune ellipse, aucun résumé paresseux).
2. Structure Markdown exemplaire :
   - Titre principal en ## (reprends fidèlement le titre du chapitre)
   - Une citation ou maxime d'ouverture inspirante en blockquote (>)
   - Des sections thématiques claires en ### et sous-sections en ####
   - Des paragraphes aérés, des analyses approfondies, des méthodes étape par étape avec listes ordonnées ou à puces
   - Des encadrés de conseils pratiques ou mises en garde
   - Une section finale de synthèse (### Synthèse & Enseignements clés) récapitulant les points essentiels
3. Rédige EXCLUSIVEMENT en : ${requestedLang}.
4. Ne commence PAS par des formules méta (ex: "Voici le chapitre :"). Commence immédiatement par le Markdown du chapitre.`;

      let outlineContext = "";
      if (Array.isArray(fullOutline) && fullOutline.length > 0) {
        outlineContext = `Table des matières complète de l'ouvrage (pour situer parfaitement ce chapitre dans la dynamique du livre) :\n` +
          fullOutline.map((item: any, idx: number) => {
            const mark = idx === currentIdx ? "-> [CHAPITRE ACTUEL EN COURS DE RÉDACTION]" : "";
            return `${idx + 1}. ${item.title || item} ${mark}`;
          }).join("\n") + "\n\n";
      }

      const userPrompt = `Livre : ${bookConcept.title} — ${bookConcept.subtitle}
Genre : ${bookConcept.genre} | Ton : ${bookConcept.tone} | Lectorat : ${bookConcept.targetAudience}
Présentation globale de l'ouvrage : ${bookConcept.description}

${outlineContext}${previousSummaries && Array.isArray(previousSummaries) && previousSummaries.length > 0 ? `Mémoire narrative des chapitres précédents (pour assurer la continuité et éviter les redites) :\n${previousSummaries.map((s: string, idx: number) => `- Chapitre ${idx + 1} : ${s}`).join("\n")}\n\n` : ""}Chapitre à rédiger (Chapitre ${currentIdx + 1} sur ${totalChapters}) :
Titre : ${outlineItem.title}
Objectif du chapitre : ${outlineItem.description}
Points clés à développer impérativement :
${(outlineItem.keyPoints || []).map((p: string) => `* ${p}`).join("\n")}
${customInstructions ? `Consignes particulières de l'auteur : ${customInstructions}` : ""}

Rédige maintenant le contenu intégral et riche de ce chapitre en Markdown.`;

      const rawContent = await callGemini(
        userPrompt,
        {
          systemInstruction: systemPrompt,
          jsonMode: false,
          temperature: 0.7
        }
      );

      // Clean markdown wrappers if any
      let cleanContent = rawContent.trim();
      if (cleanContent.startsWith("```markdown")) {
        cleanContent = cleanContent.replace(/^```markdown\s*/, "").replace(/\s*```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
      const cleanTitle = outlineItem.title.replace(/^Chapitre\s+\d+\s*:\s*/i, "");
      const summary = `Le chapitre ${currentIdx + 1} développe "${cleanTitle}", articulé autour de ${outlineItem.keyPoints?.[0] || outlineItem.description}.`;

      return res.json({
        success: true,
        content: cleanContent,
        wordCount,
        summary
      });
    } catch (err: any) {
      console.error("[AI Engine] Chapter generation error:", err);
      if (req.user?.id) {
        await QuotaService.refundAiGeneration(req.user.id, 1).catch(() => {});
      }
      return res.status(500).json({
        success: false,
        error: "GENERATION_FAILED",
        message: formatUserErrorMessage(err, "La rédaction du chapitre a rencontré une difficulté. Veuillez réessayer.")
      });
    }
  });

  // 4. Endpoint: Batch Chapter Generation (Fast Parallel Concurrency)
  app.post("/api/generate-chapters-batch", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = GenerateChaptersBatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données du lot invalides."
      });
    }

    const { bookConcept, outline, customInstructions, language, concurrency = 2 } = parseResult.data;
    const totalChapters = outline.length;

    // Plan check: Batch generation is a Creator / Pro feature
    if (!AuthorizationService.isBatchGenerationAllowed(req.user!)) {
      return res.status(403).json({
        success: false,
        error: "FEATURE_NOT_AVAILABLE",
        message: "La génération par lots accélérée est réservée aux formules Creator et Professionnel."
      });
    }

    // Atomically reserve quota units for the entire batch
    const quotaResult = await QuotaService.consumeAiGeneration(req.user!.id, totalChapters);
    if (!quotaResult.allowed) {
      return res.status(403).json({
        success: false,
        error: "AI_QUOTA_EXCEEDED",
        message: `Votre quota est insuffisant pour générer ${totalChapters} chapitres en lot (${quotaResult.remaining} restante(s)).`,
        quota: quotaResult
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      await QuotaService.refundAiGeneration(req.user!.id, totalChapters);
      return res.status(503).json({
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message: "Le service d'intelligence artificielle est temporairement indisponible."
      });
    }

    let successfulCount = 0;

    try {
      const requestedLang = language || "Français";
      const results: any[] = new Array(totalChapters);

      // Process in chunks with controlled concurrency to respect rate limits while achieving maximum speed
      const limit = Math.max(1, Math.min(Number(concurrency) || 2, 4));
      for (let i = 0; i < totalChapters; i += limit) {
        const chunkIndices = Array.from({ length: Math.min(limit, totalChapters - i) }, (_, k) => i + k);
        await Promise.all(
          chunkIndices.map(async (idx) => {
            const item = outline[idx];
            const isFirst = idx === 0;
            const isLast = idx === totalChapters - 1;

            let structuralRole = "Ce chapitre est un CHAPITRE DE DÉVELOPPEMENT MÉTHODIQUE. Rentre directement dans le sujet sans refaire une introduction générale.";
            if (isFirst) {
              structuralRole = "Ce chapitre est le PREMIER CHAPITRE (INTRODUCTION & FONDATIONS). Accroche le lecteur et pose les bases fondamentales de l'ouvrage.";
            } else if (isLast) {
              structuralRole = "Ce chapitre est le DERNIER CHAPITRE (CONCLUSION & SYNTHÈSE). Récapitule les grands enseignements et propose une feuille de route finale.";
            }

            const sysPrompt = `Tu es un auteur d'élite pour Book Pilot. Rédige l'intégralité de ce chapitre en Markdown d'excellence.\nRôle structurel : ${structuralRole}\nLangue : ${requestedLang}.\nCommence immédiatement par le Markdown en ##.`;
            const usrPrompt = `Livre : ${bookConcept.title} — ${bookConcept.subtitle}\nGenre : ${bookConcept.genre} | Ton : ${bookConcept.tone}\n\nChapitre ${idx + 1}/${totalChapters} : ${item.title}\nObjectif : ${item.description}\nPoints clés :\n${(item.keyPoints || []).map((k: string) => `- ${k}`).join("\n")}\n${customInstructions ? `Consignes : ${customInstructions}` : ""}`;

            const raw = await callGemini(usrPrompt, { systemInstruction: sysPrompt, jsonMode: false, temperature: 0.7 });
            let content = raw.trim().replace(/^```markdown\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
            const wordCount = content.split(/\s+/).filter(Boolean).length;
            const summary = `Le chapitre ${idx + 1} traite de "${item.title}".`;

            results[idx] = {
              id: item.id || `ch-${idx + 1}`,
              title: item.title,
              order: idx + 1,
              content,
              wordCount,
              status: "ready",
              summary
            };
            successfulCount++;
          })
        );
      }

      return res.json({
        success: true,
        chapters: results
      });
    } catch (err: any) {
      console.error("[AI Engine] Batch chapters error:", err);
      // Refund the chapters that failed to generate
      const failedCount = totalChapters - successfulCount;
      if (failedCount > 0 && req.user?.id) {
        await QuotaService.refundAiGeneration(req.user.id, failedCount).catch(() => {});
      }
      return res.status(500).json({
        success: false,
        error: "BATCH_GENERATION_FAILED",
        message: formatUserErrorMessage(err, "La génération par lots a rencontré une difficulté. Veuillez réessayer.")
      });
    }
  });

  // 5. Endpoint: Copilot Text Transformations & Rewriting
  app.post("/api/copilot-transform", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = CopilotTransformSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données de transformation invalides."
      });
    }

    const { text, instruction, chapterTitle, language } = parseResult.data;

    // Check Plan permission: Copilot requires Creator or Pro plan
    if (!AuthorizationService.isCopilotAllowed(req.user!)) {
      return res.status(403).json({
        success: false,
        error: "FEATURE_NOT_AVAILABLE",
        message: "Le Copilote IA d'édition est une fonctionnalité exclusive aux formules Creator et Professionnel."
      });
    }

    // Atomically consume 1 AI generation quota
    const quotaResult = await QuotaService.consumeAiGeneration(req.user!.id, 1);
    if (!quotaResult.allowed) {
      return res.status(403).json({
        success: false,
        error: "AI_QUOTA_EXCEEDED",
        message: "Votre quota de générations IA est épuisé pour votre formule actuelle.",
        quota: quotaResult
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      await QuotaService.refundAiGeneration(req.user!.id, 1);
      return res.status(503).json({
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message: "Le service d'intelligence artificielle est temporairement indisponible."
      });
    }

    try {
      const systemPrompt = `Tu es le Copilote IA de rédaction et d'édition de Book Pilot.
Tu assistes les auteurs pour perfectionner, réécrire, enrichir, raccourcir, corriger ou poursuivre leurs textes.

Règles impératives :
1. Applique scrupuleusement la consigne éditoriale de l'auteur sur le texte fourni.
2. Respecte scrupuleusement la langue du texte source${language ? ` (Rédige en ${language})` : " (Français par défaut si en français, Anglais si en anglais, etc.)"}.
3. Rends UNIQUEMENT le texte final transformé. N'inclus AUCUNE phrase d'introduction, de politesse ou de commentaire méta (ne dis JAMAIS "Voici le texte amélioré :" ou "J'ai appliqué vos modifications :").
4. Préserve la structure Markdown (titres, listes, gras) lorsqu'elle est présente ou pertinente.`;

      const userPrompt = `Chapitre concerné : "${chapterTitle || "Manuscrit"}"
Consigne d'écriture ou d'édition demandée :
"${instruction.trim()}"

Texte original de l'auteur à transformer :
"""
${text.trim()}
"""`;

      const result = await callGemini(
        userPrompt,
        {
          systemInstruction: systemPrompt,
          jsonMode: false,
          temperature: 0.5
        }
      );

      let cleanResult = result.trim();
      if (cleanResult.startsWith("```markdown")) {
        cleanResult = cleanResult.replace(/^```markdown\s*/, "").replace(/\s*```$/, "");
      } else if (cleanResult.startsWith("```")) {
        cleanResult = cleanResult.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      return res.json({
        success: true,
        result: cleanResult
      });
    } catch (err: any) {
      console.error("[AI Engine] Copilot transformation error:", err);
      if (req.user?.id) {
        await QuotaService.refundAiGeneration(req.user.id, 1).catch(() => {});
      }
      return res.status(500).json({
        success: false,
        error: "TRANSFORMATION_FAILED",
        message: formatUserErrorMessage(err, "La transformation du texte a rencontré une difficulté. Veuillez réessayer.")
      });
    }
  });

  // 5b. Endpoint: Conversational Cover Director (Contextual State & Intent Interpretation)
  app.post("/api/cover-chat/interpret", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = CoverChatInterpretSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données invalides."
      });
    }

    const {
      message,
      bookContext,
      currentVisualState,
      versions,
      currentVersionNumber,
      conversationHistory,
      currentCover,
      interfaceLanguage
    } = parseResult.data;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message: "Le service d'intelligence artificielle est temporairement indisponible."
      });
    }

    try {
      const assistantLocale = interfaceLanguage === 'en' ? 'English' : interfaceLanguage === 'es' ? 'Español' : interfaceLanguage === 'pt' ? 'Português' : 'Français';
      const systemInstruction = `Tu es le directeur artistique intelligent de Book Pilot AI, dédié à la conception et à l'évolution conversationnelle des couvertures de livres.
Tu t'exprimes sous le nom de "Book Pilot AI", avec élégance, clarté, bienveillance et professionnalisme dans la langue d'interface de l'auteur : ${assistantLocale}.
Si le livre est rédigé dans une autre langue (${bookContext?.language || 'non précisé'}), comprends et intègre parfaitement ce contexte culturel et thématique.
Ne cite JAMAIS de détails techniques internes (modèles, endpoints, SVG, Gemini, API, serveurs).

OBJECTIF MAJEUR :
Interpréter la demande de l'auteur dans le contexte de la couverture en cours, décider de l'action exacte à mener et assurer une continuité visuelle irréprochable.

RÈGLES MAJEURES D'ANALYSE :

1. CLASSIFICATION DE L'INTENTION ("intent") :
- "chat" : L'auteur demande un avis, des conseils artistiques, des idées de style, ou exprime une impression sans formuler d'instruction de modification concrète (ex: "Qu'en penses-tu ?", "Je n'aime pas cette couverture", "Quelles couleurs iraient bien ?", "Est-ce adapté au genre fantastique ?").
  ACTION : Tu conseilles l'auteur, poses des questions ouvertes pour guider son choix, SANS déclencher de génération d'image.
- "restore_version" : L'auteur demande explicitement de rétablir une version passée (ex: "Remets la version 1", "Reviens à la version précédente", "Finalement je préfère la deuxième version", "Remets l'avant-dernière version").
  ACTION : Tu identifies le numéro de version cible ("targetVersionNumber").
- "generate" : L'auteur formule une création ou une modification visuelle concrète (ex: "Fais une couverture avec...", "Rends la montagne plus imposante", "Ajoute du brouillard", "Garde tout sauf la couleur", "Fais le personnage plus petit", "Supprime le château", "Mets la lune en haut à droite", "Moins sombre").
  ACTION : Tu prépares la régénération avec continuité absolue.

2. CONTINUITÉ & CONSERVATION DU CONTEXTE (CRITIQUE pour intent="generate") :
- Une modification doit TOUJOURS être comprise comme une retouche de la couverture ACTUELLE, et NON comme une nouvelle couverture indépendante (sauf si l'auteur demande expressément de repartir de zéro).
- Conserve systématiquement les éléments visuels existants (montagne, lune, silhouette, ambiance, cadrage, ciel, couleurs) sauf ceux expressément modifiés ou supprimés.
- Exemples clés :
  * Si la couverture a une forêt sombre et une lune bleue, et que l'auteur dit "Ajoute du brouillard" -> Conserver forêt sombre + lune bleue + ajouter le brouillard.
  * Si l'auteur dit "Rends la montagne beaucoup plus imposante" -> Conserver lune, ciel, silhouette, ambiance, couleurs, et agrandir considérablement la montagne.
  * Si l'auteur dit "Garde tout pareil, mais rends la lune beaucoup plus petite et place-la en haut à droite" -> Conserver montagne, silhouette, ciel et ambiance, réduire la lune et la positionner en haut à droite.
  * Si l'auteur dit "Garde tout sauf la couleur" -> Conserver la composition, la montagne, la lune, la silhouette, et renouveler harmonieusement la palette chromatique.
  * Si l'auteur dit "Reviens à la version précédente mais avec la lune de cette version" -> Combiner précisément ces deux éléments.

3. RÈGLE TEXTE & INTERDICTION ABSOLUE DES PANNEAUX TRANSLUCIDES :
- Les textes (titre "${bookContext?.title || "Livre"}", sous-titre, nom d'auteur) sont contrôlés par Book Pilot en surimpression et ne doivent JAMAIS être dessinés ou inventés dans l'illustration visuelle.
- STRICTEMENT INTERDIT : Ne jamais ajouter de rectangle blanc translucide, rectangle gris ou noir semi-transparent, carte glassmorphism, ou panneau d'arrière-plan pour le texte.
- L'illustration doit être un décor ou motif continu, plein cadre, sans boîte ou carte artificielle.
- Si l'auteur dit "Ne touche pas au titre", rassure-le en confirmant que les textes restent strictement sous son contrôle.

4. DISTINCTION ENTRE "IMAGE SEULE" ET "COUVERTURE DE LIVRE" :
- Si l'auteur demande une image, un dessin, une photo, un personnage 3D, une illustration enfant, une peinture (ex: "un chien dans un parc", "photo d'une femme dans sa cuisine", "dessin simple d'un chat", "dragon 3D") SANS mentionner "couverture de livre" :
  * isCoverRequest = false
  * isArtworkOnly = true
  * Respecte STRICTEMENT son style (sketch, 3D, photo smartphone, aquarelle, conte pour enfant, etc.) sans lui imposer de style "couverture sombre et luxueuse".
- Si l'auteur demande explicitement une couverture (ex: "couverture pour mon livre", "couverture professionnelle sur la cuisine") :
  * isCoverRequest = true
  * isArtworkOnly = false

5. FORMAT STRICT DE SORTIE (JSON uniquement) :
{
  "intent": "chat" | "generate" | "restore_version",
  "aiReply": "Message d'accompagnement soigné, clair et courtois en français.",
  "targetVersionNumber": null ou integer (pour restore_version),
  "isCoverRequest": boolean,
  "isArtworkOnly": boolean,
  "detectedStyle": string,
  "updatedVisualState": {
    "initialPrompt": "prompt d'origine",
    "currentDescription": "description cumulative exhaustive de la scène visuelle actuelle",
    "elementsToKeep": ["élément 1", "élément 2", ...],
    "elementsToModify": ["élément modifié", ...],
    "elementsToAvoid": ["éléments retirés ou interdits", ...]
  },
  "enhancedSvgPrompt": "Prompt détaillé en anglais pour le moteur SVG décrivant l'ensemble de la scène, la composition, l'éclairage, les formes vectorielles, en respectant fidèlement le style et la simplicité demandés sans clichés luxueux ou sombres non sollicités",
  "suggestedColors": {
    "style": "luxury" | "minimal" | "business" | "technology" | "modern" | "fantasy" | "editorial" | "cinematic" | null,
    "primaryColor": "#hex ou null",
    "secondaryColor": "#hex ou null",
    "accentColor": "#hex ou null",
    "textColor": "#hex ou null",
    "pattern": "geometric" | "waves" | "lines" | "radial" | "minimal" | "stars" | "cubes" | "abstract" | null
  }
}`;

      const historyFormatted = (conversationHistory || [])
        .slice(-8)
        .map((m: any) => `${m.role === "user" ? "Auteur" : "Book Pilot AI"} : ${m.content}`)
        .join("\n");

      const versionsFormatted = (versions || [])
        .map((v: any) => `Version ${v.versionNumber} : ${v.description || "Description non disponible"}`)
        .join("\n");

      const userPrompt = `CONTEXTE DU LIVRE :
- Titre : "${bookContext?.title || "Sans titre"}"
- Sous-titre : "${bookContext?.subtitle || ""}"
- Auteur : "${bookContext?.author || ""}"
- Genre / Cible : "${bookContext?.genre || bookContext?.targetAudience || "Général"}"
- Ton : "${bookContext?.tone || "Inspirant"}"
- Résumé : "${bookContext?.description || ""}"

ÉTAT VISUEL ACTUEL :
- Version active : Version ${currentVersionNumber || 1}
- Prompt d'origine : "${currentVisualState?.initialPrompt || ""}"
- Description visuelle actuelle : "${currentVisualState?.currentDescription || "Couverture initiale du livre"}"
- Éléments à conserver : ${JSON.stringify(currentVisualState?.elementsToKeep || [])}
- Éléments modifiés récemment : ${JSON.stringify(currentVisualState?.elementsToModify || [])}
- Éléments évités / supprimés : ${JSON.stringify(currentVisualState?.elementsToAvoid || [])}
- Style actuel : ${currentCover?.style || "modern"}

VERSIONS EXISTANTES :
${versionsFormatted || "Aucune version archivée pour l'instant"}

HISTORIQUE RÉCENT DU DIALOGUE :
${historyFormatted || "Début de la conversation"}

NOUVEAU MESSAGE DE L'AUTEUR :
"${message.trim()}"`;

      const rawJson = await callGemini(userPrompt, {
        systemInstruction,
        jsonMode: true,
        temperature: 0.3
      });

      const parsed = parseJsonFromLlm(rawJson);

      return res.json({
        success: true,
        intent: parsed.intent || "chat",
        aiReply: parsed.aiReply || "Je suis à votre écoute pour faire évoluer votre couverture.",
        targetVersionNumber: typeof parsed.targetVersionNumber === "number" ? parsed.targetVersionNumber : null,
        isCoverRequest: parsed.isCoverRequest ?? false,
        isArtworkOnly: parsed.isArtworkOnly ?? (!parsed.isCoverRequest),
        detectedStyle: parsed.detectedStyle || "natural_scene",
        updatedVisualState: parsed.updatedVisualState || currentVisualState || {
          initialPrompt: message.trim(),
          currentDescription: message.trim(),
          elementsToKeep: [],
          elementsToModify: [],
          elementsToAvoid: []
        },
        enhancedSvgPrompt: parsed.enhancedSvgPrompt || message.trim(),
        suggestedColors: parsed.suggestedColors || null
      });
    } catch (err: any) {
      console.error("[AI Engine] Cover chat interpret error:", err);
      return res.status(500).json({
        success: false,
        error: "INTERPRETATION_FAILED",
        message: formatUserErrorMessage(err, "Book Pilot AI n'a pas pu analyser votre message. Veuillez réessayer.")
      });
    }
  });

  // 6. Decoupled Image Generation Provider (Gemini Nano Banana Architecture)
  // Architecture prepared for Gemini Nano Banana.
  // TEXT_GENERATION_PROVIDER: Google Gemini (gemini-3.5-flash-lite / gemini-3.1-flash-lite)
  // IMAGE_GENERATION_PROVIDER: Gemini Nano Banana (En attente de connexion API)
  app.post("/api/generate-cover-image", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = GenerateCoverImageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données d'image invalides."
      });
    }

    const { prompt, style, format } = parseResult.data;
    const { mode, bookContext } = req.body || {};

    // Check and consume 1 AI generation quota atomically
    const quotaResult = await QuotaService.consumeAiGeneration(req.user!.id, 1);
    if (!quotaResult.allowed) {
      return res.status(403).json({
        success: false,
        error: "AI_QUOTA_EXCEEDED",
        message: "Votre quota de générations IA est épuisé pour votre formule actuelle.",
        quota: quotaResult
      });
    }

    try {
      const result = await executeImageGeneration({
        prompt: prompt.trim(),
        style: typeof style === "string" ? style : undefined,
        format: format as any,
        mode,
        userPlan: req.user!.plan, // SERVER-AUTHORITATIVE: userPlan comes from req.user!.plan
        bookContext
      });

      return res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      console.log("[Image Engine] Generation status:", err?.message || err);
      // Refund quota on failure
      if (req.user?.id) {
        await QuotaService.refundAiGeneration(req.user.id, 1).catch(() => {});
      }
      const status = typeof err.status === "number" ? err.status : 503;
      return res.status(status).json({
        success: false,
        provider: IMAGE_PROVIDER,
        model: IMAGE_PROVIDER_CONFIG.modelName,
        error: err.code || "GEMINI_NANO_BANANA_NOT_CONNECTED",
        message: err.message || "Gemini Nano Banana n'est pas encore connecté. La génération d'images sera disponible dès que le fournisseur sera configuré."
      });
    }
  });

  // Alias /api/generate-image for direct image creation
  app.post("/api/generate-image", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = GenerateCoverImageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données d'image invalides."
      });
    }

    const { prompt, style, format } = parseResult.data;
    const { mode = "image", bookContext } = req.body || {};

    // Check and consume 1 AI generation quota atomically
    const quotaResult = await QuotaService.consumeAiGeneration(req.user!.id, 1);
    if (!quotaResult.allowed) {
      return res.status(403).json({
        success: false,
        error: "AI_QUOTA_EXCEEDED",
        message: "Votre quota de générations IA est épuisé pour votre formule actuelle.",
        quota: quotaResult
      });
    }

    try {
      const result = await executeImageGeneration({
        prompt: prompt.trim(),
        style: typeof style === "string" ? style : undefined,
        format: format as any,
        mode,
        userPlan: req.user!.plan, // SERVER-AUTHORITATIVE
        bookContext
      });

      return res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      console.log("[Image Engine] Direct image generation status:", err?.message || err);
      if (req.user?.id) {
        await QuotaService.refundAiGeneration(req.user.id, 1).catch(() => {});
      }
      const status = typeof err.status === "number" ? err.status : 503;
      return res.status(status).json({
        success: false,
        provider: IMAGE_PROVIDER,
        model: IMAGE_PROVIDER_CONFIG.modelName,
        error: err.code || "GEMINI_NANO_BANANA_NOT_CONNECTED",
        message: err.message || "Gemini Nano Banana n'est pas encore connecté. La génération d'images sera disponible dès que le fournisseur sera configuré."
      });
    }
  });

  // 7. Endpoint: Audio Transcription (Voice dictation powered by Gemini V2)
  app.post("/api/transcribe-audio", requireAuth, aiRateLimiter, async (req, res) => {
    const parseResult = TranscribeAudioSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: parseResult.error.issues[0]?.message || "Données audio invalides."
      });
    }

    const { audioBase64, mimeType = "audio/webm" } = parseResult.data;
    const { language = "fr-FR" } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message: "Le service de transcription IA est temporairement indisponible."
      });
    }

    try {
      const ai = getGeminiClient();
      const langHint = language.startsWith("fr") ? "French (Français)" : "the speaker's language";
      const cleanMime = (mimeType || "audio/webm").split(";")[0].trim();

      const transcriptionPrompt = `Tu es un transcripteur audio professionnel de haute précision.
Transcris fidèlement et mot à mot l'enregistrement audio parlé fourni en ${langHint}.
DIRECTIVES STRICTES :
1. Renvoie UNIQUEMENT le texte transcrit de ce qui est prononcé dans l'audio.
2. N'ajoute AUCUN préambule, aucune introduction, aucune formule de politesse, aucun commentaire ("Voici le texte", etc.).
3. N'ajoute AUCUN guillemet entourant la phrase, ni de balises Markdown.
4. Conserve les majuscules appropriées et une ponctuation naturelle et fluide.
5. Conserve les répétitions volontaires et expressives si l'orateur les prononce réellement (ex: "très très important", "jamais jamais"). Ne rajoute aucun mot parasite.
6. Si l'enregistrement audio est entièrement silencieux ou inaudible, renvoie uniquement une chaîne vide.`;

      const TRANSCRIPTION_MODELS = [
        "gemini-3.5-transcribe",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.8-flash"
      ];

      let transcriptText = "";
      let lastError: any = null;

      for (const model of TRANSCRIPTION_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMime,
                      data: audioBase64
                    }
                  },
                  { text: transcriptionPrompt }
                ]
              }
            ]
          });
          transcriptText = response.text || "";
          break;
        } catch (modelErr: any) {
          console.warn(`[Voice V2] Model ${model} failed, trying next:`, modelErr?.message || modelErr);
          lastError = modelErr;
        }
      }

      if (!transcriptText && lastError) {
        throw lastError;
      }

      // Sanitize enclosing quotes or leading/trailing markdown fences
      let cleaned = transcriptText.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith('«') && cleaned.endsWith('»'))) {
        cleaned = cleaned.slice(1, -1).trim();
      }

      return res.json({
        success: true,
        transcript: cleaned
      });
    } catch (err: any) {
      console.error("[Voice V2] Transcription error:", err);
      return res.status(500).json({
        success: false,
        error: "TRANSCRIPTION_FAILED",
        message: "La transcription vocale a rencontré une difficulté. Veuillez réessayer."
      });
    }
  });

  // 8. Endpoint: High-fidelity E-book Export (PDF, DOCX, EPUB, TXT, MD, HTML)
  app.post("/api/export-book", requireAuth, async (req, res) => {
    try {
      const parseResult = ExportBookSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Données d'exportation invalides."
        });
      }

      const { book, options } = parseResult.data;
      const format = options?.format || "pdf";

      // Verify that user plan allows this export format
      if (!AuthorizationService.isExportFormatAllowed(req.user!, format)) {
        return res.status(403).json({
          success: false,
          error: "FEATURE_NOT_AVAILABLE",
          message: `L'exportation au format ${format.toUpperCase()} n'est pas incluse dans votre formule ${req.user!.plan}.`
        });
      }

      let buffer: Uint8Array;
      let mimeType = getMimeTypeForFormat(format);
      const filename = formatExportFilename(book.title, format);

      const exportOptions: ExportOptions = {
        format,
        includeCover: options?.includeCover ?? true,
        includeTOC: options?.includeTOC ?? true,
        includePageNumbers: options?.includePageNumbers ?? true,
        fontFamily: (options?.fontFamily as any) || "serif",
        pageSize: (options?.pageSize as any) || "A4"
      };

      switch (format) {
        case "pdf":
          buffer = await BookExportEngine.generatePdf(book as unknown as Book, exportOptions);
          mimeType = "application/pdf";
          break;
        case "docx":
          buffer = await BookExportEngine.generateDocx(book as unknown as Book, exportOptions);
          mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
        case "epub":
          buffer = await BookExportEngine.generateEpub(book as unknown as Book, exportOptions);
          mimeType = "application/epub+zip";
          break;
        case "txt":
          buffer = BookExportEngine.generateTxt(book as unknown as Book);
          mimeType = "text/plain; charset=utf-8";
          break;
        case "markdown":
          buffer = BookExportEngine.generateMarkdown(book as unknown as Book);
          mimeType = "text/markdown; charset=utf-8";
          break;
        case "html":
          buffer = BookExportEngine.generateHtml(book as unknown as Book);
          mimeType = "text/html; charset=utf-8";
          break;
        default:
          return res.status(400).json({
            success: false,
            error: "UNSUPPORTED_FORMAT",
            message: `Le format d'exportation '${format}' n'est pas pris en charge.`
          });
      }

      if (!buffer || buffer.length === 0) {
        return res.status(500).json({
          success: false,
          error: "EMPTY_EXPORT",
          message: "Le fichier généré est vide."
        });
      }

      // Encode filename per RFC 5987 / RFC 6266
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      return res.end(Buffer.from(buffer));
    } catch (err: any) {
      console.error("[Export Engine] Export generation error:", err);
      return res.status(500).json({
        success: false,
        error: "EXPORT_FAILED",
        message: `Une erreur est survenue lors de l'exportation : ${err?.message || "Erreur interne"}`
      });
    }
  });

  // Strict API 404 handler - prevents unmatched /api/* requests from falling through to Vite SPA index.html
  app.all("/api/*", (req, res) => {
    return res.status(404).json({
      success: false,
      error: "ENDPOINT_NOT_FOUND",
      message: `L'endpoint API demandé (${req.method} ${req.path}) est introuvable.`
    });
  });

  // Global API error handler for any uncaught errors in API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api")) {
      console.error("[API Error Handler]", err);
      return res.status(err?.status || 500).json({
        success: false,
        error: err?.code || "INTERNAL_API_ERROR",
        message: err?.message || "Une erreur interne est survenue lors de la communication avec l'API."
      });
    }
    next(err);
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server error:", err);
});
