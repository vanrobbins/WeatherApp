/**
 * WMO weather code interpretation.
 *
 * Open-Meteo returns numeric WMO codes rather than condition text or icon URLs,
 * so this module is the single source of truth for what each code means and
 * which icon represents it. Every condition string the user reads originates here.
 */

/** Canonical icon keys. `icons.js` maps these to inline SVG. */
export const ICONS = {
  CLEAR: 'clear',
  PARTLY: 'partly',
  CLOUDY: 'cloudy',
  FOG: 'fog',
  DRIZZLE: 'drizzle',
  RAIN: 'rain',
  FREEZING: 'freezing',
  SNOW: 'snow',
  SHOWERS: 'showers',
  THUNDER: 'thunder',
  HAIL: 'hail',
  UNKNOWN: 'unknown',
};

/**
 * code -> { label, icon, dayNight }
 * `dayNight: true` means the icon has a distinct night variant (sun vs moon).
 */
const CODES = {
  0:  { label: 'Clear',              icon: ICONS.CLEAR,    dayNight: true  },
  1:  { label: 'Mainly clear',       icon: ICONS.CLEAR,    dayNight: true  },
  2:  { label: 'Partly cloudy',      icon: ICONS.PARTLY,   dayNight: true  },
  3:  { label: 'Overcast',           icon: ICONS.CLOUDY,   dayNight: false },

  45: { label: 'Fog',                icon: ICONS.FOG,      dayNight: false },
  48: { label: 'Freezing fog',       icon: ICONS.FOG,      dayNight: false },

  51: { label: 'Light drizzle',      icon: ICONS.DRIZZLE,  dayNight: false },
  53: { label: 'Drizzle',            icon: ICONS.DRIZZLE,  dayNight: false },
  55: { label: 'Heavy drizzle',      icon: ICONS.DRIZZLE,  dayNight: false },
  56: { label: 'Freezing drizzle',   icon: ICONS.FREEZING, dayNight: false },
  57: { label: 'Freezing drizzle',   icon: ICONS.FREEZING, dayNight: false },

  61: { label: 'Light rain',         icon: ICONS.RAIN,     dayNight: false },
  63: { label: 'Rain',               icon: ICONS.RAIN,     dayNight: false },
  65: { label: 'Heavy rain',         icon: ICONS.RAIN,     dayNight: false },
  66: { label: 'Freezing rain',      icon: ICONS.FREEZING, dayNight: false },
  67: { label: 'Freezing rain',      icon: ICONS.FREEZING, dayNight: false },

  71: { label: 'Light snow',         icon: ICONS.SNOW,     dayNight: false },
  73: { label: 'Snow',               icon: ICONS.SNOW,     dayNight: false },
  75: { label: 'Heavy snow',         icon: ICONS.SNOW,     dayNight: false },
  77: { label: 'Snow grains',        icon: ICONS.SNOW,     dayNight: false },

  // Showers carry a sun disc — a break in the cloud is what makes them showers
  // rather than rain — so they need a night variant like `clear` and `partly`.
  // Without one, a 3am shower drew an amber sun in a night sky.
  80: { label: 'Light showers',      icon: ICONS.SHOWERS,  dayNight: true  },
  81: { label: 'Showers',            icon: ICONS.SHOWERS,  dayNight: true  },
  82: { label: 'Heavy showers',      icon: ICONS.SHOWERS,  dayNight: true  },
  85: { label: 'Snow showers',       icon: ICONS.SNOW,     dayNight: false },
  86: { label: 'Heavy snow showers', icon: ICONS.SNOW,     dayNight: false },

  95: { label: 'Thunderstorm',       icon: ICONS.THUNDER,  dayNight: false },
  96: { label: 'Thunderstorm, hail', icon: ICONS.HAIL,     dayNight: false },
  99: { label: 'Thunderstorm, hail', icon: ICONS.HAIL,     dayNight: false },
};

const FALLBACK = { label: 'Unknown', icon: ICONS.UNKNOWN, dayNight: false };

/**
 * Describe a WMO weather code.
 *
 * @param {number} code   WMO code from Open-Meteo.
 * @param {boolean|number} isDay  Open-Meteo sends 1/0, but a boolean works too.
 * @returns {{label: string, icon: string, code: number}}
 *          `icon` gains a `-night` suffix for codes that have a night variant,
 *          so callers never need to know which codes those are.
 */
export function describe(code, isDay = 1) {
  const entry = CODES[code] ?? FALLBACK;
  const night = !isDay && entry.dayNight;

  return {
    code,
    label: entry.label,
    icon: night ? `${entry.icon}-night` : entry.icon,
  };
}

/** True when the code is one this app has an explicit mapping for. */
export function isKnown(code) {
  return Object.hasOwn(CODES, code);
}
