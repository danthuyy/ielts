// Keyboard shortcuts for the study screens.
//
// Screens re-render their whole container on every card, so each one registers
// once per render; bind() replaces any previous handler so stale closures from
// the last card can never fire.

let activeHandler = null;

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * @param {Object<string, function(KeyboardEvent): void>} map
 *   Keys are event.key values ('Enter', ' ', 'ArrowRight', '1', 'b'…).
 *   Letter keys are matched case-insensitively.
 * @param {Object} [opts]
 *   allowWhileTyping — keys that still fire inside a text field (e.g. Enter).
 */
export function bind(map, opts = {}) {
  unbind();
  const allowWhileTyping = new Set(opts.allowWhileTyping || ['Enter']);

  activeHandler = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const fn = map[key];
    if (!fn) return;

    if (isTypingTarget(e.target) && !allowWhileTyping.has(e.key)) return;

    e.preventDefault();
    fn(e);
  };

  window.addEventListener('keydown', activeHandler);
}

export function unbind() {
  if (activeHandler) {
    window.removeEventListener('keydown', activeHandler);
    activeHandler = null;
  }
}

/** Small hint strip so the shortcuts are discoverable instead of secret. */
export function hintBar(pairs) {
  const items = pairs.map(([keys, label]) => `
    <span style="display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
      ${keys.map(k => `<kbd style="background: var(--surface); border-radius: 4px; padding: 2px 6px; font-size: 11px; font-family: inherit; color: var(--text-primary);">${k}</kbd>`).join('')}
      <span>${label}</span>
    </span>
  `).join('');
  return `
    <div class="key-hints" style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; padding: 8px 16px; font-size: 11px; color: var(--text-secondary);">
      ${items}
    </div>
  `;
}
