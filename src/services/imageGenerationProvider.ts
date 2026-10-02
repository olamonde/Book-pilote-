import { buildNeutralImagePrompt } from './imagePromptService';

/**
 * ============================================================================
 * BOOK PILOT — ARCHITECTURE DE DÉCOUPLAGE DES FOURNISSEURS D'IA
 * ============================================================================
 * 
 * Séparation stricte et pérenne entre :
 * 1. TEXT_GENERATION_PROVIDER : Google Gemini
 *    - Reste 100% actif et inchangé pour : génération de livres, chapitres,
 *      résumés, copilote éditorial et assistant conversationnel.
 * 
 * 2. IMAGE_GENERATION_PROVIDER : Gemini Nano Banana (Futur Fournisseur Officiel)
 *    - Architecture préparée pour recevoir ultérieurement l'API Gemini Nano Banana.
 *    - ÉTAT ACTUEL : En attente de connexion (isApiConnected: false).
 *    - RÈGLES STRICTES :
 *      * Zéro appel à un service externe tiers.
 *      * Zéro demande de clé API ou de facturation pour cette étape.
 *      * Gestion propre de l'état non connecté pour l'utilisateur.
 */

// Fournisseurs officiels de la plateforme
export const TEXT_GENERATION_PROVIDER = 'gemini' as const;
export const IMAGE_GENERATION_PROVIDER = 'gemini-nano-banana' as const;

// Configuration centralisée du fournisseur d'images
export const IMAGE_PROVIDER: 'gemini-nano-banana' = 'gemini-nano-banana';

export interface GeminiNanoBananaConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  isCustomKey?: boolean;
}

export const IMAGE_PROVIDER_CONFIG = {
  provider: IMAGE_GENERATION_PROVIDER,
  modelName: 'gemini-nano-banana',
  displayName: 'Gemini Nano Banana',
  
  // ÉTAT DE CONNEXION : Préparé mais NON encore connecté à l'API réelle
  isApiConnected: false,
  
  // RÈGLES DE SÉCURITÉ ET FOURNISSEURS
  allowExternalThirdPartyProviders: false,
  allowPaidModelsWithoutExplicitSetup: false,

  // PRÉPARATION DES FUTURS ABONNEMENTS (Paliers d'accès selon le plan)
  // Prêt pour filtrer ultérieurement l'accès à Gemini Nano Banana par formule
  tierPolicy: {
    free: {
      canGenerate: false,
      quotaPerMonth: 0,
      label: 'Accès Gemini Nano Banana non inclus (Réservé aux offres Premium)'
    },
    creator: {
      canGenerate: true,
      quotaPerMonth: 30,
      label: 'Accès Créateur Gemini Nano Banana'
    },
    pro: {
      canGenerate: true,
      quotaPerMonth: 100,
      label: 'Accès Illimité Gemini Nano Banana'
    }
  }
} as const;

export interface ImageGenerationParams {
  prompt: string;
  style?: string;
  format?: 'square' | 'portrait' | 'landscape' | '1:1' | '3:4' | '16:9';
  mode?: 'image' | 'cover';
  userPlan?: 'free' | 'creator' | 'pro' | string;
  bookContext?: {
    title?: string;
    subtitle?: string;
    author?: string;
    genre?: string;
    tone?: string;
    description?: string;
    targetAudience?: string;
  };
}

export interface ImageGenerationSuccess {
  imageUrl: string;
  engineUsed: string;
  provider: string;
  model: string;
  finalPromptSent: string;
  detectedStyle: string;
  styleLabel: string;
  isArtworkOnly: boolean;
  aspectRatio: '1:1' | '3:4' | '16:9';
}

/**
 * Vérification de l'éligibilité du plan utilisateur pour la future politique d'abonnements.
 * Permet de contrôler l'accès sans modifier le système de paiement existant.
 */
export function checkPlanImageAccess(userPlan?: string): {
  allowed: boolean;
  message?: string;
} {
  const planKey = (userPlan || 'free').toLowerCase() as keyof typeof IMAGE_PROVIDER_CONFIG.tierPolicy;
  const policy = IMAGE_PROVIDER_CONFIG.tierPolicy[planKey];

  if (!policy) {
    return { allowed: false, message: 'Plan utilisateur non reconnu.' };
  }

  return {
    allowed: policy.canGenerate,
    message: policy.label
  };
}

/**
 * Point d'intégration futur pour brancher la configuration API de Gemini Nano Banana.
 * Sera utilisé dès que les accès officiels seront fournis, sans devoir reconstruire Book Pilot.
 */
let runtimeNanoBananaConfig: GeminiNanoBananaConfig | null = null;

export function configureGeminiNanoBanana(config: GeminiNanoBananaConfig): void {
  runtimeNanoBananaConfig = { ...config };
  console.log('[Image Architecture] Configuration Gemini Nano Banana enregistrée pour future activation.');
}

/**
 * Exécute la logique de génération d'image de Book Pilot.
 * 
 * En l'état actuel :
 * - L'API Gemini Nano Banana n'étant pas encore connectée (isApiConnected: false),
 *   cette fonction ne lance aucun appel réel et ne consulte aucun service tiers.
 * - Elle retourne un statut propre et explicite informant l'utilisateur.
 */
export async function executeImageGeneration(
  params: ImageGenerationParams
): Promise<ImageGenerationSuccess> {
  const userPrompt = (params.prompt || '').trim();
  const explicitStyle = (params.style || '').trim();
  const format = params.format || 'portrait';
  const mode = params.mode || 'image';

  // Préparation du prompt neutre respectant l'intention éditoriale de l'auteur
  const built = buildNeutralImagePrompt({
    userPrompt,
    explicitStyle: explicitStyle || undefined,
    format,
    mode,
    bookContext: params.bookContext
  });

  console.log(`[Image Provider: ${IMAGE_PROVIDER}] Requête reçue : "${userPrompt}"`);
  console.log(`[Image Provider: ${IMAGE_PROVIDER}] Style : ${built.detectedStyle} (${built.styleLabel})`);
  console.log(`[Image Provider: ${IMAGE_PROVIDER}] Statut fournisseur : En attente de connexion API.`);

  // 1. Contrôle de l'état de connexion de l'API Gemini Nano Banana
  if (!IMAGE_PROVIDER_CONFIG.isApiConnected && !runtimeNanoBananaConfig?.apiKey) {
    const notConnectedMsg = "Gemini Nano Banana n'est pas encore connecté. La génération d'images sera disponible dès que le fournisseur sera configuré.";
    const errorObj = new Error(notConnectedMsg);
    (errorObj as any).status = 503;
    (errorObj as any).code = 'GEMINI_NANO_BANANA_NOT_CONNECTED';
    (errorObj as any).provider = IMAGE_PROVIDER;
    (errorObj as any).model = IMAGE_PROVIDER_CONFIG.modelName;
    throw errorObj;
  }

  // 2. Futur point d'exécution réel (lorsque runtimeNanoBananaConfig sera branché)
  // AUCUN appel n'est effectué ici tant que la connexion n'est pas officialisée.
  throw new Error("L'intégration active de Gemini Nano Banana est en cours de déploiement.");
}
