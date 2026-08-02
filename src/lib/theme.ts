import { getSetting, setSetting, type ThemeChoice } from './settings';

/**
 * Theme switching.
 *
 * `data-theme` on <html> is always written as a concrete 'light' or 'dark' —
 * 'system' is resolved here rather than in CSS. That keeps tokens.css to a
 * single `[data-theme='light']` block instead of duplicating the whole palette
 * inside a prefers-color-scheme query.
 */

export type ResolvedTheme = 'light' | 'dark';

const LIGHT_QUERY = '(prefers-color-scheme: light)';

/** Matches --bg for each theme, so the mobile browser chrome follows along. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  dark: '#0a0a1a',
  light: '#f6f5fb',
};

export function systemTheme(): ResolvedTheme {
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark';
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === 'system' ? systemTheme() : choice;
}

export function applyTheme(choice: ThemeChoice): ResolvedTheme {
  const resolved = resolveTheme(choice);
  document.documentElement.dataset.theme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved]);

  return resolved;
}

export function setTheme(choice: ThemeChoice): ResolvedTheme {
  setSetting('theme', choice);
  return applyTheme(choice);
}

/**
 * Applies the saved choice and keeps 'system' live — the OS can flip to dark at
 * sunset while the app is open, and the page should follow without a reload.
 */
export function initTheme(): () => void {
  applyTheme(getSetting('theme'));

  const media = window.matchMedia(LIGHT_QUERY);
  const onChange = (): void => {
    if (getSetting('theme') === 'system') applyTheme('system');
  };

  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
