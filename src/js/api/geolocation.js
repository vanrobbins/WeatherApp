/**
 * Promise wrapper over the browser Geolocation API.
 *
 * Distinguishes *denied* from *unavailable* from *timed out*, because they call
 * for different responses: denial means fall back to search silently and never
 * re-prompt, while a timeout is worth surfacing and retrying.
 */

export const GEO_DENIED = 'denied';
export const GEO_UNAVAILABLE = 'unavailable';
export const GEO_TIMEOUT = 'timeout';
export const GEO_UNSUPPORTED = 'unsupported';

export class GeolocationError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'GeolocationError';
    this.kind = kind;
  }
}

/**
 * @param {{timeout?: number, maximumAge?: number}} [options]
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export function getCurrentPosition({ timeout = 10000, maximumAge = 300000 } = {}) {
  if (!('geolocation' in navigator)) {
    return Promise.reject(
      new GeolocationError(GEO_UNSUPPORTED, "This browser can't share your location.")
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      (error) => reject(toGeolocationError(error)),
      { enableHighAccuracy: false, timeout, maximumAge }
    );
  });
}

function toGeolocationError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new GeolocationError(GEO_DENIED, 'Location access was denied.');
    case error.POSITION_UNAVAILABLE:
      return new GeolocationError(GEO_UNAVAILABLE, "Your location isn't available right now.");
    case error.TIMEOUT:
      return new GeolocationError(GEO_TIMEOUT, 'Finding your location took too long.');
    default:
      return new GeolocationError(GEO_UNAVAILABLE, "Couldn't determine your location.");
  }
}

/**
 * Has the user already denied location, so we can skip prompting entirely?
 * The Permissions API isn't universal, so an unknown answer means "just try".
 */
export async function isPermissionDenied() {
  return (await permissionState()) === GEO_DENIED;
}

/**
 * The browser's current geolocation permission, without triggering a prompt:
 * 'granted' | 'prompt' | 'denied', or 'unknown' where the Permissions API is
 * absent. Lets the app auto-locate a returning user who already said yes, while
 * never prompting anyone on page load (which iOS Safari rejects outright).
 */
export async function permissionState() {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;   // 'granted' | 'prompt' | 'denied'
  } catch {
    return 'unknown';
  }
}
