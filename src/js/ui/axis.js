/**
 * The axis line the board puts under every bar strip.
 *
 * Three marks: where the window opens, the moment the story changes, and where
 * it closes — "NOW · +35 STOPS · +60" on the canvas. The middle mark is the
 * only one in ink, because it is the only one carrying news; it is dropped
 * entirely when nothing changes inside the window rather than shown empty.
 */

import { el, replace } from '../util/dom.js';
import { RAINING } from '../data/rain.js';

/**
 * @param {Element|null} node      the axis element
 * @param {object} summary        a rainSummary() result
 * @param {string} endLabel       the right-hand mark, e.g. "+12h"
 */
export function renderAxis(node, summary, endLabel) {
  if (!node) return;

  const marks = [el('span', { text: 'Now' })];

  if (summary?.changesInMinutes != null) {
    marks.push(el('span', {
      className: 'axis__change',
      text: `+${summary.changesInMinutes}m ${summary.state === RAINING ? 'stops' : 'starts'}`,
    }));
  }

  marks.push(el('span', { text: endLabel }));
  replace(node, marks);
}

/**
 * Just the middle mark, for an axis row whose other two marks are static markup
 * (the forecast's strip, where the left mark is the section heading).
 * Empty when nothing changes inside the window — an axis should not announce a
 * moment that isn't coming.
 */
export function renderChangeMark(node, summary) {
  if (!node) return;
  node.textContent = summary?.changesInMinutes == null
    ? ''
    : `+${summary.changesInMinutes}m ${summary.state === RAINING ? 'stops' : 'starts'}`;
}
