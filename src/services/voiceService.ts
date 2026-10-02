/**
 * VoiceInputService V2 for Book Pilot
 * 
 * Rock-solid single-recording architecture:
 * UTILISATEUR -> BOUTON MICROPHONE -> AUTORISATION MICROPHONE -> CAPTURE AUDIO (MediaRecorder)
 * -> ENREGISTREMENT AUDIO PROPRE -> ARRÊT -> ENVOI AU BACKEND (/api/transcribe-audio)
 * -> TRANSCRIPTION UNIQUE DE HAUTE PRÉCISION (Gemini) -> NETTOYAGE LÉGER
 * -> INSERTION PROPRE DANS LE CHAMP
 * 
 * Absolute guarantees:
 * 1. ZERO TECHNICAL DUPLICATION: Exactly ONE audio recording and ONE final transcript per session.
 *    No continuous Web Speech API race conditions, no interim/final buffer collisions.
 * 2. SINGLE ACTIVE SESSION: Monotonic voiceSessionId drops any delayed responses or overlapping requests.
 * 3. HARDWARE RELEASE: All MediaStream tracks are immediately closed on stop/cancel (Android Chrome compatible).
 * 4. NATURAL SPEECH: High-fidelity natural French transcription with punctuation, keeping intentional repetitions.
 * 5. MODULAR & RESILIENT: Works across all Book Pilot input fields (Copilot, Editor, Covers, Books).
 */

export type VoiceState =
  | 'idle'
  | 'ready'
  | 'requesting_permission'
  | 'recording'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'stopping'
  | 'completed'
  | 'error';

export interface VoiceTranscriptEvent {
  finalText: string;
  fullFinalText: string;
  interimText: string;
  isFinal: boolean;
}

export interface VoiceServiceOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onStateChange?: (state: VoiceState, message?: string) => void;
  onTranscript?: (
    transcript: string,
    isFinal: boolean,
    fullSessionText?: string
  ) => void;
  onTranscriptEvent?: (event: VoiceTranscriptEvent) => void;
  onError?: (error: string) => void;
}

/**
 * Normalizes language codes to standard BCP 47 tags
 */
export function normalizeLanguageCode(lang?: string): string {
  if (!lang) {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }
    return 'fr-FR';
  }

  const l = lang.toLowerCase().trim();
  if (l.startsWith('fr') || l.includes('french') || l.includes('français')) return 'fr-FR';
  if (l.startsWith('en') || l.includes('english') || l.includes('anglais')) return 'en-US';
  if (l.startsWith('es') || l.includes('spanish') || l.includes('espagnol')) return 'es-ES';
  if (l.startsWith('de') || l.includes('german') || l.includes('allemand')) return 'de-DE';
  if (l.startsWith('it') || l.includes('italian') || l.includes('italien')) return 'it-IT';
  if (l.startsWith('pt') || l.includes('portuguese') || l.includes('portugais')) return 'pt-BR';

  return lang;
}

/**
 * Light cleanup of transcript:
 * - Trims redundant whitespace
 * - Normalizes spacing before punctuation (e.g. " ," -> ", ")
 * - Preserves intentional user repetitions like "très très important"
 */
export function cleanTranscript(raw: string): string {
  if (!raw) return '';

  let cleaned = raw.trim();

  // Normalize multiple spaces/tabs to single space
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Remove space before commas and periods: " ," -> ",", " ." -> "."
  cleaned = cleaned.replace(/\s+([,.])/g, '$1');

  // Strip wrapping quotation marks if model enclosed text
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith('«') && cleaned.endsWith('»'))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

/**
 * Intelligently joins preexisting text in an input field with the newly dictated transcript
 */
