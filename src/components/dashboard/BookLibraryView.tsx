import React, { useState } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  FileEdit,
  Copy,
  Trash2,
  Download,
  Calendar,
  BookOpen
} from 'lucide-react';
import { Book } from '../../types';
import { CoverRenderer } from '../cover/CoverRenderer';
import { useTranslation } from '../../i18n';

interface BookLibraryViewProps {
  books: Book[];
  initialFilter?: 'all' | 'drafts' | 'completed';
  onCreateNewBook: () => void;
  onOpenBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onDuplicateBook: (bookId: string) => void;
  onRenameBook: (bookId: string) => void;
  onExportBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
}

export const BookLibraryView: React.FC<BookLibraryViewProps> = ({
  books,
  initialFilter = 'all',
  onCreateNewBook,
  onOpenBook,
  onEditBook,
  onDuplicateBook,
  onRenameBook,
  onExportBook,
  onDeleteBook
}) => {
  const { t, formatDate } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'drafts' | 'completed'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'words' | 'title'>('updated');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter and search
  const filteredBooks = books
    .filter((b) => {
      if (filter === 'drafts') return b.status === 'draft';
      if (filter === 'completed') return b.status === 'completed';
      return true;
    })
    .filter((b) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
        b.author.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'words') return b.wordCount - a.wordCount;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

  const getFilterLabel = (f: 'all' | 'drafts' | 'completed') => {
    if (f === 'all') return `${t('common.all')} (${books.length})`;
    if (f === 'drafts') return t('common.draft');
    return t('common.completed');
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
            {t('library.title')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('library.subtitle')}
          </p>
        </div>

        <button
          onClick={onCreateNewBook}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('library.createNew')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'drafts', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition whitespace-nowrap ${
                filter === f
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {getFilterLabel(f)}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('library.searchPlaceholder')}
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-purple-500"
          >
            <option value="updated">{t('library.sortNewest')}</option>
            <option value="words">{t('library.sortWords')}</option>
            <option value="title">{t('library.sortTitle')}</option>
          </select>
        </div>
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-2xl border border-dashed border-white/10 bg-slate-900/20">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">{t('dashboard.emptyTitle')}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery
              ? t('library.noMatch')
              : t('dashboard.emptySubtitle')}
          </p>
          <button
            onClick={onCreateNewBook}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-medium text-xs transition"
          >
            {t('library.createNew')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const formattedDate = formatDate(book.updatedAt || book.createdAt);

            return (
              <div
                key={book.id}
                className="relative p-5 rounded-2xl bg-slate-900/40 border border-white/10 hover:border-purple-500/40 transition-all duration-300 shadow-xl group flex flex-col justify-between"
              >
                <div className="flex gap-4">
                  <div
                    onClick={() => onOpenBook(book)}
                    className="cursor-pointer shrink-0 transform group-hover:scale-[1.03] transition-transform duration-300"
                  >
                    <CoverRenderer cover={book.cover} size="sm" />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-semibold tracking-wider ${
                            book.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {book.status === 'completed' ? t('common.completed') : t('common.draft')}
                        </span>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === book.id ? null : book.id)
                            }
                            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === book.id && (
                            <div className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-950 border border-white/15 shadow-2xl p-1.5 z-30 animate-in fade-in duration-100 text-xs">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEditBook(book);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition text-left"
                              >
                                <FileEdit className="w-3.5 h-3.5" />
                                <span>{t('dashboard.bookMenu.openEditor')}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDuplicateBook(book.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition text-left"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{t('dashboard.bookMenu.duplicate')}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onRenameBook(book.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition text-left"
                              >
                                <FileEdit className="w-3.5 h-3.5" />
                                <span>{t('dashboard.bookMenu.rename')}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onExportBook(book);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition text-left"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{t('dashboard.bookMenu.exportBook')}</span>
                              </button>
                              <div className="my-1 border-t border-white/10" />
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDeleteBook(book.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition text-left"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t('dashboard.bookMenu.delete')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h3
                        onClick={() => onOpenBook(book)}
                        className="text-sm font-bold text-white line-clamp-1 group-hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        {book.title}
                      </h3>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                        {book.subtitle || book.description}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono space-y-0.5 mt-2">
                      <p>{book.chapters.length} {t('common.chapters')} • {book.wordCount} {t('common.words')}</p>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => onEditBook(book)}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-purple-600/20 text-purple-300 hover:text-white border border-white/10 hover:border-purple-500/40 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>{t('dashboard.bookMenu.openEditor')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
