import { eq, and, desc } from 'drizzle-orm';
import { db, isPostgresConfigured } from '../db/index.ts';
import { books as booksTable, BookRow } from '../db/schema.ts';
import { Book } from '../../src/types/index.ts';

export interface IBookRepository {
  createBook(book: Book, userId: string): Promise<Book>;
  getBookById(bookId: string, userId: string): Promise<Book | null>;
  getBooksByUserId(userId: string): Promise<Book[]>;
  updateBook(book: Book, userId: string): Promise<Book | null>;
  deleteBook(bookId: string, userId: string): Promise<boolean>;
}

function mapBookRowToBook(row: BookRow): Book {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    subtitle: row.subtitle || '',
    description: row.description || '',
    author: row.author || '',
    language: row.language || 'Français',
    genre: row.genre || 'Guide Pratique',
    tone: row.tone || 'Inspirant & Professionnel',
    targetAudience: row.targetAudience || 'Tout public',
    status: row.status as 'draft' | 'generating' | 'completed' | 'archived',
    cover: row.cover,
    chapters: row.chapters || [],
    wordCount: row.wordCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    settings: (row as any).settings || {
      bookSize: 'standard-ebook',
      font: 'sans',
      theme: 'cream',
      margins: 'normal',
      headerFooter: true,
      pageNumbers: true,
      dropCaps: false
    },
    exportHistory: (row as any).exportHistory || []
  };
}

export class PostgresBookRepository implements IBookRepository {
  /**
   * Create a new book strictly tied to authenticated userId
   */
  async createBook(book: Book, userId: string): Promise<Book> {
    if (!db) throw new Error('Database is not initialized');
    const now = new Date();
    const effectiveCover = book.cover || {
      title: book.title,
      subtitle: book.subtitle || '',
      author: book.author || '',
      style: 'minimal',
      primaryColor: '#0f172a',
      secondaryColor: '#3b82f6',
      accentColor: '#60a5fa',
      pattern: 'geometric',
      fontFamily: 'sans',
      textColor: '#ffffff'
    };

    await db.insert(booksTable).values({
      id: book.id,
      userId,
      title: book.title,
      subtitle: book.subtitle || '',
      description: book.description || '',
      author: book.author || '',
      language: book.language || 'Français',
      genre: book.genre || 'Guide Pratique',
      tone: book.tone || 'Inspirant & Professionnel',
      targetAudience: book.targetAudience || 'Tout public',
      status: book.status || 'draft',
      cover: effectiveCover,
      chapters: book.chapters || [],
      wordCount: book.wordCount || 0,
      createdAt: book.createdAt ? new Date(book.createdAt) : now,
      updatedAt: now
    });

    return {
      ...book,
      cover: effectiveCover,
      userId,
      updatedAt: now.toISOString()
    };
  }

  /**
   * Get single book ensuring ownership: WHERE id = bookId AND user_id = authenticatedUserId
   */
  async getBookById(bookId: string, userId: string): Promise<Book | null> {
    if (!db) return null;
    const rows = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId)))
      .limit(1);

    if (!rows.length) return null;
    return mapBookRowToBook(rows[0]);
  }

  /**
   * Get all books for authenticated user ordered by recent update
   */
  async getBooksByUserId(userId: string): Promise<Book[]> {
    if (!db) return [];
    const rows = await db
      .select()
      .from(booksTable)
      .where(eq(booksTable.userId, userId))
      .orderBy(desc(booksTable.updatedAt));

    return rows.map(mapBookRowToBook);
  }

  /**
   * Update book strictly scoped by id AND userId
   */
  async updateBook(book: Book, userId: string): Promise<Book | null> {
    if (!db) return null;
    const now = new Date();

    const updateValues: any = {
      title: book.title,
      subtitle: book.subtitle || '',
      description: book.description || '',
      author: book.author || '',
      language: book.language || 'Français',
      genre: book.genre || 'Guide Pratique',
      tone: book.tone || 'Inspirant & Professionnel',
      targetAudience: book.targetAudience || 'Tout public',
      status: book.status || 'draft',
      chapters: book.chapters || [],
      wordCount: book.wordCount || 0,
      updatedAt: now
    };

    if (book.cover) {
      updateValues.cover = book.cover;
    }

    const rows = await db
      .update(booksTable)
      .set(updateValues)
      .where(and(eq(booksTable.id, book.id), eq(booksTable.userId, userId)))
      .returning();

    if (!rows.length) return null;
    return mapBookRowToBook(rows[0]);
  }

  /**
   * Delete book strictly scoped by id AND userId
   */
  async deleteBook(bookId: string, userId: string): Promise<boolean> {
    if (!db) return false;
    const deleted = await db
      .delete(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId)))
      .returning({ id: booksTable.id });

    return deleted.length > 0;
  }
}

export const bookRepository: IBookRepository = new PostgresBookRepository();
