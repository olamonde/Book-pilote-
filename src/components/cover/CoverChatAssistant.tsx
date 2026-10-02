import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Undo2,
  Wand2,
  Info
} from 'lucide-react';
import {
  Book,
  CoverConfig,
  CoverChatMessage,
  CoverVisualState,
  CoverVersionItem,
  User
} from '../../types';
import { AIService } from '../../services/aiService';
import { validateAndSanitizeCoverSvg } from '../../utils/svgSanitizer';
import { VoiceInputButton } from '../common/VoiceInputButton';
import { useLanguage, useTranslation } from '../../i18n';

interface CoverChatAssistantProps {
  book: Book;
  cover: CoverConfig;
  user?: User;
  onUpdateCover: (newCover: CoverConfig) => void;
  onTrackAiUsage: () => void;
  onRefundAiUsage?: () => void;
  versions: CoverVersionItem[];
  setVersions: React.Dispatch<React.SetStateAction<CoverVersionItem[]>>;
  currentVersionNumber: number;
  setCurrentVersionNumber: React.Dispatch<React.SetStateAction<number>>;
  visualState: CoverVisualState;
  setVisualState: React.Dispatch<React.SetStateAction<CoverVisualState>>;
  conversationHistory: CoverChatMessage[];
  setConversationHistory: React.Dispatch<React.SetStateAction<CoverChatMessage[]>>;
}

