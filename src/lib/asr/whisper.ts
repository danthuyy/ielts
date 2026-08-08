/**
 * On-device speech recognition with Whisper, for the speaking rung.
 *
 * The browser's built-in recogniser (Web Speech) mishears often — it splits one
 * word into two, or lands on a near-homophone — because we don't control the
 * engine. Whisper runs the actual model on the learner's machine, so it is both
 * more accurate and works offline once the model is cached.
 *
 * It stays free and static-host friendly by loading everything in the browser:
 * the Transformers.js runtime is pulled from a CDN on first use (never at app
 * start — the speaking rung is the last rung a word reaches, so this is
 * lazy-loaded only when actually needed), and the ~40MB quantised tiny model is
 * fetched from the Hugging Face hub and cached by the browser thereafter.
 *
 * WASM single-threaded on purpose: GitHub Pages can't send the COOP/COEP
 * headers that multi-threaded WASM needs, so asking for threads would only
 * error. tiny.en on a one-word clip is a second or two even so.
 */

// The Transformers.js ESM bundle, pinned. Imported at runtime, not bundled.
const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
const MODEL = 'Xenova/whisper-tiny.en';
const SAMPLE_RATE = 16000;

export interface ModelProgress {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

type Transcriber = (
  audio: Float32Array,
  options?: Record<string, unknown>,
) => Promise<{ text?: string } | { text?: string }[]>;

let transcriber: Promise<Transcriber> | null = null;

/** True where we can both capture audio and decode it — the model's prereqs. */
export function isWhisperCapable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.AudioContext !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

/**
 * Load (once) the speech-recognition pipeline. Subsequent calls return the same
 * in-flight or resolved promise; a failed load is not cached, so a later attempt
 * can retry after, say, the connection comes back.
 */
export function loadTranscriber(onProgress?: (info: ModelProgress) => void): Promise<Transcriber> {
  if (!transcriber) {
    transcriber = (async () => {
      const mod = (await import(/* @vite-ignore */ CDN)) as {
        pipeline: (
          task: string,
          model: string,
          opts: Record<string, unknown>,
        ) => Promise<Transcriber>;
        env: { allowLocalModels: boolean; backends: { onnx: { wasm: { numThreads: number } } } };
      };
      const { pipeline, env } = mod;
      // Fetch the model from the hub, and keep WASM single-threaded (see file
      // header — no cross-origin isolation on GitHub Pages).
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      return pipeline('automatic-speech-recognition', MODEL, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: onProgress,
      });
    })().catch((error: unknown) => {
      transcriber = null;
      throw error;
    });
  }
  return transcriber;
}

/**
 * Decode a recorded clip to the mono 16kHz PCM Whisper expects.
 *
 * An OfflineAudioContext does the downmix and resample in one pass, at better
 * quality than dropping samples by hand.
 */
export async function decodeToPcm(blob: Blob): Promise<Float32Array> {
  const bytes = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(bytes);
  } finally {
    await decodeCtx.close();
  }
  const frames = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}

/**
 * Transcribe a recorded clip. Returns '' when nothing was heard.
 *
 * No `language`/`task` options: the model is the English-only `.en` build, which
 * rejects them ("Cannot specify task or language for an English-only model").
 */
export async function transcribeBlob(blob: Blob): Promise<string> {
  const asr = await loadTranscriber();
  const pcm = await decodeToPcm(blob);
  const output = await asr(pcm);
  const result = Array.isArray(output) ? output[0] : output;
  return (result?.text ?? '').trim();
}
