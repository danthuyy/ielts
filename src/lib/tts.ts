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

const SLOW_RATE = 0.6;

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

export function speak(text: string, rate?: number): void {
  const engine = synth();
  if (!engine || !text) return;

  // Speaking over an in-flight utterance queues it; learners expect the new
  // word to replace the old one.
  if (engine.speaking || engine.pending) engine.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = resolveVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    // Better to let the browser choose by language than to read English with
    // whatever Vietnamese voice happens to be first.
    utterance.lang = 'en-GB';
  }
  utterance.rate = rate ?? getSetting('speechRate');
  engine.speak(utterance);
}

export function speakSlow(text: string): void {
  speak(text, SLOW_RATE);
}

export function cancelSpeech(): void {
  synth()?.cancel();
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
