import { useEffect, useState, type ReactNode } from 'react';

import { pickIdiom } from '@/content/idioms';
import { probeDeviceSpeech, prewarmRemote, speechMode } from '@/lib/tts';

type Phase = 'checking' | 'intro' | 'ready';

interface Props {
  /** Words to warm the network voice for while the intro shows. May be empty. */
  words: string[];
  children: ReactNode;
}

/**
 * Opens a study session.
 *
 * On a device whose browser can speak, this is invisible — children render at
 * once. On a device that falls back to network audio (a common Samsung-tablet
 * case), the first tap would otherwise stall while the audio loads; instead this
 * shows a quick idiom to learn while the session's pronunciation warms up in the
 * background, then hands over. Far nicer than a "loading audio" bar, and the
 * wait teaches something.
 */
export function LessonGate({ words, children }: Props) {
  const [phase, setPhase] = useState<Phase>(() => {
    const mode = speechMode();
    if (mode === 'device') return 'ready';
    if (mode === 'remote') return 'intro';
    return 'checking';
  });
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  // Chosen once per mount (the gate is keyed by lesson), so the card does not
  // swap idioms underneath the reader on a re-render.
  const [idiom] = useState(pickIdiom);

  const key = words.join('');
  useEffect(() => {
    if (phase === 'ready') return;
    let cancelled = false;

    const warmThenReady = async (shownAt: number) => {
      await prewarmRemote(words, (done, total) => {
        if (!cancelled) setProgress({ done, total });
      });
      if (cancelled) return;
      // Leave the idiom up long enough to actually read.
      const MIN_MS = 2600;
      const wait = Math.max(0, MIN_MS - (Date.now() - shownAt));
      window.setTimeout(() => {
        if (!cancelled) setPhase('ready');
      }, wait);
    };

    void (async () => {
      if (speechMode() === 'unknown') {
        const works = await probeDeviceSpeech();
        if (cancelled) return;
        if (works) {
          setPhase('ready');
          return;
        }
        setPhase('intro');
      }
      await warmThenReady(Date.now());
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (phase === 'ready') return <>{children}</>;

  // Brief neutral hold while we work out whether this device can speak. Keeps a
  // laptop from flashing the idiom card before going straight in.
  if (phase === 'checking') {
    return (
      <div className="lesson-gate lesson-gate--checking" aria-hidden="true">
        <BookMark />
      </div>
    );
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="lesson-gate" role="status" aria-live="polite">
      <div className="lesson-gate__card">
        <div className="lesson-gate__badge">
          <BookMark />
          <span>Học nhanh một thành ngữ</span>
        </div>

        <p className="lesson-gate__idiom">“{idiom.en}”</p>
        <p className="lesson-gate__vi">{idiom.vi}</p>

        <div className="lesson-gate__example">
          <p className="lesson-gate__example-en">{idiom.example}</p>
          <p className="lesson-gate__example-vi">{idiom.exampleVi}</p>
        </div>

        <div className="lesson-gate__foot">
          <span
            className="progress progress--thin"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Đang mở bài"
          >
            <span className="progress__fill" style={{ width: `${Math.max(8, pct)}%` }} />
          </span>
          <button className="btn btn--secondary" onClick={() => setPhase('ready')}>
            Vào học →
          </button>
        </div>
      </div>
    </div>
  );
}

/** A little open-book mark drawn inline — no image asset to ship or cache. */
function BookMark() {
  return (
    <span className="lesson-gate__mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
        <path
          d="M24 12c-4-3-9-3-13-1v24c4-2 9-2 13 1 4-3 9-3 13-1V11c-4-2-9-2-13 1z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M24 12v25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
