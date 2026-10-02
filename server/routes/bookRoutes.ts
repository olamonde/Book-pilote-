import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { bookRepository } from '../repositories/bookRepository.ts';
import { Book } from '../../src/types/index.ts';

export const bookRouter = Router();

// All book management routes strictly require authentication
bookRouter.use(requireAuth);

/**
 * GET /api/books
 * Retrieve all books belonging strictly to the authenticated user
 */
bookRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userBooks = await bookRepository.getBooksByUserId(userId);
    return res.json({
      success: true,
      books: userBooks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/books/:id
 * Retrieve a single book ensuring ownership: WHERE id = :id AND user_id = req.user.id
 */
bookRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const bookId = req.params.id;
    const book = await bookRepository.getBookById(bookId, userId);

    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'BOOK_NOT_FOUND',
        message: 'Livre introuvable ou vous ne disposez pas des droits pour y accéder.'
      });
    }

    return res.json({
      success: true,
      book
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/books
 * Save or create a book ensuring ownership: book.userId = req.user.id
 */
bookRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const rawBook: Book = req.body;

    if (!rawBook || !rawBook.title) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Le livre doit avoir un titre.'
      });
    }

    const bookToSave: Book = {
      ...rawBook,
      id: rawBook.id || `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId // STRICT: override client userId with verified session userId
    };

    const existing = await bookRepository.getBookById(bookToSave.id, userId);
    let savedBook: Book;

    if (existing) {
      savedBook = (await bookRepository.updateBook(bookToSave, userId)) || bookToSave;
    } else {
      savedBook = await bookRepository.createBook(bookToSave, userId);
    }

    return res.json({
      success: true,
      book: savedBook
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/books/:id
 * Delete book ensuring ownership: WHERE id = :id AND user_id = req.user.id
 */
bookRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const bookId = req.params.id;
    const deleted = await bookRepository.deleteBook(bookId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'BOOK_NOT_FOUND',
        message: 'Livre introuvable ou vous ne disposez pas des droits pour le supprimer.'
      });
    }

    return res.json({
      success: true,
      message: 'Projet de livre supprimé avec succès.'
    });
  } catch (err) {
    next(err);
  }
});
