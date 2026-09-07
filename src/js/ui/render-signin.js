/**
 * The sign-in screen's night panel.
 *
 * Per the canvas: a live reading sits above the form, so the page shows the
 * product working before asking anyone to create an account.
 */

import { qs } from '../util/dom.js';
import { rainSummary, RAINING } from '../data/rain.js';
import { locationShortLabel } from '../api/geocoding.js';
import { formatTemp, formatWind } from '../util/format.js';
import { describe } from '../util/wmo.js';

export function renderSigninPanel(state) {
  const { weather, activeLocation, prefs } = state;
  const label = qs('[data-panel-label]');
  const reading = qs('[data-panel-reading]');
  const claim = qs('[data-panel-claim]');
  const metrics = qs('[data-panel-metrics]');
  if (!label || !reading || !claim) return;

  if (!weather || !activeLocation) {
    // Never leave the panel showing a bare dash — say what's happening.
    label.textContent = 'Live';
    reading.textContent = '—';
    claim.textContent = 'Loading a live reading…';
    if (metrics) metrics.textContent = '';
    return;
  }

  const now = weather.current;
  const imperial = prefs?.unitSystem === 'imperial';
  const condition = describe(now?.weather_code, now?.is_day);
  const rain = rainSummary(weather.minutely_15, now?.time);

  label.textContent = `Live · ${locationShortLabel(activeLocation)}`;
  reading.textContent = formatTemp(now?.temperature_2m, imperial ? 'f' : 'c');

  const wind = formatWind(now?.wind_speed_10m, imperial ? 'mph' : 'kmh');

  // The headline is strictly the rain claim; the condition belongs to the
  // detail line. Folding it into both read as "Partly cloudy. … Partly cloudy".
  const headline = rain.changesInMinutes != null
    ? (rain.state === RAINING
        ? `Rain stops in ${rain.text.replace(/^Stops in /, '')}.`
        : `Rain starts in ${rain.text.replace(/^Rain in /, '')}.`)
    : `${rain.text}.`;

  // The board keeps these on separate lines and in separate registers: the
  // claim is language, the line under it is what a machine measured.
  claim.textContent = headline;
  if (metrics) metrics.textContent = `${condition.label} · ${wind}`;
}
