// Touch gestures for the study screens — the phone equivalent of keys.js.
//
// Deliberately conservative: a swipe only counts if it is clearly directional
// and clearly not a scroll, so flicking through the example text on the back
// of a card never jumps to the next word.

const MIN_DISTANCE = 60;   // px before a drag counts as a swipe
const MAX_OFF_AXIS = 0.6;  // perpendicular movement allowed, as a ratio
const MAX_DURATION = 800;  // ms — slower than this is a drag, not a swipe

/**
 * @param {HTMLElement} el
 * @param {{left?: function, right?: function, up?: function, down?: function}} handlers
 * @returns {function} detach
 */
export function onSwipe(el, handlers) {
  if (!el) return () => {};

  let startX = 0, startY = 0, startTime = 0, tracking = false;

  const onStart = (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = e.timeStamp;
    tracking = true;
  };

  const onEnd = (e) => {
    if (!tracking) return;
    tracking = false;

    const t = e.changedTouches[0];
    if (!t) return;
    if (e.timeStamp - startTime > MAX_DURATION) return;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx >= MIN_DISTANCE && ady <= adx * MAX_OFF_AXIS) {
      const fn = dx < 0 ? handlers.left : handlers.right;
      if (fn) fn();
      return;
    }
    if (ady >= MIN_DISTANCE && adx <= ady * MAX_OFF_AXIS) {
      const fn = dy < 0 ? handlers.up : handlers.down;
      if (fn) fn();
    }
  };

  // Multi-touch (pinch-zoom) must cancel tracking, not register as a swipe.
  const onCancel = () => { tracking = false; };

  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchend', onEnd, { passive: true });
  el.addEventListener('touchcancel', onCancel, { passive: true });

  return () => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchend', onEnd);
    el.removeEventListener('touchcancel', onCancel);
  };
}

export function isTouchDevice() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

/** Mirror of keys.hintBar, phrased for touch. */
export function gestureHint(pairs) {
  const items = pairs.map(([icon, label]) => `
    <span style="display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
      <span style="font-size: 13px;">${icon}</span><span>${label}</span>
    </span>
  `).join('');
  return `
    <div class="gesture-hints" style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; padding: 8px 16px; font-size: 11px; color: var(--text-secondary);">
      ${items}
    </div>
  `;
}
