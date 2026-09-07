/**
 * Bootstrap and wiring.
 *
 * The only module that knows about all the others. Everything below is
 * assembly: fetch -> store -> render. No business logic lives here.
 */

import { qs, qsa, el, replace } from './util/dom.js';
import { getForecast, WeatherApiError } from './api/weather-api.js';
import { getCurrentPosition, permissionState, GEO_DENIED } from './api/geolocation.js';
import { searchCities, toLocation } from './api/geocoding.js';
import * as store from './data/store.js';
import * as prefsStore from './data/prefs.js';
import {
  loadGuest, saveGuest, clearGuest, addLocation, removeLocation,
} from './data/locations-repo.js';
import { mergeLocations, needsWrite } from './data/merge-locations.js';
import { startRouter, navigate, onRouteChange, currentRoute } from './ui/router.js';
import { renderForecast } from './ui/render-forecast.js';
import { renderLanding } from './ui/render-landing.js';
import { renderSettings } from './ui/render-settings.js';
import { renderSigninPanel } from './ui/render-signin.js';
import { initAuthForm } from './ui/auth-form.js';
import { initSearch, openSearch, closeSearch } from './ui/search-box.js';
import { toast } from './ui/toast.js';
import { renderThemeToggle, nextTheme } from './ui/theme-toggle.js';
import { playTransition, chosenMove } from './ui/transition.js';

const CACHE_KEY = 'cirro:last-weather';

// A place to start before we know anything about the user. Bristol is the
// canvas's own example city, so a cold load matches the design's screenshots.
const FALLBACK_PLACE = {
  id: '51.45,-2.58',
  name: 'Bristol', region: 'England', country: 'United Kingdom',
  latitude: 51.45, longitude: -2.58, timezone: 'Europe/London',
};

// -- Boot ---------------------------------------------------------------------

async function boot() {
  const prefs = prefsStore.load();
  prefsStore.applyTheme(prefs.theme);
  prefsStore.applyMotion(prefs);

  store.setState({ prefs, savedLocations: loadGuest() });
  store.subscribe(render);

  wireChrome();
  initSearch({ onSelect: addPlace });
  initAuthForm({ onAuthed: () => navigate('forecast') });
  startRouter();
  onRouteChange((route) => {
    // Opening the sign-in screen is the cue to bring Firebase in, so it's ready
    // by the time the user submits — but a guest who never visits it never pays.
    if (route === 'signin') ensureAuth();
    render(store.getState());
    if (route === 'signin') playSigninTransition();
  });

  showCachedIfAny();
  maybeRestoreSession();
  await loadInitialPlace();
}

// -- Auth ---------------------------------------------------------------------

/**
 * Firebase is heavy and most visitors never sign in, so it isn't in the boot
 * bundle. It's pulled in on demand — either because a session already exists
 * (maybeRestoreSession) or because the user opened the sign-in screen. The
 * module system caches the import, so this only ever fetches once.
 */
let firebaseModules = null;
function loadFirebase() {
  if (!firebaseModules) {
    firebaseModules = Promise.all([
      import('./auth/auth-service.js'),
      import('./data/cloud-repo.js'),
    ]).then(([authService, cloudRepo]) => ({ ...authService, ...cloudRepo }));
  }
  return firebaseModules;
}

/** Load Firebase (if needed) and register the auth listener exactly once. */
let authWired = null;
function ensureAuth() {
  if (!authWired) {
    authWired = loadFirebase().then((fb) => {
      fb.onAuthChange(handleAuth);   // fires immediately with the current user
      return fb;
    });
  }
  return authWired;
}

/**
 * On boot, only pull in Firebase if this browser already holds a session —
 * detected by the presence of Firebase Auth's IndexedDB store, without opening
 * it. Where that can't be probed, load eagerly so a returning user is never
 * wrongly shown as signed out.
 */
async function maybeRestoreSession() {
  try {
    if (typeof indexedDB?.databases !== 'function') { ensureAuth(); return; }
    const dbs = await indexedDB.databases();
    if (dbs.some((entry) => entry.name === 'firebaseLocalStorageDb')) ensureAuth();
  } catch { /* probing failed — a guest simply stays a guest until sign-in */ }
}

/**
 * React to Firebase's auth state, the single place a user appearing or leaving
 * is handled. On sign-in, the guest's places on this browser are unioned into
 * the account (never overwriting it — see merge-locations.js) and the account
 * becomes the source of truth. On sign-out, we fall back to this device's guest
 * data.
 */
