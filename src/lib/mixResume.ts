import type { QueueSnapshot } from '@/hooks/useMasteryQueue';
import { hashString } from './wordOfDay';

/**
 * Letting a mixed-practice session survive a page reload.
 *
 * The ladder state lives in React state, so a refresh mid-session would restart
 * the whole lesson — which is exactly the "reload lại học lại từ đầu" bug. We
 * stash the queue snapshot (plus the two scoring counters) in `sessionStorage`
 * after every answer and restore it on mount. sessionStorage, not local: it is
 * meant to resume *this* tab's session and clears itself when the tab closes,
 * so a finished session can never linger and reopen days later.
 */

export interface MixResume {
  snapshot: QueueSnapshot;
  misses: number;
  clean: number;
}

const PREFIX = 'ielts_mix_resume_';

/** Keyed by the study source and the exact word set, so lessons never collide. */
export function mixResumeKey(source: string, wordIds: readonly string[]): string {
  return `${PREFIX}${source}_${hashString([...wordIds].join(','))}`;
}

export function readMixResume(key: string): MixResume | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as MixResume) : null;
  } catch {
    return null;
  }
}

export function writeMixResume(key: string, value: MixResume): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — resume is a nicety, never worth throwing over.
  }
}

export function clearMixResume(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
