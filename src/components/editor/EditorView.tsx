import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Bot,
  Palette,
  Download,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Sparkles,
  Save,
  Eye,
  Menu,
  X
} from 'lucide-react';
import { Book, Chapter } from '../../types';
import { AiCopilotPanel } from './AiCopilotPanel';
import { EditorialEditor } from './EditorialEditor';
import { VoiceInputButton } from '../common/VoiceInputButton';
import { useTranslation } from '../../i18n';

interface EditorViewProps {
  book: Book;
  onSaveBook: (updatedBook: Book) => void;
  onNavigateToCover: () => void;
  onNavigateToExport: () => void;
  onBackToDashboard: () => void;
  onTrackAiUsage: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  book,
  onSaveBook,
  onNavigateToCover,
  onNavigateToExport,
  onBackToDashboard,
  onTrackAiUsage
}) => {
  const { t } = useTranslation();
  const [currentBook, setCurrentBook] = useState<Book>(book);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotSelectedText, setCopilotSelectedText] = useState<string>('');
  const [copilotInitialDirective, setCopilotInitialDirective] = useState<string>('');
  const [isMobileChaptersOpen, setIsMobileChaptersOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [renamingChapterIndex, setRenamingChapterIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const saveTimeoutRef = useRef<any>(null);

  const activeChapter = currentBook.chapters[activeChapterIndex] || currentBook.chapters[0];

  // Autosave trigger with debounce
  const triggerAutoSave = (updatedBook: Book) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      onSaveBook(updatedBook);
      setSaveStatus('saved');
    }, 800);
  };

  // Chapter Content Update
  const handleContentChange = (newContent: string) => {
    const wordCount = newContent.trim() ? newContent.trim().split(/\s+/).length : 0;

    const updatedChapters = currentBook.chapters.map((ch, idx) => {
      if (idx === activeChapterIndex) {
        return {
          ...ch,
          content: newContent,
          wordCount
        };
      }
      return ch;
    });

    const totalWords = updatedChapters.reduce((acc, c) => acc + c.wordCount, 0);

    const updatedBook: Book = {
      ...currentBook,
      chapters: updatedChapters,
      wordCount: totalWords,
      updatedAt: new Date().toISOString()
    };

    setCurrentBook(updatedBook);
    triggerAutoSave(updatedBook);
  };

  // Chapter Title Update
  const handleChapterTitleChange = (newTitle: string) => {
    const updatedChapters = currentBook.chapters.map((ch, idx) => {
      if (idx === activeChapterIndex) {
        return { ...ch, title: newTitle };
      }
      return ch;
    });

    const updatedBook: Book = {
      ...currentBook,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString()
    };

    setCurrentBook(updatedBook);
    triggerAutoSave(updatedBook);
  };

  // Add New Chapter
  const handleAddChapter = () => {
    const newChNumber = currentBook.chapters.length + 1;
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      order: newChNumber,
      title: `${t('editor.chapterPrefix', 'Chapter')} ${newChNumber}: ${t('editor.newSection', 'New Section')}`,
      content: t('editor.newSectionIntro', '### Introduction\n\nEnter the core concepts of this chapter here...'),
      wordCount: 10,
      status: 'ready'
    };

    const updatedBook: Book = {
      ...currentBook,
      chapters: [...currentBook.chapters, newChapter],
      updatedAt: new Date().toISOString()
    };

    setCurrentBook(updatedBook);
    setActiveChapterIndex(updatedBook.chapters.length - 1);
    triggerAutoSave(updatedBook);
  };

  // Delete Chapter
  const handleDeleteChapter = (indexToDelete: number) => {
    if (currentBook.chapters.length <= 1) return; // Keep at least one chapter

    const updatedChapters = currentBook.chapters.filter((_, idx) => idx !== indexToDelete);
    // Re-index chapter numbers
    const reindexed = updatedChapters.map((ch, idx) => ({
      ...ch,
      chapterNumber: idx + 1
    }));

    const totalWords = reindexed.reduce((acc, c) => acc + c.wordCount, 0);

    const updatedBook: Book = {
      ...currentBook,
      chapters: reindexed,
      wordCount: totalWords,
      updatedAt: new Date().toISOString()
    };

    setCurrentBook(updatedBook);
    setActiveChapterIndex(Math.max(0, indexToDelete - 1));
    triggerAutoSave(updatedBook);
  };

  // Move Chapter Up/Down
  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentBook.chapters.length) return;

    const list = [...currentBook.chapters];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reindexed = list.map((ch, idx) => ({ ...ch, chapterNumber: idx + 1 }));

    const updatedBook: Book = {
      ...currentBook,
      chapters: reindexed,
      updatedAt: new Date().toISOString()
    };

    setCurrentBook(updatedBook);
    setActiveChapterIndex(targetIndex);
    triggerAutoSave(updatedBook);
  };

  // Status toggle (Draft / Completed)
  const handleToggleStatus = () => {
    const nextStatus = currentBook.status === 'draft' ? 'completed' : 'draft';
    const updatedBook: Book = {
      ...currentBook,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    setCurrentBook(updatedBook);
    triggerAutoSave(updatedBook);
  };

  // Open Copilot directly targeting a selected passage with an instruction
  const handleOpenCopilotWithSelection = (selectedText: string, instruction?: string) => {
    setCopilotSelectedText(selectedText);
    setCopilotInitialDirective(instruction || '');
    setIsCopilotOpen(true);
  };

  const readingTimeMinutes = Math.max(1, Math.round((activeChapter?.wordCount || 0) / 200));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#08090d] text-white overflow-hidden">
      {/* Top Bar Navigation */}
      <div className="h-14 px-3 sm:px-6 border-b border-white/10 bg-[#090a0f] flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onBackToDashboard}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition flex items-center gap-1.5 text-xs shrink-0"
            title={t('editor.libraryTooltip', 'Retour à la bibliothèque')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('editor.library', 'Bibliothèque')}</span>
          </button>

          {/* Toggle chapters sidebar on mobile */}
          <button
            onClick={() => setIsMobileChaptersOpen(!isMobileChaptersOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition flex items-center gap-1 text-xs shrink-0"
            title={t('editor.showChapters', 'Afficher les chapitres')}
          >
            <Menu className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-[11px]">{activeChapterIndex + 1}/{currentBook.chapters.length}</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-xs">
              {currentBook.title}
            </h2>
            <button
              onClick={handleToggleStatus}
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold border transition shrink-0 hidden sm:inline-block ${
                currentBook.status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {currentBook.status === 'completed' ? t('editor.statusCompleted', 'Completed') : t('editor.statusDraft', 'Draft')}
            </button>
          </div>
        </div>

        {/* Right Tools & Autosave Status */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Autosave badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            {saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{t('editor.savingShort', 'Enregistrement...')}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{t('editor.savedShort', 'Sauvegardé')}</span>
              </>
            )}
          </div>

          {/* Cover Studio shortcut */}
          <button
            onClick={onNavigateToCover}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition flex items-center gap-1.5"
            title={t('editor.coverBtn', 'Studio Couverture')}
          >
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">{t('editor.coverBtn', 'Couverture')}</span>
          </button>

          {/* Export shortcut */}
          <button
            onClick={onNavigateToExport}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition flex items-center gap-1.5"
            title={t('editor.exportBtn', 'Exporter l’e-book')}
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">{t('editor.exportBtn', 'Export')}</span>
          </button>

          {/* AI Copilot toggle button */}
          <button
            id="editor-copilot-toggle-btn"
            onClick={() => {
              if (isCopilotOpen) {
                setIsCopilotOpen(false);
                setCopilotSelectedText('');
                setCopilotInitialDirective('');
              } else {
                setIsCopilotOpen(true);
              }
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md ${
              isCopilotOpen
                ? 'bg-purple-600 text-white shadow-purple-600/30'
                : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30'
            }`}
            title={t('editor.copilotBtn', 'Ouvrir le copilote IA d’écriture')}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">{t('editor.copilotBtn', 'IA Copilot')}</span>
          </button>
        </div>
      </div>

      {/* Editor Body: Left Sidebar + Central Writing Pad + Right Copilot */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLUMN: CHAPTERS LIST (Desktop & Mobile Drawer) */}
        <div
          className={`${
            isMobileChaptersOpen ? 'fixed inset-0 z-40 flex bg-black/60 backdrop-blur-xs md:relative md:bg-transparent' : 'hidden md:flex'
          } w-64 border-r border-white/10 bg-[#090a0f] flex-col justify-between shrink-0 z-30 transition-all`}
        >
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
              {t('editor.chapterList', 'Chapitres')} ({currentBook.chapters.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleAddChapter}
                className="p-1 text-purple-400 hover:text-purple-300 hover:bg-white/5 rounded transition"
                title={t('editor.addChapter', 'Ajouter un chapitre')}
              >
                <Plus className="w-4 h-4" />
              </button>
              {isMobileChaptersOpen && (
                <button
                  onClick={() => setIsMobileChaptersOpen(false)}
                  className="md:hidden p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Chapters item list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {currentBook.chapters.map((ch, idx) => {
              const isActive = idx === activeChapterIndex;
              return (
                <div
                  key={ch.id}
                  className={`group relative p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                    isActive
                      ? 'bg-purple-600/15 border-purple-500/40 text-white font-medium'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div
                    onClick={() => {
                      setActiveChapterIndex(idx);
                      setIsMobileChaptersOpen(false);
                    }}
                    className="flex-1 min-w-0 cursor-pointer pr-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-purple-400 font-bold">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <p className="truncate font-sans">{ch.title}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                      {t('editor.wordsCount', { count: ch.wordCount || 0 })}
                    </span>
                  </div>

                  {/* Move & Delete controls */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleMoveChapter(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:text-white disabled:opacity-20"
                      title={t('editor.moveUp', 'Monter')}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMoveChapter(idx, 'down')}
                      disabled={idx === currentBook.chapters.length - 1}
                      className="p-1 hover:text-white disabled:opacity-20"
                      title={t('editor.moveDown', 'Descendre')}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {currentBook.chapters.length > 1 && (
                      <button
                        onClick={() => handleDeleteChapter(idx)}
                        className="p-1 hover:text-rose-400 transition"
                        title={t('editor.delete', 'Supprimer')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Book Summary Info at bottom */}
          <div className="p-3 border-t border-white/5 text-[11px] font-mono text-slate-500">
            <p>{t('editor.totalWords', { count: currentBook.wordCount || 0 })}</p>
            <p>{t('editor.readingTimeEst', { count: Math.round((currentBook.wordCount || 0) / 200) })}</p>
          </div>
        </div>

        {/* CENTER COLUMN: EDITORIAL BOOK WRITING AREA */}
        <div className="flex-1 flex flex-col bg-[#0b0d13] overflow-hidden min-w-0">
          {/* Chapter Title & Voice Bar */}
          <div className="px-4 sm:px-8 py-3 bg-[#090a0f] border-b border-white/5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <input
                type="text"
                value={activeChapter?.title || ''}
                onChange={(e) => handleChapterTitleChange(e.target.value)}
                className="flex-1 bg-transparent text-lg sm:text-xl font-extrabold text-white font-serif-book border-0 focus:outline-hidden tracking-tight truncate"
                placeholder={t('editor.chapterTitlePlaceholder', 'Titre du chapitre...')}
              />
              {/* Voice dictation for Chapter Title */}
              <VoiceInputButton
                currentValue={activeChapter?.title || ''}
                onValueChange={handleChapterTitleChange}
                targetFieldLabel={t('editor.voiceChapterTitle', 'titre du chapitre')}
                buttonSize="xs"
                tooltipPosition="bottom"
              />
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-slate-500 shrink-0">
              <span>{t('editor.wordsCount', { count: activeChapter?.wordCount || 0 })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readingTimeMinutes} {t('editor.readingTime', 'min')}
              </span>
            </div>
          </div>

          {/* Rich Editorial Manuscript Editor */}
          <EditorialEditor
            content={activeChapter?.content || ''}
            chapterTitle={activeChapter?.title || ''}
            onChange={handleContentChange}
            onOpenCopilotWithSelection={handleOpenCopilotWithSelection}
          />
        </div>

        {/* RIGHT COLUMN: AI COPILOT DRAWER */}
        {isCopilotOpen && (
          <AiCopilotPanel
            currentText={activeChapter?.content || ''}
            chapterTitle={activeChapter?.title || t('editor.chapterPrefix', 'Chapitre')}
            selectedTextContext={copilotSelectedText}
            initialDirective={copilotInitialDirective}
            onApplyChanges={handleContentChange}
            onClose={() => {
              setIsCopilotOpen(false);
              setCopilotSelectedText('');
              setCopilotInitialDirective('');
            }}
            onTrackAiUsage={onTrackAiUsage}
          />
        )}
      </div>
    </div>
  );
};
