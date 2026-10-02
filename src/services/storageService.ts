import { Book, Plan, PlanLimits, User, Chapter, CoverConfig, ExportRecord } from '../types';

const STORAGE_KEYS = {
  USER: 'bookpilot_user',
  BOOKS: 'bookpilot_books',
  ACTIVE_BOOK_ID: 'bookpilot_active_book_id',
  THEME: 'bookpilot_theme'
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    maxBooks: 1,
    aiGenerationsLimit: 5,
    allowedExports: ['pdf', 'txt'],
    mockups3D: false,
    aiCopilot: false,
    priorityGeneration: false,
    commercialUsage: false,
    noBranding: false,
    support: 'community'
  },
  creator: {
    name: 'Creator',
    priceMonthly: 12,
    priceYearly: 115, // ~20% off
    maxBooks: 'unlimited',
    aiGenerationsLimit: 50,
    allowedExports: ['pdf', 'epub', 'docx', 'txt', 'markdown'],
    mockups3D: true,
    aiCopilot: true,
    priorityGeneration: false,
    commercialUsage: false,
    noBranding: true,
    support: 'standard'
  },
  pro: {
    name: 'Pro',
    priceMonthly: 29,
    priceYearly: 278, // ~20% off
    maxBooks: 'unlimited',
    aiGenerationsLimit: 200,
    allowedExports: ['pdf', 'epub', 'docx', 'txt', 'markdown'],
    mockups3D: true,
    aiCopilot: true,
    priorityGeneration: true,
    commercialUsage: true,
    noBranding: true,
    support: 'priority'
  }
};

export class StorageService {
  /**
   * @deprecated Identity and authentication are now handled server-side via AuthService and /api/auth.
   * Kept only for backward compatibility with local mocks or fallback.
   */
  static findOrCreateUser(email: string, name?: string): User {
    const cleanEmail = email.toLowerCase().trim();
    const stableId = `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('bookpilot_registered_users') : null;
      const registry: Record<string, User> = raw ? JSON.parse(raw) : {};
      if (registry[cleanEmail]) {
        return registry[cleanEmail];
      }
      const newUser: User = {
        id: stableId,
        name: name?.trim() || cleanEmail.split('@')[0] || 'Auteur',
        email: cleanEmail,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        plan: 'free',
        billingCycle: 'monthly',
        aiGenerationsUsed: 0,
        aiGenerationsLimit: 5,
        createdAt: new Date().toISOString(),
        hasCompletedOnboarding: false
      };
      registry[cleanEmail] = newUser;
      if (typeof window !== 'undefined') {
        localStorage.setItem('bookpilot_registered_users', JSON.stringify(registry));
      }
      return newUser;
    } catch {
      return {
        id: stableId,
        name: name?.trim() || cleanEmail.split('@')[0] || 'Auteur',
        email: cleanEmail,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        plan: 'free',
        billingCycle: 'monthly',
        aiGenerationsUsed: 0,
        aiGenerationsLimit: 5,
        createdAt: new Date().toISOString(),
        hasCompletedOnboarding: false
      };
    }
  }

  static getUser(): User {
    const current = this.getCurrentUser();
    if (current) return current;
    return {
      id: 'guest',
      name: 'Utilisateur',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      plan: 'free',
      billingCycle: 'monthly',
      aiGenerationsUsed: 0,
      aiGenerationsLimit: 5,
      createdAt: new Date().toISOString(),
      hasCompletedOnboarding: false
    };
  }

  static getCurrentUser(): User | null {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('bookpilot_logged_out') === 'true') {
        return null;
      }
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.USER) : null;
      if (stored && stored !== 'null' && stored !== 'undefined') {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id === 'user-demo-1') {
          // Purge legacy demo user
          localStorage.removeItem(STORAGE_KEYS.USER);
          return null;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    // Return null if not explicitly logged in or if logged out
    return null;
  }

  static setCurrentUser(user: User | null): void {
    try {
      if (typeof window === 'undefined') return;
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.removeItem('bookpilot_logged_out');
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.setItem('bookpilot_logged_out', 'true');
      }
    } catch {
      // ignore
    }
  }

  static saveUser(user: User): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      if (user.email) {
        const raw = localStorage.getItem('bookpilot_registered_users');
        const registry: Record<string, User> = raw ? JSON.parse(raw) : {};
        registry[user.email.toLowerCase().trim()] = user;
        localStorage.setItem('bookpilot_registered_users', JSON.stringify(registry));
      }
    } catch {
      // ignore
    }
  }

  /**
   * @deprecated Server-side PostgreSQL is the source of truth for AI quota consumption.
   * This is kept as a local mirror for visual counter feedback until next server sync.
   */
  static incrementAiGenerations(userId?: string): User {
    const user = this.getUser();
    user.aiGenerationsUsed = Math.min(user.aiGenerationsLimit, (user.aiGenerationsUsed || 0) + 1);
    this.saveUser(user);
    return user;
  }

  static getAllRawBooks(): Book[] {
    try {
      if (typeof window === 'undefined') return [];
      const stored = localStorage.getItem(STORAGE_KEYS.BOOKS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Strictly purge legacy demo/mock books
          const cleaned = parsed.filter((b) =>
            b &&
            !b.id?.startsWith('demo-') &&
            b.userId !== 'user-demo-1' &&
            b.title !== 'The Future of Remote Work' &&
            b.title !== 'Atomic Focus Protocol'
          );
          if (cleaned.length !== parsed.length) {
            this.saveBooks(cleaned);
          }
          return cleaned;
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  static getBooks(userId?: string): Book[] {
    const all = this.getAllRawBooks();
    const targetUserId = userId || this.getCurrentUser()?.id;
    if (!targetUserId) {
      return [];
    }
    // Strict isolation: only return projects belonging to this user
    return all.filter((b) => b.userId === targetUserId);
  }

  static saveBooks(books: Book[]): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    } catch {
      // ignore
    }
  }

  static getBookById(id: string, userId?: string): Book | undefined {
    const targetUserId = userId || this.getCurrentUser()?.id;
    const all = this.getAllRawBooks();
    return all.find((b) => b.id === id && (!targetUserId || b.userId === targetUserId));
  }

  static saveBook(book: Book, userId?: string): Book[] {
    const targetUserId = userId || book.userId || this.getCurrentUser()?.id || 'anonymous';
    const all = this.getAllRawBooks();
    const index = all.findIndex((b) => b.id === book.id);
    const updated: Book = {
      ...book,
      userId: targetUserId,
      updatedAt: new Date().toISOString(),
      wordCount: (book.chapters || []).reduce((acc, c) => acc + (c.wordCount || 0), 0)
    };

    if (index >= 0) {
      all[index] = updated;
    } else {
      all.unshift(updated);
    }
    this.saveBooks(all);
    return this.getBooks(targetUserId);
  }

  static deleteBook(id: string, userId?: string): Book[] {
    const targetUserId = userId || this.getCurrentUser()?.id;
    const all = this.getAllRawBooks().filter((b) => b.id !== id);
    this.saveBooks(all);
    return this.getBooks(targetUserId);
  }

  static duplicateBook(id: string, userId?: string): Book | undefined {
    const targetUserId = userId || this.getCurrentUser()?.id || 'anonymous';
    const original = this.getBookById(id, targetUserId);
    if (!original) return undefined;

    const copy: Book = {
      ...original,
      id: `book-${Date.now()}`,
      userId: targetUserId,
      title: `${original.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      chapters: (original.chapters || []).map((c) => ({
        ...c,
        id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      })),
      exportHistory: []
    };

    this.saveBook(copy, targetUserId);
    return copy;
  }

