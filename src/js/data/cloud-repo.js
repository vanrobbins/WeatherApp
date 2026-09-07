/**
 * The signed-in user's record in Firestore: saved places + prefs in one
 * document, `users/{uid}`.
 *
 * Split out from locations-repo.js on purpose — this is the only data module
 * that imports Firebase, so the guest path (plain localStorage) stays free of
 * the SDK. main.js imports this lazily, so a visitor who never signs in never
 * downloads Firestore at all.
 *
 * The guest→account union rule lives in merge-locations.js; callers apply it.
 */

import {
  doc, getDoc, setDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { db } from '../auth/firebase.js';
import { MAX_PLACES } from './locations-repo.js';

const userDoc = (uid) => doc(db, 'users', uid);

/**
 * Read a user's whole record. Returns a stable shape even for a brand-new
 * account with no document yet, so callers never branch on existence.
 * @returns {Promise<{places: Array, prefs: object | null}>}
 */
export async function loadCloud(uid) {
  const snap = await getDoc(userDoc(uid));
  const data = snap.exists() ? snap.data() : {};
  return {
    places: Array.isArray(data.places) ? data.places : [],
    prefs: data.prefs ?? null,
  };
}

/** Write the saved places, capped, without disturbing the prefs field. */
export function saveCloudPlaces(uid, locations) {
  return setDoc(userDoc(uid), { places: locations.slice(0, MAX_PLACES) }, { merge: true });
}

/** Write the prefs, without disturbing the places field. */
export function saveCloudPrefs(uid, prefs) {
  return setDoc(userDoc(uid), { prefs }, { merge: true });
}
