import { useEffect, useRef } from 'react';

/**
 * Handlers may be async — the return value is ignored, so a screen can bind an
 * `async` grading function directly without wrapping it.
 */
export type KeyMap = Record<string, (event: KeyboardEvent) => unknown>;

interface Options {
  /** Keys that still fire while the caret is in a text field. */
  allowWhileTyping?: readonly string[];
  enabled?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * Keyboard shortcuts for the study screens.
 *
 * The handler map is kept in a ref, so re-rendering with new closures never
 * detaches and reattaches the listener — and a stale closure from the previous
 * card can never fire.
 */
export function useKeyboard(keyMap: KeyMap, options: Options = {}): void {
  const { allowWhileTyping = ['Enter', 'Escape'], enabled = true } = options;

  const mapRef = useRef(keyMap);
  const allowRef = useRef(allowWhileTyping);

  useEffect(() => {
    mapRef.current = keyMap;
    allowRef.current = allowWhileTyping;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const handler = mapRef.current[key];
      if (!handler) return;

      if (isTypingTarget(event.target) && !allowRef.current.includes(event.key)) return;

      event.preventDefault();
      void handler(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
