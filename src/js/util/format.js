/**
 * Formatting and unit conversion.
 *
 * The app always fetches metric from Open-Meteo and converts here, so switching
 * units is a pure re-render off existing state and never triggers a refetch.
 *
 * Every function is pure: no DOM, no globals, no `Date.now()`. Times are derived
 * from the API's local-time strings because the active location is frequently in
 * a different timezone than the browser.
 */

export const TEMP_C = 'c';
export const TEMP_F = 'f';
export const WIND_KMH = 'kmh';
export const WIND_MPH = 'mph';

export const cToF = (c) => (c * 9) / 5 + 32;
export const kmhToMph = (kmh) => kmh * 0.621371;
export const hPaToInHg = (hPa) => hPa * 0.02953;

/**
 * @param {number} celsius
 * @param {'c'|'f'} unit
 * @param {{degree?: boolean}} [opts] include the degree sign (default true)
 * @returns {string} e.g. "72°"  — no unit letter; the toggle already shows it
 */
export function formatTemp(celsius, unit = TEMP_F, { degree = true } = {}) {
  if (!Number.isFinite(celsius)) return '--';
  const value = unit === TEMP_F ? cToF(celsius) : celsius;
  return `${Math.round(value)}${degree ? '°' : ''}`;
}

/**
 * @param {number} kmh
 * @param {'kmh'|'mph'} unit
 * @returns {string} e.g. "8 mph"
 */
export function formatWind(kmh, unit = WIND_MPH) {
  if (!Number.isFinite(kmh)) return '--';
  const value = unit === WIND_MPH ? kmhToMph(kmh) : kmh;
  return `${Math.round(value)} ${unit === WIND_MPH ? 'mph' : 'km/h'}`;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/**
 * Meteorological wind direction (degrees the wind blows *from*) to a compass point.
 * 16 buckets of 22.5°, with 0/360 landing on N.
 */
export function windDirection(degrees) {
  if (!Number.isFinite(degrees)) return '--';
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return COMPASS[index];
}

export function formatPressure(hPa) {
  if (!Number.isFinite(hPa)) return '--';
  return `${hPaToInHg(hPa).toFixed(2)} in`;
}

export function formatHumidity(percent) {
  return Number.isFinite(percent) ? `${Math.round(percent)}%` : '--';
}

export function formatPrecipChance(percent) {
  return Number.isFinite(percent) ? `${Math.round(percent)}%` : '--';
}

/**
 * UV index to its standard risk band.
 * Thresholds follow the WHO Global Solar UV Index.
 */
export function uvLabel(uv) {
  if (!Number.isFinite(uv)) return '--';
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
}

/**
 * Parse an Open-Meteo local-time string ("2026-09-05T22:00") into its parts
 * WITHOUT letting the browser apply its own timezone.
 *
 * `new Date("2026-09-05T22:00")` is parsed as *browser-local* time, which is
 * exactly wrong here: the string already represents the target location's local
 * clock. Splitting the string keeps Tokyo's 22:00 as 22:00 in Indiana.
 */
export function parseLocalTime(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso ?? '');
  if (!match) return null;
  const [, year, month, day, hour = '0', minute = '0'] = match;
  return {
    year: +year, month: +month, day: +day,
    hour: +hour, minute: +minute,
  };
}

export const CLOCK_24 = '24h';
export const CLOCK_12 = '12h';

/**
 * "2026-09-05T22:00" -> "22" (24h) or "10 PM" (12h).
 * The hourly strip is dense, so 24h drops the minutes entirely — matching the
 * canvas, which labels the strip "15 16 17 18".
 */
export function formatHour(iso, clock = CLOCK_24) {
  const t = parseLocalTime(iso);
  if (!t) return '--';
  if (clock === CLOCK_24) return String(t.hour).padStart(2, '0');
  const suffix = t.hour < 12 ? 'AM' : 'PM';
  return `${t.hour % 12 === 0 ? 12 : t.hour % 12} ${suffix}`;
}

/** "2026-09-05T07:18" -> "07:18" (24h) or "7:18 AM" (12h) */
export function formatClock(iso, clock = CLOCK_24) {
  const t = parseLocalTime(iso);
  if (!t) return '--';
  const minute = String(t.minute).padStart(2, '0');
  if (clock === CLOCK_24) return `${String(t.hour).padStart(2, '0')}:${minute}`;
  const suffix = t.hour < 12 ? 'AM' : 'PM';
  return `${t.hour % 12 === 0 ? 12 : t.hour % 12}:${minute} ${suffix}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * "2026-09-05" -> "Sat". Uses Date.UTC so the weekday is computed from the
 * calendar date itself rather than shifting across a timezone boundary.
 */
export function dayName(iso) {
  const t = parseLocalTime(iso);
  if (!t) return '--';
  const index = new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay();
  return DAYS[index];
}

/** True when the ISO date string is the same calendar day as `todayIso`. */
export function isToday(iso, todayIso) {
  return (iso ?? '').slice(0, 10) === (todayIso ?? '').slice(0, 10);
}
