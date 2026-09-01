import { getSetting, setSetting } from './settings';

/**
 * Text-to-speech.
 *
 * The browser's default pick is unusable: macOS ships a pile of novelty voices
 * that all report en-US, so `getVoices()[0]` lands on "Albert" and reads the
 * vocabulary in a cartoon voice. Voices are filtered and ranked instead.
 */

const NOVELTY_VOICES = new Set([
  'Albert',
  'Bad News',
  'Bahh',
  'Bells',
  'Boing',
  'Bubbles',
  'Cellos',
  'Deranged',
  'Good News',
  'Hysterical',
  'Jester',
  'Junior',
  'Organ',
  'Pipe Organ',
  'Superstar',
  'Trinoids',
  'Whisper',
  'Wobble',
  'Zarvox',
  'Fred',
  'Ralph',
  'Kathy',
  'Princess',
  'Bruce',
  'Agnes',
  'Grandma',
  'Grandpa',
  'Rocko',
  'Shelley',
  'Sandy',
  'Flo',
  'Eddy',
  'Reed',
]);

// The content uses British IPA, so British voices come first.
const PREFERRED_VOICES = [
  'Google UK English Female',
  'Google UK English Male',
  'Microsoft Libby Online (Natural) - English (United Kingdom)',
  'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'Daniel',
  'Serena',
  'Kate',
  'Oliver',
  'Google US English',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Samantha',
  'Alex',
  'Ava',
  'Allison',
  'Karen',
  'Moira',
  'Tessa',
];

const LANG_ORDER = ['en-GB', 'en-US', 'en-AU', 'en-IE', 'en-ZA', 'en-IN'];

export const SLOW_RATE = 0.6;

/** Human labels for the accents worth offering a quick button for. */
const ACCENT_LABELS: Record<string, { flag: string; label: string }> = {
  'en-GB': { flag: '🇬🇧', label: 'Anh-Anh' },
  'en-US': { flag: '🇺🇸', label: 'Anh-Mỹ' },
  'en-AU': { flag: '🇦🇺', label: 'Anh-Úc' },
  'en-IE': { flag: '🇮🇪', label: 'Anh-Ireland' },
  'en-ZA': { flag: '🇿🇦', label: 'Anh-Nam Phi' },
  'en-IN': { flag: '🇮🇳', label: 'Anh-Ấn Độ' },
};

function rank(list: readonly string[], value: string): number {
  const index = list.indexOf(value);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

/**
 * Whether this device can actually say anything.
 *
 * Matters for mixed practice, where two rungs are listening exercises: on a
 * device with no voices installed they would be unanswerable, and a mode that
 * only ends when every word is learned would never end at all.
 */
export function canSpeak(): boolean {
  return synth() !== null && listVoices().length > 0;
}

/** Every English voice worth offering, best first. */
export function listVoices(): SpeechSynthesisVoice[] {
  const engine = synth();
  if (!engine) return [];
  return engine
    .getVoices()
    .filter((voice) => /^en[-_]/i.test(voice.lang) && !NOVELTY_VOICES.has(voice.name))
    .sort((a, b) => {
      const byPreference = rank(PREFERRED_VOICES, a.name) - rank(PREFERRED_VOICES, b.name);
      if (byPreference !== 0) return byPreference;
      const byLang = rank(LANG_ORDER, a.lang) - rank(LANG_ORDER, b.lang);
      if (byLang !== 0) return byLang;
      return a.name.localeCompare(b.name);
    });
}

/** Normalise a BCP-47 tag ("en_gb", "en-GB-x-…") to a plain accent code. */
export function accentOf(lang: string): string {
  const [base, region] = lang.replace('_', '-').split('-');
  const low = (base ?? '').toLowerCase();
  return region ? `${low}-${region.toUpperCase()}` : low;
}

export interface AccentVoice {
  voice: SpeechSynthesisVoice;
  code: string;
  flag: string;
  label: string;
}

/**
 * One voice per distinct accent, best first — the data behind the row of quick
 * "hear it in this accent" buttons. Deduplicated by accent so the learner gets
 * British / American / Australian rather than five near-identical US voices.
 */
export function pickAccentVoices(
  voices: readonly SpeechSynthesisVoice[],
  limit = 3,
): AccentVoice[] {
  const seen = new Set<string>();
  const out: AccentVoice[] = [];
  for (const voice of voices) {
    const code = accentOf(voice.lang);
    if (seen.has(code)) continue;
    seen.add(code);
    const meta = ACCENT_LABELS[code] ?? { flag: '🔊', label: voice.lang };
    out.push({ voice, code, flag: meta.flag, label: meta.label });
    if (out.length >= limit) break;
  }
  return out;
}

export function distinctAccentVoices(limit = 3): AccentVoice[] {
  return pickAccentVoices(listVoices(), limit);
}

export function resolveVoice(): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (voices.length === 0) return null;
  const saved = getSetting('voiceName');
  if (saved) {
    const match = voices.find((voice) => voice.name === saved);
    if (match) return match;
  }
  return voices[0] ?? null;
}

