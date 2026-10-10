import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import {
  authService,
  AuthError,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS
} from "./services/authService";
import { bookRepository } from "./repositories/bookRepository";
import { QuotaService } from "./services/quotaService";
import { AuthorizationService } from "./services/authorizationService";
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
} from "./validation/apiSchemas";
import {
  IMAGE_PROVIDER,
  IMAGE_PROVIDER_CONFIG,
  executeImageGeneration
} from "../src/services/imageGenerationProvider";
import {
  BookExportEngine,
  formatExportFilename,
  getMimeTypeForFormat
} from "../src/services/bookExportEngine";
import { Book, ExportOptions, User } from "../src/types";

dotenv.config();

// Cookie helpers compatible with Web Standard Request & Response
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    try {
      list[name] = decodeURIComponent(value);
    } catch {
      list[name] = value;
    }
  });

  return list;
}

export function buildSessionCookie(sessionId: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAgeSec = Math.floor(SESSION_MAX_AGE_MS / 1000);
  let cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax; HttpOnly`;
  if (isProduction) cookie += "; Secure";
  return cookie;
}

export function buildClearSessionCookie(): string {
  const isProduction = process.env.NODE_ENV === "production";
  let cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
  if (isProduction) cookie += "; Secure";
  return cookie;
}

export function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

// In-memory rate limiter using lazy cleanup (Worker safe, no top-level setInterval)
interface RateRecord {
  count: number;
  resetAt: number;
}
const rateMap = new Map<string, RateRecord>();
let lastRateCleanup = Date.now();

function checkRateLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  if (now - lastRateCleanup > 60000 || rateMap.size > 200) {
    lastRateCleanup = now;
    for (const [k, v] of rateMap.entries()) {
      if (v.resetAt <= now) rateMap.delete(k);
    }
  }

  let rec = rateMap.get(key);
  if (!rec || rec.resetAt <= now) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (rec.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((rec.resetAt - now) / 1000) };
  }

  rec.count++;
  return { allowed: true };
}

// User extractor
export async function getSessionUser(request: Request): Promise<{ user: User | null; sessionId: string | null }> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const sessionId = cookies[SESSION_COOKIE_NAME] || null;
  if (!sessionId) return { user: null, sessionId: null };

  try {
    const user = await authService.getCurrentUserFromSession(sessionId);
    return { user, sessionId };
  } catch (err) {
    console.error("[Auth] Session validation error:", err);
    return { user: null, sessionId };
  }
}

// Gemini helpers
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

const GEMINI_TEXT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.1-pro-preview"
];

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
      if (options?.systemInstruction) config.systemInstruction = options.systemInstruction;
      if (options?.jsonMode) config.responseMimeType = "application/json";
      if (typeof options?.temperature === "number") config.temperature = options.temperature;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config
      });

      const text = response.text?.trim() || "";
      if (text) return text;
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

  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    try {
      const repaired = jsonrepair(cleaned);
      return JSON.parse(repaired);
    } catch {
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
        } catch {}
      }
      throw err1;
    }
  }
}

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

function extractChaptersFromRawText(raw: string, targetCount: number): any[] {
  const chapters: any[] = [];
  const titleRegex = /"title"\s*:\s*"([^"]+)"/g;
  const descRegex = /"description"\s*:\s*"([^"]+)"/g;
  const keyPointsBlockRegex = /"keyPoints"\s*:\s*\[([\s\S]*?)\]/g;

  const titles: string[] = [];
  let m;
  while ((m = titleRegex.exec(raw)) !== null) titles.push(m[1].trim());

  const descs: string[] = [];
  while ((m = descRegex.exec(raw)) !== null) descs.push(m[1].trim());

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

// MAIN WEB API DISPATCHER
export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // Helper to read JSON body safely
  async function readJsonBody(): Promise<any> {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }

  // 1. Health check
  if (path === "/api/health" && method === "GET") {
    return jsonResponse({ status: "ok" });
  }

  // -------------------------------------------------------------------------
  // AUTH ROUTES
  // -------------------------------------------------------------------------
  if (path === "/api/auth/register" && method === "POST") {
    const body = await readJsonBody();
    try {
      const result = await authService.register(body);
      const cookie = buildSessionCookie(result.sessionId);
      return jsonResponse({ success: true, user: result.user }, 201, { "Set-Cookie": cookie });
    } catch (err: any) {
      if (err instanceof AuthError) {
        return jsonResponse({ success: false, error: err.code, message: err.message }, err.code === "USER_EXISTS" ? 409 : 400);
      }
      return jsonResponse({ success: false, error: "AUTH_ERROR", message: err?.message || "Erreur d'inscription" }, 500);
    }
  }

  if (path === "/api/auth/login" && method === "POST") {
    const body = await readJsonBody();
    try {
      const result = await authService.login(body);
      const cookie = buildSessionCookie(result.sessionId);
      return jsonResponse({ success: true, user: result.user }, 200, { "Set-Cookie": cookie });
    } catch (err: any) {
      if (err instanceof AuthError) {
        return jsonResponse({ success: false, error: err.code, message: err.message }, 401);
      }
      return jsonResponse({ success: false, error: "AUTH_ERROR", message: err?.message || "Erreur de connexion" }, 500);
    }
  }

  if (path === "/api/auth/logout" && method === "POST") {
    const { sessionId } = await getSessionUser(request);
    if (sessionId) {
      await authService.logout(sessionId).catch(() => {});
    }
    const cookie = buildClearSessionCookie();
    return jsonResponse({ success: true, message: "Déconnexion réussie." }, 200, { "Set-Cookie": cookie });
  }

  if (path === "/api/auth/me" && method === "GET") {
    const { user, sessionId } = await getSessionUser(request);
    if (!sessionId || !user) {
      const headers = sessionId ? { "Set-Cookie": buildClearSessionCookie() } : {};
      return jsonResponse({ authenticated: false, user: null }, 200, headers);
    }
    return jsonResponse({ authenticated: true, user });
  }

  if (path === "/api/auth/forgot-password" && method === "POST") {
    const body = await readJsonBody();
    const result = await authService.handleForgotPassword(body.email);
    return jsonResponse(result);
  }

  if (path === "/api/auth/reset-password" && method === "POST") {
    try {
      const body = await readJsonBody();
      const result = await authService.resetPassword(body.token, body.newPassword);
      return jsonResponse(result);
    } catch (err: any) {
      return jsonResponse({
        success: false,
        error: err?.code || "RESET_FAILED",
        message: err?.message || "Échec de la réinitialisation du mot de passe."
      }, 400);
    }
  }

  if (path === "/api/auth/profile" && method === "PATCH") {
    const { user } = await getSessionUser(request);
    if (!user) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED", message: "Vous devez être connecté." }, 401);
    }
    const body = await readJsonBody();
    const partial: Record<string, any> = {};
    if (typeof body.name === "string" && body.name.trim().length > 0 && body.name.trim().length <= 80) {
      partial.name = body.name.trim();
    }
    if (typeof body.avatar === "string" && body.avatar.trim().length <= 500) {
      partial.avatar = body.avatar.trim();
    }
    if (typeof body.hasCompletedOnboarding === "boolean") {
      partial.hasCompletedOnboarding = body.hasCompletedOnboarding;
    }
    if (["fr", "en", "es", "pt"].includes(body.interfaceLanguage)) {
      partial.interfaceLanguage = body.interfaceLanguage;
    }
    if (typeof body.defaultContentLanguage === "string" && body.defaultContentLanguage.trim().length <= 30) {
      partial.defaultContentLanguage = body.defaultContentLanguage.trim();
    }
    const updated = await authService.updateUserProfile(user.id, partial);
    return jsonResponse({ success: true, user: updated });
  }

  // -------------------------------------------------------------------------
  // BOOK ROUTES
  // -------------------------------------------------------------------------
  if (path === "/api/books" && method === "GET") {
    const { user } = await getSessionUser(request);
    if (!user) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED", message: "Authentification requise." }, 401);
    }
    const userBooks = await bookRepository.getBooksByUserId(user.id);
    return jsonResponse({ success: true, books: userBooks });
  }

  if (path === "/api/books" && method === "POST") {
    const { user } = await getSessionUser(request);
    if (!user) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED", message: "Authentification requise." }, 401);
    }
    const rawBook: Book = await readJsonBody();
    if (!rawBook || !rawBook.title) {
      return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: "Le livre doit avoir un titre." }, 400);
    }
    const bookToSave: Book = {
      ...rawBook,
      id: rawBook.id || `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id
    };
    const existing = await bookRepository.getBookById(bookToSave.id, user.id);
    let savedBook: Book;
    if (existing) {
      savedBook = (await bookRepository.updateBook(bookToSave, user.id)) || bookToSave;
    } else {
      savedBook = await bookRepository.createBook(bookToSave, user.id);
    }
    return jsonResponse({ success: true, book: savedBook });
  }

  // Duplicate endpoint: POST /api/books/:id/duplicate
  if (path.startsWith("/api/books/") && path.endsWith("/duplicate") && method === "POST") {
    const segments = path.split("/");
    const bookId = segments[3];
    const { user } = await getSessionUser(request);
    if (!user) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED", message: "Authentification requise." }, 401);
    }
    const existing = await bookRepository.getBookById(bookId, user.id);
    if (!existing) {
      return jsonResponse({ success: false, error: "BOOK_NOT_FOUND", message: "Livre d'origine introuvable." }, 404);
    }
    const duplicateBook: Book = {
      ...existing,
      id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      title: `${existing.title} (Copie)`,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: (existing.chapters || []).map(ch => ({
        ...ch,
        id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      })),
      exportHistory: []
    };
    const saved = await bookRepository.createBook(duplicateBook, user.id);
    return jsonResponse({ success: true, book: saved });
  }

  // Single book CRUD: /api/books/:id
  if (path.startsWith("/api/books/") && path.split("/").length === 4) {
    const bookId = path.split("/")[3];
    const { user } = await getSessionUser(request);
    if (!user) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED", message: "Authentification requise." }, 401);
    }

    if (method === "GET") {
      const book = await bookRepository.getBookById(bookId, user.id);
      if (!book) {
        return jsonResponse({ success: false, error: "BOOK_NOT_FOUND", message: "Livre introuvable." }, 404);
      }
      return jsonResponse({ success: true, book });
    }

    if (method === "PUT" || method === "PATCH") {
      const rawUpdates: Partial<Book> = await readJsonBody();
      if (!rawUpdates || typeof rawUpdates !== "object") {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: "Données de mise à jour invalides." }, 400);
      }
      const existing = await bookRepository.getBookById(bookId, user.id);
      if (!existing) {
        return jsonResponse({ success: false, error: "BOOK_NOT_FOUND", message: "Livre introuvable." }, 404);
      }
      const mergedBook: Book = {
        ...existing,
        ...rawUpdates,
        id: bookId,
        userId: user.id, // Strictly preserve authenticated user
        updatedAt: new Date().toISOString()
      };
      if (rawUpdates.chapters) {
        mergedBook.wordCount = (rawUpdates.chapters || []).reduce((acc, c) => acc + (c.wordCount || 0), 0);
      }
      const updatedBook = await bookRepository.updateBook(mergedBook, user.id);
      if (!updatedBook) {
        return jsonResponse({ success: false, error: "UPDATE_FAILED", message: "Échec de la mise à jour du livre." }, 500);
      }
      return jsonResponse({ success: true, book: updatedBook });
    }

    if (method === "DELETE") {
      const deleted = await bookRepository.deleteBook(bookId, user.id);
      if (!deleted) {
        return jsonResponse({ success: false, error: "BOOK_NOT_FOUND", message: "Livre introuvable ou déjà supprimé." }, 404);
      }
      return jsonResponse({ success: true, message: "Projet de livre supprimé avec succès." });
    }
  }

  // -------------------------------------------------------------------------
  // AI ENDPOINTS (Require Authentication & AI Rate Limiter)
  // -------------------------------------------------------------------------
  const isAiRoute = [
    "/api/generate-book-concept",
    "/api/generate-outline",
    "/api/generate-chapter",
    "/api/generate-chapters-batch",
    "/api/copilot-transform",
    "/api/cover-chat/interpret",
    "/api/generate-cover-image",
    "/api/generate-image",
    "/api/transcribe-audio",
    "/api/export-book"
  ].includes(path);

  if (isAiRoute && method === "POST") {
    const { user } = await getSessionUser(request);
    if (!user) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED", message: "Authentification requise." }, 401);
    }

    // Rate limiting for non-export AI routes
    if (path !== "/api/export-book") {
      const rateKey = `${path}:${user.id}`;
      const rateCheck = checkRateLimit(rateKey, 30, 60000);
      if (!rateCheck.allowed) {
        return jsonResponse({
          success: false,
          error: "RATE_LIMITED",
          message: "Le moteur de génération IA est fortement sollicité. Veuillez patienter quelques secondes."
        }, 429, { "Retry-After": String(rateCheck.retryAfter || 2) });
      }
    }

    // A. Generate Book Concept
    if (path === "/api/generate-book-concept") {
      const body = await readJsonBody();
      const parseResult = BookConceptSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données invalides." }, 400);
      }

      const { idea, language, bookType, tone, length, targetAudience, author, customInstructions } = parseResult.data;
      const quotaResult = await QuotaService.consumeAiGeneration(user.id, 1);
      if (!quotaResult.allowed) {
        return jsonResponse({ success: false, error: "AI_QUOTA_EXCEEDED", message: "Quota IA épuisé.", quota: quotaResult }, 403);
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

        const rawJson = await callGemini(userPrompt, { systemInstruction: systemPrompt, jsonMode: true, temperature: 0.7 });
        let parsed: any = {};
        try {
          parsed = parseJsonFromLlm(rawJson);
        } catch {
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

        const validStyles = ["luxury", "minimal", "business", "technology", "modern", "fantasy", "editorial", "cinematic"];
        const coverStyle = validStyles.includes(parsed.coverStyle) ? parsed.coverStyle : "modern";
        const validPatterns = ["geometric", "radial", "lines", "stars", "cubes", "minimal", "waves"];
        const pattern = validPatterns.includes(parsed.pattern) ? parsed.pattern : "geometric";

        const concept = {
          title: String(parsed.title || idea.slice(0, 50)).trim(),
          subtitle: String(parsed.subtitle || "Un guide complet et inspirant").trim(),
          description: String(parsed.description || `Un ouvrage passionnant consacré à ${idea}.`).trim(),
          targetAudience: String(parsed.targetAudience || targetAudience || "Lecteurs passionnés").trim(),
          tone: String(parsed.tone || tone || "Inspirant & Professionnel").trim(),
          genre: String(parsed.genre || bookType || "Guide Pratique").trim(),
          coverStyle,
          primaryColor: parsed.primaryColor || "#0f172a",
          secondaryColor: parsed.secondaryColor || "#8b5cf6",
          accentColor: parsed.accentColor || "#38bdf8",
          pattern,
          estimatedChapters: typeof parsed.estimatedChapters === "number" ? parsed.estimatedChapters : (length === "short" ? 4 : length === "long" ? 8 : 6)
        };

        return jsonResponse({ success: true, concept });
      } catch (err: any) {
        await QuotaService.refundAiGeneration(user.id, 1).catch(rErr => console.error('[Quota Refund Error]:', rErr));
        return jsonResponse({ success: false, error: "GENERATION_FAILED", message: formatUserErrorMessage(err, "La synthèse du concept a échoué.") }, 500);
      }
    }

    // B. Generate Outline
    if (path === "/api/generate-outline") {
      const body = await readJsonBody();
      const parseResult = GenerateOutlineSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données invalides." }, 400);
      }

      const { concept, options } = parseResult.data;
      const quotaResult = await QuotaService.consumeAiGeneration(user.id, 1);
      if (!quotaResult.allowed) {
        return jsonResponse({ success: false, error: "AI_QUOTA_EXCEEDED", message: "Quota IA épuisé.", quota: quotaResult }, 403);
      }

      try {
        const requestedLang = options?.language || "Français";
        const targetCount = concept.estimatedChapters || 6;
        const systemPrompt = `Tu es l'architecte éditorial principal de Book Pilot.
Ta mission est de concevoir le plan détaillé (Table des Matières) sur mesure de l'e-book.
Le plan doit comporter exactement ${targetCount} chapitres organisés selon une progression logique, rythmée, pédagogique et captivante.
Tu DOIS répondre EXCLUSIVEMENT sous forme d'un objet JSON strict valide contenant une clé "chapters".
La langue de rédaction DOIT être impérativement : ${requestedLang}.`;

        const userPrompt = `Livre : "${concept.title}" — "${concept.subtitle}". Description : ${concept.description}`;
        let rawChapters: any[] = [];
        try {
          const rawJson = await callGemini(userPrompt, { systemInstruction: systemPrompt, jsonMode: true, temperature: 0.6 });
          const parsed = parseJsonFromLlm(rawJson);
          if (Array.isArray(parsed.chapters)) rawChapters = parsed.chapters;
          else if (Array.isArray(parsed)) rawChapters = parsed;
        } catch {
          rawChapters = extractChaptersFromRawText("", targetCount);
        }

        if (!rawChapters || rawChapters.length < 2) {
          rawChapters = generateContextualFallbackOutline(concept, targetCount);
        }

        const outline = rawChapters.slice(0, targetCount).map((ch: any, idx: number) => {
          const order = typeof ch.order === "number" ? ch.order : idx + 1;
          let title = String(ch.title || `Chapitre ${order}`).trim();
          if (!/^chapitre\s+\d+/i.test(title)) title = `Chapitre ${order} : ${title}`;
          return {
            id: `ch-${order}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            order,
            title,
            description: String(ch.description || `Développement approfondi de ${title}.`).trim(),
            keyPoints: Array.isArray(ch.keyPoints) && ch.keyPoints.length > 0 ? ch.keyPoints.map(String) : ["Concepts clés", "Méthode pas à pas"]
          };
        });

        return jsonResponse({ success: true, outline });
      } catch (err: any) {
        const safeFallback = generateContextualFallbackOutline(concept || {}, concept?.estimatedChapters || 6);
        return jsonResponse({ success: true, outline: safeFallback });
      }
    }

    // C. Generate Single Chapter
    if (path === "/api/generate-chapter") {
      const body = await readJsonBody();
      const parseResult = GenerateChapterSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données invalides." }, 400);
      }

      const { bookConcept, outlineItem, chapterIndex = 0, previousSummaries, customInstructions, language, fullOutline, totalChapters: paramTotalChapters } = parseResult.data;
      const quotaResult = await QuotaService.consumeAiGeneration(user.id, 1);
      if (!quotaResult.allowed) {
        return jsonResponse({ success: false, error: "AI_QUOTA_EXCEEDED", message: "Quota IA épuisé.", quota: quotaResult }, 403);
      }

      try {
        const requestedLang = language || "Français";
        const totalChapters = Number(paramTotalChapters) || (Array.isArray(fullOutline) ? fullOutline.length : (bookConcept.estimatedChapters || 6));
        const currentIdx = typeof chapterIndex === "number" ? chapterIndex : 0;
        const isFirstChapter = currentIdx === 0;
        const isLastChapter = currentIdx === totalChapters - 1;

        let structuralRole = "Ce chapitre est un CHAPITRE DE DÉVELOPPEMENT MÉTHODIQUE. Rentre directement dans le vif du sujet technique, sans refaire une introduction globale à l'ensemble du livre.";
        if (isFirstChapter) structuralRole = "Ce chapitre est le PREMIER CHAPITRE (INTRODUCTION & FONDATIONS). Accroche puissamment le lecteur et pose les enjeux fondamentaux.";
        else if (isLastChapter) structuralRole = "Ce chapitre est le DERNIER CHAPITRE (CONCLUSION & PLAN D'ACTION). Récapitule les grands enseignements.";

        const systemPrompt = `Tu es un auteur d'élite pour Book Pilot.
Rédige l'intégralité du contenu d'un chapitre d'e-book en Markdown de haute qualité littéraire et technique.
Rôle structurel : ${structuralRole}
Langue : ${requestedLang}. Commence immédiatement par le Markdown en ##.`;

        const userPrompt = `Livre : ${bookConcept.title} — ${bookConcept.subtitle}
Chapitre ${currentIdx + 1}/${totalChapters} : ${outlineItem.title}
Objectif : ${outlineItem.description}
Points clés : ${(outlineItem.keyPoints || []).join(", ")}
${customInstructions ? `Consignes : ${customInstructions}` : ""}`;

        const rawContent = await callGemini(userPrompt, { systemInstruction: systemPrompt, jsonMode: false, temperature: 0.7 });
        let cleanContent = rawContent.trim().replace(/^```markdown\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
        const summary = `Le chapitre ${currentIdx + 1} traite de "${outlineItem.title}".`;

        return jsonResponse({ success: true, content: cleanContent, wordCount, summary });
      } catch (err: any) {
        await QuotaService.refundAiGeneration(user.id, 1).catch(rErr => console.error('[Quota Refund Error]:', rErr));
        return jsonResponse({ success: false, error: "GENERATION_FAILED", message: formatUserErrorMessage(err, "La rédaction du chapitre a échoué.") }, 500);
      }
    }

    // D. Batch Generate Chapters
    if (path === "/api/generate-chapters-batch") {
      const body = await readJsonBody();
      const parseResult = GenerateChaptersBatchSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données invalides." }, 400);
      }

      const { bookConcept, outline, customInstructions, language, concurrency = 2 } = parseResult.data;
      const totalChapters = outline.length;

      if (!AuthorizationService.isBatchGenerationAllowed(user)) {
        return jsonResponse({ success: false, error: "FEATURE_NOT_AVAILABLE", message: "La génération par lots accélérée est réservée aux formules Creator et Pro." }, 403);
      }

      const quotaResult = await QuotaService.consumeAiGeneration(user.id, totalChapters);
      if (!quotaResult.allowed) {
        return jsonResponse({ success: false, error: "AI_QUOTA_EXCEEDED", message: "Quota insuffisant.", quota: quotaResult }, 403);
      }

      try {
        const requestedLang = language || "Français";
        const results: any[] = new Array(totalChapters);
        const limit = Math.max(1, Math.min(Number(concurrency) || 2, 4));

        for (let i = 0; i < totalChapters; i += limit) {
          const chunkIndices = Array.from({ length: Math.min(limit, totalChapters - i) }, (_, k) => i + k);
          await Promise.all(
            chunkIndices.map(async (idx) => {
              const item = outline[idx];
              const sysPrompt = `Tu es un auteur d'élite pour Book Pilot. Rédige l'intégralité de ce chapitre en Markdown d'excellence.\nLangue : ${requestedLang}.\nCommence immédiatement par le Markdown en ##.`;
              const usrPrompt = `Livre : ${bookConcept.title} — ${bookConcept.subtitle}\nChapitre ${idx + 1}/${totalChapters} : ${item.title}\nObjectif : ${item.description}\nPoints clés : ${(item.keyPoints || []).join(", ")}`;
              const raw = await callGemini(usrPrompt, { systemInstruction: sysPrompt, jsonMode: false, temperature: 0.7 });
              let content = raw.trim().replace(/^```markdown\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
              results[idx] = {
                id: item.id || `ch-${idx + 1}`,
                title: item.title,
                order: idx + 1,
                content,
                wordCount: content.split(/\s+/).filter(Boolean).length,
                status: "ready",
                summary: `Le chapitre ${idx + 1} traite de "${item.title}".`
              };
            })
          );
        }

        return jsonResponse({ success: true, chapters: results });
      } catch (err: any) {
        await QuotaService.refundAiGeneration(user.id, totalChapters).catch(rErr => console.error('[Batch Quota Refund Error]:', rErr));
        return jsonResponse({ success: false, error: "BATCH_GENERATION_FAILED", message: formatUserErrorMessage(err, "La génération par lots a échoué.") }, 500);
      }
    }

    // E. Copilot Transform
    if (path === "/api/copilot-transform") {
      const body = await readJsonBody();
      const parseResult = CopilotTransformSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données invalides." }, 400);
      }

      const { text, instruction, chapterTitle, language } = parseResult.data;
      if (!AuthorizationService.isCopilotAllowed(user)) {
        return jsonResponse({ success: false, error: "FEATURE_NOT_AVAILABLE", message: "Le Copilote IA d'édition est une fonctionnalité réservée aux formules Creator et Pro." }, 403);
      }

      const quotaResult = await QuotaService.consumeAiGeneration(user.id, 1);
      if (!quotaResult.allowed) {
        return jsonResponse({ success: false, error: "AI_QUOTA_EXCEEDED", message: "Quota IA épuisé.", quota: quotaResult }, 403);
      }

      try {
        const systemPrompt = `Tu es le Copilote IA de rédaction et d'édition de Book Pilot.
Applique scrupuleusement la consigne éditoriale de l'auteur sur le texte fourni.
Rends UNIQUEMENT le texte final transformé en préservant la langue et le Markdown.`;
        const userPrompt = `Chapitre : "${chapterTitle || "Manuscrit"}"\nConsigne : "${instruction.trim()}"\nTexte original :\n"""\n${text.trim()}\n"""`;
        const result = await callGemini(userPrompt, { systemInstruction: systemPrompt, jsonMode: false, temperature: 0.5 });
        let cleanResult = result.trim().replace(/^```markdown\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        return jsonResponse({ success: true, transformedText: cleanResult, wordCount: cleanResult.split(/\s+/).filter(Boolean).length });
      } catch (err: any) {
        await QuotaService.refundAiGeneration(user.id, 1).catch(rErr => console.error('[Quota Refund Error]:', rErr));
        return jsonResponse({ success: false, error: "TRANSFORMATION_FAILED", message: formatUserErrorMessage(err, "La transformation a échoué.") }, 500);
      }
    }

    // F. Cover Chat Interpret
    if (path === "/api/cover-chat/interpret") {
      const body = await readJsonBody();
      const parseResult = CoverChatInterpretSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données invalides." }, 400);
      }

      const { message, bookContext, interfaceLanguage } = parseResult.data;
      try {
        const assistantLocale = interfaceLanguage === "en" ? "English" : interfaceLanguage === "es" ? "Español" : interfaceLanguage === "pt" ? "Português" : "Français";
        const systemInstruction = `Tu es le directeur artistique intelligent de Book Pilot AI pour les couvertures de livres. Tu réponds sous forme JSON strict avec "intent", "aiReply", "isCoverRequest", "isArtworkOnly", "enhancedSvgPrompt", "suggestedColors". Langue de réponse : ${assistantLocale}.`;
        const userPrompt = `Message de l'auteur : "${message}". Titre du livre : "${bookContext?.title || "Livre"}"`;
        const rawJson = await callGemini(userPrompt, { systemInstruction, jsonMode: true, temperature: 0.7 });
        const parsed = parseJsonFromLlm(rawJson);
        return jsonResponse({ success: true, interpretation: parsed });
      } catch (err: any) {
        return jsonResponse({ success: false, error: "INTERPRETATION_FAILED", message: formatUserErrorMessage(err, "L'interprétation artistique a échoué.") }, 500);
      }
    }

    // G. Generate Cover Image & Direct Image
    if (path === "/api/generate-cover-image" || path === "/api/generate-image") {
      const body = await readJsonBody();
      const parseResult = GenerateCoverImageSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données invalides." }, 400);
      }

      const { prompt, style, format } = parseResult.data;
      const { mode = "image", bookContext } = body;
      const quotaResult = await QuotaService.consumeAiGeneration(user.id, 1);
      if (!quotaResult.allowed) {
        return jsonResponse({ success: false, error: "AI_QUOTA_EXCEEDED", message: "Quota IA épuisé.", quota: quotaResult }, 403);
      }

      try {
        const result = await executeImageGeneration({
          prompt: prompt.trim(),
          style: typeof style === "string" ? style : undefined,
          format: format as any,
          mode,
          userPlan: user.plan,
          bookContext
        });
        return jsonResponse({ success: true, ...result });
      } catch (err: any) {
        await QuotaService.refundAiGeneration(user.id, 1).catch(rErr => console.error('[Quota Refund Error]:', rErr));
        return jsonResponse({
          success: false,
          provider: IMAGE_PROVIDER,
          model: IMAGE_PROVIDER_CONFIG.modelName,
          error: err.code || "GEMINI_NANO_BANANA_NOT_CONNECTED",
          message: err.message || "Gemini Nano Banana n'est pas encore connecté."
        }, typeof err.status === "number" ? err.status : 503);
      }
    }

    // H. Audio Transcription
    if (path === "/api/transcribe-audio") {
      const body = await readJsonBody();
      const parseResult = TranscribeAudioSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données audio invalides." }, 400);
      }

      const { audioBase64, mimeType = "audio/webm" } = parseResult.data;
      const { language = "fr-FR" } = body;
      try {
        const ai = getGeminiClient();
        const langHint = language.startsWith("fr") ? "French (Français)" : "the speaker's language";
        const cleanMime = (mimeType || "audio/webm").split(";")[0].trim();
        const transcriptionPrompt = `Transcris fidèlement et mot à mot l'enregistrement audio parlé fourni en ${langHint}. Renvoie UNIQUEMENT le texte transcrit sans commentaire ni préambule.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: cleanMime, data: audioBase64 } },
                { text: transcriptionPrompt }
              ]
            }
          ]
        });

        let transcriptText = (response.text || "").trim();
        if ((transcriptText.startsWith('"') && transcriptText.endsWith('"')) || (transcriptText.startsWith('«') && transcriptText.endsWith('»'))) {
          transcriptText = transcriptText.slice(1, -1).trim();
        }
        return jsonResponse({ success: true, transcript: transcriptText });
      } catch (err: any) {
        return jsonResponse({ success: false, error: "TRANSCRIPTION_FAILED", message: "La transcription a échoué." }, 500);
      }
    }

    // I. High-fidelity E-book Export
    if (path === "/api/export-book") {
      const body = await readJsonBody();
      const parseResult = ExportBookSchema.safeParse(body);
      if (!parseResult.success) {
        return jsonResponse({ success: false, error: "VALIDATION_ERROR", message: parseResult.error.issues[0]?.message || "Données d'export invalides." }, 400);
      }

      const { book, options } = parseResult.data;
      const format = options?.format || (body as any).format || "pdf";
      try {
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
            return jsonResponse({ success: false, error: "UNSUPPORTED_FORMAT", message: `Le format '${format}' n'est pas supporté.` }, 400);
        }

        if (!buffer || buffer.length === 0) {
          return jsonResponse({ success: false, error: "EMPTY_EXPORT", message: "Le fichier généré est vide." }, 500);
        }

        const encodedFilename = encodeURIComponent(filename);
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
            "Content-Length": String(buffer.length),
            "Cache-Control": "no-cache, no-store, must-revalidate"
          }
        });
      } catch (err: any) {
        console.error("[Export Engine] Error:", err);
        return jsonResponse({ success: false, error: "EXPORT_FAILED", message: err?.message || "Erreur d'exportation." }, 500);
      }
    }
  }

  // Strict 404 for unmatched /api/* routes
  return jsonResponse({
    success: false,
    error: "ENDPOINT_NOT_FOUND",
    message: `L'endpoint API demandé (${method} ${path}) est introuvable.`
  }, 404);
}
