/**
 * Open-Meteo forecast client.
 *
 * Always requests metric with `timezone=auto`; conversion happens in util/format.js
 * so the unit toggle never triggers a network call. Returns the payload unchanged —
 * shaping data is the formatters' job, not the fetch layer's.
 *
 * No API key: Open-Meteo requires no credentials at all.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 8000;

const CURRENT_FIELDS = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'is_day',
  'weather_code', 'pressure_msl', 'wind_speed_10m', 'wind_direction_10m', 'precipitation',
];

const HOURLY_FIELDS = [
  'temperature_2m', 'weather_code', 'precipitation_probability', 'is_day', 'uv_index',
];

const DAILY_FIELDS = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'sunrise', 'sunset',
  'uv_index_max', 'precipitation_probability_max',
];

// Cirro's core claim ("rain stops in ~35 minutes") rides on this block.
// Open-Meteo resolves precipitation to 15-minute steps, 48 of them = 12 hours,
// which is exactly the window the canvas draws as the rain-chance strip.
// The UI must round to that precision rather than imply per-minute accuracy.
const MINUTELY_FIELDS = ['precipitation', 'weather_code'];

/** Resolution of the minutely_15 block, in minutes. */
export const MINUTELY_STEP_MINUTES = 15;

/** Typed error so the UI can say something specific instead of "went wrong". */
export class WeatherApiError extends Error {
  constructor(message, { status = null, kind = 'unknown', cause = null } = {}) {
    super(message);
    this.name = 'WeatherApiError';
    this.status = status;
    /** 'timeout' | 'offline' | 'http' | 'parse' | 'unknown' */
    this.kind = kind;
    this.cause = cause;
  }
}

/**
 * Fetch a full forecast for a coordinate pair.
 *
 * @param {{latitude: number, longitude: number}} coords
 * @param {{days?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<object>} the raw Open-Meteo payload
 */
export async function getForecast({ latitude, longitude }, { days = 5, signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: 'auto',
    forecast_days: String(days),
    current: CURRENT_FIELDS.join(','),
    hourly: HOURLY_FIELDS.join(','),
    daily: DAILY_FIELDS.join(','),
    minutely_15: MINUTELY_FIELDS.join(','),
    forecast_minutely_15: '48',   // 48 x 15min = the canvas's 12-hour window
  });

  return request(`${FORECAST_URL}?${params}`, signal);
}

/**
 * Shared fetch wrapper: applies a timeout, honours an external abort signal, and
 * normalises every failure mode into a WeatherApiError.
 */
export async function request(url, externalSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), TIMEOUT_MS);

  // Caller-driven aborts (a newer keystroke) must cancel this request too.
  const onExternalAbort = () => controller.abort(externalSignal.reason);
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      // Open-Meteo puts a human-readable explanation in `reason` on 4xx.
      let reason = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        if (body?.reason) reason = body.reason;
      } catch { /* non-JSON error body; keep the generic message */ }

      throw new WeatherApiError(reason, { status: response.status, kind: 'http' });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof WeatherApiError) throw error;

    if (error?.name === 'AbortError') {
      // An external abort is a deliberate cancellation, not a failure —
      // rethrow it so callers can ignore it rather than showing an error.
      if (externalSignal?.aborted) throw error;
      throw new WeatherApiError('The weather service took too long to respond.', {
        kind: 'timeout', cause: error,
      });
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new WeatherApiError("You're offline.", { kind: 'offline', cause: error });
    }

    throw new WeatherApiError("Couldn't reach the weather service.", {
      kind: 'unknown', cause: error,
    });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
