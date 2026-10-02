export type Plan = 'free' | 'creator' | 'pro';

export interface PlanLimits {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxBooks: number | 'unlimited';
  aiGenerationsLimit: number;
  allowedExports: ('pdf' | 'epub' | 'docx' | 'txt' | 'markdown')[];
  mockups3D: boolean;
  aiCopilot: boolean;
  priorityGeneration: boolean;
  commercialUsage: boolean;
  noBranding: boolean;
  support: 'community' | 'standard' | 'priority';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
  aiGenerationsUsed: number;
  aiGenerationsLimit: number;
  createdAt: string;
  hasCompletedOnboarding: boolean;
  nextBillingDate?: string;
  interfaceLanguage?: 'fr' | 'en' | 'es' | 'pt';
  defaultContentLanguage?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
    expiry: string;
  };
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  content: string;
  status: 'ready' | 'generating' | 'failed' | 'empty';
  wordCount: number;
  summary?: string;
}

export type CoverStyle = 
  | 'minimal' 
  | 'luxury' 
  | 'business' 
  | 'modern' 
  | 'editorial' 
  | 'fiction' 
  | 'fantasy' 
  | 'sci-fi' 
  | 'romance' 
  | 'educational' 
  | 'technology' 
  | 'cinematic';

export interface CoverChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isGenerating?: boolean;
  versionCreated?: number;
  intent?: 'chat' | 'generate' | 'restore_version';
}

export interface CoverVisualState {
  initialPrompt: string;
  currentDescription: string;
  elementsToKeep: string[];
  elementsToModify: string[];
  elementsToAvoid: string[];
  historySummaries: string[];
}

export interface CoverVersionItem {
  id: string;
  versionNumber: number;
  label: string;
  description: string;
  cover: CoverConfig;
  visualState: CoverVisualState;
  createdAt: string;
}

export interface CoverConfig {
  title: string;
  subtitle: string;
  author: string;
  style: CoverStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pattern: 'geometric' | 'waves' | 'lines' | 'radial' | 'minimal' | 'stars' | 'cubes' | 'abstract';
  fontFamily: 'serif' | 'sans' | 'cinzel' | 'modern';
  textColor: string;
  customPrompt?: string;
  imageUrl?: string;
  conversationHistory?: CoverChatMessage[];
  visualState?: CoverVisualState;
  versions?: CoverVersionItem[];
  currentVersionIndex?: number;
  isArtworkOnly?: boolean;
  showTextOverlay?: boolean;
  displayMode?: 'cover' | 'artwork';
  detectedStyle?: string;
  aspectRatio?: '1:1' | '3:4' | '16:9' | 'square' | 'portrait' | 'landscape';
  explicitStyle?: string;
}

export interface BookSettings {
  bookSize: 'A5' | '6x9' | 'standard-ebook' | 'trade-paperback';
  font: 'serif' | 'sans' | 'cinzel' | 'classic';
  theme: 'dark' | 'cream' | 'white' | 'sepia';
  margins: 'normal' | 'compact' | 'wide';
  headerFooter: boolean;
  pageNumbers: boolean;
  dropCaps: boolean;
}

export type ExportFormat = 'pdf' | 'epub' | 'docx' | 'txt' | 'markdown' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  includeCover: boolean;
  includeTOC: boolean;
  includePageNumbers: boolean;
  fontFamily: 'serif' | 'sans' | 'mono';
  pageSize: 'A4' | '6x9' | 'letter';
}

export interface ExportRecord {
  id: string;
  format: ExportFormat;
  timestamp: string;
  fileSize: string;
}

export interface Book {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  description: string;
  author: string;
  language: string;
  genre: string;
  tone: string;
  targetAudience: string;
  status: 'draft' | 'generating' | 'completed' | 'archived';
  cover: CoverConfig;
  chapters: Chapter[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  settings: BookSettings;
  generationSettings?: {
    prompt: string;
    length: 'short' | 'medium' | 'long' | 'custom';
    bookType: string;
    writingStyle?: string;
  };
  exportHistory: ExportRecord[];
}

export type MockupMode = 
  | 'standing' 
  | 'perspective' 
  | 'desk' 
  | 'floating' 
  | 'mobile' 
  | 'tablet';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
}

export type ViewRoute = 
  | 'landing' 
  | 'pricing' 
  | 'login' 
  | 'signup' 
  | 'forgot-password'
  | 'dashboard' 
  | 'create' 
  | 'generate' 
  | 'books' 
  | 'book-detail' 
  | 'editor' 
  | 'cover' 
  | 'mockups'
  | 'preview' 
  | 'export'
  | 'settings' 
  | 'billing' 
  | 'privacy' 
  | 'terms' 
  | 'cookies' 
  | 'refund' 
  | 'faq';
