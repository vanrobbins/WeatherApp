/**
 * Saved places for a guest — plain localStorage, no Firebase.
 *
 * The signed-in equivalent lives in cloud-repo.js (Firestore), kept separate so
 * this module carries no SDK and can load on the boot path for free. Both sides
 * go through `mergeLocations` from merge-locations.js so a guest's cities are
 * unioned into their account on sign-in rather than overwriting it.
 */

import { mergeLocations } from './merge-locations.js';

const STORAGE_KEY = 'cirro:places';
const MAX_PLACES = 8;

export function loadGuest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuest(locations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  } catch {
    // Non-fatal — the list simply won't survive a reload.
  }
}

export function clearGuest() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * Add a place, de-duplicating by id and capping the list.
 * Returns the new array; never mutates the input.
 */
export function addLocation(locations, location) {
  if (!location?.id) return locations;
  // mergeLocations already does exactly this union-by-id, so reuse it rather
  // than writing a second de-duplication rule that could drift from the first.
  return mergeLocations(locations, [location]).slice(0, MAX_PLACES);
}

export function removeLocation(locations, id) {
  return locations.filter((location) => location.id !== id);
}

export { MAX_PLACES };