export function stitchTranscripts(existing: string, incoming: string): string {
  const cleanExisting = (existing || '').trim();
  const cleanIncoming = cleanTranscript(incoming);

  if (!cleanExisting) return cleanIncoming;
  if (!cleanIncoming) return cleanExisting;

  // Exact duplicate check
  if (cleanExisting.toLowerCase() === cleanIncoming.toLowerCase()) {
    return cleanExisting;
  }

  // Preexisting ends with incoming text
  if (cleanExisting.toLowerCase().endsWith(cleanIncoming.toLowerCase())) {
    return cleanExisting;
  }

  // Detect word overlap at boundary
  const wordsExisting = cleanExisting.split(/\s+/);
  const wordsIncoming = cleanIncoming.split(/\s+/);

  const maxOverlap = Math.min(wordsExisting.length, wordsIncoming.length, 8);
  let overlap = 0;

  for (let len = maxOverlap; len >= 1; len--) {
    const endSlice = wordsExisting.slice(-len).join(' ').toLowerCase();
    const startSlice = wordsIncoming.slice(0, len).join(' ').toLowerCase();
    if (endSlice === startSlice) {
      overlap = len;
      break;
    }
  }

  if (overlap > 0) {
    const remainder = wordsIncoming.slice(overlap).join(' ');
    if (!remainder) return cleanExisting;
    return `${cleanExisting} ${remainder}`;
  }

  // Standard boundary separator
  const lastChar = cleanExisting[cleanExisting.length - 1];
  const separator = (lastChar === '\n' || lastChar === ' ') ? '' : ' ';
  return `${cleanExisting}${separator}${cleanIncoming}`;
}

export const mergeTranscriptSegments = stitchTranscripts;
export const cleanTranscriptChunk = cleanTranscript;
export function deduplicatePhrases(text: string): string {
  return cleanTranscript(text);
}

/**
 * Detect the best supported audio MIME type for MediaRecorder on this device/browser
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }

  const mimeCandidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
    'audio/aac'
  ];

  for (const mime of mimeCandidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return '';
}

/**
 * Centralized Voice & Audio Transcription Service V2
 */
export class VoiceService {
  private static activeSessionId = 0;
  private static lastProcessedSessionId = 0;
  private static isTransitioning = false;
  private static isRecording = false;

  private static currentOptions: VoiceServiceOptions | null = null;
  private static currentState: VoiceState = 'idle';

  private static mediaStream: MediaStream | null = null;
  private static mediaRecorder: MediaRecorder | null = null;
  private static recordedChunks: Blob[] = [];
  private static activeMimeType = 'audio/webm';
  private static recordingTimeoutTimer: any = null;

  // Single-shot browser recognition fallback (only if MediaRecorder is unavailable)
  private static fallbackRecognition: any = null;

  /**
   * Check if recording or speech recognition is supported in this browser
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const hasMedia = !!(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
    const hasSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    return hasMedia || hasSpeech;
  }

  /**
   * Check if MediaRecorder is supported
   */
  static hasMediaRecorder(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
  }

  /**
   * Check current voice state
   */
  static getState(): VoiceState {
    return this.currentState;
  }

  /**
   * Internal state transition with callback notification
   */
  private static setState(state: VoiceState, message?: string): void {
    this.currentState = state;
    this.currentOptions?.onStateChange?.(state, message);
  }

