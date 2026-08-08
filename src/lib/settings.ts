/**
 * User settings. Still stored under the v1 `ielts_setting_*` localStorage keys
 * and still JSON-encoded, so an existing install keeps its preferences and the
 * sync payload stays compatible.
 */

import { HINT_STYLES, type HintStyle } from './hints';

export const SETTING_PREFIX = 'ielts_setting_';

export const THEME_CHOICES = ['system', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

// Re-exported so screens can import every setting-shaped thing from one place.
export { HINT_STYLES, HINT_STYLE_LABEL, type HintStyle } from './hints';

export interface Settings {
  dailyGoal: number;
  autoSpeak: boolean;
  speechRate: number;
  voiceName: string | null;
  theme: ThemeChoice;
  /** ISO date of the exam, or '' when no date is set. */
  examDate: string;
  /** Show a browser notification when review is due. */
  remindDaily: boolean;
  /** Local time of day for that reminder, "HH:MM". */
  remindAt: string;
  /** How the typing quizzes reveal a hint. */
  hintStyle: HintStyle;
  /** Shuffle the word order at the start of each study session. */
  shuffleWords: boolean;
  /** Short synthesised tones on right and wrong answers. */
  soundEffects: boolean;
  /** Reaction stickers during and after a session. */
  showStickers: boolean;
  /** Show the "🎤 Luyện nói" pronunciation button in mixed practice. */
  speakPractice: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 10,
  autoSpeak: true,
  speechRate: 0.85,
  voiceName: null,
  theme: 'system',
  examDate: '',
  remindDaily: false,
  remindAt: '20:00',
  hintStyle: 'progressive',
  shuffleWords: true,
  soundEffects: true,
  showStickers: true,
  speakPractice: true,
};

type Listener = (settings: Settings) => void;
const listeners = new Set<Listener>();

function readRaw<K extends keyof Settings>(key: K): Settings[K] {
  const raw = localStorage.getItem(SETTING_PREFIX + key);
  if (raw === null) return DEFAULT_SETTINGS[key];
  try {
    return JSON.parse(raw) as Settings[K];
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export function getSettings(): Settings {
  return {
    dailyGoal: readRaw('dailyGoal'),
    autoSpeak: readRaw('autoSpeak'),
    speechRate: readRaw('speechRate'),
    voiceName: readRaw('voiceName'),
    theme: readTheme(),
    examDate: readRaw('examDate'),
    remindDaily: readRaw('remindDaily'),
    remindAt: readRaw('remindAt'),
    hintStyle: readHintStyle(),
    shuffleWords: readRaw('shuffleWords'),
    soundEffects: readRaw('soundEffects'),
    showStickers: readRaw('showStickers'),
    speakPractice: readRaw('speakPractice'),
  };
}

/** Guarded like the theme: an unknown value would break the hint button. */
function readHintStyle(): HintStyle {
  const value = readRaw('hintStyle');
  return HINT_STYLES.includes(value) ? value : DEFAULT_SETTINGS.hintStyle;
}

/** Guarded separately: an unknown string here would break the theme switch. */
function readTheme(): ThemeChoice {
  const value = readRaw('theme');
  return THEME_CHOICES.includes(value) ? value : DEFAULT_SETTINGS.theme;
}

export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
  return readRaw(key);
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  localStorage.setItem(SETTING_PREFIX + key, JSON.stringify(value));
  const snapshot = getSettings();
  for (const listener of listeners) listener(snapshot);
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The settings half of a sync snapshot: raw JSON strings, exactly as stored. */
export function exportSettings(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(SETTING_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value !== null) out[key.slice(SETTING_PREFIX.length)] = value;
    }
  }
  return out;
}

export function importSettings(settings: Record<string, string> | undefined): void {
  if (!settings) return;
  for (const [key, value] of Object.entries(settings)) {
    localStorage.setItem(SETTING_PREFIX + key, value);
  }
  const snapshot = getSettings();
  for (const listener of listeners) listener(snapshot);
}

export function clearSettings(): void {
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith('ielts_')) localStorage.removeItem(key);
  }
  const snapshot = getSettings();
  for (const listener of listeners) listener(snapshot);
}
