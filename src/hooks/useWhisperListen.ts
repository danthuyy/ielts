import { useCallback, useEffect, useRef, useState } from 'react';

import { isWhisperCapable, loadTranscriber, transcribeBlob } from '@/lib/asr/whisper';

/**
 * Record a short clip and transcribe it with the on-device Whisper model.
 *
 * Deliberately separate from `useSpeechRecognition`: the speaking rung runs both
 * at once — the built-in engine for an instant guess, this for a more accurate
 * one — and accepts the answer if either hears the word. This hook owns its own
 * microphone stream so the two never fight over one recorder's state.
 *
 * The model download starts the moment the learner first presses record, in
 * parallel with them speaking, so the wait is hidden behind something they were
 * going to do anyway.
 */

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WhisperListenState {
  supported: boolean;
  listening: boolean;
  /** Whisper is decoding the clip just recorded. */
  thinking: boolean;
  /** The transcript of the last clip, '' until one arrives. */
  transcript: string;
  modelStatus: ModelStatus;
  /** 0–1 while the model downloads on first use. */
  progress: number;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useWhisperListen(enabled: boolean): WhisperListenState {
  const supported = enabled && isWhisperCapable();

  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Warm the model as soon as recording starts, not before: the speaking rung is
  // the last rung, so most words never reach it and never pay the download.
  const warmModel = useCallback(() => {
    if (modelStatus === 'loading' || modelStatus === 'ready') return;
    setModelStatus('loading');
    loadTranscriber((info) => {
      if (!mountedRef.current) return;
      if (typeof info.progress === 'number') setProgress(Math.min(1, info.progress / 100));
    })
      .then(() => {
        if (!mountedRef.current) return;
        setProgress(1);
        setModelStatus('ready');
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setModelStatus('error');
      });
  }, [modelStatus]);

  const start = useCallback(() => {
    if (!supported || listening) return;
    setTranscript('');
    setError(null);
    warmModel();
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size === 0) return;
          setThinking(true);
          transcribeBlob(blob)
            .then((text) => {
              if (mountedRef.current) setTranscript(text);
            })
            .catch(() => {
              if (mountedRef.current) setError('transcribe-failed');
            })
            .finally(() => {
              if (mountedRef.current) setThinking(false);
            });
        };
        recorder.start();
        recorderRef.current = recorder;
        setListening(true);
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        setError(
          err instanceof DOMException && err.name === 'NotAllowedError' ? 'not-allowed' : 'mic',
        );
        setListening(false);
      });
  }, [supported, listening, warmModel]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current = null;
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    supported,
    listening,
    thinking,
    transcript,
    modelStatus,
    progress,
    error,
    start,
    stop,
    reset,
  };
}