  /**
   * Start a clean audio recording session
   */
  static async startRecording(options: VoiceServiceOptions): Promise<boolean> {
    // Rapid double-click protection
    if (this.isTransitioning) {
      console.warn('[Voice V2] Rapid click ignored: transition in progress');
      return false;
    }

    // Toggle stop if already recording
    if (this.isRecording) {
      this.stopRecording();
      return true;
    }

    this.isTransitioning = true;
    const sessionId = ++this.activeSessionId;

    try {
      this.abortCurrentHardware();
      this.currentOptions = options;
      this.recordedChunks = [];

      this.setState('requesting_permission', 'Demande d’accès au microphone...');

      // Check browser hardware access
      if (!this.isSupported()) {
        this.handleFatalError('La capture vocale n’est pas supportée sur ce navigateur.');
        return false;
      }

      // Check if MediaRecorder is available (Primary V2 Architecture)
      if (this.hasMediaRecorder()) {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (permErr: any) {
          if (this.activeSessionId !== sessionId) return false;
          let userMsg = 'Accès au microphone refusé. Veuillez autoriser le micro dans votre navigateur.';
          if (permErr?.name === 'NotFoundError' || permErr?.name === 'DevicesNotFoundError') {
            userMsg = 'Aucun microphone détecté sur cet appareil.';
          }
          this.handleFatalError(userMsg);
          return false;
        }

        // Verify session wasn't aborted while awaiting permission
        if (this.activeSessionId !== sessionId) {
          if (stream) stream.getTracks().forEach((t) => t.stop());
          return false;
        }

        this.mediaStream = stream;
        const mime = getSupportedAudioMimeType();
        this.activeMimeType = mime || 'audio/webm';

        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        recorder.onerror = (err) => {
          console.warn('[Voice V2] MediaRecorder error:', err);
          if (this.activeSessionId === sessionId) {
            this.handleFatalError('Une erreur est survenue lors de l’enregistrement audio.');
          }
        };

        this.mediaRecorder = recorder;
        this.isRecording = true;

        recorder.start(250); // Flush chunks every 250ms
        this.setState('recording', 'Enregistrement en cours... Parlez naturellement.');

        // Safety timeout: Auto-stop after 120 seconds if left unattended
        if (this.recordingTimeoutTimer) clearTimeout(this.recordingTimeoutTimer);
        this.recordingTimeoutTimer = setTimeout(() => {
          if (this.isRecording && this.activeSessionId === sessionId) {
            this.stopRecording();
          }
        }, 120000);

        return true;
      }

      // Fallback: Single-shot Web Speech recognition (if MediaRecorder is unavailable)
      return this.startFallbackSingleShot(options, sessionId);
    } catch (err: any) {
      console.error('[Voice V2] Start failed:', err);
      this.handleFatalError('Impossible d’initialiser le microphone.');
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Stop recording and initiate single transcription
   */
  static async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      this.setState('idle');
      return;
    }

    if (this.recordingTimeoutTimer) {
      clearTimeout(this.recordingTimeoutTimer);
      this.recordingTimeoutTimer = null;
    }

    this.isRecording = false;
    const sessionId = this.activeSessionId;
    this.setState('transcribing', 'Transcription IA de haute précision en cours...');

    // If using MediaRecorder:
    if (this.mediaRecorder) {
      const recorder = this.mediaRecorder;
      const stream = this.mediaStream;
      const mime = this.activeMimeType;

      this.mediaRecorder = null;
      this.mediaStream = null;

      const finishPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          // RELEASE HARDWARE IMMEDIATELY
          if (stream) {
            try {
              stream.getTracks().forEach((t) => t.stop());
            } catch {
              // ignore
            }
          }
          const blob = new Blob(this.recordedChunks, { type: mime || 'audio/webm' });
          resolve(blob);
        };
      });

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch (err) {
        console.warn('[Voice V2] Error stopping recorder:', err);
      }

      const audioBlob = await finishPromise;

      // Drop if session was canceled in the meantime
      if (this.activeSessionId !== sessionId) {
        return;
      }

      // If audio is empty or too short (< 200 bytes)
      if (!audioBlob || audioBlob.size < 200) {
        this.setState('idle');
        return;
      }

      // Transcribe via backend /api/transcribe-audio
      await this.sendAudioForTranscription(audioBlob, mime, sessionId);
      return;
    }

    // If using fallback Web Speech API:
    if (this.fallbackRecognition) {
      try {
        this.fallbackRecognition.stop();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Sends audio blob to backend and inserts result ONCE
   */
  private static async sendAudioForTranscription(
    audioBlob: Blob,
    mimeType: string,
    sessionId: number
  ): Promise<void> {
    try {
      this.setState('processing', 'Analyse du langage et transcription...');

      const base64Audio = await this.blobToBase64(audioBlob);

      // Verify session is still valid
      if (this.activeSessionId !== sessionId) return;

      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: mimeType.split(';')[0],
          language: normalizeLanguageCode(this.currentOptions?.language)
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

      // Verify session is still valid
      if (this.activeSessionId !== sessionId) return;

      if (data && data.success && typeof data.transcript === 'string') {
        const cleanedText = cleanTranscript(data.transcript);

        // Guard against duplicate processing
        if (this.lastProcessedSessionId === sessionId) {
          return;
        }
        this.lastProcessedSessionId = sessionId;

        if (cleanedText) {
          // Emit single final result
          this.currentOptions?.onTranscriptEvent?.({
            finalText: cleanedText,
            fullFinalText: cleanedText,
            interimText: '',
            isFinal: true
          });

          this.currentOptions?.onTranscript?.(cleanedText, true, cleanedText);

          this.setState('completed', 'Transcription validée.');
          setTimeout(() => {
            if (this.currentState === 'completed' && this.activeSessionId === sessionId) {
              this.setState('idle');
            }
          }, 1600);
        } else {
          // Audio was silent or empty
          this.setState('idle');
        }
      } else {
        const errorMsg = data.message || 'La transcription a échoué.';
        this.handleFatalError(errorMsg);
      }
    } catch (err: any) {
      console.error('[Voice V2] Network transcription error:', err);
      if (this.activeSessionId === sessionId) {
        this.handleFatalError('Erreur de connexion lors de la transcription.');
      }
    }
  }

  /**
   * Single-shot fallback using browser SpeechRecognition (only if MediaRecorder unsupported)
   */
  private static startFallbackSingleShot(
    options: VoiceServiceOptions,
    sessionId: number
  ): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.handleFatalError('La saisie vocale n’est pas supportée sur ce navigateur.');
      return false;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Strictly single-shot!
      recognition.interimResults = false; // No interim streaming duplicates!
      recognition.maxAlternatives = 1;
      recognition.lang = normalizeLanguageCode(options.language);

      let capturedText = '';

      recognition.onstart = () => {
        if (this.activeSessionId !== sessionId) return;
        this.isRecording = true;
        this.setState('recording', 'Écoute active... Parlez maintenant.');
      };

      recognition.onresult = (event: any) => {
        if (this.activeSessionId !== sessionId) return;
        if (event.results && event.results[0] && event.results[0][0]) {
          capturedText = event.results[0][0].transcript || '';
        }
      };

      recognition.onerror = (event: any) => {
        if (this.activeSessionId !== sessionId) return;
        if (event.error === 'no-speech') {
          this.setState('idle');
          return;
        }
        this.handleFatalError('Erreur lors de la capture vocale.');
      };

      recognition.onend = () => {
        if (this.activeSessionId !== sessionId) return;
        this.isRecording = false;
        this.fallbackRecognition = null;

        const clean = cleanTranscript(capturedText);
        if (clean && this.lastProcessedSessionId !== sessionId) {
          this.lastProcessedSessionId = sessionId;

          this.currentOptions?.onTranscriptEvent?.({
            finalText: clean,
            fullFinalText: clean,
            interimText: '',
            isFinal: true
          });
          this.currentOptions?.onTranscript?.(clean, true, clean);

          this.setState('completed', 'Transcription validée.');
          setTimeout(() => {
            if (this.currentState === 'completed') {
              this.setState('idle');
            }
          }, 1500);
        } else {
          this.setState('idle');
        }
      };

      this.fallbackRecognition = recognition;
      recognition.start();
      return true;
    } catch (err) {
      console.warn('[Voice V2] Fallback start failed:', err);
      this.handleFatalError('Impossible de démarrer la reconnaissance vocale.');
      return false;
    }
  }

  /**
   * Cancel and abort current recording without saving
   */
  static cancelRecording(): void {
    this.activeSessionId++;
    this.isRecording = false;
    if (this.recordingTimeoutTimer) {
      clearTimeout(this.recordingTimeoutTimer);
      this.recordingTimeoutTimer = null;
    }
    this.abortCurrentHardware();
    this.setState('idle');
  }

  /**
   * Hardware cleanup helper
   */
  private static abortCurrentHardware(): void {
    if (this.mediaRecorder) {
      try {
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onerror = null;
        this.mediaRecorder.onstop = null;
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch {
        // ignore
      }
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      this.mediaStream = null;
    }

    if (this.fallbackRecognition) {
      try {
        this.fallbackRecognition.onstart = null;
        this.fallbackRecognition.onresult = null;
        this.fallbackRecognition.onerror = null;
        this.fallbackRecognition.onend = null;
        this.fallbackRecognition.abort();
      } catch {
        // ignore
      }
      this.fallbackRecognition = null;
    }

    this.recordedChunks = [];
  }

  /**
   * Handle fatal error with cleanup
   */
  private static handleFatalError(message: string): void {
    this.isRecording = false;
    this.abortCurrentHardware();
    this.currentOptions?.onError?.(message);
    this.setState('error', message);
  }

  /**
   * Helper to convert Blob to base64
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Backwards compatibility aliases
  static startListening(options: VoiceServiceOptions): Promise<boolean> {
    return this.startRecording(options);
  }

  static stopListening(): void {
    this.stopRecording();
  }

  static abortListening(): void {
    this.cancelRecording();
  }

  static getConfirmedText(): string {
    return '';
  }
}
