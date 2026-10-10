import { Book } from '../types';

export class BookApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = 'BookApiError';
    this.status = status;
    this.code = code;
  }
}

export class BookService {
  /**
   * Fetch all books belonging to the authenticated user from PostgreSQL / Neon
   */
  static async getBooks(): Promise<Book[]> {
    const res = await fetch('/api/books', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    });

    if (!res.ok) {
      let errorMsg = 'Impossible de récupérer vos livres depuis le serveur.';
      let errorCode = 'FETCH_FAILED';
      try {
        const data = await res.json();
        if (data?.message) errorMsg = data.message;
        if (data?.error) errorCode = data.error;
      } catch {
        // ignore parse error
      }
      throw new BookApiError(errorMsg, res.status, errorCode);
    }

    const data = await res.json();
    return Array.isArray(data.books) ? data.books : [];
  }

  /**
   * Fetch a single book by ID strictly owned by the authenticated user
   */
  static async getBook(id: string): Promise<Book> {
    const res = await fetch(`/api/books/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    });

    if (!res.ok) {
      let errorMsg = 'Livre introuvable ou accès refusé.';
      let errorCode = 'BOOK_NOT_FOUND';
      try {
        const data = await res.json();
        if (data?.message) errorMsg = data.message;
        if (data?.error) errorCode = data.error;
      } catch {
        // ignore
      }
      throw new BookApiError(errorMsg, res.status, errorCode);
    }

    const data = await res.json();
    if (!data.book) {
      throw new BookApiError('Réponse serveur invalide.', 500, 'INVALID_RESPONSE');
    }
    return data.book;
  }

  /**
   * Create a new book persisted in PostgreSQL / Neon
   */
  static async createBook(book: Partial<Book>): Promise<Book> {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(book)
    });

    if (!res.ok) {
      let errorMsg = 'Impossible de créer le livre sur le serveur.';
      let errorCode = 'CREATE_FAILED';
      try {
        const data = await res.json();
        if (data?.message) errorMsg = data.message;
        if (data?.error) errorCode = data.error;
      } catch {
        // ignore
      }
      throw new BookApiError(errorMsg, res.status, errorCode);
    }

    const data = await res.json();
    if (!data.book) {
      throw new BookApiError('Le serveur n\'a pas retourné le livre créé.', 500, 'INVALID_RESPONSE');
    }
    return data.book;
  }

  /**
   * Update an existing book in PostgreSQL / Neon
   */
  static async updateBook(id: string, updates: Partial<Book>): Promise<Book> {
    const res = await fetch(`/api/books/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      let errorMsg = 'Impossible de mettre à jour le livre sur le serveur.';
      let errorCode = 'UPDATE_FAILED';
      try {
        const data = await res.json();
        if (data?.message) errorMsg = data.message;
        if (data?.error) errorCode = data.error;
      } catch {
        // ignore
      }
      throw new BookApiError(errorMsg, res.status, errorCode);
    }

    const data = await res.json();
    if (!data.book) {
      throw new BookApiError('Le serveur n\'a pas retourné le livre mis à jour.', 500, 'INVALID_RESPONSE');
    }
    return data.book;
  }

  /**
   * Delete a book from PostgreSQL / Neon
   */
  static async deleteBook(id: string): Promise<boolean> {
    const res = await fetch(`/api/books/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    });

    if (!res.ok) {
      let errorMsg = 'Impossible de supprimer le livre sur le serveur.';
      let errorCode = 'DELETE_FAILED';
      try {
        const data = await res.json();
        if (data?.message) errorMsg = data.message;
        if (data?.error) errorCode = data.error;
      } catch {
        // ignore
      }
      throw new BookApiError(errorMsg, res.status, errorCode);
    }

    return true;
  }

  /**
   * Duplicate a book server-side into PostgreSQL / Neon
   */
  static async duplicateBook(id: string): Promise<Book> {
    const res = await fetch(`/api/books/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    });

    if (!res.ok) {
      let errorMsg = 'Impossible de dupliquer le projet sur le serveur.';
      let errorCode = 'DUPLICATE_FAILED';
      try {
        const data = await res.json();
        if (data?.message) errorMsg = data.message;
        if (data?.error) errorCode = data.error;
      } catch {
        // ignore
      }
      throw new BookApiError(errorMsg, res.status, errorCode);
    }

    const data = await res.json();
    if (!data.book) {
      throw new BookApiError('Le serveur n\'a pas retourné le livre dupliqué.', 500, 'INVALID_RESPONSE');
    }
    return data.book;
  }

  /**
   * Rename a book with atomic server update
   */
  static async renameBook(id: string, newTitle: string, existingCover?: any): Promise<Book> {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      throw new BookApiError('Le titre ne peut pas être vide.', 400, 'VALIDATION_ERROR');
    }

    const updates: Partial<Book> = {
      title: trimmed
    };

    if (existingCover) {
      updates.cover = {
        ...existingCover,
        title: trimmed
      };
    }

    return this.updateBook(id, updates);
  }

  /**
   * Safely migrate any legacy localStorage books to PostgreSQL / Neon.
   * Runs once per user, imports only legitimate books, cleans up localStorage,
   * and prevents duplicates.
   */
  static async migrateLegacyLocalStorageBooks(serverBooks: Book[], userId: string): Promise<Book[]> {
    if (typeof window === 'undefined') return serverBooks;

    const migrationKey = `bookpilot_migrated_v1_${userId}`;
    const alreadyMigrated = localStorage.getItem(migrationKey);
    if (alreadyMigrated === 'true') {
      return serverBooks;
    }

    const rawLegacy = localStorage.getItem('bookpilot_books');
    if (!rawLegacy) {
      localStorage.setItem(migrationKey, 'true');
      return serverBooks;
    }

    try {
      const parsed = JSON.parse(rawLegacy);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(migrationKey, 'true');
        return serverBooks;
      }

      const existingServerIds = new Set(serverBooks.map(b => b.id));
      const existingServerTitles = new Set(serverBooks.map(b => b.title.toLowerCase().trim()));

      // Filter out demo/mock books or other users' books
      const candidates = parsed.filter((b: any) => {
        if (!b || !b.title) return false;
        if (b.id?.startsWith('demo-') || b.userId === 'user-demo-1') return false;
        if (b.title === 'The Future of Remote Work' || b.title === 'Atomic Focus Protocol') return false;
        // Skip if already in server by ID or title
        if (existingServerIds.has(b.id) || existingServerTitles.has(b.title.toLowerCase().trim())) {
          return false;
        }
        // Only accept if belongs to this user or anonymous legacy session
        if (b.userId && b.userId !== userId && b.userId !== 'anonymous' && b.userId !== 'guest') {
          return false;
        }
        return true;
      });

      if (candidates.length === 0) {
        localStorage.setItem(migrationKey, 'true');
        return serverBooks;
      }

      console.info(`[BookService] Migrating ${candidates.length} legacy localStorage books to PostgreSQL for user ${userId}...`);
      const migratedBooks: Book[] = [...serverBooks];

      for (const candidate of candidates) {
        try {
          const payload: Partial<Book> = {
            ...candidate,
            userId // strictly enforce current user
          };
          const saved = await this.createBook(payload);
          migratedBooks.push(saved);
        } catch (err) {
          console.warn(`[BookService] Skipping migration of book "${candidate.title}":`, err);
        }
      }

      // Mark migration as completed so it never runs again
      localStorage.setItem(migrationKey, 'true');
      // Clear legacy storage key so localStorage is never the authority
      localStorage.removeItem('bookpilot_books');

      return migratedBooks;
    } catch (err) {
      console.warn('[BookService] Error parsing legacy books for migration:', err);
      localStorage.setItem(migrationKey, 'true');
      return serverBooks;
    }
  }
}
