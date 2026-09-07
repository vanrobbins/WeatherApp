/**
 * City search — an ARIA combobox over the Open-Meteo geocoding API.
 *
 * Fully keyboard operable: arrows move, Enter picks, Escape closes and returns
 * focus to whatever opened it.
 */

import { qs, el, replace, debounce } from '../util/dom.js';
import { searchCities, locationLabel } from '../api/geocoding.js';

let activeIndex = -1;
let results = [];
let inFlight = null;
let lastFocused = null;
let onPick = () => {};

const root = () => qs('[data-search]');
const input = () => qs('#search-input');
const list = () => qs('[data-search-results]');
const status = () => qs('[data-search-status]');

export function initSearch({ onSelect }) {
  onPick = onSelect;

  const search = debounce(runSearch, 250);

  input().addEventListener('input', (event) => {
    const term = event.target.value.trim();
    if (term.length < 2) {
      clearResults();
      setStatus(term.length ? 'Keep typing…' : '');
      return;
    }
    setStatus('Searching…');
    search(term);
  });

  input().addEventListener('keydown', onKeyDown);

  for (const closer of document.querySelectorAll('[data-search-close]')) {
    closer.addEventListener('click', closeSearch);
  }
  for (const opener of document.querySelectorAll('[data-open-search]')) {
    opener.addEventListener('click', () => openSearch(opener));
  }
}

export function openSearch(trigger = null) {
  lastFocused = trigger ?? document.activeElement;
  root().hidden = false;
  input().value = '';
  clearResults();
  setStatus('');
  input().focus();
}

export function closeSearch() {
  root().hidden = true;
  clearResults();
  // Returning focus is what makes this usable without a mouse.
  lastFocused?.focus?.();
  lastFocused = null;
}

async function runSearch(term) {
  // Cancel the previous request so a slow early keystroke can't overwrite
  // the results of a later one.
  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;

  try {
    const found = await searchCities(term, { signal: controller.signal });
    if (controller.signal.aborted) return;

    results = found;
    activeIndex = found.length ? 0 : -1;
    paint();
    setStatus(found.length ? '' : `Nothing found for “${term}”.`);
  } catch (error) {
    if (error?.name === 'AbortError') return;   // superseded, not a failure
    clearResults();
    setStatus(error?.message ?? "Couldn't search right now.");
  } finally {
    if (inFlight === controller) inFlight = null;
  }
}

function paint() {
  const options = results.map((location, i) => el('li', {
    className: 'search__option',
    role: 'option',
    id: `search-option-${i}`,
    'aria-selected': String(i === activeIndex),
    onClick: () => pick(i),
  }, [
    el('span', { className: 'search__name', text: location.name }),
    el('span', {
      className: 'search__region',
      text: [location.region, location.country].filter(Boolean).join(', '),
    }),
  ]));

  replace(list(), options);
  input().setAttribute('aria-expanded', String(results.length > 0));
  syncActiveDescendant();
}

function syncActiveDescendant() {
  const option = list().children[activeIndex];
  if (option) {
    input().setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  } else {
    input().removeAttribute('aria-activedescendant');
  }
}

function move(delta) {
  if (!results.length) return;
  activeIndex = (activeIndex + delta + results.length) % results.length;
  for (const [i, option] of [...list().children].entries()) {
    option.setAttribute('aria-selected', String(i === activeIndex));
  }
  syncActiveDescendant();
}

function onKeyDown(event) {
  switch (event.key) {
    case 'ArrowDown': event.preventDefault(); move(1); break;
    case 'ArrowUp':   event.preventDefault(); move(-1); break;
    case 'Enter':
      if (activeIndex >= 0) { event.preventDefault(); pick(activeIndex); }
      break;
    case 'Escape':    event.preventDefault(); closeSearch(); break;
    default: break;
  }
}

function pick(index) {
  const location = results[index];
  if (!location) return;
  closeSearch();
  onPick(location);
}

function clearResults() {
  results = [];
  activeIndex = -1;
  replace(list());
  input().setAttribute('aria-expanded', 'false');
  input().removeAttribute('aria-activedescendant');
}

function setStatus(text) {
  status().textContent = text;
}

export { locationLabel };