export function currentVoiceName(): string | null {
  return resolveVoice()?.name ?? null;
}

export function setVoice(name: string): void {
  setSetting('voiceName', name);
}

// Chrome silently drops an utterance that gets garbage-collected before it
// finishes; holding a reference until it ends keeps speech alive.
let inFlight: SpeechSynthesisUtterance | null = null;

/** Speak with an explicit voice — the quick per-accent buttons use this. */
export function speakWith(text: string, voice: SpeechSynthesisVoice | null, rate?: number): void {
  const engine = synth();
  if (!engine || !text) return;

  // Speaking over an in-flight utterance queues it; learners expect the new
  // word to replace the old one.
  if (engine.speaking || engine.pending) engine.cancel();
  // Desktop Chrome can leave the engine paused after an earlier cancel; a paused
  // engine accepts speak() but stays silent until it is resumed.
  if (engine.paused) engine.resume();

  // Fall back to the best available voice if the caller passed none.
  const chosen = voice ?? resolveVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  if (chosen) {
    utterance.voice = chosen;
    utterance.lang = chosen.lang;
  } else {
    // Better to let the browser choose by language than to read English with
    // whatever Vietnamese voice happens to be first.
    utterance.lang = 'en-GB';
  }
  utterance.rate = rate ?? getSetting('speechRate');

  inFlight = utterance;
  const release = () => {
    if (inFlight === utterance) inFlight = null;
  };
  utterance.addEventListener('end', release);
  utterance.addEventListener('error', release);

  engine.speak(utterance);
}

// A budget Android/Samsung tablet often ships with no English TTS voice at all,
// and asking a child to install a voice pack is a non-starter. When the device
// has no usable voice, pronunciation is streamed as an MP3 from a public
// dictionary endpoint. Plain <audio> playback works cross-origin without CORS;
// it needs a network connection.
//
// Source order matters. Youdao serves single words reliably from a browser even
// when the page sends a Referer. Google's translate_tts, by contrast, returns
// 404 to a real in-browser request that carries a Referer (it only answered our
// server-side probes because those sent none) — so it is a last resort, forced
// referrer-less, and mostly useful for the multi-word phrases Youdao rejects.
let remoteAudio: HTMLAudioElement | null = null;

