import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  BookOpen,
  Download,
  FileEdit,
  ArrowRight,
  Clock,
  Layers,
  Cpu,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Book, Chapter } from '../../types';
import { AIService, BookConcept, OutlineItem } from '../../services/aiService';
import { StorageService } from '../../services/storageService';
import { CoverRenderer } from '../cover/CoverRenderer';
import { useTranslation } from '../../i18n';

interface GenerationProgressViewProps {
  idea: string;
  concept: BookConcept;
  outline: OutlineItem[];
  options: {
    language: string;
    bookType: string;
    tone: string;
    length: 'short' | 'medium' | 'long' | 'custom';
    targetAudience: string;
    author: string;
    customInstructions: string;
  };
  onComplete: (completedBook: Book) => void;
  onOpenEditor: (book: Book) => void;
  onExport: (book: Book) => void;
}

export const GenerationProgressView: React.FC<GenerationProgressViewProps> = ({
  idea,
  concept,
  outline,
  options,
  onComplete,
  onOpenEditor,
  onExport
}) => {
  const { t } = useTranslation();
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(10);
  const [currentTask, setCurrentTask] = useState(t('generationProgress.title', 'Rédaction du livre en cours...'));
  const [liveStreamText, setLiveStreamText] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [finalBook, setFinalBook] = useState<Book | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.max(15, outline.length * 4)
  );

  // Countdown timer effect
  useEffect(() => {
    if (isCompleted || secondsRemaining <= 0 || errorMessage) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(1, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCompleted, secondsRemaining, errorMessage]);

  // Main generation loop
  useEffect(() => {
    let isCancelled = false;
    setErrorMessage(null);
    setProgressPercent(10);
    setSecondsRemaining(Math.max(15, outline.length * 4));

    const runGeneration = async () => {
      try {
        const generatedChapters: Chapter[] = [];
        const totalSteps = outline.length + 2; // cover + chapters + compilation

        // Step 1: Cover Design Generation
        setCurrentTask(t('generationProgress.taskCover', 'Synthesizing high-contrast cover art and color grading...'));
        setProgressPercent(15);
        const generatedCover = await AIService.generateCover(concept, outline);

        if (isCancelled) return;

        // Step 2: Accelerated Parallel Chapter Generation (concurrency = 2)
        const concurrency = 2;
        for (let i = 0; i < outline.length; i += concurrency) {
          if (isCancelled) return;

          const currentBatch = outline.slice(i, i + concurrency);
          const batchLabels = currentBatch.map((_, k) => `Ch. ${i + k + 1}`).join(' & ');
          setCurrentChapterIndex(i);
          setCurrentTask(t('generationProgress.taskChapters', { labels: batchLabels, total: outline.length }));

          const batchResults = await Promise.all(
            currentBatch.map(async (item, offset) => {
              const idx = i + offset;
              const chapterRes = await AIService.generateChapter(
                concept,
                item,
                idx,
                generatedChapters.map((c) => c.summary || ''),
                options.customInstructions,
                options.language,
                outline,
                outline.length
              );

              return {
                id: item.id || `ch-${idx + 1}`,
                title: item.title,
                order: idx + 1,
                content: chapterRes.content,
                wordCount: chapterRes.wordCount,
                status: 'ready' as const,
                summary: chapterRes.summary
              };
            })
          );

          if (isCancelled) return;

          for (const chapterData of batchResults) {
            generatedChapters.push(chapterData);
          }

          // Calculate progress percentage
          const pct = Math.min(95, Math.round(((i + currentBatch.length) / totalSteps) * 100));
          setProgressPercent(pct);

          // Stream snippet text to live preview box
          const lastCreated = batchResults[batchResults.length - 1];
          if (lastCreated) {
            setLiveStreamText(lastCreated.content.slice(0, 420));
          }

          // Brief smooth transition
          await new Promise((r) => setTimeout(r, 200));
        }

        // Step 3: Finalizing and compiling
        setCurrentTask(t('generationProgress.taskCompiling', 'Compiling table of contents, pagination & export buffers...'));
        setProgressPercent(100);
        await new Promise((r) => setTimeout(r, 800));

        // Calculate total words
        const totalWords = generatedChapters.reduce((acc, c) => acc + c.wordCount, 0);

        const newBook: Book = {
          id: `book-${Date.now()}`,
          userId: StorageService.getCurrentUser()?.id || 'anonymous',
          title: concept.title,
          subtitle: concept.subtitle,
          description: concept.description,
          author: options.author || 'Author',
          language: options.language || 'English',
          tone: options.tone || 'Professional',
          genre: options.bookType || 'Non-Fiction',
          targetAudience: options.targetAudience || 'General Audience',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          wordCount: totalWords,
          cover: generatedCover,
          chapters: generatedChapters,
          settings: {
            bookSize: '6x9',
            font: 'serif',
            theme: 'dark',
            margins: 'normal',
            headerFooter: true,
            pageNumbers: true,
            dropCaps: false
          },
          generationSettings: {
            prompt: idea,
            length: options.length || 'medium',
            bookType: options.bookType || 'Non-Fiction'
          },
          exportHistory: []
        };

        if (!isCancelled) {
          setFinalBook(newBook);
          setIsCompleted(true);
          onComplete(newBook);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[GenerationProgressView] Error during chapter generation:', err);
          setErrorMessage(
            err?.message || t('generationProgress.defaultError', 'Une difficulté est survenue lors de la rédaction automatique des chapitres.')
          );
        }
      }
    };

    runGeneration();

    return () => {
      isCancelled = true;
    };
  }, [retryTrigger]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-200">
      {errorMessage ? (
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-red-500/30 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t('generationProgress.failureTitle', 'Interruption de la génération')}
              </h2>
              <p className="text-sm text-slate-400">
                {t('generationProgress.failureSubtitle', 'La rédaction automatique a rencontré une difficulté temporaire.')}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-white/10 text-sm text-slate-300 font-mono leading-relaxed">
            {errorMessage}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => setRetryTrigger((prev) => prev + 1)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('generationProgress.retryBtn', 'Relancer la génération')}</span>
            </button>
          </div>
        </div>
      ) : !isCompleted ? (
        /* Active Generation Screen (Section 14 & 54) */
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-white/15 shadow-2xl space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight font-sans">
                  {concept.title}
                </h2>
                <p className="text-xs text-purple-400 font-mono">
                  {t('generationProgress.subtitle', 'Book Pilot rédige vos chapitres et prépare la couverture...')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>~{secondsRemaining}s</span>
            </div>
          </div>

          {/* Progress Bar & Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                {currentTask}
              </span>
              <span className="font-mono text-purple-400 font-bold">{progressPercent}%</span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-400 rounded-full transition-all duration-300 shadow-md shadow-purple-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Chapters Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {outline.map((item, idx) => {
              const isPast = idx < currentChapterIndex;
              const isCurrent = idx === currentChapterIndex;

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isPast
                      ? 'bg-purple-950/20 border-purple-500/30 text-purple-300'
                      : isCurrent
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-md ring-1 ring-purple-500/40'
                      : 'bg-slate-950/40 border-white/5 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold">Ch. {idx + 1}</span>
                    {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] font-medium truncate">{item.title}</p>
                </div>
              );
            })}
          </div>

          {/* Live Streaming Content Window */}
          <div className="rounded-2xl bg-slate-950 border border-white/10 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-purple-400" />
                {t('generationProgress.liveStreamTitle', 'Live Manuscript Stream')}
              </span>
              <span>{t('generationProgress.tokensActive', 'Tokens active')}</span>
            </div>

            <div className="text-xs text-slate-300 font-mono leading-relaxed min-h-[90px] whitespace-pre-line opacity-90">
              {liveStreamText || t('generationProgress.synthesizing', 'Synthesizing chapter headings and topic exposition...')}
              <span className="inline-block w-1.5 h-3 bg-purple-400 ml-1 animate-pulse" />
            </div>
          </div>
        </div>
      ) : (
        /* Success Screen at Completion */
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-3">
              <span>{t('generationProgress.completedTitle', 'Votre livre est prêt !')}</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight font-sans">
              {t('generationProgress.completedTitle', 'Votre livre est prêt !')}
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
              {t('generationProgress.completedSubtitle', 'Le manuscrit a été généré avec succès et sauvegardé dans votre bibliothèque.')}
            </p>
          </div>

          {/* Cover & Meta Summary */}
          {finalBook && (
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center gap-5 text-left">
              <div className="shrink-0 shadow-xl">
                <CoverRenderer cover={finalBook.cover} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{finalBook.title}</h4>
                <p className="text-xs text-purple-300 italic truncate mt-0.5">
                  {finalBook.subtitle}
                </p>
                <div className="mt-3 text-[11px] font-mono text-slate-400 space-y-0.5">
                  <p>{t('editor.chapterCount', { count: finalBook.chapters.length })}</p>
                  <p>{t('editor.wordCount', { count: finalBook.wordCount })}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          {finalBook && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                id="open-in-editor-btn"
                onClick={() => onOpenEditor(finalBook)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xl shadow-purple-600/30 transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <FileEdit className="w-4 h-4" />
                <span>{t('generationProgress.goToEditor', 'Ouvrir dans l\'éditeur')}</span>
              </button>

              <button
                id="export-pdf-quick-btn"
                onClick={() => onExport(finalBook)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/25 font-semibold text-xs transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{t('generationProgress.exportNow', 'Exporter')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
