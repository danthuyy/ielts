import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A thin wrapper over the browser's Web Speech API (`SpeechRecognition`).
 *
 * It runs entirely in the browser with no backend, which is why it fits a
 * static GitHub Pages app. Note the trade-off: Chrome performs the actual
 * recognition on Google's servers, so it needs a connection and is not truly
 * on-device. Support is essentially Chrome/Edge — `supported` is false
 * elsewhere, and callers hide the feature rather than offering a dead button.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionEvent {
  results: ArrayLike<ArrayLike<RecognitionAlternative>>;
}
interface RecognitionErrorEvent {
  error?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionState {
  /** False when the browser has no SpeechRecognition — hide the feature. */
  supported: boolean;
  listening: boolean;
  /** The most recent recognised text, '' until a result arrives. */
  transcript: string;
  /** Set on a recognition error, e.g. 'not-allowed' when the mic is blocked. */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(lang = 'en-US'): SpeechRecognitionState {
  const Ctor = recognitionCtor();
  const supported = Ctor !== null;

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = lang;
    // One short utterance per press — the learner says a single word.
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript ?? '';
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      setError(event.error ?? 'error');
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
        // abort() throws if it never started — nothing to clean up.
      }
      recognitionRef.current = null;
    };
  }, [Ctor, lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || listening) return;
    setTranscript('');
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if called while already running — ignore.
    }
  }, [listening]);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // no-op
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
