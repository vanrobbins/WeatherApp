/**
 * Hash router.
 *
 * Four screens live in one document so the store and the auth session survive
 * navigation. Hash routing (rather than the History API) keeps the app working
 * from any static host and any subdirectory with no server rewrite rules.
 */

import { qsa, qs } from '../util/dom.js';

const ROUTES = ['landing', 'forecast', 'settings', 'signin'];
const DEFAULT_ROUTE = 'landing';

const listeners = new Set();

export function currentRoute() {
  const name = (location.hash.replace(/^#\/?/, '') || DEFAULT_ROUTE).split('?')[0];
  return ROUTES.includes(name) ? name : DEFAULT_ROUTE;
}

export function navigate(route) {
  if (!ROUTES.includes(route)) return;
  if (currentRoute() === route) { show(route); return; }
  location.hash = `#/${route}`;
}

export function onRouteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function show(route) {
  // The shell needs to know where it is: the sign-in screen is a full-bleed
  // takeover with no header, footer or tab bar, exactly as the board draws it.
  document.body.dataset.route = route;

  for (const section of qsa('[data-screen]')) {
    section.hidden = section.dataset.screen !== route;
  }

  // Mark the active nav item for both sighted and assistive users.
  for (const link of qsa('[data-nav]')) {
    const active = link.dataset.nav === route;
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  // Place tabs belong to the forecast screen only.
  const tabs = qs('[data-place-tabs]');
  if (tabs) tabs.hidden = route !== 'forecast';

  // Moving between screens must move focus, or a keyboard user stays parked
  // in the header and a screen reader never announces the new screen.
  const heading = qs(`[data-screen="${route}"] h1`);
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0, behavior: 'auto' });

  for (const fn of listeners) fn(route);
}

export function startRouter() {
  window.addEventListener('hashchange', () => show(currentRoute()));
  show(currentRoute());
}
