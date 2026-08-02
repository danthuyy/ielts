import { useSyncExternalStore } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  setSetting,
  subscribeSettings,
  type Settings,
} from '@/lib/settings';

let cached: Settings = DEFAULT_SETTINGS;
let initialised = false;

function getSnapshot(): Settings {
  if (!initialised) {
    cached = getSettings();
    initialised = true;
  }
  return cached;
}

function subscribe(onChange: () => void): () => void {
  return subscribeSettings((next) => {
    cached = next;
    onChange();
  });
}

/** Reactive settings. Writing through `update` repaints every subscriber. */
export function useSettings(): {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
} {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS);

  return {
    settings,
    update: (key, value) => {
      setSetting(key, value);
      cached = getSettings();
    },
  };
}
