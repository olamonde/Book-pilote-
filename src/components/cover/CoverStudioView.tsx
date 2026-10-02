import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  ArrowLeft,
  Check,
  Download,
  Layers,
  Wand2,
  RefreshCw,
  Sliders,
  Type,
  MessageSquare,
  Undo2,
  AlertCircle,
  Image as ImageIcon,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import {
  Book,
  CoverConfig,
  CoverStyle,
  CoverChatMessage,
  CoverVisualState,
  CoverVersionItem,
  User
} from '../../types';
import { CoverRenderer } from './CoverRenderer';
import { CoverChatAssistant } from './CoverChatAssistant';
import { AIService } from '../../services/aiService';
import { VoiceInputButton } from '../common/VoiceInputButton';
import { useTranslation } from '../../i18n';

interface CoverStudioViewProps {
  book: Book;
  user?: User;
  onSaveCover: (updatedCover: CoverConfig) => void;
  onViewMockup: () => void;
  onBackToEditor: () => void;
  onTrackAiUsage: () => void;
  onRefundAiUsage?: () => void;
}

export const CoverStudioView: React.FC<CoverStudioViewProps> = ({
  book,
  user,
  onSaveCover,
  onViewMockup,
  onBackToEditor,
  onTrackAiUsage,
  onRefundAiUsage
}) => {
  const { t } = useTranslation();
  const [cover, setCover] = useState<CoverConfig>(book.cover);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'generator' | 'chat' | 'presets' | 'customize'>('generator');

  // Direct Image & Cover Generator State (User Prompt is King)
  const [generatorPrompt, setGeneratorPrompt] = useState(book.cover.customPrompt || '');
  const [generatorStyle, setGeneratorStyle] = useState('');
  const [generatorFormat, setGeneratorFormat] = useState<'square' | 'portrait' | 'landscape'>('portrait');
  const [generatorMode, setGeneratorMode] = useState<'image' | 'cover'>('image');
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastGenerationInfo, setLastGenerationInfo] = useState<{
    engineUsed?: string;
    detectedStyle?: string;
    styleLabel?: string;
    finalPromptSent?: string;
  } | null>(null);

  const handleGenerateDirectImage = async () => {
    if (!generatorPrompt.trim() || isImageGenerating) return;
    setIsImageGenerating(true);
    setGenerationError(null);
    onTrackAiUsage();

    try {
      const response = await fetch('/api/generate-cover-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatorPrompt.trim(),
          style: generatorStyle.trim() || undefined,
          format: generatorFormat,
          mode: generatorMode,
          bookContext: {
            title: cover.title || book.title,
            subtitle: cover.subtitle || book.subtitle,
            author: cover.author || book.author,
            genre: book.targetAudience,
            description: book.description
          }
        })
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      }

      if (!response.ok || !data || !data.success) {
        if (onRefundAiUsage) onRefundAiUsage();
        throw new Error(data?.message || 'Erreur lors de la génération de l\'image.');
      }

      const isArtwork = generatorMode === 'image';
      const updatedCover: CoverConfig = {
        ...cover,
        imageUrl: data.imageUrl,
        customPrompt: generatorPrompt.trim(),
        isArtworkOnly: isArtwork,
        showTextOverlay: !isArtwork,
        displayMode: isArtwork ? 'artwork' : 'cover',
        detectedStyle: data.detectedStyle,
        aspectRatio: generatorFormat
      };

      setCover(updatedCover);
      setLastGenerationInfo({
        engineUsed: data.engineUsed,
        detectedStyle: data.detectedStyle,
        styleLabel: data.styleLabel,
        finalPromptSent: data.finalPromptSent
      });

      const nextVer = versions.length + 1;
      const newVersionItem: CoverVersionItem = {
        id: `v-${Date.now()}`,
        versionNumber: nextVer,
        label: `Version ${nextVer}`,
        description: generatorPrompt.trim(),
        cover: updatedCover,
        visualState: {
          initialPrompt: generatorPrompt.trim(),
          currentDescription: generatorPrompt.trim(),
          elementsToKeep: [],
          elementsToModify: [],
          elementsToAvoid: [],
          historySummaries: []
        },
        createdAt: new Date().toISOString()
      };
      setVersions((prev) => [...prev, newVersionItem]);
      setCurrentVersionNumber(nextVer);
    } catch (err: any) {
      console.warn('Direct generation status:', err?.message || err);
      setGenerationError(err?.message || 'La génération a échoué. Veuillez vérifier votre prompt.');
    } finally {
      setIsImageGenerating(false);
    }
  };

  // Conversational session state persistence
  const [versions, setVersions] = useState<CoverVersionItem[]>(() => {
    if (book.cover.versions && book.cover.versions.length > 0) {
      return book.cover.versions;
    }
    if (book.cover.imageUrl || book.cover.customPrompt) {
      return [
        {
          id: 'v-init',
          versionNumber: 1,
          label: 'Version 1',
          description: book.cover.customPrompt || `Couverture de style ${book.cover.style}`,
          cover: book.cover,
          visualState: {
            initialPrompt: book.cover.customPrompt || '',
            currentDescription: book.cover.customPrompt || `Couverture ${book.cover.style}`,
            elementsToKeep: [],
            elementsToModify: [],
            elementsToAvoid: [],
            historySummaries: []
          },
          createdAt: new Date().toISOString()
        }
      ];
    }
    return [];
  });

  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(() => {
    if (typeof book.cover.currentVersionIndex === 'number') {
      return book.cover.currentVersionIndex;
    }
    if (book.cover.versions && book.cover.versions.length > 0) {
      return book.cover.versions[book.cover.versions.length - 1].versionNumber;
    }
    return 1;
  });

  const [visualState, setVisualState] = useState<CoverVisualState>(() => {
    if (book.cover.visualState) return book.cover.visualState;
    return {
      initialPrompt: book.cover.customPrompt || '',
      currentDescription: book.cover.customPrompt || `Couverture ${book.cover.style}`,
      elementsToKeep: [],
      elementsToModify: [],
      elementsToAvoid: [],
      historySummaries: []
    };
  });

  const [conversationHistory, setConversationHistory] = useState<CoverChatMessage[]>(() => {
    if (book.cover.conversationHistory && book.cover.conversationHistory.length > 0) {
      return book.cover.conversationHistory;
    }
    return [
      {
        id: 'welcome',
        sender: 'assistant',
        text: `Bonjour ! Je suis votre directeur artistique Book Pilot AI. Discutons de la couverture que vous imaginez pour votre livre « ${book.title} ». Vous pouvez m'expliquer vos envies, me demander des conseils de style, ou me donner des consignes de retouche au fil de notre conversation.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: 'chat'
      }
    ];
  });

  const handleRemoveImage = () => {
    setCover({
      ...cover,
      imageUrl: undefined
    });
  };

  const styles: { id: CoverStyle; label: string; desc: string }[] = [
    { id: 'luxury', label: 'Luxury', desc: 'Reflets dorés, noir obsidienne profond et typographie serif noble' },
    { id: 'minimal', label: 'Minimal', desc: 'Typographie suisse, grand espace négatif et haute clarté' },
    { id: 'business', label: 'Business', desc: 'Bleu marine d’autorité, grille rigoureuse et sérieux exécutif' },
    { id: 'technology', label: 'Technology', desc: 'Violet néon, cyan électrique et motifs vectoriels futuristes' },
    { id: 'modern', label: 'Modern', desc: 'Dégradés chromatiques audacieux et vitalité géométrique' },
    { id: 'fantasy', label: 'Fantasy / Sci-Fi', desc: 'Nébuleuses cosmiques, violet profond et profondeur étoilée' },
    { id: 'editorial', label: 'Editorial', desc: 'Prestige littéraire classique, papier chaud et finesse serif' },
    { id: 'cinematic', label: 'Cinematic / Bold', desc: 'Forte saturation, contraste saisissant et ambiance cinématographique' }
  ];

  const patterns = [
    { id: 'geometric', label: 'Grille Géométrique' },
    { id: 'radial', label: 'Aurore Radiale' },
    { id: 'lines', label: 'Matrice Linéaire' },
    { id: 'stars', label: 'Champ Stellaire' },
    { id: 'cubes', label: 'Cubes Isométriques' },
    { id: 'minimal', label: 'Solide Épuré' }
  ];

  const fonts = [
    { id: 'cinzel', label: 'Cinzel (Classique Royal)' },
    { id: 'serif', label: 'Playfair / Serif (Littéraire)' },
    { id: 'sans', label: 'Plus Jakarta / Modern Sans' },
    { id: 'modern', label: 'Futuriste Mono / Tech' }
  ];

  // AI Random Variation Generator
  const handleAiRegenerate = async () => {
    setIsGenerating(true);
    try {
      const newCover = await AIService.generateCover(
        {
          title: cover.title,
          subtitle: cover.subtitle,
          description: book.description,
          targetAudience: book.targetAudience,
          tone: book.tone
        },
        book.chapters.map((c) => ({ id: c.id, title: c.title, description: '' }))
      );
      setCover(newCover);
      onTrackAiUsage();
    } catch {
      const nextStyle = styles[(styles.findIndex((s) => s.id === cover.style) + 1) % styles.length].id;
      setCover({ ...cover, style: nextStyle });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyStyle = (newStyle: CoverStyle) => {
    const paletteMap: Partial<Record<CoverStyle, Partial<CoverConfig>>> = {
      luxury: {
        primaryColor: '#0a0a0c',
        secondaryColor: '#d97706',
        accentColor: '#f59e0b',
        textColor: '#fef3c7',
        fontFamily: 'cinzel',
        pattern: 'radial'
      },
      minimal: {
        primaryColor: '#18181b',
        secondaryColor: '#52525b',
        accentColor: '#e4e4e7',
        textColor: '#ffffff',
        fontFamily: 'sans',
        pattern: 'minimal'
      },
      business: {
        primaryColor: '#0f172a',
        secondaryColor: '#1e40af',
        accentColor: '#38bdf8',
        textColor: '#f8fafc',
        fontFamily: 'sans',
        pattern: 'cubes'
      },
      technology: {
        primaryColor: '#05070f',
        secondaryColor: '#7c3aed',
        accentColor: '#06b6d4',
        textColor: '#ffffff',
        fontFamily: 'modern',
        pattern: 'lines'
      },
      modern: {
        primaryColor: '#111827',
        secondaryColor: '#ec4899',
        accentColor: '#8b5cf6',
        textColor: '#ffffff',
        fontFamily: 'modern',
        pattern: 'geometric'
      },
      fantasy: {
        primaryColor: '#0d0722',
        secondaryColor: '#6d28d9',
        accentColor: '#38bdf8',
        textColor: '#fdf4ff',
        fontFamily: 'cinzel',
        pattern: 'stars'
      },
      editorial: {
        primaryColor: '#1c1917',
        secondaryColor: '#44403c',
        accentColor: '#f59e0b',
        textColor: '#fafaf9',
        fontFamily: 'serif',
        pattern: 'minimal'
      },
      cinematic: {
        primaryColor: '#18181b',
        secondaryColor: '#f43f5e',
        accentColor: '#fbbf24',
        textColor: '#ffffff',
        fontFamily: 'sans',
        pattern: 'geometric'
      }
    };

    setCover({
      ...cover,
      style: newStyle,
      ...paletteMap[newStyle]
    });
  };

  const handleSave = () => {
    // Retain full session state with the cover
    const coverWithState: CoverConfig = {
      ...cover,
      versions,
      visualState,
      conversationHistory,
      currentVersionIndex: currentVersionNumber
    };
    onSaveCover(coverWithState);
  };

  // Download cover image (HTML Canvas or SVG export)
  const handleDownloadCover = () => {
    const el = document.getElementById('cover-render-canvas');
    if (!el) return;

    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;">
            ${el.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cover.title.toLowerCase().replace(/\s+/g, '-')}-cover.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            title={t('coverStudio.backToEditor')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans flex items-center gap-2.5">
              <span>{t('coverStudio.title')}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-normal">
                {t('coverStudio.conversationalAiBadge')}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {t('coverStudio.creationFor', { title: book.title })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="view-mockup-shortcut-btn"
            onClick={onViewMockup}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>{t('coverStudio.mockupsBtn')}</span>
          </button>

          <button
            id="download-cover-image-btn"
            onClick={handleDownloadCover}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>{t('coverStudio.download')}</span>
          </button>

          <button
            id="save-cover-btn"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>{t('coverStudio.applyCover')}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Canvas + Right Controls / Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Cover Preview Stage (5-6 Cols) */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl bg-slate-900/50 border border-white/10 shadow-2xl relative">
          <div
            id="cover-render-canvas"
            className="transform hover:scale-[1.02] transition-transform duration-300"
          >
            <CoverRenderer cover={cover} size="xl" />
          </div>

          {/* Active Version & Image Status Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>{t('coverStudio.activeVersion', { version: currentVersionNumber })}</span>
            </span>

            {cover.imageUrl && (
              <>
                <button
                  type="button"
                  id="toggle-cover-artwork-mode-btn"
                  onClick={() =>
                    setCover((prev) => {
                      const nextArtworkOnly = !prev.isArtworkOnly;
                      return {
                        ...prev,
                        isArtworkOnly: nextArtworkOnly,
                        displayMode: nextArtworkOnly ? 'artwork' : 'cover',
                        showTextOverlay: !nextArtworkOnly
                      };
                    })
                  }
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 ${
                    cover.isArtworkOnly
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  <ImageIcon className="w-3 h-3 text-amber-400" />
                  <span>{cover.isArtworkOnly ? t('coverStudio.artworkMode') : t('coverStudio.coverMode')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition flex items-center gap-1"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>{t('coverStudio.returnToClassic')}</span>
                </button>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              id="generate-new-cover-ai-btn"
              onClick={handleAiRegenerate}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>{isGenerating ? t('coverStudio.variationInProgress') : t('coverStudio.randomVariation')}</span>
            </button>
          </div>
        </div>

        {/* RIGHT: Conversational Studio Assistant & Manual Tools (7 Cols) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* Navigation Tabs */}
          <div className="p-1 rounded-2xl bg-slate-900 border border-white/10 flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              id="tab-generator-btn"
              onClick={() => setSelectedTab('generator')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                selectedTab === 'generator'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wand2 className="w-4 h-4 text-purple-300" />
              <span>{t('coverStudio.tabs.generator')}</span>
            </button>

            <button
              type="button"
              id="tab-chat-btn"
              onClick={() => setSelectedTab('chat')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                selectedTab === 'chat'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-purple-300" />
              <span>{t('coverStudio.tabs.chat')}</span>
            </button>

            <button
              type="button"
              id="tab-presets-btn"
              onClick={() => setSelectedTab('presets')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                selectedTab === 'presets'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>{t('coverStudio.tabs.presets')}</span>
            </button>

            <button
              type="button"
              id="tab-customize-btn"
              onClick={() => setSelectedTab('customize')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                selectedTab === 'customize'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{t('coverStudio.tabs.customize')}</span>
            </button>
          </div>

          {/* TAB 0: SIMPLE & DIRECT IMAGE GENERATOR (Prompt is King) */}
          {selectedTab === 'generator' && (
            <div className="space-y-5 rounded-2xl bg-slate-900/60 border border-white/10 p-5 shadow-xl animate-in fade-in">
              {/* Mode Switcher: Mode Image vs Mode Couverture */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div>
                  <span className="text-xs font-bold text-white block">Mode de génération</span>
                  <span className="text-[11px] text-slate-400">
                    {generatorMode === 'image'
                      ? 'Mode Image : Priorité absolue au sujet demandé, aucun texte, aucun cadre de livre'
                      : 'Mode Couverture : Avec titre du livre, auteur et habillage éditorial'}
                  </span>
                </div>
                <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-white/10 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setGeneratorMode('image')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                      generatorMode === 'image'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Mode Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeneratorMode('cover')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                      generatorMode === 'cover'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Mode Couverture</span>
                  </button>
                </div>
              </div>

              {/* 1. QUE VOULEZ-VOUS CRÉER ? */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="direct-generator-prompt" className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <span>QUE VOULEZ-VOUS CRÉER ?</span>
                  </label>
                  <span className="text-[11px] text-purple-300 font-mono">
                    Priorité absolue à votre description
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    id="direct-generator-prompt"
                    rows={4}
                    value={generatorPrompt}
                    onChange={(e) => setGeneratorPrompt(e.target.value)}
                    placeholder={
                      generatorMode === 'image'
                        ? "Décrivez précisément ce que vous souhaitez voir. Ex: Une vraie photo réaliste d'un chef cuisinier en train de cuisiner dans une cuisine professionnelle moderne..."
                        : "Décrivez l'ambiance de votre couverture de livre. Ex: Une montagne enneigée sous un ciel étoilé, style minimaliste et épuré..."
                    }
                    className="w-full bg-slate-950 border border-white/15 rounded-xl p-3.5 pr-14 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-none transition"
                  />
                  <div className="absolute right-3 bottom-3">
                    <VoiceInputButton
                      currentValue={generatorPrompt}
                      onValueChange={setGeneratorPrompt}
                      targetFieldLabel="description de l'image"
                      buttonSize="md"
                      tooltipPosition="top"
                    />
                  </div>
                </div>
              </div>

              {/* 2. STYLE — FACULTATIF */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="direct-generator-style" className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
                    STYLE — FACULTATIF
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Champ libre (laissez vide si déjà dans le prompt)
                  </span>
                </div>
                <input
                  type="text"
                  id="direct-generator-style"
                  value={generatorStyle}
                  onChange={(e) => setGeneratorStyle(e.target.value)}
                  placeholder='Exemple : "photographie réaliste", "dessin au crayon", "rendu 3D", "peinture à l’huile"...'
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500 transition"
                />
              </div>

              {/* 3. FORMAT */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 block">
                  FORMAT
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGeneratorFormat('square')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 ${
                      generatorFormat === 'square'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Square className="w-4 h-4" />
                    <span>Carré (1:1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeneratorFormat('portrait')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 ${
                      generatorFormat === 'portrait'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <RectangleVertical className="w-4 h-4" />
                    <span>Portrait (3:4)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeneratorFormat('landscape')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 ${
                      generatorFormat === 'landscape'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <RectangleHorizontal className="w-4 h-4" />
                    <span>Paysage (16:9)</span>
                  </button>
                </div>
              </div>

              {/* 4. BOUTON GÉNÉRER */}
              <button
                type="button"
                id="direct-generate-btn"
                onClick={handleGenerateDirectImage}
                disabled={!generatorPrompt.trim() || isImageGenerating}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-purple-600/25 transition flex items-center justify-center gap-2.5 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isImageGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                    <span>Génération fidèle en cours...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-purple-200" />
                    <span>{generatorMode === 'image' ? "Générer l'image" : "Générer la couverture"}</span>
                  </>
                )}
              </button>

              {/* Error Display */}
              {generationError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{generationError}</span>
                </div>
              )}

              {/* Last Generation Metadata badge */}
              {lastGenerationInfo && (
                <div className="p-3 rounded-xl bg-slate-950 border border-white/10 space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Moteur : <strong className="text-purple-300">{lastGenerationInfo.engineUsed}</strong></span>
                    <span>Style : <strong className="text-indigo-300">{lastGenerationInfo.styleLabel}</strong></span>
                  </div>
                  {lastGenerationInfo.finalPromptSent && (
                    <details className="text-[10px] text-slate-500 cursor-pointer pt-1 border-t border-white/5">
                      <summary className="hover:text-slate-400">Voir le prompt exact envoyé au modèle</summary>
                      <p className="mt-1 text-slate-400 font-sans p-2 rounded bg-black/40 border border-white/5 text-[11px] leading-relaxed">
                        {lastGenerationInfo.finalPromptSent}
                      </p>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: CONVERSATIONAL ASSISTANT */}
          {selectedTab === 'chat' && (
            <CoverChatAssistant
              book={book}
              cover={cover}
              user={user}
              onUpdateCover={setCover}
              onTrackAiUsage={onTrackAiUsage}
              onRefundAiUsage={onRefundAiUsage}
              versions={versions}
              setVersions={setVersions}
              currentVersionNumber={currentVersionNumber}
              setCurrentVersionNumber={setCurrentVersionNumber}
              visualState={visualState}
              setVisualState={setVisualState}
              conversationHistory={conversationHistory}
              setConversationHistory={setConversationHistory}
            />
          )}

          {/* TAB 2: STYLE PRESETS */}
          {selectedTab === 'presets' && (
            <div className="space-y-4 p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-xl animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Directions Artistiques Clé-en-main (1-Clic)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Style actuel : {cover.style}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {styles.map((s) => {
                  const isSelected = cover.style === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleApplyStyle(s.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-600/20 ring-1 ring-purple-500/40'
                          : 'bg-slate-900/40 border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{s.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TEXTS & COLOR CUSTOMIZATION */}
          {selectedTab === 'customize' && (
            <div className="space-y-5 rounded-2xl bg-slate-900/60 border border-white/10 p-5 shadow-xl animate-in fade-in">
              {/* Titles */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Titre du livre (contrôlé par Book Pilot)
                  </label>
                  <input
                    type="text"
                    value={cover.title}
                    onChange={(e) => setCover({ ...cover, title: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Sous-titre
                  </label>
                  <input
                    type="text"
                    value={cover.subtitle || ''}
                    onChange={(e) => setCover({ ...cover, subtitle: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Nom de l'auteur
                  </label>
                  <input
                    type="text"
                    value={cover.author}
                    onChange={(e) => setCover({ ...cover, author: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Color Pickers */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Palette Chromatique
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Base Primaire</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl p-1.5">
                      <input
                        type="color"
                        value={cover.primaryColor}
                        onChange={(e) => setCover({ ...cover, primaryColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-[10px] font-mono text-slate-300 truncate">
                        {cover.primaryColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Dégradé Secondaire</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl p-1.5">
                      <input
                        type="color"
                        value={cover.secondaryColor}
                        onChange={(e) => setCover({ ...cover, secondaryColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-[10px] font-mono text-slate-300 truncate">
                        {cover.secondaryColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Accents Lumineux</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl p-1.5">
                      <input
                        type="color"
                        value={cover.accentColor}
                        onChange={(e) => setCover({ ...cover, accentColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-[10px] font-mono text-slate-300 truncate">
                        {cover.accentColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pattern and Font */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Motif de texture géométrique
                  </label>
                  <select
                    value={cover.pattern}
                    onChange={(e) => setCover({ ...cover, pattern: e.target.value as any })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  >
                    {patterns.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Association Typographique
                  </label>
                  <select
                    value={cover.fontFamily}
                    onChange={(e) => setCover({ ...cover, fontFamily: e.target.value as any })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  >
                    {fonts.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
