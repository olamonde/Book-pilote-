import { Plan, User, ExportFormat } from '../../src/types/index.ts';

export interface ServerPlanRules {
  name: string;
  maxBooks: number | 'unlimited';
  aiGenerationsLimit: number;
  allowedExports: ExportFormat[];
  mockups3D: boolean;
  aiCopilot: boolean;
  priorityGeneration: boolean;
  commercialUsage: boolean;
  noBranding: boolean;
  batchGenerationAllowed: boolean;
}

export const SERVER_PLANS: Record<Plan, ServerPlanRules> = {
  free: {
    name: 'Free',
    maxBooks: 1,
    aiGenerationsLimit: 5,
    allowedExports: ['pdf', 'txt'],
    mockups3D: false,
    aiCopilot: false,
    priorityGeneration: false,
    commercialUsage: false,
    noBranding: false,
    batchGenerationAllowed: false
  },
  creator: {
    name: 'Creator',
    maxBooks: 'unlimited',
    aiGenerationsLimit: 50,
    allowedExports: ['pdf', 'epub', 'docx', 'txt', 'markdown'],
    mockups3D: true,
    aiCopilot: true,
    priorityGeneration: false,
    commercialUsage: false,
    noBranding: true,
    batchGenerationAllowed: true
  },
  pro: {
    name: 'Pro',
    maxBooks: 'unlimited',
    aiGenerationsLimit: 200,
    allowedExports: ['pdf', 'epub', 'docx', 'txt', 'markdown', 'html'],
    mockups3D: true,
    aiCopilot: true,
    priorityGeneration: true,
    commercialUsage: true,
    noBranding: true,
    batchGenerationAllowed: true
  }
};

export class AuthorizationService {
  /**
   * Get server-side plan rules for a user
   */
  static getPlanRules(user: User): ServerPlanRules {
    const plan = user.plan || 'free';
    return SERVER_PLANS[plan] || SERVER_PLANS.free;
  }

  /**
   * Verify if a user is allowed to perform export format
   */
  static isExportFormatAllowed(user: User, format: ExportFormat): boolean {
    const rules = this.getPlanRules(user);
    return rules.allowedExports.includes(format);
  }

  /**
   * Check if Copilot text transformation is allowed for user plan
   */
  static isCopilotAllowed(user: User): boolean {
    const rules = this.getPlanRules(user);
    return rules.aiCopilot;
  }

  /**
   * Check if 3D mockups generation is allowed
   */
  static isMockupsAllowed(user: User): boolean {
    const rules = this.getPlanRules(user);
    return rules.mockups3D;
  }

  /**
   * Check if user is allowed to batch-generate chapters
   */
  static isBatchGenerationAllowed(user: User): boolean {
    const rules = this.getPlanRules(user);
    return rules.batchGenerationAllowed;
  }
}
