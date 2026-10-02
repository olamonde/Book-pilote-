import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  Wand2,
  Globe2,
  BookMarked,
  MessageSquareQuote,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { AIService, BookConcept, OutlineItem } from '../../services/aiService';
import { VoiceInputButton } from '../common/VoiceInputButton';
import { useTranslation, useLanguage } from '../../i18n';

interface CreateBookViewProps {
  initialPrompt?: string;
  onConfirmGeneration: (
    idea: string,
    concept: BookConcept,
    outline: OutlineItem[],
    options: {
      language: string;
      bookType: string;
      tone: string;
      length: 'short' | 'medium' | 'long' | 'custom';
      targetAudience: string;
      author: string;
      customInstructions: string;
    }
  ) => void;
  onCancel: () => void;
}

export const CreateBookView: React.FC<CreateBookViewProps> = ({
  initialPrompt = '',
  onConfirmGeneration,
  onCancel
}) => {
  const { t } = useTranslation();
  const { contentLanguage, availableContentLanguages } = useLanguage();

  const [step, setStep] = useState<'input' | 'analyzing' | 'confirmation'>('input');
  const [idea, setIdea] = useState(initialPrompt);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setIdea(initialPrompt);
    }
  }, [initialPrompt]);

  // Advanced Options state (optional), defaults to the user's contentLanguage
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [language, setLanguage] = useState(contentLanguage || 'English');
  const [bookType, setBookType] = useState('Guide');
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long' | 'custom'>('medium');
  const [targetAudience, setTargetAudience] = useState('');
  const [authorName, setAuthorName] = useState('Author Name');
  const [customInstructions, setCustomInstructions] = useState('');

  // Synchronize initial contentLanguage if changed
  useEffect(() => {
    if (contentLanguage) {
      setLanguage(contentLanguage);
    }
  }, [contentLanguage]);

  // Generated Preview Concept & Outline
  const [generatedConcept, setGeneratedConcept] = useState<BookConcept | null>(null);
  const [generatedOutline, setGeneratedOutline] = useState<OutlineItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;

    setErrorMessage(null);
    setStep('analyzing');

    try {
      const options = {
        idea: idea.trim(),
        language,
        bookType,
        tone,
        length,
        targetAudience,
        author: authorName,
        customInstructions
      };

      // Generate Concept & Outline through AIService
      const concept = await AIService.generateBookConcept(options);
      const outline = await AIService.generateOutline(concept, options);

      setGeneratedConcept(concept);
      setGeneratedOutline(outline);
      setStep('confirmation');
    } catch (err: any) {
      console.error('Erreur lors de la génération:', err);
      setErrorMessage(err?.message || "Une difficulté est survenue lors de la création du plan par l'IA. Veuillez réessayer.");
      setStep('input');
    }
  };

  const handleFinalGenerate = () => {
    if (!generatedConcept || generatedOutline.length === 0) return;

    onConfirmGeneration(idea, generatedConcept, generatedOutline, {
      language,
      bookType,
      tone,
      length,
      targetAudience: targetAudience || generatedConcept.targetAudience,
      author: authorName,
      customInstructions
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-200">
      {/* STEP 1: Quick Prompt & Optional Advanced Inputs */}
      {step === 'input' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-mono mb-2 border border-purple-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('createBook.badge')}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {t('createBook.title')}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {t('createBook.subtitle')}
              </p>
            </div>

            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition"
            >
              {t('common.cancel')}
            </button>
          </div>

          {/* Quick drafting language bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Globe2 className="w-4 h-4 text-purple-400" />
              <span className="font-medium">{t('createBook.languageLabel')}:</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-950 border border-purple-500/30 text-purple-200 font-semibold rounded-lg px-3 py-1.5 text-xs focus:outline-hidden focus:border-purple-400"
              >
                {availableContentLanguages.map((l) => (
                  <option key={l.code} value={l.name}>
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleStartAnalysis} className="space-y-6">
            {/* Primary Large Textarea */}
            <div className="relative rounded-2xl bg-slate-900 border border-white/15 focus-within:border-purple-500/80 focus-within:ring-2 focus-within:ring-purple-500/20 p-4 sm:p-6 shadow-2xl transition">
              <div className="flex items-start justify-between gap-2">
                <textarea
                  id="create-book-idea-textarea"
                  rows={4}
                  required
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={t('createBook.placeholder')}
                  className="w-full bg-transparent text-white placeholder-slate-500 text-base sm:text-lg focus:outline-hidden resize-none leading-relaxed"
                />
                <div className="shrink-0 pt-1">
                  <VoiceInputButton
                    currentValue={idea}
                    onValueChange={setIdea}
                    targetFieldLabel={t('createBook.voiceIdea')}
                    buttonSize="sm"
                    tooltipPosition="left"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                {/* Advanced Options Toggle */}
                <button
                  type="button"
                  id="toggle-advanced-options-btn"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showAdvanced ? t('createBook.hideAdvanced') : t('createBook.showAdvanced')}</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Generate Button */}
                <button
                  id="create-book-submit-btn"
                  type="submit"
                  disabled={!idea.trim()}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-xl shadow-purple-600/30 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{t('createBook.generateBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Advanced Options Accordion Panel */}
            {showAdvanced && (
              <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                <h3 className="text-xs font-mono uppercase tracking-widest text-purple-300 font-bold">
                  {t('createBook.advancedTitle')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Language */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>{t('createBook.languageLabel')}</span>
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                    >
                      {availableContentLanguages.map((l) => (
                        <option key={l.code} value={l.name}>
                          {l.flag} {l.name} ({l.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Book Type */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <BookMarked className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('createBook.bookTypeLabel')}</span>
                    </label>
                    <select
                      value={bookType}
                      onChange={(e) => setBookType(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                    >
                      {[
                        'Guide',
                        'Ebook',
                        'Course',
                        'Manual',
                        'Fiction',
                        'Story',
                        'Business book',
                        'Educational',
                        'Other'
                      ].map((tVal) => (
                        <option key={tVal} value={tVal}>
                          {tVal}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('createBook.toneLabel')}</span>
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                    >
                      {[
                        'Professional',
                        'Friendly',
                        'Inspirational',
                        'Academic',
                        'Casual',
                        'Storytelling'
                      ].map((tn) => (
                        <option key={tn} value={tn}>
                          {tn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Length */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('createBook.lengthLabel')}</span>
                    </label>
                    <select
                      value={length}
                      onChange={(e) => setLength(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                    >
                      <option value="short">{t('createBook.lengthShort')}</option>
                      <option value="medium">{t('createBook.lengthMedium')}</option>
                      <option value="long">{t('createBook.lengthLong')}</option>
                      <option value="custom">{t('createBook.lengthCustom')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {t('createBook.audienceLabel')}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder={t('createBook.audiencePlaceholder')}
                        className="flex-1 min-w-0 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                      />
                      <VoiceInputButton
                        currentValue={targetAudience}
                        onValueChange={setTargetAudience}
                        targetFieldLabel={t('createBook.voiceAudience')}
                        buttonSize="sm"
                        tooltipPosition="left"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {t('createBook.authorLabel')}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder={t('createBook.authorPlaceholder')}
                        className="flex-1 min-w-0 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                      />
                      <VoiceInputButton
                        currentValue={authorName}
                        onValueChange={setAuthorName}
                        targetFieldLabel={t('createBook.voiceAuthor')}
                        buttonSize="sm"
                        tooltipPosition="left"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t('createBook.instructionsLabel')}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder={t('createBook.instructionsPlaceholder')}
                      className="flex-1 min-w-0 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                    />
                    <VoiceInputButton
                      currentValue={customInstructions}
                      onValueChange={setCustomInstructions}
                      targetFieldLabel={t('createBook.voiceInstructions')}
                      buttonSize="sm"
                      tooltipPosition="left"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* STEP 2: Analyzing Concept Animation */}
      {step === 'analyzing' && (
        <div className="py-24 text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Wand2 className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {t('createBook.analyzingTitle')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {t('createBook.analyzingSubtitle')}
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: Confirmation (Section 53) */}
      {step === 'confirmation' && generatedConcept && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('input')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← {t('createBook.editConcept')}</span>
            </button>

            <span className="text-xs font-mono uppercase text-purple-400 tracking-wider">
              {t('createBook.readyBadge')}
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-[10px] uppercase font-mono tracking-widest text-purple-400 font-bold">
                {t('createBook.yourBook')}
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">{generatedConcept.title}</h2>
              <p className="text-sm text-purple-300 italic mt-0.5">{generatedConcept.subtitle}</p>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {generatedConcept.description}
              </p>
            </div>

            {/* Meta badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">
                  {t('createBook.metaAudience')}
                </span>
                <span className="text-white font-medium truncate block mt-0.5">
                  {targetAudience || generatedConcept.targetAudience}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">
                  {t('createBook.metaLanguage')}
                </span>
                <span className="text-white font-medium block mt-0.5">{language}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">
                  {t('createBook.metaTone')}
                </span>
                <span className="text-white font-medium block mt-0.5">{tone}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">
                  {t('createBook.metaLength')}
                </span>
                <span className="text-white font-medium block mt-0.5">
                  {t('createBook.chapterWordsEst', { chapters: generatedOutline.length, words: generatedOutline.length * 1800 })}
                </span>
              </div>
            </div>

            {/* Generated Chapters Table of Contents */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 font-semibold">
                {t('createBook.chaptersBreakdown')}
              </h4>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {generatedOutline.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950 border border-white/5 flex items-start gap-3"
                  >
                    <span className="text-xs font-mono font-bold text-purple-400 mt-0.5">
                      0{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-white">{item.title}</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition"
              >
                ← {t('createBook.editDetails')}
              </button>

              <button
                id="confirm-generate-book-btn"
                type="button"
                onClick={handleFinalGenerate}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xl shadow-purple-600/30 transition hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              >
                <span>{t('createBook.confirmBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
