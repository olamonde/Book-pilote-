import { Book, Chapter, CoverConfig, CoverStyle, CoverVisualState, CoverVersionItem } from '../types';
import { analyzeImagePrompt } from './imagePromptService';

export interface CoverChatInterpretationResult {
  intent: 'chat' | 'generate' | 'restore_version';
  aiReply: string;
  targetVersionNumber?: number | null;
  isCoverRequest?: boolean;
  isArtworkOnly?: boolean;
  detectedStyle?: string;
  updatedVisualState: CoverVisualState;
  enhancedSvgPrompt: string;
  suggestedColors?: {
    style?: CoverStyle | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    textColor?: string | null;
    pattern?: CoverConfig['pattern'] | null;
  } | null;
}

export interface GenerateOptions {
  idea: string;
  language?: string;
  bookType?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long' | 'custom';
  targetAudience?: string;
  author?: string;
  customInstructions?: string;
}

export interface BookConcept {
  title: string;
  subtitle: string;
  description: string;
  targetAudience: string;
  tone: string;
  genre: string;
  coverStyle: CoverStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pattern: CoverConfig['pattern'];
  estimatedChapters: number;
}

export interface OutlineItem {
  id: string;
  title: string;
  order: number;
  description: string;
  keyPoints: string[];
}

/**
 * Resilient client-side fetch helper that ensures all API responses are valid JSON
 * and prevents SyntaxError ("Unexpected token '<'") when receiving HTML error pages or gateway timeouts.
 */
