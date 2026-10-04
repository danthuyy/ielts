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
interface RecognitionResult extends ArrayLike<RecognitionAlternative> {
  isFinal?: boolean;
}
interface RecognitionEvent {
  results: ArrayLike<RecognitionResult>;
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
  /** What is being said right now, before the engine has settled on it. */
  interim: string;
  /**
   * How many times a press ended with nothing heard at all — a silent room, or
   * a microphone that picks up no sound. Lets the caller count it as a miss
   * instead of leaving the learner waiting on a recording that never ends.
   */
  silentEnds: number;
  /**
   * Every guess the engine offered for the last utterance, best first.
   *
   * The top guess alone is brittle: for near-homophones the engine routinely
   * ranks the wrong word first even for a good pronunciation, so a caller that
   * only checks `transcript` rejects a correct answer. Checking the whole list
   * — the correct word is usually somewhere in it — is far more forgiving.
   */
  alternatives: string[];
  /** Set on a recognition error, e.g. 'not-allowed' when the mic is blocked. */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/** Longest a single press may listen. A dead mic never raises an end event. */
const MAX_LISTEN_MS = 7000;
/** Quiet this long after the last new word means the learner has finished. */
const SETTLE_MS = 700;

export function useSpeechRecognition(lang = 'en-US'): SpeechRecognitionState {
  const Ctor = recognitionCtor();
  const supported = Ctor !== null;

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [interim, setInterim] = useState('');
  const [silentEnds, setSilentEnds] = useState(0);
  const gotResultRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const settleRef = useRef<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = lang;
    // One short utterance per press — the learner says a single word.
    recognition.continuous = false;
    // Interim results stream the words in as they are spoken, so the screen
    // shows what is being heard instead of sitting blank until the end.
    recognition.interimResults = true;
    // Ask for several guesses, not just the top one: the engine often ranks a
    // near-homophone first even for a clean pronunciation, and the word the
    // learner actually said sits a place or two down the list.
    recognition.maxAlternatives = 6;

    recognition.onresult = (event) => {
      const last = event.results?.[event.results.length - 1];
      const guesses: string[] = [];
      for (let i = 0; last && i < last.length; i++) {
        const text = last[i]?.transcript;
        if (text) guesses.push(text);
      }
      if (last?.isFinal === false) {
        setInterim(guesses[0] ?? '');
        // The engine waits a second or two of silence before it calls an
        // utterance finished. Cut that wait: once the words stop changing, stop
        // listening, so the result appears the moment the learner stops talking.
        window.clearTimeout(settleRef.current);
        settleRef.current = window.setTimeout(() => {
          try {
            recognition.stop();
          } catch {
            // no-op
          }
        }, SETTLE_MS);
        return;
      }
      window.clearTimeout(settleRef.current);
      gotResultRef.current = true;
      setInterim('');
      setTranscript(guesses[0] ?? '');
      setAlternatives(guesses);
    };
    recognition.onerror = (event) => {
      window.clearTimeout(timerRef.current);
      // Silence is an outcome, not a fault: onend follows and counts it. Only a
      // real fault (blocked or missing microphone) is surfaced as an error.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error ?? 'error');
      }
      setListening(false);
    };
    recognition.onend = () => {
      window.clearTimeout(timerRef.current);
      window.clearTimeout(settleRef.current);
      setListening(false);
      setInterim('');
      if (!gotResultRef.current) setSilentEnds((count) => count + 1);
    };

    recognitionRef.current = recognition;
    return () => {
      window.clearTimeout(timerRef.current);
      window.clearTimeout(settleRef.current);
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
    setAlternatives([]);
    setInterim('');
    setError(null);
    gotResultRef.current = false;
    try {
      recognition.start();
      setListening(true);
      // Stop by force if nothing ends the recording: a broken microphone can
      // leave the engine "listening" for ever, with no event to say otherwise.
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // no-op
        }
        // stop() waits for a result; if the engine is wedged, abort() ends it.
        timerRef.current = window.setTimeout(() => {
          try {
            recognition.abort();
          } catch {
            // no-op
          }
        }, 1500);
      }, MAX_LISTEN_MS);
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
    setInterim('');
    setSilentEnds(0);
    setAlternatives([]);
    setError(null);
  }, []);

  return {
    supported,
    listening,
    transcript,
    interim,
    silentEnds,
    alternatives,
    error,
    start,
    stop,
    reset,
  };
}
