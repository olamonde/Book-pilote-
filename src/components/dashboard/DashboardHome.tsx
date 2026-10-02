import React, { useState } from 'react';
import {
  Plus,
  BookOpen,
  FileEdit,
  CheckCircle2,
  Sparkles,
  MoreVertical,
  Copy,
  Trash2,
  Download,
  ArrowRight
} from 'lucide-react';
import { Book, User } from '../../types';
import { CoverRenderer } from '../cover/CoverRenderer';
import { useTranslation } from '../../i18n';

interface DashboardHomeProps {
  user: User;
  books: Book[];
  onCreateNewBook: () => void;
  onOpenBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onDuplicateBook: (bookId: string) => void;
  onRenameBook: (bookId: string) => void;
  onExportBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  user,
  books,
  onCreateNewBook,
  onOpenBook,
  onEditBook,
  onDuplicateBook,
  onRenameBook,
  onExportBook,
  onDeleteBook
}) => {
  const { t, formatDate } = useTranslation();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [quickPrompt, setQuickPrompt] = useState<string>('');

  // Derived Stats
  const totalBooks = books.length;
  const draftBooks = books.filter((b) => b.status === 'draft').length;
  const completedBooks = books.filter((b) => b.status === 'completed').length;
  const remainingGenerations = Math.max(0, user.aiGenerationsLimit - user.aiGenerationsUsed);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user.name ? user.name.split(' ')[0] : 'Author';
    if (hour < 12) return t('dashboard.greeting.morning', { name: firstName });
    if (hour < 18) return t('dashboard.greeting.afternoon', { name: firstName });
    return t('dashboard.greeting.evening', { name: firstName });
  };

  const stats = [
    {
      label: t('dashboard.stats.totalBooks'),
      value: totalBooks,
      sub: t('dashboard.stats.totalBooksSub'),
      icon: BookOpen,
      color: 'text-[#7C3AED]'
    },
    {
      label: t('dashboard.stats.drafts'),
      value: draftBooks,
      sub: t('dashboard.stats.draftsSub'),
      icon: FileEdit,
      color: 'text-[#F59E0B]'
    },
    {
      label: t('dashboard.stats.completed'),
      value: completedBooks,
      sub: t('dashboard.stats.completedSub'),
      icon: CheckCircle2,
      color: 'text-[#10B981]'
    },
    {
      label: t('dashboard.stats.aiQuotas'),
      value: `${remainingGenerations}`,
      sub: t('dashboard.stats.aiQuotasSub', { used: user.aiGenerationsUsed, limit: user.aiGenerationsLimit }),
      icon: Sparkles,
      color: 'text-[#3B82F6]'
    }
  ];

  const handleQuickGenerate = () => {
    onCreateNewBook();
  };

  return (
    <div className="relative p-4 sm:p-10 max-w-7xl mx-auto space-y-12">
      {/* Immersive Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#7C3AED] opacity-10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Idea Generator Section (Immersive UI Design) */}
      <section className="relative z-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-white">
          {getGreeting()}
        </h1>
        <p className="text-[#9CA3AF] text-base sm:text-lg">{t('dashboard.heroSubtitle')}</p>

        <div className="mt-8 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-[#0C0C0E] border border-[#ffffff10] rounded-xl p-2 gap-2">
            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuickGenerate();
              }}
              placeholder={t('dashboard.ideaPlaceholder')}
              className="flex-grow bg-transparent px-4 sm:px-6 py-3 sm:py-4 outline-none text-white placeholder-[#4B5563] text-sm sm:text-base"
            />
            <button
              id="dashboard-hero-create-btn"
              onClick={handleQuickGenerate}
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white text-black font-bold text-xs sm:text-sm rounded-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg"
            >
              <span>{t('dashboard.generateBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-6 mt-4 text-[11px] text-[#4B5563] font-medium px-4">
            <span className="text-[#9CA3AF] font-semibold">{t('common.tryIdea')}</span>
            <span
              onClick={() => setQuickPrompt('Guide to personal finance for Gen Z')}
              className="cursor-pointer hover:text-[#9CA3AF] transition"
            >
              &ldquo;Guide to personal finance for Gen Z&rdquo;
            </span>
            <span
              onClick={() => setQuickPrompt('Modern Architecture trends 2026')}
              className="cursor-pointer hover:text-[#9CA3AF] transition"
            >
              &ldquo;Modern Architecture trends 2026&rdquo;
            </span>
            <span
              onClick={() => setQuickPrompt('The Psychology of Deep Work')}
              className="cursor-pointer hover:text-[#9CA3AF] transition"
            >
              &ldquo;The Psychology of Deep Work&rdquo;
            </span>
          </div>
        </div>
      </section>

      {/* Statistics 4-Card Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-xl bg-[#121214] border border-[#ffffff08] flex flex-col justify-between shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-lg bg-[#1F1F23] ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-[10px] text-[#4B5563] mt-1 font-mono">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Recent Projects Section */}
      <section className="space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#9CA3AF]">
            {t('dashboard.recentBooks')}
          </h2>
          {books.length > 0 && (
            <button
              onClick={onCreateNewBook}
              className="text-xs font-semibold text-[#7C3AED] hover:underline"
            >
              {t('dashboard.allBooks')} →
            </button>
          )}
        </div>

        {/* Empty State when no books exist */}
        {books.length === 0 ? (
          <div
            onClick={onCreateNewBook}
            className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#ffffff08] rounded-2xl hover:border-[#ffffff15] transition-colors cursor-pointer group bg-[#0C0C0E]/40"
          >
            <div className="w-12 h-12 rounded-full bg-[#121214] flex items-center justify-center text-[#4B5563] group-hover:text-white transition-colors mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-[#4B5563] uppercase tracking-widest group-hover:text-[#9CA3AF] transition">
              {t('dashboard.quickCreateCard')}
            </p>
            <p className="text-[11px] text-[#4B5563] mt-1">
              {t('dashboard.emptySubtitle')}
            </p>
          </div>
        ) : (
          /* Recent Books Cards Grid in Immersive UI style */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.slice(0, 8).map((book) => {
              const formattedDate = formatDate(book.updatedAt || book.createdAt);

              return (
                <div
                  key={book.id}
                  className="group cursor-pointer flex flex-col justify-between"
                >
                  <div className="aspect-[2/3] bg-[#121214] rounded-xl overflow-hidden border border-[#ffffff10] relative mb-3 transition-transform duration-300 group-hover:scale-[1.02] shadow-2xl">
                    <CoverRenderer cover={book.cover} size="lg" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#7C3AED]/20 to-black/90 pointer-events-none" />

                    {/* Top right 3-dots action menu */}
                    <div className="absolute top-2.5 right-2.5 z-20">
                      <button
                        id={`book-menu-trigger-${book.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === book.id ? null : book.id);
                        }}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition backdrop-blur-xs"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeMenuId === book.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-1 w-44 rounded-xl bg-[#0C0C0E] border border-[#ffffff15] shadow-2xl p-1.5 z-30 animate-in fade-in duration-100 text-xs"
                        >
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

                    {/* Book Cover title overlay */}
                    <div
                      onClick={() => onOpenBook(book)}
                      className="absolute inset-0 p-4 flex flex-col justify-end"
                    >
                      <div className="w-full h-1 bg-white/20 rounded mb-3" />
                      <h3 className="text-sm font-bold leading-tight text-white line-clamp-2 uppercase tracking-wide">
                        {book.title}
                      </h3>
                      <p className="text-[10px] text-[#9CA3AF] mt-1 italic truncate">
                        {book.author || user.name}
                      </p>
                    </div>
                  </div>

                  {/* Card footer details */}
                  <div className="flex justify-between items-start pt-1">
                    <div className="min-w-0 pr-2">
                      <p
                        onClick={() => onOpenBook(book)}
                        className="text-sm font-bold text-white truncate hover:text-[#7C3AED] transition"
                      >
                        {book.title}
                      </p>
                      <p className="text-xs text-[#4B5563]">
                        {t('dashboard.wordsCount', { count: book.wordCount })} • {formattedDate}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 bg-[#ffffff08] rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        book.status === 'completed'
                          ? 'text-[#10B981] border border-[#10B981]/30'
                          : 'text-[#7C3AED] border border-[#7C3AED]/30'
                      }`}
                    >
                      {book.status === 'completed' ? t('common.ready') : t('common.draft')}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Quick add new project card */}
            <div
              onClick={onCreateNewBook}
              className="flex flex-col items-center justify-center aspect-[2/3] border-2 border-dashed border-[#ffffff08] rounded-xl hover:border-[#ffffff15] transition-colors cursor-pointer group bg-[#121214]/30"
            >
              <div className="w-12 h-12 rounded-full bg-[#121214] flex items-center justify-center text-[#4B5563] group-hover:text-white transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <p className="mt-4 text-xs font-bold text-[#4B5563] uppercase tracking-widest group-hover:text-[#9CA3AF] transition">
                {t('dashboard.quickCreateCard')}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Immersive UI Engine Footer */}
      <footer className="h-12 border-t border-[#ffffff08] px-2 sm:px-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#4B5563] font-medium gap-2 pt-2 sm:pt-0">
        <div>Book Pilot AI Studio • {t('common.appTagline')}</div>
        <div className="flex gap-6">
          <span className="text-[#10B981] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            {t('settings.aiPreferences.activeStatus')}
          </span>
          <span className="hover:text-[#9CA3AF] cursor-pointer">{t('footer.privacy')}</span>
          <span className="hover:text-[#9CA3AF] cursor-pointer">{t('footer.terms')}</span>
        </div>
      </footer>
    </div>
  );
};
