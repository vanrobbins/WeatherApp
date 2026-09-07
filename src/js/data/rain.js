/**
 * Minute-level rain reasoning — the claim Cirro is built around.
 *
 * Open-Meteo resolves precipitation to 15-minute steps, so this module rounds to
 * that precision and says "about", rather than inventing a to-the-minute figure
 * the data can't support. The canvas mockup reads "Stops in 35 minutes"; the
 * honest render of the same idea is "Stops in about 30 minutes".
 *
 * Pure: no DOM, no clock. `nowIso` is passed in so the logic is testable.
 */

import { MINUTELY_STEP_MINUTES } from '../api/weather-api.js';

/**
 * Precipitation below this (mm per 15-minute step) is drizzle so light it
 * reads as "dry" to a person standing outside. Without a floor, a trace value
 * of 0.01mm would keep the UI insisting it's raining.
 */
const WET_THRESHOLD_MM = 0.1;

export const RAINING = 'raining';
export const DRY = 'dry';

/**
 * Index of the step covering `nowIso`, or the first future step.
 * Compares ISO strings directly — they're the location's local clock and sort
 * lexicographically, so this avoids Date parsing and its timezone trap.
 */
function currentIndex(times, nowIso) {
  if (!Array.isArray(times) || times.length === 0) return -1;
  for (let i = times.length - 1; i >= 0; i -= 1) {
    if (times[i] <= nowIso) return i;
  }
  return 0;
}

/**
 * Summarise the next 12 hours of precipitation.
 *
 * @param {{time: string[], precipitation: number[]}} minutely  Open-Meteo minutely_15
 * @param {string} nowIso  the location's local time, e.g. "2026-09-05T14:22"
 * @returns {{state: string, changesInMinutes: number|null, text: string, isEstimate: boolean}}
 */
export function rainSummary(minutely, nowIso) {
  const times = minutely?.time;
  const precip = minutely?.precipitation;

  if (!Array.isArray(times) || !Array.isArray(precip) || times.length === 0) {
    return { state: DRY, changesInMinutes: null, text: '', isEstimate: false };
  }

  const start = currentIndex(times, nowIso);
  if (start < 0) {
    return { state: DRY, changesInMinutes: null, text: '', isEstimate: false };
  }

  const isWet = (i) => (precip[i] ?? 0) >= WET_THRESHOLD_MM;
  const rainingNow = isWet(start);

  // Walk forward to the first step whose state differs from now.
  let changeAt = -1;
  for (let i = start + 1; i < times.length; i += 1) {
    if (isWet(i) !== rainingNow) { changeAt = i; break; }
  }

  const horizonMinutes = (times.length - 1 - start) * MINUTELY_STEP_MINUTES;

  if (changeAt === -1) {
    // No change inside the window — say so, and don't imply we can see further.
    return {
      state: rainingNow ? RAINING : DRY,
      changesInMinutes: null,
      text: rainingNow
        ? 'Rain continuing past 12 hours'
        : 'No rain in the next 12 hours',
      isEstimate: false,
      horizonMinutes,
    };
  }

  const minutes = (changeAt - start) * MINUTELY_STEP_MINUTES;

  return {
    state: rainingNow ? RAINING : DRY,
    changesInMinutes: minutes,
    text: rainingNow
      ? `Stops in ${phraseMinutes(minutes)}`
      : `Rain in ${phraseMinutes(minutes)}`,
    // Always true when a figure is shown: it is quantised to 15-minute steps.
    isEstimate: true,
    horizonMinutes,
  };
}

/**
 * Render a 15-minute-quantised duration without overstating precision.
 * "about 30 minutes", "about 2 hours", "under 15 minutes".
 */
export function phraseMinutes(minutes) {
  if (minutes <= 0) return 'under 15 minutes';
  if (minutes < 60) return `about ${minutes} minutes`;

  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return `about ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  // 90 -> "about 1.5 hours"; keeps one decimal rather than inventing minutes.
  return `about ${hours.toFixed(1).replace(/\.0$/, '')} hours`;
}

/**
 * Which of the board's four ramp steps a 0..1 value lands on.
 *
 * The thresholds are read off the canvas rather than spaced evenly: the board's
 * hourly columns put 55-70% on ink, 20-38% on the mid tint, 10-14% one lighter
 * and anything under that on the rule colour. Evenly spaced quartiles washed
 * the whole strip out, because most quarter-hours in a real forecast are dry.
 *
 * @param {number} value 0..1
 * @returns {1|2|3|4} 1 is darkest
 */
export function rampStep(value) {
  const v = Number.isFinite(value) ? value : 0;
  if (v >= 0.5) return 1;
  if (v >= 0.2) return 2;
  if (v >= 0.1) return 3;
  return 4;
}

/**
 * The 12-hour rain-chance strip: one bar per 15-minute step, normalised 0..1
 * against the window's own peak so light drizzle is still visible.
 */
export function rainBars(minutely, nowIso, count = 48) {
  const times = minutely?.time;
  const precip = minutely?.precipitation;
  if (!Array.isArray(times) || !Array.isArray(precip)) return [];

  const start = Math.max(0, currentIndex(times, nowIso));
  const slice = precip.slice(start, start + count);
  const peak = Math.max(...slice, 0);

  return slice.map((mm, i) => ({
    time: times[start + i],
    mm: mm ?? 0,
    // A flat zero window must render as empty bars, not divide by zero.
    level: peak > 0 ? Math.min(1, (mm ?? 0) / peak) : 0,
    wet: (mm ?? 0) >= WET_THRESHOLD_MM,
  }));
}
