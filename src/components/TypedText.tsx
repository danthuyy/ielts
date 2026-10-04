import { useEffect, useState } from 'react';

interface Props {
  text: string;
  /** Milliseconds per character. */
  speed?: number;
}

/**
 * Reveals `text` one character at a time.
 *
 * Used for the words the microphone has just heard: they appear as if being
 * written, which tells the learner the app is following along. When the text
 * grows (more of the sentence arrives) it carries on from where it was; when it
 * is replaced by something else it starts again.
 */
export function TypedText({ text, speed = 35 }: Props) {
  const [shown, setShown] = useState(0);
  const [prev, setPrev] = useState(text);

  // Derived-state reset during render, not in an effect: avoids a flash of the
  // old length when the text is swapped for a different phrase.
  if (prev !== text) {
    setPrev(text);
    if (!text.startsWith(prev)) setShown(0);
  }

  useEffect(() => {
    if (shown >= text.length) return;
    const timer = window.setTimeout(() => setShown((n) => n + 1), speed);
    return () => window.clearTimeout(timer);
  }, [shown, text, speed]);

  return <>{text.slice(0, shown)}</>;
}