async function handleAuth(user) {
  if (!user) {
    store.setState({ user: null, savedLocations: loadGuest() });
    return;
  }

  store.setState({ user });

  try {
    const fb = await loadFirebase();
    const cloud = await fb.loadCloud(user.uid);

    const merged = mergeLocations(cloud.places, loadGuest());
    if (needsWrite(cloud.places, merged)) await fb.saveCloudPlaces(user.uid, merged);
    clearGuest();

    // Prefs: adopt the account's if it has any, otherwise seed the account from
    // this device so a first sign-in doesn't wipe the settings just chosen.
    let { prefs } = store.getState();
    if (cloud.prefs) {
      prefs = { ...prefsStore.DEFAULTS, ...cloud.prefs };
      prefsStore.applyTheme(prefs.theme);
      prefsStore.applyMotion(prefs);
      prefsStore.save(prefs);
    } else {
      fb.saveCloudPrefs(user.uid, prefs).catch(() => { /* best-effort seed */ });
    }

    store.setState({ savedLocations: merged, prefs });

    // Land them on one of their own cities if the current one isn't saved.
    const { activeLocation } = store.getState();
    if (merged.length && !merged.some((place) => place.id === activeLocation?.id)) {
      selectPlace(merged[0]);
    }
  } catch {
    toast("Signed in, but couldn't load your saved places.");
  }
}

async function signOutUser() {
  try {
    const fb = await loadFirebase();
    await fb.signOut();
    navigate('landing');
  } catch (error) {
    toast(error.message);
  }
}

/** Persist places to the account when signed in, else to this device. */
function persistPlaces(locations) {
  const { user } = store.getState();
  if (!user) {
    saveGuest(locations);
    return;
  }
  loadFirebase()
    .then((fb) => fb.saveCloudPlaces(user.uid, locations))
    .catch(() => toast("Couldn't sync your places just now. Try again in a moment."));
}

/**
 * Paint the last-good payload immediately so a cold load isn't a blank screen,
 * then let the live fetch replace it.
 */
function showCachedIfAny() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const { weather, location, at } = JSON.parse(raw);
    if (!weather || !location) return;
    store.setState({
      weather, activeLocation: location, status: 'ready', lastUpdated: at,
    });
  } catch { /* nothing cached, or unreadable */ }
}

async function loadInitialPlace() {
  const { savedLocations } = store.getState();
  if (savedLocations.length > 0) return selectPlace(savedLocations[0]);

  // Never prompt for location on load — a cold-load permission prompt is poor
  // UX and iOS Safari rejects it outright. Only auto-locate a user who already
  // granted it (which reads silently, no prompt); everyone else gets the
  // fallback and can tap "Use my location" from search when they choose to.
  if (await permissionState() === 'granted') {
    try {
      const coords = await getCurrentPosition();
      return selectPlace(await reverseName(coords));
    } catch { /* fall through to the fallback place */ }
  }
  return selectPlace(FALLBACK_PLACE);
}

/**
 * The explicit "Use my location" action from search — a real user gesture, so
 * prompting here is expected and allowed everywhere. Adds the result as a saved
 * place, the same as picking a city from the list.
 */
async function useMyLocation() {
  closeSearch();
  try {
    const coords = await getCurrentPosition();
    addPlace(await reverseName(coords));
  } catch (error) {
    if (error?.kind !== GEO_DENIED) toast(error.message);
  }
}

/**
 * Open-Meteo has no reverse-geocoding endpoint, so name the coordinates by
 * searching for the nearest match and keeping the user's real position.
 */
async function reverseName(coords) {
  try {
    const [nearest] = await searchCities(`${coords.latitude},${coords.longitude}`);
    if (nearest) return { ...nearest, ...coords, id: keyFor(coords) };
  } catch { /* fall through to the unnamed version */ }

  return {
    ...coords,
    id: keyFor(coords),
    name: 'Your location', region: '', country: '', timezone: 'auto',
  };
}