export const CoverChatAssistant: React.FC<CoverChatAssistantProps> = ({
  book,
  cover,
  user,
  onUpdateCover,
  onTrackAiUsage,
  onRefundAiUsage,
  versions,
  setVersions,
  currentVersionNumber,
  setCurrentVersionNumber,
  visualState,
  setVisualState,
  conversationHistory,
  setConversationHistory
}) => {
  const { interfaceLanguage, contentLanguage } = useLanguage();
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingArtwork, setIsGeneratingArtwork] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, isAnalyzing, isGeneratingArtwork]);

  // Remaining credits calculation
  const creditsUsed = user?.aiGenerationsUsed ?? 0;
  const creditsLimit = user?.aiGenerationsLimit ?? 5;
  const creditsRemaining = Math.max(0, creditsLimit - creditsUsed);
  const hasCredits = creditsRemaining > 0;

  // Restore a given version
  const handleSelectVersion = (version: CoverVersionItem) => {
    setCurrentVersionNumber(version.versionNumber);
    setVisualState(version.visualState);
    onUpdateCover({
      ...version.cover,
      // Retain current book title/subtitle/author in case user customized them in studio
      title: cover.title,
      subtitle: cover.subtitle,
      author: cover.author
    });

    // Add note in chat
    const systemMsg: CoverChatMessage = {
      id: `sys-${Date.now()}`,
      sender: 'assistant',
      text: t('coverStudio.chat.revertedMsg', { version: version.versionNumber, label: version.label }),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent: 'restore_version'
    };
    setConversationHistory((prev) => [...prev, systemMsg]);
  };

  // Main message dispatch
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? inputText).trim();
    if (!textToSend || isAnalyzing || isGeneratingArtwork) return;

    setErrorMessage(null);
    setInputText('');

    // 1. Append user message to conversation history
    const userMsg: CoverChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [...conversationHistory, userMsg];
    setConversationHistory(updatedHistory);
    setIsAnalyzing(true);

    try {
      // 2. Call backend conversational interpreter
      const result = await AIService.interpretCoverChat({
        message: textToSend,
        bookContext: {
          title: cover.title || book.title,
          subtitle: cover.subtitle || book.subtitle,
          author: cover.author || book.author,
          genre: book.genre || book.targetAudience,
          tone: book.tone,
          description: book.description,
          targetAudience: book.targetAudience,
          language: book.language || contentLanguage
        },
        currentCover: cover,
        currentVisualState: visualState,
        versions,
        currentVersionNumber,
        conversationHistory: updatedHistory.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        interfaceLanguage
      });

      // 3. ACTION: RESTORE VERSION
      if (result.intent === 'restore_version' && result.targetVersionNumber) {
        setIsAnalyzing(false);
        const target = versions.find((v) => v.versionNumber === result.targetVersionNumber);
        if (target) {
          handleSelectVersion(target);
          return;
        } else {
          // If specified version not found, restore previous version if available
          const prevVersion = versions[versions.length - 2];
          if (prevVersion) {
            handleSelectVersion(prevVersion);
            return;
          }
        }
      }

      // 4. ACTION: CHAT / ADVICE / ANALYSIS (NO CREDITS CONSUMED, NO IMAGE GENERATION)
      if (result.intent === 'chat' || !result.enhancedSvgPrompt) {
        setIsAnalyzing(false);
        const aiMsg: CoverChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: result.aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: 'chat'
        };
        setConversationHistory((prev) => [...prev, aiMsg]);
        return;
      }

      // 5. ACTION: GENERATE / REGENERATE (CONSUMES CREDIT WITH PRIOR RESERVATION AND REFUND ON FAILURE)
      if (result.intent === 'generate') {
        // Verify credit limit before proceeding
        if (!hasCredits) {
          setIsAnalyzing(false);
          const creditExhaustedMsg: CoverChatMessage = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: `Vous avez atteint votre quota de générations d'IA (${creditsLimit}/${creditsLimit} utilisées). Pour concevoir de nouvelles versions, vous pouvez mettre à niveau votre forfait dans l'onglet Facturation.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            intent: 'chat'
          };
          setConversationHistory((prev) => [...prev, creditExhaustedMsg]);
          return;
        }

        // RESERVE CREDIT BEFORE GENERATION STARTS
        onTrackAiUsage();
        setIsAnalyzing(false);
        setIsGeneratingArtwork(true);

        try {
          // Generate the artwork using the refined contextual SVG prompt
          const newImageUrl = await AIService.generateCoverArtwork(
            result.enhancedSvgPrompt,
            {
              title: cover.title || book.title,
              subtitle: cover.subtitle || book.subtitle,
              author: cover.author || book.author,
              genre: book.genre || book.targetAudience,
              tone: book.tone,
              description: book.description,
              targetAudience: book.targetAudience
            },
            {
              mode: result.isCoverRequest ? 'cover' : 'image',
              isArtworkOnly: result.isArtworkOnly,
              detectedStyle: result.detectedStyle,
              userPrompt: textToSend
            }
          );

          let finalImageUrl = newImageUrl;
          if (newImageUrl && newImageUrl.startsWith('data:image/svg+xml;base64,')) {
            try {
              const rawSvgStr = atob(newImageUrl.replace('data:image/svg+xml;base64,', ''));
              const validation = validateAndSanitizeCoverSvg(rawSvgStr);
              finalImageUrl = `data:image/svg+xml;base64,${btoa(validation.sanitizedSvg)}`;
            } catch (sanErr) {
              console.warn('[Cover Chat] SVG post-validation notice:', sanErr);
            }
          }

          // Determine next version number
          const maxNum =
            versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) : 0;
          const newVersionNumber = maxNum + 1;

          // Assemble new cover configuration while preserving textual bylines
          const isArtworkOnly = result.isArtworkOnly ?? (!result.isCoverRequest);
          const newCover: CoverConfig = {
            ...cover,
            imageUrl: finalImageUrl,
            customPrompt: result.enhancedSvgPrompt,
            isArtworkOnly,
            showTextOverlay: !isArtworkOnly,
            displayMode: isArtworkOnly ? 'artwork' : 'cover',
            detectedStyle: result.detectedStyle,
            ...(result.suggestedColors?.style ? { style: result.suggestedColors.style } : {}),
            ...(result.suggestedColors?.primaryColor
              ? { primaryColor: result.suggestedColors.primaryColor }
              : {}),
            ...(result.suggestedColors?.secondaryColor
              ? { secondaryColor: result.suggestedColors.secondaryColor }
              : {}),
            ...(result.suggestedColors?.accentColor
              ? { accentColor: result.suggestedColors.accentColor }
              : {}),
            ...(result.suggestedColors?.textColor
              ? { textColor: result.suggestedColors.textColor }
              : {}),
            ...(result.suggestedColors?.pattern
              ? { pattern: result.suggestedColors.pattern }
              : {})
          };

          const newVersionItem: CoverVersionItem = {
            id: `v-${Date.now()}-${newVersionNumber}`,
            versionNumber: newVersionNumber,
            label: `Version ${newVersionNumber}`,
            description:
              result.updatedVisualState?.currentDescription?.slice(0, 80) || textToSend,
            cover: newCover,
            visualState: result.updatedVisualState,
            createdAt: new Date().toISOString()
          };

          // Update versions and active state
          setVersions((prev) => [...prev, newVersionItem]);
          setCurrentVersionNumber(newVersionNumber);
          setVisualState(result.updatedVisualState);
          onUpdateCover(newCover);

          // Add assistant message with version stamp
          const aiSuccessMsg: CoverChatMessage = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: result.aiReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            versionCreated: newVersionNumber,
            intent: 'generate'
          };
          setConversationHistory((prev) => [...prev, aiSuccessMsg]);
        } catch (genErr: any) {
          console.error('[Cover Generation Error]:', genErr);
          // AUTOMATIC CREDIT REFUND ON GENERATION FAILURE
          if (onRefundAiUsage) {
            onRefundAiUsage();
          }

          const failMsg: CoverChatMessage = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: `La création visuelle a rencontré une difficulté. Votre crédit a été immédiatement remboursé. N'hésitez pas à reformuler votre consigne ou à réessayer.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            intent: 'chat'
          };
          setConversationHistory((prev) => [...prev, failMsg]);
          setErrorMessage(
            genErr?.message || "La création de la couverture n'a pas pu aboutir. Votre crédit a été remboursé."
          );
        } finally {
          setIsGeneratingArtwork(false);
        }
      }
    } catch (err: any) {
      console.error('[Cover Chat Error]:', err);
      setIsAnalyzing(false);
      setIsGeneratingArtwork(false);
      const errReply: CoverChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: `Désolé, une erreur est survenue lors de l'analyse. Veuillez vérifier votre connexion et réessayer.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: 'chat'
      };
      setConversationHistory((prev) => [...prev, errReply]);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Dynamic quick suggestion pills according to current state
  const quickSuggestions =
    versions.length === 0
      ? [
          'Roman fantastique avec montagne enneigée, lune rouge et silhouette',
          'Thriller sombre et cinématographique aux contrastes intenses',
          'Design minimaliste moderne avec reflets dorés prestigieux',
          'Quels styles et couleurs me conseilles-tu pour ce livre ?'
        ]
      : [
          'Agrandis la montagne pour la rendre imposante',
          'Rends la lune plus petite et place-la en haut à droite',
          'Ajoute du brouillard mystérieux',
          'Garde tout sauf la couleur',
          'Fais le personnage plus petit',
          'Ne touche pas au titre',
          'Remets la version précédente'
        ];

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-purple-500/20 shadow-xl overflow-hidden">
      {/* Top Header: Assistant Identity & Credit Status */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-950/50 via-slate-900/80 to-slate-900/60 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Book Pilot AI
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {t('coverStudio.chat.artDirectorBadge')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {t('coverStudio.chat.dialogueDesc')}
            </p>
          </div>
        </div>

        {/* Credits Pill */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono"
            title={t('coverStudio.chat.creditNotice')}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-300">
              {creditsRemaining} / {creditsLimit}
            </span>
            <span className="text-slate-500 text-[10px]">{t('coverStudio.chat.aiCredits')}</span>
          </div>
        </div>
      </div>

      {/* Version History Toolbar */}
      {versions.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0 mr-1">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>{t('coverStudio.chat.history')}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {versions.map((v) => {
              const isCurrent = v.versionNumber === currentVersionNumber;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectVersion(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                    isCurrent
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/40 ring-1 ring-purple-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                  }`}
                  title={v.description}
                >
                  <span>V{v.versionNumber}</span>
                  {isCurrent && (
                    <span className="text-[9px] px-1 py-0.2 bg-purple-900/80 rounded font-mono">
                      {t('coverStudio.chat.currentVersion')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick previous version revert button */}
          {versions.length > 1 && (
            <button
              type="button"
              onClick={() => handleSendMessage('Remets la version précédente')}
              disabled={isAnalyzing || isGeneratingArtwork}
              className="ml-auto text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition flex items-center gap-1 shrink-0"
              title={t('coverStudio.chat.undoLast')}
            >
              <Undo2 className="w-3 h-3 text-purple-400" />
              <span>{t('coverStudio.chat.undoLast')}</span>
            </button>
          )}
        </div>
      )}

      {/* Conversation Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[300px] max-h-[460px]">
        {conversationHistory.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-950/90 text-slate-200 border border-white/10 rounded-bl-xs'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-white/10 text-[10px] font-semibold text-purple-300">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Book Pilot AI</span>
                    {msg.versionCreated && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                        {t('coverStudio.chat.versionCreated', { version: msg.versionCreated })}
                      </span>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
              <span className="text-[9px] text-slate-500 font-mono px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {/* Analyzing / Interpreting Indicator */}
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/30 border border-purple-500/20 p-3 rounded-2xl max-w-[85%] animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            <span>{t('coverStudio.chat.analyzing')}</span>
          </div>
        )}

        {/* Artwork Generation In Progress Indicator */}
        {isGeneratingArtwork && (
          <div className="flex flex-col gap-1.5 text-xs text-purple-200 bg-purple-950/40 border border-purple-500/30 p-3.5 rounded-2xl max-w-[90%] shadow-lg shadow-purple-950/30 animate-pulse">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 animate-spin text-purple-400" />
              <span className="font-semibold text-white">
                {t('coverStudio.chat.generatingTitle')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 pl-6">
              {t('coverStudio.chat.generatingDesc')}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Pills */}
      <div className="px-4 py-2 bg-slate-950/50 border-t border-white/10">
        <div className="flex items-center gap-1 mb-1.5">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {t('coverStudio.chat.quickSuggestionsTitle')}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(suggestion)}
              disabled={isAnalyzing || isGeneratingArtwork}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition text-left truncate max-w-full disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="mx-4 mb-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white text-xs"
          >
            ×
          </button>
        </div>
      )}

      {/* Bottom Message Input Form */}
      <div className="p-3 bg-slate-950 border-t border-white/10">
        <div className="flex items-end gap-2">
          {/* Voice Input Button */}
          <VoiceInputButton
            currentValue={inputText}
            onValueChange={setInputText}
            targetFieldLabel={t('coverStudio.chat.targetFieldVoice')}
            buttonSize="md"
            tooltipPosition="top"
          />

          {/* Chat Textarea Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAnalyzing || isGeneratingArtwork}
              placeholder={t('coverStudio.chat.placeholder')}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none leading-relaxed"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isAnalyzing || isGeneratingArtwork}
            className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-purple-600/30 transition shrink-0 hover:scale-[1.03] active:scale-[0.97]"
            title={t('coverStudio.chat.sendBtn')}
          >
            {isAnalyzing || isGeneratingArtwork ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
          <span>{t('coverStudio.chat.keyboardHint')}</span>
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3 text-purple-400" />
            <span>{t('coverStudio.chat.creditNotice')}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
