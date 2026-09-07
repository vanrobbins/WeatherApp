/**
 * Merging a guest's saved cities into a signed-in account.
 *
 * This is the highest-risk logic in the app, so it lives on its own as a pure
 * function — no Firestore, no localStorage, nothing to mock.
 *
 * Two failure modes it exists to prevent:
 *
 *   1. A returning user signs in on a new device where they'd browsed as a guest.
 *      Their cloud list must NOT be replaced by that device's guest list.
 *   2. A guest saves cities, then signs up. Those cities must NOT be discarded
 *      in favour of an empty cloud list.
 *
 * So: union, never overwrite.
 */

/**
 * @param {Array<{id: string}>} cloud  saved locations already on the account
 * @param {Array<{id: string}>} guest  saved locations from this browser
 * @returns {Array} union, cloud entries first, de-duplicated by `id`
 */
export function mergeLocations(cloud = [], guest = []) {
  const merged = [];
  const seen = new Set();

  // Cloud order wins: it's the user's curated list across devices.
  for (const location of [...cloud, ...guest]) {
    if (!location?.id || seen.has(location.id)) continue;
    seen.add(location.id);
    merged.push(location);
  }

  return merged;
}

/**
 * True when the merge produced something the cloud doesn't already have,
 * i.e. a write is actually needed. Avoids a pointless Firestore write on
 * every single sign-in.
 */
export function needsWrite(cloud = [], merged = []) {
  if (cloud.length !== merged.length) return true;
  return cloud.some((location, index) => location?.id !== merged[index]?.id);
}
