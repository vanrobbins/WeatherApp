import { qs } from '../util/dom.js';

let timer;

/**
 * Transient message. The element is aria-live="polite" in the markup, so the
 * text is announced without stealing focus.
 */
export function toast(message, { duration = 4000 } = {}) {
  const node = qs('[data-toast]');
  if (!node || !message) return;

  clearTimeout(timer);
  node.textContent = message;
  node.hidden = false;

  timer = setTimeout(() => { node.hidden = true; }, duration);
}
