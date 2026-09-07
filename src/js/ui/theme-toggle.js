/**
 * The header's theme control.
 *
 * It is a two-state switch, not a three-state cycle. "System" is where a theme
 * can come from, not a third thing the page can look like — so the button's job
 * is simply "give me the other one", and its icon always shows what a click
 * would get you: a moon while the page is light, a sun while it is dark.
 *
 * The icon is drawn in ink, not amber. Amber means sunlight, and this sun is a
 * UI affordance rather than weather.
 */

import { qs } from '../util/dom.js';
import { resolvedTheme } from '../data/prefs.js';

const MOON = '<path d="M20.5 15A9 9 0 0 1 9 3.5 9 9 0 1 0 20.5 15z"/>';

const SUN = `
  <circle cx="12" cy="12" r="4"/>
  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;

/** The theme a click on the toggle should move to, given the current setting. */
export function nextTheme(theme) {
  return resolvedTheme(theme) === 'dark' ? 'light' : 'dark';
}

/** Point the toggle at whatever a click would actually do right now. */
export function renderThemeToggle(theme) {
  const button = qs('[data-theme-toggle]');
  const icon = qs('[data-theme-icon]');
  if (!button || !icon) return;

  const next = nextTheme(theme);
  icon.innerHTML = next === 'dark' ? MOON : SUN;
  button.setAttribute('aria-label', `Switch to ${next} theme`);
  button.setAttribute('title', `Switch to ${next} theme`);
}