  static renameBook(id: string, newTitle: string, userId?: string): void {
    const book = this.getBookById(id, userId);
    if (book) {
      book.title = newTitle;
      book.cover.title = newTitle;
      this.saveBook(book, userId);
    }
  }

  static recordExport(bookId: string, format: ExportRecord['format'], fileSize: string): void {
    const book = this.getBookById(bookId);
    if (!book) return;
    const record: ExportRecord = {
      id: `exp-${Date.now()}`,
      format,
      timestamp: new Date().toISOString(),
      fileSize
    };
    book.exportHistory = [record, ...(book.exportHistory || [])];
    this.saveBook(book);
  }

  /**
   * @deprecated Server-side PostgreSQL is the source of truth for AI quota consumption.
   */
  static canConsumeAiGeneration(): boolean {
    const user = this.getUser();
    return (user.aiGenerationsUsed || 0) < user.aiGenerationsLimit;
  }

  /**
   * @deprecated Server-side PostgreSQL QuotaService handles actual consumption.
   */
  static consumeAiGeneration(): boolean {
    const user = this.getUser();
    if (user.aiGenerationsUsed >= user.aiGenerationsLimit) {
      return false; // Limit reached
    }
    user.aiGenerationsUsed += 1;
    this.saveUser(user);
    return true;
  }

  /**
   * @deprecated Server-side PostgreSQL QuotaService handles refunds.
   */
  static refundAiGeneration(): User {
    const user = this.getUser();
    user.aiGenerationsUsed = Math.max(0, (user.aiGenerationsUsed || 0) - 1);
    this.saveUser(user);
    return user;
  }

  /**
   * @deprecated Server plan in PostgreSQL is authoritative. Client cannot grant itself paid privileges.
   */
  static upgradePlan(plan: Plan, cycle: 'monthly' | 'yearly'): User {
    const user = this.getUser();
    const limits = PLAN_LIMITS[plan];
    user.plan = plan;
    user.billingCycle = cycle;
    user.aiGenerationsLimit = limits.aiGenerationsLimit;
    this.saveUser(user);
    return user;
  }
}
