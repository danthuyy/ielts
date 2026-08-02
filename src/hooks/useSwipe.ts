import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';

export interface SwipeHandlers {
  left?: () => void;
  right?: () => void;
  up?: () => void;
  down?: () => void;
}

// Deliberately conservative: a swipe only counts if it is clearly directional
// and clearly not a scroll, so flicking through the example text on the back of
// a card never jumps to the next word.
const MIN_DISTANCE = 60;
const MAX_OFF_AXIS = 0.6;
const MAX_DURATION = 800;

export function useSwipe(target: RefObject<HTMLElement | null>, handlers: SwipeHandlers): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = event.timeStamp;
      tracking = true;
    };

    const onEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const touch = event.changedTouches[0];
      if (!touch) return;
      if (event.timeStamp - startTime > MAX_DURATION) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (adx >= MIN_DISTANCE && ady <= adx * MAX_OFF_AXIS) {
        (dx < 0 ? handlersRef.current.left : handlersRef.current.right)?.();
        return;
      }
      if (ady >= MIN_DISTANCE && adx <= ady * MAX_OFF_AXIS) {
        (dy < 0 ? handlersRef.current.up : handlersRef.current.down)?.();
      }
    };

    // Multi-touch (pinch-zoom) must cancel tracking, not register as a swipe.
    const onCancel = () => {
      tracking = false;
    };

    element.addEventListener('touchstart', onStart, { passive: true });
    element.addEventListener('touchend', onEnd, { passive: true });
    element.addEventListener('touchcancel', onCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', onStart);
      element.removeEventListener('touchend', onEnd);
      element.removeEventListener('touchcancel', onCancel);
    };
  }, [target]);
}

const TOUCH_QUERY = '(hover: none) and (pointer: coarse)';

function subscribeToTouch(onChange: () => void): () => void {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Read straight from the media query — no effect, so no first-paint flicker. */
export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(
    subscribeToTouch,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
}