async function safeApiFetch<T = any>(
  url: string,
  options: RequestInit,
  fallbackErrorMessage: string
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (networkErr: any) {
    throw new Error(
      "Impossible de contacter le serveur Book Pilot. Veuillez vérifier votre connexion et réessayer."
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    // Non-JSON response received (e.g. HTML error page from proxy/gateway or server restarting)
    const textSample = await response.text().catch(() => '');
    console.warn(`[AIService] Non-JSON response received from ${url} (HTTP ${response.status}):`, textSample.slice(0, 150));
    throw new Error(
      response.status >= 500
        ? "Le service d'intelligence artificielle est momentanément indisponible. Veuillez réessayer dans quelques instants."
        : fallbackErrorMessage
    );
  }

  if (!response.ok || !data || data.success === false) {
    const errorMsg = data?.message || fallbackErrorMessage;
    const err = new Error(errorMsg);
    (err as any).code = data?.error || 'API_ERROR';
    (err as any).status = response.status;
    throw err;
  }

  return data as T;
}

export class AIService {
  // Step 1: Generate Book Concept from raw idea
  static async generateBookConcept(options: GenerateOptions): Promise<BookConcept> {
    const data = await safeApiFetch<{ success: boolean; concept: BookConcept }>(
      '/api/generate-book-concept',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      },
      'Erreur lors de la génération du concept de livre.'
    );

    return data.concept;
  }

  // Step 2: Generate Outline from Concept
  static async generateOutline(concept: BookConcept, options: GenerateOptions): Promise<OutlineItem[]> {
    const data = await safeApiFetch<{ success: boolean; outline: OutlineItem[] }>(
      '/api/generate-outline',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, options })
      },
      'Erreur lors de la génération du plan.'
    );

    return data.outline;
  }

  // Step 3: Generate a rich Chapter with consistent narrative memory & structural context
  static async generateChapter(
    bookConcept: BookConcept,
    outlineItem: OutlineItem,
    chapterIndex: number,
    previousSummaries: string[] = [],
    customInstructions?: string,
    language?: string,
    fullOutline?: OutlineItem[],
    totalChapters?: number
  ): Promise<{ content: string; wordCount: number; summary: string }> {
    const data = await safeApiFetch<{
      success: boolean;
      content: string;
      wordCount: number;
      summary: string;
    }>(
      '/api/generate-chapter',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookConcept,
          outlineItem,
          chapterIndex,
          previousSummaries,
          customInstructions,
          language: language || (bookConcept as any).language || 'Français',
          fullOutline,
          totalChapters
        })
      },
      `Erreur lors de la rédaction du chapitre ${chapterIndex + 1}.`
    );

    return {
      content: data.content,
      wordCount: data.wordCount,
      summary: data.summary
    };
  }

  // High-Speed Batch Chapter Generation (Parallel Processing)
  static async generateChaptersBatch(
    bookConcept: BookConcept,
    outline: OutlineItem[],
    customInstructions?: string,
    language?: string,
    concurrency = 2
  ): Promise<Chapter[]> {
    const data = await safeApiFetch<{ success: boolean; chapters: Chapter[] }>(
      '/api/generate-chapters-batch',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookConcept,
          outline,
          customInstructions,
          language: language || (bookConcept as any).language || 'Français',
          concurrency
        })
      },
      'Erreur lors de la rédaction accélérée des chapitres.'
    );

    return data.chapters;
  }

  // Step 4: AI Copilot transformations
  static async copilotTransform(
    action: string,
    selectedText: string,
    customPrompt?: string,
    chapterTitle?: string,
    language?: string
  ): Promise<string> {
    const clean = selectedText.trim();
    if (!clean) {
      return 'Veuillez sélectionner ou fournir du texte à transformer avec Book Pilot Copilot.';
    }

    let instruction = customPrompt || action;
    if (action === 'rewrite') {
      instruction = 'Réécris ce texte avec une grande fluidité littéraire, un style percutant et une clarté remarquable tout en préservant le sens.';
    } else if (action === 'expand') {
      instruction = 'Développe ce texte en profondeur avec des explications concrètes, des analogies pertinentes et des détails immersifs.';
    } else if (action === 'shorten' || action === 'summarize') {
      instruction = 'Condense et résume ce texte de manière percutante, en conservant uniquement les idées et leçons maîtresses.';
    } else if (action === 'professional') {
      instruction = 'Adopte un ton résolument exécutif, élégant, autoritaire et hautement professionnel.';
    } else if (action === 'inspiring') {
      instruction = 'Sublime ce texte avec un ton profondément inspirant, galvanisant et motivant.';
    } else if (action === 'examples') {
      instruction = 'Ajoute des cas concrets, des exemples réels et des illustrations pratiques pour ancrer le propos.';
    } else if (action === 'grammar') {
      instruction = 'Corrige rigoureusement toute faute de grammaire, d\'orthographe, de ponctuation et soigne la cadence des phrases.';
    } else if (action === 'continue') {
      instruction = 'Poursuis la rédaction de manière fluide et naturelle dans la continuité immédiate du texte.';
    }

    if (customPrompt && action !== 'custom') {
      instruction += ` Consigne supplémentaire : ${customPrompt}`;
    }

    const data = await safeApiFetch<{ success: boolean; result: string }>(
      '/api/copilot-transform',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          instruction,
          chapterTitle,
          language
        })
      },
      'Erreur lors du traitement avec le copilote.'
    );

    return data.result;
  }

  // Step 5: AI Cover Variations Generator
  static generateCoverVariations(
    title: string,
    subtitle: string,
    author: string,
    style: CoverStyle = 'modern'
  ): CoverConfig[] {
    const safeTitle = title || 'Turn Ideas Into Reality';
    const safeSub = subtitle || 'The Complete Modern Handbook';
    const safeAuthor = author || 'Book Pilot Author';

    const palettes: {
      style: CoverStyle;
      primary: string;
      secondary: string;
      accent: string;
      pattern: CoverConfig['pattern'];
      font: CoverConfig['fontFamily'];
      textColor: string;
    }[] = [
      {
        style: 'modern',
        primary: '#090a0f',
        secondary: '#7c3aed',
        accent: '#38bdf8',
        pattern: 'geometric',
        font: 'modern',
        textColor: '#ffffff'
      },
      {
        style: 'luxury',
        primary: '#0e0e12',
        secondary: '#b45309',
        accent: '#fbbf24',
        pattern: 'lines',
        font: 'cinzel',
        textColor: '#fef3c7'
      },
      {
        style: 'business',
        primary: '#0f172a',
        secondary: '#2563eb',
        accent: '#10b981',
        pattern: 'cubes',
        font: 'sans',
        textColor: '#f8fafc'
      },
      {
        style: 'editorial',
        primary: '#1c1917',
        secondary: '#e11d48',
        accent: '#f43f5e',
        pattern: 'minimal',
        font: 'serif',
        textColor: '#fafaf9'
      },
      {
        style: 'sci-fi',
        primary: '#030712',
        secondary: '#06b6d4',
        accent: '#a855f7',
        pattern: 'stars',
        font: 'modern',
        textColor: '#f0fdf4'
      },
      {
        style: 'minimal',
        primary: '#18181b',
        secondary: '#52525b',
        accent: '#fafafa',
        pattern: 'waves',
        font: 'sans',
        textColor: '#ffffff'
      }
    ];

    return palettes.map((p) => ({
      title: safeTitle,
      subtitle: safeSub,
      author: safeAuthor,
      style: p.style,
      primaryColor: p.primary,
      secondaryColor: p.secondary,
      accentColor: p.accent,
      pattern: p.pattern,
      fontFamily: p.font,
      textColor: p.textColor
    }));
  }

  // Flexible Copilot executor handling various parameter orders and chapter contexts
  static async executeCopilotAction(
    param1: string,
    param2: string,
    customPrompt?: string,
    chapterTitle?: string,
    language?: string
  ): Promise<string> {
    // If param1 is long text (e.g. currentText) and param2 is prompt/action
    let text = param1;
    let instruction = param2;

    // If param1 is a short action identifier (e.g. 'rewrite', 'expand') and param2 is the text
    if (param1.length < 40 && param2.length >= 40) {
      instruction = customPrompt ? `${param1}: ${customPrompt}` : param1;
      text = param2;
    }

    return this.copilotTransform(instruction, text, customPrompt, chapterTitle, language);
  }

  // Generate a synthesized cover config based on concept
  static async generateCover(
    concept: Partial<BookConcept>,
    chapters: any[] = []
  ): Promise<CoverConfig> {
    const title = concept.title || 'Mon E-Book';
    const subtitle = concept.subtitle || '';
    const author = 'Auteur Book Pilot';
    const style = concept.coverStyle || 'modern';

    const promptIdea = concept.description
      ? `Illustration de couverture pour "${title}" : ${concept.description.slice(0, 160)}`
      : `Illustration de couverture artistique pour "${title}"`;

    let generatedImageUrl: string | undefined = undefined;
    try {
      const data = await safeApiFetch<{ success: boolean; imageUrl?: string }>(
        '/api/generate-cover-image',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptIdea,
            bookContext: {
              title,
              subtitle,
              genre: concept.genre,
              tone: concept.tone,
              description: concept.description,
              targetAudience: concept.targetAudience
            }
          })
        },
        'Illustration non disponible'
      );
      if (data?.imageUrl) {
        generatedImageUrl = data.imageUrl;
      }
    } catch (e) {
      console.warn('[AIService] Cover auto-gen fallback to styled palette:', e);
    }

    const variations = this.generateCoverVariations(title, subtitle, author, style);
    const baseCover = variations[0] || {
      title,
      subtitle,
      author,
      style: 'modern',
      primaryColor: concept.primaryColor || '#0f172a',
      secondaryColor: concept.secondaryColor || '#7c3aed',
      accentColor: concept.accentColor || '#38bdf8',
      pattern: concept.pattern || 'geometric',
      fontFamily: 'modern',
      textColor: '#ffffff'
    };

    return {
      ...baseCover,
      primaryColor: concept.primaryColor || baseCover.primaryColor,
      secondaryColor: concept.secondaryColor || baseCover.secondaryColor,
      accentColor: concept.accentColor || baseCover.accentColor,
      pattern: concept.pattern || baseCover.pattern,
      customPrompt: promptIdea,
      imageUrl: generatedImageUrl
    };
  }

  // Chapter generator alias
  static async generateChapterContent(
    bookConcept: BookConcept,
    outlineItem: OutlineItem,
    chapterIndex: number,
    previousSummaries: string[] = []
  ): Promise<{ content: string; wordCount: number; summary: string }> {
    return this.generateChapter(bookConcept, outlineItem, chapterIndex, previousSummaries);
  }

  // Step 6: Generate custom cover based on user's descriptive prompt & book context
  static async generateCoverFromUserIdea(
    userDescription: string,
    bookContext: {
      title?: string;
      subtitle?: string;
      author?: string;
      genre?: string;
      description?: string;
      targetAudience?: string;
      tone?: string;
    },
    currentCover?: Partial<CoverConfig>
  ): Promise<CoverConfig> {
    const raw = userDescription.trim();
    const analysis = analyzeImagePrompt(raw, bookContext);

    let style: CoverStyle = currentCover?.style || (analysis.isCoverRequest ? 'modern' : 'minimal');
    let primaryColor = currentCover?.primaryColor || analysis.suggestedColors.primaryColor;
    let secondaryColor = currentCover?.secondaryColor || analysis.suggestedColors.secondaryColor;
    let accentColor = currentCover?.accentColor || analysis.suggestedColors.accentColor;
    let textColor = currentCover?.textColor || analysis.suggestedColors.textColor;
    let fontFamily: CoverConfig['fontFamily'] = currentCover?.fontFamily || 'sans';
    let pattern: CoverConfig['pattern'] = currentCover?.pattern || 'geometric';

    // 2. Call secure backend endpoint for image / cover generation
    let generatedImageUrl: string | undefined = undefined;

    try {
      const data = await safeApiFetch<{ success: boolean; imageUrl?: string }>(
        '/api/generate-cover-image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: raw,
            mode: analysis.isCoverRequest ? 'cover' : 'image',
            bookContext: {
              title: currentCover?.title || bookContext.title,
              subtitle: currentCover?.subtitle || bookContext.subtitle,
              author: currentCover?.author || bookContext.author,
              genre: bookContext.genre,
              tone: bookContext.tone,
              description: bookContext.description,
              targetAudience: bookContext.targetAudience
            }
          })
        },
        "Erreur lors de la génération de l'illustration."
      );

      generatedImageUrl = data.imageUrl;
    } catch (err) {
      console.error('[Cover Generation] Backend request error:', err);
      throw err;
    }

    return {
      title: currentCover?.title || bookContext.title || 'Mon E-Book',
      subtitle: currentCover?.subtitle ?? (bookContext.subtitle || ''),
      author: currentCover?.author || bookContext.author || 'Auteur Book Pilot',
      style,
      primaryColor,
      secondaryColor,
      accentColor,
      textColor,
      fontFamily,
      pattern,
      customPrompt: raw,
      imageUrl: generatedImageUrl,
      isArtworkOnly: !analysis.isCoverRequest,
      showTextOverlay: analysis.isCoverRequest,
      displayMode: analysis.isCoverRequest ? 'cover' : 'artwork',
      detectedStyle: analysis.visualStyle
    };
  }

  /**
   * Conversational Cover Director: Interprets user messages in context,
   * detects whether to chat/advise, restore an older version, or generate a new version.
   */
  static async interpretCoverChat(params: {
    message: string;
    bookContext: {
      title: string;
      subtitle?: string;
      author: string;
      genre?: string;
      tone?: string;
      description?: string;
      targetAudience?: string;
      language?: string;
    };
    currentCover: CoverConfig;
    currentVisualState?: CoverVisualState;
    versions?: CoverVersionItem[];
    currentVersionNumber?: number;
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
    interfaceLanguage?: string;
  }): Promise<CoverChatInterpretationResult> {
    return safeApiFetch<CoverChatInterpretationResult>(
      '/api/cover-chat/interpret',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      },
      "Impossible d'analyser votre message. Veuillez réessayer."
    );
  }

  /**
   * Generates high-definition vector artwork from the synthesized prompt
   */
  static async generateCoverArtwork(
    svgPrompt: string,
    bookContext: {
      title: string;
      subtitle?: string;
      author: string;
      genre?: string;
      tone?: string;
      description?: string;
      targetAudience?: string;
    },
    options?: {
      mode?: 'cover' | 'image';
      isArtworkOnly?: boolean;
      userPrompt?: string;
      detectedStyle?: string;
    }
  ): Promise<string> {
    const data = await safeApiFetch<{ success: boolean; imageUrl?: string }>(
      '/api/generate-cover-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: svgPrompt,
          bookContext,
          mode: options?.mode || (options?.isArtworkOnly ? 'image' : undefined)
        })
      },
      "Erreur lors de la génération de l'illustration."
    );

    if (!data.imageUrl) {
      const err = new Error("Erreur lors de la génération de l'illustration.");
      (err as any).code = 'GENERATION_FAILED';
      throw err;
    }

    return data.imageUrl;
  }
}
