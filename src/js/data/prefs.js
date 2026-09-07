/**
 * User preferences.
 *
 * Guests persist to localStorage; signed-in users get the same object synced to
 * Firestore alongside their saved places (see locations-repo.js).
 *
 * Every switch defined here controls something real. The canvas draws seventeen,
 * including alert scheduling that needs a push backend this app doesn't have —
 * those are omitted rather than shipped as controls that do nothing.
 */

const STORAGE_KEY = 'cirro:prefs';

export const DEFAULTS = {
  // Units
  unitSystem: 'metric',    // 'metric' | 'imperial'
  clock: '24h',            // '24h' | '12h'

  // Appearance
  theme: 'system',         // 'light' | 'dark' | 'system'

  // Motion
  animatedIcons: true,
  weatherTransitions: true,
  transitionMove: 'live',    // 'live' | 'gust' | 'fall' | 'iris' | 'flash'
  transitionLength: '1.2',   // seconds, as the canvas offers them
  reduceMotion: false,

  // What the forecast shows
  showRainBars: true,
  showHourly: true,
  showRanges: true,
  showFeelsLike: true,
};

/** Derived: the app stores one unit system, format.js takes two units. */
export function unitsFor(prefs) {
  const imperial = prefs.unitSystem === 'imperial';
  return { tempUnit: imperial ? 'f' : 'c', windUnit: imperial ? 'mph' : 'kmh' };
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    // Merge over defaults so a preference added in a later version doesn't
    // arrive as undefined for someone with an older stored object.
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // Private mode, cleared storage, or a browser blocking site data.
    return { ...DEFAULTS };
  }
}

export function save(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Non-fatal: preferences simply don't persist this session.
  }
}

/**
 * Apply the theme preference to the document.
 * 'system' removes the attribute entirely so the CSS media query takes over —
 * writing data-theme="system" would match neither selector.
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/** Does the OS currently ask for a dark UI? */
function systemPrefersDark() {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

/**
 * What the page is actually painted as right now: 'light' or 'dark'.
 *
 * 'system' is a source, not a third appearance — it resolves to whichever of
 * the two the OS is currently asking for. Anything that has to agree with what
 * the user can see (the header toggle's icon and its label, above all) must ask
 * this rather than read the raw preference.
 */
export function resolvedTheme(theme) {
  if (theme === 'light' || theme === 'dark') return theme;
  return systemPrefersDark() ? 'dark' : 'light';
}

/**
 * Call `fn` whenever the OS appearance flips. Only meaningful while the
 * preference is 'system' — that is the one setting whose rendered result can
 * change without the user touching the app.
 *
 * @returns {() => void} unsubscribe
 */
export function watchSystemTheme(fn) {
  const query = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!query) return () => {};
  const handler = () => fn(systemPrefersDark() ? 'dark' : 'light');
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}

/** Reduced motion: the user's own OS setting always wins if it's set. */
export function prefersReducedMotion(prefs) {
  const system = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return Boolean(system || prefs.reduceMotion);
}

export function applyMotion(prefs) {
  const root = document.documentElement;
  root.toggleAttribute('data-reduce-motion', prefersReducedMotion(prefs));
  root.toggleAttribute('data-no-icon-motion', !prefs.animatedIcons);
}
