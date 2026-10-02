import React, { useState, useEffect, useRef } from 'react';
import { Mic, AlertCircle, Loader2, X, Check, Square } from 'lucide-react';
import { VoiceService, VoiceState, stitchTranscripts } from '../../services/voiceService';

export interface VoiceInputButtonProps {
  onTranscript?: (text: string, isFinal: boolean, fullSessionText?: string) => void;
  currentValue?: string;
  onValueChange?: (newValue: string) => void;
  targetFieldLabel?: string;
  language?: string;
  buttonSize?: 'xs' | 'sm' | 'md';
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  showInlineFeedback?: boolean;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  currentValue = '',
  onValueChange,
  targetFieldLabel = 'ce champ',
  language = 'fr-FR',
  buttonSize = 'sm',
  className = '',
  tooltipPosition = 'top',
  showInlineFeedback = true
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [stateMessage, setStateMessage] = useState<string>('');
  const [lastTranscribedText, setLastTranscribedText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const timerIntervalRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<any>(null);
  const initialValueRef = useRef<string>(currentValue);
  const isSessionOwnerRef = useRef<boolean>(false);

  // Keep initialValue updated when idle so new session merges with the latest input value
  useEffect(() => {
    if (voiceState === 'idle' || voiceState === 'ready' || voiceState === 'completed') {
      initialValueRef.current = currentValue;
    }
  }, [currentValue, voiceState]);

  // Check support on mount
  useEffect(() => {
    setIsSupported(VoiceService.isSupported());
    return () => {
      if (isSessionOwnerRef.current) {
        VoiceService.abortListening();
        isSessionOwnerRef.current = false;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const isRecording =
    voiceState === 'recording' ||
    voiceState === 'listening' ||
    voiceState === 'requesting_permission';

  const isTranscribing =
    voiceState === 'transcribing' ||
    voiceState === 'processing' ||
    voiceState === 'stopping';

  // Timer logic during active recording
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleToggleListening = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSupported) {
      setErrorMessage('La saisie vocale n’est pas supportée par ce navigateur.');
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // Toggle stop if already recording
    if (isRecording) {
      VoiceService.stopListening();
      return;
    }

    if (isTranscribing) {
      // Transcription already in flight, ignore rapid click
      return;
    }

    // Capture the text as it exists right before microphone recording begins
    initialValueRef.current = currentValue;
    setLastTranscribedText('');
    setErrorMessage(null);
    isSessionOwnerRef.current = true;

    await VoiceService.startRecording({
      language,
      onStateChange: (state, message) => {
        setVoiceState(state);
        if (message) setStateMessage(message);

        if (state === 'error' && message) {
          setErrorMessage(message);
        } else if (state === 'completed' || state === 'idle' || state === 'ready') {
          isSessionOwnerRef.current = false;
        }
      },
      onTranscriptEvent: (event) => {
        if (event.isFinal && event.finalText) {
          setLastTranscribedText(event.finalText);

          // Update parent input field exactly ONCE with clean stitch
          if (onValueChange) {
            const merged = stitchTranscripts(initialValueRef.current, event.finalText);
            onValueChange(merged);
          }

          // Trigger consumer callback
          onTranscript?.(event.finalText, true, event.finalText);
        }
      },
      onError: (err) => {
        setErrorMessage(err);
        isSessionOwnerRef.current = false;
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          setErrorMessage(null);
          setVoiceState('idle');
        }, 5000);
      }
    });
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    VoiceService.abortListening();
    isSessionOwnerRef.current = false;
    setVoiceState('idle');
    setLastTranscribedText('');
    setErrorMessage(null);
  };

  const sizeClasses = {
    xs: 'w-7 h-7 text-xs p-1',
    sm: 'w-8 h-8 text-xs p-1.5',
    md: 'w-10 h-10 text-sm p-2'
  }[buttonSize];

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  }[buttonSize];

  return (
    <div className="relative inline-flex items-center">
      {/* Primary Voice Mic Button */}
      <button
        type="button"
        onClick={handleToggleListening}
        aria-label={`Saisie vocale pour ${targetFieldLabel}`}
        title={
          !isSupported
            ? 'Saisie vocale non disponible sur ce navigateur'
            : isRecording
            ? 'Arrêter l’enregistrement et transcrire'
            : isTranscribing
            ? 'Transcription IA en cours...'
            : `Dicter à la voix (${targetFieldLabel})`
        }
        className={`relative rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 ${sizeClasses} ${
          isRecording
            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-400/50 scale-105'
            : isTranscribing
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
            : voiceState === 'completed'
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
            : voiceState === 'error'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
            : 'bg-white/5 hover:bg-purple-600/20 text-slate-400 hover:text-purple-300 border border-white/10 hover:border-purple-500/40'
        } ${!isSupported ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      >
        {isRecording ? (
          <div className="flex items-center justify-center gap-0.5 h-full">
            <span className="w-0.5 bg-white rounded-full animate-voice-wave-1" />
            <span className="w-0.5 bg-white rounded-full animate-voice-wave-2" />
            <span className="w-0.5 bg-white rounded-full animate-voice-wave-3" />
            <span className="w-0.5 bg-white rounded-full animate-voice-wave-4" />
          </div>
        ) : isTranscribing ? (
          <Loader2 className={`${iconSizes} animate-spin text-white`} />
        ) : voiceState === 'completed' ? (
          <Check className={`${iconSizes} text-white`} />
        ) : voiceState === 'error' ? (
          <AlertCircle className={iconSizes} />
        ) : (
          <Mic className={iconSizes} />
        )}
      </button>

      {/* Inline Feedback / Floating Voice Toast */}
      {showInlineFeedback && (isRecording || isTranscribing || voiceState === 'completed' || errorMessage) && (
        <div
          className={`absolute z-50 flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md shadow-2xl border transition-all animate-in fade-in duration-200 ${
            tooltipPosition === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : tooltipPosition === 'bottom'
              ? 'top-full mt-2 left-1/2 -translate-x-1/2'
              : tooltipPosition === 'left'
              ? 'right-full mr-2 top-1/2 -translate-y-1/2'
              : 'left-full ml-2 top-1/2 -translate-y-1/2'
          } ${
            errorMessage
              ? 'bg-rose-950/95 text-rose-200 border-rose-500/40'
              : isRecording
              ? 'bg-slate-900/95 text-slate-200 border-rose-500/50 ring-1 ring-rose-500/20'
              : isTranscribing
              ? 'bg-purple-950/95 text-purple-200 border-purple-500/40'
              : voiceState === 'completed'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40'
              : 'bg-slate-900/95 text-slate-200 border-white/10'
          }`}
          style={{ maxWidth: '320px', minWidth: isRecording ? '210px' : '170px' }}
        >
          {errorMessage ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </>
          ) : isTranscribing ? (
            <div className="flex items-center gap-2 text-[11px] text-purple-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
              <span>Transcription en cours...</span>
            </div>
          ) : isRecording ? (
            <>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-mono text-rose-400 font-semibold text-[11px]">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-[11px] leading-snug truncate text-slate-300">
                Écoute... Parlez
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={handleToggleListening}
                  className="p-1 hover:bg-emerald-500/20 rounded-md text-emerald-400 hover:text-emerald-300 transition"
                  title="Arrêter et transcrire"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition"
                  title="Annuler"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </>
          ) : voiceState === 'completed' && lastTranscribedText ? (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 truncate max-w-xs">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-medium">✓ Dicté : {lastTranscribedText}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
