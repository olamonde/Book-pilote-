import { z } from 'zod';

export const BookConceptSchema = z.object({
  idea: z.string().min(3, "L'idée doit comporter au moins 3 caractères").max(3000, "L'idée ne peut dépasser 3000 caractères"),
  language: z.string().max(50).optional(),
  bookType: z.string().max(100).optional(),
  tone: z.string().max(100).optional(),
  length: z.enum(['short', 'standard', 'long']).optional(),
  targetAudience: z.string().max(300).optional(),
  author: z.string().max(100).optional(),
  customInstructions: z.string().max(2000).optional()
});

export const GenerateOutlineSchema = z.object({
  concept: z.object({
    title: z.string().min(1).max(250),
    subtitle: z.string().max(300).optional(),
    description: z.string().max(3000).optional(),
    genre: z.string().max(100).optional(),
    tone: z.string().max(100).optional(),
    targetAudience: z.string().max(300).optional(),
    estimatedChapters: z.number().int().min(2).max(20).optional()
  }),
  options: z.object({
    language: z.string().max(50).optional(),
    idea: z.string().max(3000).optional(),
    customInstructions: z.string().max(2000).optional()
  }).optional()
});

export const GenerateChapterSchema = z.object({
  bookConcept: z.object({
    title: z.string().min(1).max(250),
    subtitle: z.string().max(300).optional(),
    genre: z.string().max(100).optional(),
    tone: z.string().max(100).optional(),
    targetAudience: z.string().max(300).optional(),
    description: z.string().max(3000).optional(),
    estimatedChapters: z.number().int().optional()
  }),
  outlineItem: z.object({
    id: z.string().optional(),
    order: z.number().int().optional(),
    title: z.string().min(1).max(250),
    description: z.string().max(2000).optional(),
    keyPoints: z.array(z.string().max(500)).max(15).optional()
  }),
  chapterIndex: z.number().int().min(0).max(50).optional(),
  previousSummaries: z.array(z.string().max(2000)).max(30).optional(),
  customInstructions: z.string().max(2000).optional(),
  language: z.string().max(50).optional(),
  fullOutline: z.array(z.any()).max(50).optional(),
  totalChapters: z.number().int().min(1).max(50).optional()
});

export const GenerateChaptersBatchSchema = z.object({
  bookConcept: z.object({
    title: z.string().min(1).max(250),
    subtitle: z.string().max(300).optional(),
    genre: z.string().max(100).optional(),
    tone: z.string().max(100).optional()
  }),
  outline: z.array(
    z.object({
      id: z.string().optional(),
      order: z.number().int().optional(),
      title: z.string().min(1).max(250),
      description: z.string().max(2000).optional(),
      keyPoints: z.array(z.string().max(500)).optional()
    })
  ).min(1, "Le plan doit comporter au moins 1 chapitre").max(15, "Le lot ne peut dépasser 15 chapitres simultanés"),
  customInstructions: z.string().max(2000).optional(),
  language: z.string().max(50).optional(),
  concurrency: z.number().int().min(1).max(4).optional()
});

export const CopilotTransformSchema = z.object({
  text: z.string().min(1, "Le texte à modifier est requis").max(50000, "Le texte ne peut dépasser 50 000 caractères"),
  instruction: z.string().min(1, "La consigne est requise").max(2000, "La consigne ne peut dépasser 2000 caractères"),
  chapterTitle: z.string().max(250).optional(),
  language: z.string().max(50).optional()
});

export const CoverChatInterpretSchema = z.object({
  message: z.string().min(1, "Le message est requis").max(2000, "Le message ne peut dépasser 2000 caractères"),
  bookContext: z.any().optional(),
  currentVisualState: z.any().optional(),
  versions: z.array(z.any()).max(20).optional(),
  currentVersionNumber: z.number().int().optional(),
  conversationHistory: z.array(z.any()).max(50).optional(),
  currentCover: z.any().optional(),
  interfaceLanguage: z.enum(['fr', 'en', 'es', 'pt']).optional()
});

export const GenerateCoverImageSchema = z.object({
  prompt: z.string().min(1, "Le prompt est requis").max(3000, "Le prompt ne peut dépasser 3000 caractères"),
  title: z.string().max(250).optional(),
  subtitle: z.string().max(300).optional(),
  author: z.string().max(100).optional(),
  genre: z.string().max(100).optional(),
  style: z.string().max(100).optional(),
  aspectRatio: z.enum(['1:1', '3:4', '16:9', 'square', 'portrait', 'landscape']).optional(),
  format: z.string().optional()
});

export const TranscribeAudioSchema = z.object({
  audioBase64: z.string().min(10, "Données audio invalides").max(15 * 1024 * 1024, "Fichier audio trop volumineux (max 15MB)"),
  mimeType: z.string().max(50).optional()
});

export const ExportBookSchema = z.object({
  book: z.object({
    id: z.string().optional(),
    title: z.string().min(1, "Le titre du livre est requis").max(250),
    subtitle: z.string().max(300).optional(),
    author: z.string().max(100).optional(),
    chapters: z.array(z.any()).optional(),
    cover: z.any().optional()
  }),
  options: z.object({
    format: z.enum(['pdf', 'epub', 'docx', 'txt', 'markdown', 'html']),
    includeCover: z.boolean().optional(),
    includeTOC: z.boolean().optional(),
    includePageNumbers: z.boolean().optional(),
    fontFamily: z.string().optional(),
    pageSize: z.string().optional()
  }).optional()
});
