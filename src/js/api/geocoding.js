/**
 * Open-Meteo geocoding client — powers city search autocomplete.
 *
 * Note the no-match shape: the API returns `{"generationtime_ms": 0.42}` with the
 * `results` key ABSENT rather than an empty array. Verified against the live API.
 * Anything that assumes `data.results` exists will throw on every failed search.
 */

import { request } from './weather-api.js';

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * A stable identity for a place, used to de-duplicate saved locations.
 * Two decimal places (~1.1km) collapses near-identical coordinates that the
 * geocoder returns for the same city from different queries.
 */
export function locationId({ latitude, longitude }) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

/**
 * Flatten a geocoding hit into what the app actually displays.
 * `admin1` is the state/province; it disambiguates the many Bloomingtons.
 */
export function toLocation(result) {
  return {
    id: locationId(result),
    name: result.name,
    region: result.admin1 ?? '',
    country: result.country ?? '',
    countryCode: result.country_code ?? '',
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone ?? 'auto',
  };
}

/** "Bloomington, Indiana, United States" — skipping any empty parts. */
export function locationLabel(location) {
  return [location.name, location.region, location.country].filter(Boolean).join(', ');
}

/** Short form for tight spaces: "Bloomington, Indiana" */
export function locationShortLabel(location) {
  return [location.name, location.region || location.country].filter(Boolean).join(', ');
}

/**
 * Search for cities by name.
 *
 * @param {string} term
 * @param {{count?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<Array>} normalised locations; ALWAYS an array
 */
export async function searchCities(term, { count = 8, signal } = {}) {
  const query = term.trim();
  if (query.length < 2) return [];

  const params = new URLSearchParams({
    name: query,
    count: String(count),
    language: 'en',
    format: 'json',
  });

  const data = await request(`${SEARCH_URL}?${params}`, signal);

  // The `?? []` is load-bearing — see the module comment.
  return (data.results ?? []).map(toLocation);
}
