import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  RefreshCw,
  Maximize2,
  Minimize2,
  Wand2,
  FileCheck2,
  PenTool,
  Send,
  X,
  Check,
  Quote
} from 'lucide-react';
import { AIService } from '../../services/aiService';
import { VoiceInputButton } from '../common/VoiceInputButton';
import { useLanguage, useTranslation } from '../../i18n';

interface AiCopilotPanelProps {
  currentText: string;
  chapterTitle: string;
  selectedTextContext?: string;
  initialDirective?: string;
  onApplyChanges: (newText: string) => void;
  onClose: () => void;
  onTrackAiUsage: () => void;
}

export const AiCopilotPanel: React.FC<AiCopilotPanelProps> = ({
  currentText,
  chapterTitle,
  selectedTextContext,
  initialDirective = '',
  onApplyChanges,
  onClose,
  onTrackAiUsage
}) => {
  const { contentLanguage } = useLanguage();
  const { t } = useTranslation();
  const [customPrompt, setCustomPrompt] = useState(initialDirective);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [activeActionLabel, setActiveActionLabel] = useState<string | null>(null);

  useEffect(() => {
    if (initialDirective) {
      setCustomPrompt(initialDirective);
    }
  }, [initialDirective]);

  const targetText = selectedTextContext && selectedTextContext.trim() ? selectedTextContext.trim() : currentText;
  const isSelectionMode = Boolean(selectedTextContext && selectedTextContext.trim());

  const copilotActions = [
    {
      id: 'rewrite',
      label: isSelectionMode ? t('editor.copilot.actionRewriteSelection', 'Réécrire ce passage') : t('editor.copilot.actionRewriteChapter', 'Réécrire le chapitre'),
      prompt: t('editor.copilot.promptRewrite', 'Réécris ce contenu avec une clarté remarquable, un rythme percutant et une grande fluidité éditoriale tout en préservant le fond.')
    },
    {
      id: 'professional',
      label: t('editor.copilot.actionProfessional', 'Ton plus professionnel'),
      prompt: t('editor.copilot.promptProfessional', 'Adopte une tonalité plus experte, soignée, élégante et rigoureuse.')
    },
    {
      id: 'shorten',
      label: t('editor.copilot.actionShorten', 'Raccourcir & Synthétiser'),
      prompt: t('editor.copilot.promptShorten', 'Raccourcis ce passage pour aller droit au but de manière synthétique et dense sans perte d’idées clés.')
    },
    {
      id: 'expand',
      label: t('editor.copilot.actionExpand', 'Développer & Enrichir'),
      prompt: t('editor.copilot.promptExpand', 'Développe ce passage en approfondissant les concepts, la méthode pas-à-pas et les explications.')
    },
    {
      id: 'examples',
      label: t('editor.copilot.actionExamples', 'Ajouter des exemples'),
      prompt: t('editor.copilot.promptExamples', 'Ajoute des cas concrets, des exemples applicables et des illustrations pratiques.')
    },
    {
      id: 'grammar',
      label: t('editor.copilot.actionGrammar', 'Corriger style & grammaire'),
      prompt: t('editor.copilot.promptGrammar', 'Corrige méticuleusement l’orthographe, la syntaxe, la ponctuation et le style littéraire.')
    }
  ];

  const handleExecuteAction = async (promptText: string, label: string) => {
    if (!targetText.trim() || isProcessing) return;

    setIsProcessing(true);
    setActiveActionLabel(label);
    setPreviewResult(null);

    try {
      const result = await AIService.executeCopilotAction(targetText, promptText, chapterTitle, contentLanguage);
      setPreviewResult(result);
      onTrackAiUsage();
    } catch {
      setPreviewResult(t('editor.copilot.error', 'Impossible d’appliquer l’instruction IA. Veuillez réessayer.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (previewResult) {
      if (isSelectionMode && selectedTextContext) {
        // Replace just the selected passage in the chapter
        const updated = currentText.replace(selectedTextContext, previewResult);
        onApplyChanges(updated);
      } else {
        onApplyChanges(previewResult);
      }
      setPreviewResult(null);
    }
  };

  return (
    <div className="w-80 sm:w-96 h-full bg-[#090a0f] border-l border-white/10 flex flex-col justify-between z-20 shadow-2xl animate-in slide-in-from-right-4 duration-200">
      {/* Copilot Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>{t('editor.copilotBtn', 'IA Copilot')}</span>
              {isSelectionMode && (
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-sans normal-case">
                  {t('editor.copilot.targetedPassage', 'Passage ciblé')}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 truncate max-w-[170px]">
              {chapterTitle}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Passage Preview if active */}
      {isSelectionMode && selectedTextContext && (
        <div className="px-4 py-2 bg-purple-950/20 border-b border-purple-500/20 text-xs">
          <div className="flex items-center gap-1 text-[10px] font-mono text-purple-400 font-bold mb-1">
            <Quote className="w-3 h-3" />
            <span>{t('editor.copilot.selectedPassageLabel', 'Passage sélectionné :')}</span>
          </div>
          <p className="text-slate-300 text-[11px] line-clamp-2 italic font-serif">
            « {selectedTextContext} »
          </p>
        </div>
      )}

      {/* Main Copilot Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Active Result Preview if generated */}
        {previewResult ? (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-purple-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {activeActionLabel || t('editor.copilot.aiSuggestion', 'Suggestion IA')}
              </span>
              <button
                onClick={() => setPreviewResult(null)}
                className="text-slate-500 hover:text-slate-300 text-[11px]"
              >
                {t('editor.copilot.discardBtn', 'Ignorer')}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/30 text-xs text-slate-200 font-sans leading-relaxed max-h-72 overflow-y-auto whitespace-pre-line shadow-inner">
              {previewResult}
            </div>

            <button
              id="copilot-apply-result-btn"
              onClick={handleApply}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSelectionMode ? t('editor.copilot.replaceSelection', 'Remplacer la sélection') : t('editor.copilot.applyBtn', 'Appliquer au chapitre')}</span>
            </button>
          </div>
        ) : isProcessing ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{t('editor.copilot.perfecting', 'Perfectionnement en cours...')}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {activeActionLabel || t('editor.copilot.processing', 'Traitement éditorial')}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Quick 1-Click Action Buttons */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block mb-2.5">
                {t('editor.copilot.quickActions', 'Actions Rapides')}
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {copilotActions.map((action) => (
                  <button
                    key={action.id}
                    id={`copilot-action-${action.id}`}
                    onClick={() => handleExecuteAction(action.prompt, action.label)}
                    className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-purple-600/15 border border-white/5 hover:border-purple-500/30 text-left text-xs font-medium text-slate-300 hover:text-white transition flex items-center justify-between group"
                  >
                    <span>{action.label}</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-600 group-hover:text-purple-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom Prompt & Voice Directive Input at Bottom */}
      <div className="p-4 border-t border-white/10 bg-slate-950/80">
        <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold mb-2">
          {t('editor.copilot.customDirectiveTitle', 'Instruction ou Commande Vocale')}
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customPrompt.trim()) {
                handleExecuteAction(customPrompt.trim(), t('editor.copilot.customDirectiveLabel', 'Instruction personnalisée'));
                setCustomPrompt('');
              }
            }}
            placeholder={t('editor.copilot.customPlaceholder', 'Ex : Ajoute 3 conseils stratégiques avec métriques...')}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-20 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {/* Voice input button inside AI Copilot */}
            <VoiceInputButton
              currentValue={customPrompt}
              onValueChange={setCustomPrompt}
              targetFieldLabel={t('editor.copilot.voiceAiCommand', 'commande IA')}
              buttonSize="xs"
              tooltipPosition="top"
            />

            <button
              onClick={() => {
                if (customPrompt.trim()) {
                  handleExecuteAction(customPrompt.trim(), t('editor.copilot.customDirectiveLabel', 'Instruction personnalisée'));
                  setCustomPrompt('');
                }
              }}
              disabled={!customPrompt.trim() || isProcessing}
              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 transition"
              title={t('editor.copilot.sendInstruction', 'Envoyer l’instruction')}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
