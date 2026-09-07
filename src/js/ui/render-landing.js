/**
 * Landing — one claim, one live reading.
 *
 * The claim is generated from real data rather than hardcoded: if it currently
 * says rain stops in about 30 minutes, that is because the API says so.
 */

import { qs, el, replace } from '../util/dom.js';
import { describe } from '../util/wmo.js';
import { weatherIcon } from '../util/icons.js';
import { rainSummary, rainBars, rampStep, RAINING } from '../data/rain.js';
import { renderAxis } from './axis.js';
import { locationShortLabel } from '../api/geocoding.js';
import { formatTemp, formatClock } from '../util/format.js';

export function renderLanding(state) {
  const { weather, activeLocation, prefs } = state;
  if (!weather || !activeLocation) return;

  const now = weather.current;
  const nowIso = now?.time;
  const condition = describe(now?.weather_code, now?.is_day);
  const tempUnit = prefs?.unitSystem === 'imperial' ? 'f' : 'c';
  const clock = prefs?.clock ?? '24h';
  const rain = rainSummary(weather.minutely_15, nowIso);

  // The headline is the product claim, phrased from live data.
  const claim = qs('[data-landing-claim]');
  if (claim) {
    if (rain.changesInMinutes != null) {
      claim.textContent = rain.state === RAINING
        ? `Rain stops in ${strip(rain.text)}.`
        : `Rain starts in ${strip(rain.text)}.`;
    } else {
      claim.textContent = rain.state === RAINING
        ? 'Rain all afternoon.'
        : 'No rain for twelve hours.';
    }
  }

  replace(qs('[data-landing-reading]'), [
    el('div', {}, [
      el('p', {
        className: 'label',
        text: `Live · ${locationShortLabel(activeLocation)} · ${formatClock(nowIso, clock)}`,
      }),
      el('p', {
        className: 'reading',
        text: formatTemp(now?.temperature_2m, tempUnit),
      }),
      el('p', {
        className: 'landing__reading-condition',
        text: condition.label,
      }),
    ]),
    weatherIcon(condition.icon, { size: 200 }),
  ]);

  renderStrip(weather, nowIso, rain);
}

/**
 * The proof strip. The board puts twelve bars and an axis directly under the
 * live reading — the headline makes a claim, and this is the evidence for it in
 * about an inch of page. Twelve quarter-hours is three hours: near enough that
 * the change the headline names is actually inside the picture.
 */
const STRIP_BARS = 12;

function renderStrip(weather, nowIso, rain) {
  const container = qs('[data-landing-strip]');
  const bars = rainBars(weather.minutely_15, nowIso, STRIP_BARS);
  if (!container) return;

  container.hidden = bars.length === 0;
  if (bars.length === 0) return;

  replace(qs('[data-landing-bars]'), bars.map((bar, i) => el('div', {
    className: `landing__bar landing__bar--r${rampStep(bar.level)}`,
    style: {
      height: bar.wet ? `${Math.max(12, bar.level * 100)}%` : '5%',
      '--i': String(i),
    },
  })));

  // The bars are one picture, not twelve facts, so they carry a single sentence
  // and the axis beneath them stays plain text.
  qs('[data-landing-bars]').setAttribute(
    'aria-label',
    rain.text ? `${rain.text}.` : 'Rainfall over the next three hours.'
  );

  renderAxis(qs('[data-landing-axis]'), rain, '+3h');
}

/** "Stops in about 30 minutes" -> "about 30 minutes" */
function strip(text) {
  return text.replace(/^(Stops|Rain) in /, '');
}
