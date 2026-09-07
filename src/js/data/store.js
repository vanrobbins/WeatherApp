/**
 * The single source of mutable state.
 *
 * Views subscribe once and re-render when notified. Nothing here touches the DOM
 * or the network; nothing outside mutates state directly. That one-way flow
 * (api -> store -> ui) is what keeps the render modules independent of each other.
 */

const initialState = {
  user: null,               // Firebase user, or null for a guest
  prefs: {
    tempUnit: 'f',          // 'c' | 'f'
    windUnit: 'mph',        // 'kmh' | 'mph'
  },
  activeLocation: null,     // normalised location object (see api/geocoding.js)
  weather: null,            // raw Open-Meteo payload
  selectedDay: null,        // 'YYYY-MM-DD' — a day opened from the forecast list,
                            // or null for the rolling next-12-hours view
  savedLocations: [],
  status: 'idle',           // 'idle' | 'loading' | 'ready' | 'error'
  error: null,
  lastUpdated: null,        // ISO string — drives the offline "Last updated" note
};

let state = { ...initialState };
const subscribers = new Set();

export function getState() {
  return state;
}

/**
 * Shallow-merge a patch into state and notify subscribers.
 * Nested objects (`prefs`) must be passed whole — see setPrefs.
 */
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  notify();
}

/** Merge into `prefs` without clobbering the keys you didn't pass. */
export function setPrefs(patch) {
  setState({ prefs: { ...state.prefs, ...patch } });
}

/**
 * @param {(state: object) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function notify() {
  // Copy first: a listener that unsubscribes during notification
  // must not shift the set out from under the iteration.
  for (const listener of [...subscribers]) {
    listener(state);
  }
}

/** Test helper — resets to a clean slate. */
export function resetState() {
  state = { ...initialState };
  notify();
}
