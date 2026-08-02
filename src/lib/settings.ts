/**
 * User settings. Still stored under the v1 `ielts_setting_*` localStorage keys
 * and still JSON-encoded, so an existing install keeps its preferences and the
 * sync payload stays compatible.
 */

export const SETTING_PREFIX = 'ielts_setting_';

export interface Settings {
  dailyGoal: number;
  autoSpeak: boolean;
  speechRate: number;
  voiceName: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 10,
  autoSpeak: true,
  speechRate: 0.85,
  voiceName: null,
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
  };
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