function remoteUrls(text: string): string[] {
  const q = encodeURIComponent(text.slice(0, 200));
  return [
    // type=1 = British, matching the app's British-IPA content.
    `https://dict.youdao.com/dictvoice?type=1&audio=${q}`,
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${q}&total=1&idx=0&textlen=${text.length}`,
  ];
}

/** True if the browser can even attempt network audio. */
export function canPlayRemote(): boolean {
  return typeof Audio !== 'undefined';
}

function playUrl(url: string, speed: number): Promise<boolean> {
  const audio = new Audio(url);
  const tweak = audio as HTMLAudioElement & {
    referrerPolicy?: string;
    preservesPitch?: boolean;
    mozPreservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
  };
  // Strip the Referer so referrer-sensitive endpoints (Google) don't 404.
  tweak.referrerPolicy = 'no-referrer';
  audio.playbackRate = Math.max(0.5, Math.min(1, speed));
  // Keep the pitch natural when slowed rather than deepening it.
  tweak.preservesPitch = true;
  tweak.mozPreservesPitch = true;
  tweak.webkitPreservesPitch = true;
  remoteAudio = audio;
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };
    audio.addEventListener('playing', () => done(true));
    audio.addEventListener('error', () => done(false));
    audio.play().catch(() => done(false));
    setTimeout(() => done(false), 5000);
  });
}

/** Stream the word from a dictionary endpoint. Resolves true once it plays. */
export function speakRemote(text: string, rate?: number): Promise<boolean> {
  if (!canPlayRemote() || !text) return Promise.resolve(false);
  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio = null;
  }
  const speed = rate ?? getSetting('speechRate');
  const urls = remoteUrls(text);
  // Try each source in turn; the first that actually starts playing wins.
  return urls.reduce<Promise<boolean>>(
    (chain, url) => chain.then((ok) => (ok ? true : playUrl(url, speed))),
    Promise.resolve(false),
  );
}

export function speak(text: string, rate?: number): void {
  if (!text) return;
  const engine = synth();
  const voice = engine ? resolveVoice() : null;
  // Prefer the device voice: instant, offline, and no dependency on Google. It
  // is warmed at startup (below), so by tap time a capable device has it ready.
  if (engine && (voice || listVoices().length > 0)) {
    speakWith(text, voice, rate);
    return;
  }
  // No usable device voice → network fallback so voice-less tablets still speak.
  void speakRemote(text, rate);
}

export function speakSlow(text: string): void {
  speak(text, SLOW_RATE);
}

export function cancelSpeech(): void {
  synth()?.cancel();
  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio = null;
  }
}

/**
 * Chrome and Safari populate the voice list asynchronously, so the first
 * `getVoices()` usually returns nothing. Components use this to repaint.
 */
export function onVoicesChanged(handler: () => void): () => void {
  const engine = synth();
  if (!engine) return () => {};
  engine.addEventListener('voiceschanged', handler);
  return () => engine.removeEventListener('voiceschanged', handler);
}

/**
 * iOS (every iPhone/iPad browser) blocks speech until an utterance is fired
 * from inside a real user gesture — the very first one. Auto-speak in the study
 * modes runs on a timer, outside any gesture, so on iOS it never unlocks the
 * engine and every later tap stays silent too. Firing a silent utterance on the
 * first touch fixes that. Idempotent and safe on desktop.
 */
let unlocked = false;
export function unlockSpeech(): void {
  const engine = synth();
  if (!engine || unlocked) return;
  unlocked = true;
  engine.getVoices();
  try {
    const primer = new SpeechSynthesisUtterance(' ');
    primer.volume = 0;
    engine.speak(primer);
  } catch {
    // Never let priming throw during a tap handler.
  }
}

export type SpeechOutcome =
  | 'spoke'
  | 'remote'
  | 'error'
  | 'no-voice'
  | 'timeout'
  | 'unsupported';

export interface SpeechDiagnosis {
  supported: boolean;
  /** Every voice the device exposes, English or not. */
  totalVoices: number;
  /** English voices — what this app can actually use. */
  englishVoices: number;
  chosenVoice: string | null;
  /** Running as an installed PWA (iOS has extra speech bugs here). */
  standalone: boolean;
  outcome: SpeechOutcome;
  detail?: string;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return mm || iosStandalone;
}

/**
 * Speak a probe word and report what actually happened — the data behind the
 * "Kiểm tra âm thanh" panel. Lets a parent read the real cause off the child's
 * own iPad/tablet instead of us guessing: no English voice installed, engine
 * blocked, or muted (fires but no start event).
 */
export async function runSpeechTest(): Promise<SpeechDiagnosis> {
  const engine = synth();
  const base = {
    supported: engine !== null,
    totalVoices: engine?.getVoices().length ?? 0,
    englishVoices: listVoices().length,
    chosenVoice: currentVoiceName(),
    standalone: isStandalone(),
  };

  // No device voice (or no speech engine at all): fall back to network audio and
  // report whether that works, since that is exactly what the app now does.
  if (!engine || listVoices().length === 0) {
    const remoteOk = await speakRemote('happiness');
    if (remoteOk) return { ...base, outcome: 'remote' };
    return { ...base, outcome: engine ? 'no-voice' : 'unsupported' };
  }

  return await new Promise<SpeechDiagnosis>((resolve) => {
    let settled = false;
    const finish = (outcome: SpeechOutcome, detail?: string) => {
      if (settled) return;
      settled = true;
      resolve({ ...base, outcome, detail });
    };
    if (engine.paused) engine.resume();
    if (engine.speaking || engine.pending) engine.cancel();
    const probe = new SpeechSynthesisUtterance('happiness');
    const voice = resolveVoice();
    if (voice) {
      probe.voice = voice;
      probe.lang = voice.lang;
    } else {
      probe.lang = 'en-GB';
    }
    probe.addEventListener('start', () => finish('spoke'));
    probe.addEventListener('error', (event) => finish('error', event.error));
    engine.speak(probe);
    setTimeout(() => finish('timeout'), 3500);
  });
}

// Kick the async voice list into loading the moment the app starts, so the
// first tap on a 🔊 button finds voices ready instead of an empty list. The
// listener re-reads on `voiceschanged` to keep the browser's cache warm.
(function warmVoices() {
  const engine = synth();
  if (!engine) return;
  engine.getVoices();
  engine.addEventListener('voiceschanged', () => engine.getVoices());
})();