const keyFor = ({ latitude, longitude }) =>
  `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

// -- Data ---------------------------------------------------------------------

async function selectPlace(location) {
  store.setState({ activeLocation: location, status: 'loading', error: null });

  try {
    const weather = await getForecast(location, { days: 5 });
    const at = new Date().toISOString();

    store.setState({ weather, status: 'ready', error: null, lastUpdated: at });
    cache(weather, location, at);
  } catch (error) {
    const message = error instanceof WeatherApiError
      ? error.message
      : "Couldn't load the forecast.";

    // Keep whatever is already on screen; an error must not blank the app.
    store.setState({ status: 'error', error: message });
    toast(store.getState().weather ? `${message} Showing the last update.` : message);
  }
}

function cache(weather, location, at) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ weather, location, at }));
  } catch { /* quota or private mode — caching is best-effort */ }
}

function addPlace(location) {
  const { savedLocations } = store.getState();
  const next = addLocation(savedLocations, location);
  store.setState({ savedLocations: next });
  persistPlaces(next);
  selectPlace(location);
  store.setState({ selectedDay: null });
  navigate('forecast');
}

function dropPlace(id) {
  const { savedLocations, activeLocation } = store.getState();
  const next = removeLocation(savedLocations, id);
  store.setState({ savedLocations: next });
  persistPlaces(next);

  // Removing the place you're looking at has to move you somewhere real.
  if (activeLocation?.id === id) selectPlace(next[0] ?? FALLBACK_PLACE);
}

// -- Chrome -------------------------------------------------------------------

function wireChrome() {
  qs('[data-theme-toggle]')?.addEventListener('click', () => {
    // A switch, not a cycle. "System" is where a theme comes from, not a third
    // appearance, so the button asks for the opposite of what is on screen —
    // which from 'system' means committing to the opposite of whatever the OS
    // is currently giving us. Settings keeps the three-way choice.
    const theme = nextTheme(store.getState().prefs.theme);
    updatePrefs({ theme });
  });

  // While the preference is 'system' the OS can change the rendered theme with
  // no input from the app, and the toggle's icon has to keep up.
  prefsStore.watchSystemTheme(() => {
    const { prefs } = store.getState();
    if (prefs.theme === 'system') renderThemeToggle(prefs.theme);
  });

  qs('[data-use-location]')?.addEventListener('click', useMyLocation);

  for (const link of qsa('[data-nav], [data-nav-home], [data-auth-action]')) {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href') ?? '';
      if (!href.startsWith('#/')) return;
      event.preventDefault();
      navigate(href.slice(2) || 'landing');
    });
  }
}

function updatePrefs(patch) {
  const prefs = { ...store.getState().prefs, ...patch };

  if ('theme' in patch) prefsStore.applyTheme(prefs.theme);
  if ('animatedIcons' in patch || 'reduceMotion' in patch) prefsStore.applyMotion(prefs);

  prefsStore.save(prefs);   // local cache, and the guest's store of record
  const { user } = store.getState();
  if (user) {
    loadFirebase()
      .then((fb) => fb.saveCloudPrefs(user.uid, prefs))
      .catch(() => { /* best-effort sync */ });
  }
  store.setState({ prefs });
}

/**
 * The move that carries you into sign in. The canvas builds its whole
 * transition section around this one journey, so this is the one journey that
 * plays it — every other screen change stays immediate.
 */
function playSigninTransition() {
  const { prefs, weather } = store.getState();
  if (!prefs.weatherTransitions) return;

  playTransition(qs('[data-screen="signin"]'), {
    move: chosenMove(prefs, weather),
    seconds: Number(prefs.transitionLength) || 1.2,
  });
}

/**
 * Open a day from the forecast list, or close the one that's open. The hourly
 * strip becomes that day's 24 hours; clicking the same day again returns it to
 * the rolling next-twelve.
 */
function selectDay(date) {
  const { selectedDay } = store.getState();
  store.setState({ selectedDay: selectedDay === date ? null : date });
}

// -- Render -------------------------------------------------------------------

function render(state) {
  const route = currentRoute();

  if (route === 'forecast') renderForecast(state, { onSelectDay: selectDay });
  if (route === 'landing') renderLanding(state);
  if (route === 'settings') {
    renderSettings(state, {
      onChange: updatePrefs, onSignOut: signOutUser, onRemovePlace: dropPlace,
    });
  }
  if (route === 'signin') renderSigninPanel(state);

  renderPlaceTabs(state);
  renderAuthLink(state);
  renderThemeToggle(state.prefs.theme);
}

function renderPlaceTabs(state) {
  const list = qs('[data-place-tabs-list]');
  if (!list) return;

  const tabs = state.savedLocations.map((location) => {
    const active = location.id === state.activeLocation?.id;

    // No remove control here. A row of tiny × targets beside the place you are
    // trying to tap is the easiest way to lose a saved city by accident, and
    // this design has no vocabulary for one. Removal lives in settings.
    return el('li', {}, [
      el('button', {
        className: `place-tabs__tab${active ? ' place-tabs__tab--active' : ''}`,
        type: 'button',
        text: location.name,
        'aria-current': active ? 'true' : null,
        onClick: () => selectPlace(location),
      }),
    ]);
  });

  replace(list, tabs);
}

function renderAuthLink(state) {
  const link = qs('[data-auth-action]');
  if (!link) return;
  // Signed in, the header link is a way back to the account (settings holds the
  // sign-out control); signed out, it's the way in.
  link.textContent = state.user ? 'Account' : 'Sign in';
  link.setAttribute('href', state.user ? '#/settings' : '#/signin');
}

boot();
