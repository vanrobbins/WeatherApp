/**
 * The forecast screen: reading, hourly strip, rain bars, days, metrics.
 *
 * Reads from the store and writes to the DOM. It never fetches and never
 * mutates state — that keeps it independent of every other render module.
 */

import { qs, el, replace } from '../util/dom.js';
import { describe } from '../util/wmo.js';
import { weatherIcon, liveRing } from '../util/icons.js';
import { rainSummary, rainBars, rampStep } from '../data/rain.js';
import { locationShortLabel } from '../api/geocoding.js';
import { renderChangeMark } from './axis.js';
import {
  formatTemp, formatWind, formatClock, formatHour, dayName,
  windDirection, formatHumidity, uvLabel,
} from '../util/format.js';

const MIDDOT = ' · ';

export function renderForecast(state, { onSelectDay } = {}) {
  const { weather, activeLocation, prefs, selectedDay } = state;
  if (!weather || !activeLocation) return;

  const { tempUnit, windUnit, clock } = unitsOf(prefs);
  const now = weather.current;
  const nowIso = now?.time ?? weather.current_weather?.time;
  const condition = describe(now?.weather_code, now?.is_day);

  renderNow({ weather, activeLocation, now, nowIso, condition, tempUnit, clock, prefs, selectedDay });
  renderHourly(weather, nowIso, tempUnit, clock, prefs, selectedDay);
  renderRain(weather, nowIso, prefs);
  renderDaily(weather, tempUnit, prefs, selectedDay, onSelectDay);
  renderMetrics(weather, now, windUnit, clock);
}

function unitsOf(prefs) {
  const imperial = prefs?.unitSystem === 'imperial';
  return {
    tempUnit: imperial ? 'f' : 'c',
    windUnit: imperial ? 'mph' : 'kmh',
    clock: prefs?.clock ?? '24h',
  };
}

// -- Current ------------------------------------------------------------------

function renderNow({
  weather, activeLocation, now, nowIso, condition, tempUnit, clock, prefs, selectedDay,
}) {
  const today = weather.daily;
  const place = locationShortLabel(activeLocation).toUpperCase();

  qs('[data-now-label]').textContent =
    `${place}${MIDDOT}Updated ${formatClock(nowIso, clock)}`;

  qs('[data-now-reading]').textContent = formatTemp(now?.temperature_2m, tempUnit);

  // "Light rain easing · 16° / 9°"
  const parts = [condition.label];
  if (today?.temperature_2m_max?.[0] != null) {
    parts.push(`${formatTemp(today.temperature_2m_max[0], tempUnit)} / ` +
               `${formatTemp(today.temperature_2m_min[0], tempUnit)}`);
  }
  if (prefs?.showFeelsLike && now?.apparent_temperature != null) {
    parts.push(`Feels ${formatTemp(now.apparent_temperature, tempUnit)}`);
  }
  qs('[data-now-condition]').textContent = parts.join(MIDDOT);

  // The claim the product is built on. The board sets a live ring against it —
  // it is the one line here that goes stale without anyone touching the page.
  const rain = rainSummary(weather.minutely_15, nowIso);
  const claim = qs('[data-now-rain]');
  replace(claim, rain.text ? [liveRing(), el('span', { text: rain.text })] : []);

  // The hero icon follows whichever day the list below has open, so the big
  // picture and the strip are describing the same day. With nothing open it
  // goes back to the condition outside right now.
  const dayIndex = selectedDay ? (weather.daily?.time?.indexOf(selectedDay) ?? -1) : -1;
  const heroIcon = dayIndex >= 0
    ? describe(weather.daily.weather_code[dayIndex], 1).icon
    : condition.icon;

  replace(qs('[data-now-icon]'), weatherIcon(heroIcon, { size: 200 }));
}

// -- Hourly -------------------------------------------------------------------

function renderHourly(weather, nowIso, tempUnit, clock, prefs, selectedDay) {
  const section = qs('.hourly');
  const hourly = weather.hourly;
  const visible = Boolean(prefs?.showHourly) && Boolean(hourly?.time);
  if (section) section.hidden = !visible;
  if (!visible) return;

  // Two modes. By default the strip is the rolling window the board draws:
  // the next twelve hours from now. Open a day from the list below and it
  // becomes that day, midnight to midnight.
  const day = selectedDay
    ? indexesForDay(hourly.time, selectedDay)
    : rollingWindow(hourly.time, nowIso);

  section.classList.toggle('hourly--day', Boolean(selectedDay));

  const items = day.map((index, i) => {
    const time = hourly.time[index];
    const { label } = describe(hourly.weather_code[index], hourly.is_day?.[index]);

    // The board draws this column as rain chance, not as a second icon set —
    // the caption under the strip literally reads "rain chance". The bar is
    // floored so a dry hour still sits on the axis as a bar.
    const chance = clampPercent(hourly.precipitation_probability?.[index]);

    return el('li', { className: 'hourly__hour' }, [
      el('span', {
        className: 'hourly__temp',
        text: formatTemp(hourly.temperature_2m[index], tempUnit),
      }),
      el('div', { className: 'hourly__track' }, [
        el('div', {
          className: `hourly__bar hourly__bar--r${rampStep(chance / 100)}`,
          style: { height: `${Math.max(4, chance)}%`, '--i': String(i) },
        }),
      ]),
      // Without this the temperature and the hour run together as "19°03".
      el('span', { className: 'visually-hidden', text: ' at ' }),
      el('span', {
        className: 'hourly__label',
        text: formatHour(time, clock),
      }),
      // The bar carries no text of its own, so the chance and the condition are
      // spoken here rather than left as colour a screen reader cannot see.
      el('span', {
        className: 'visually-hidden',
        text: `, ${chance}% chance of rain, ${label.toLowerCase()}`,
      }),
    ]);
  });

  replace(qs('[data-hourly]'), items);
  renderHourlyCaption(selectedDay);
}

/** The next twelve hourly steps from now — the board's default strip. */
function rollingWindow(times, nowIso) {
  let start = times.findIndex((t) => t >= nowIso);
  if (start < 0) start = 0;
  return times.slice(start, start + 24).map((_, i) => start + i).slice(0, 12);
}

/** Every hourly step whose local date matches — a whole day, midnight to midnight. */
function indexesForDay(times, date) {
  const out = [];
  for (let i = 0; i < times.length; i += 1) {
    if (times[i].startsWith(date)) out.push(i);
  }
  return out;
}

/**
 * The caption has to agree with what is actually on screen. In rolling mode the
 * column count is decided by CSS (eight narrow, twelve wide), so both numbers
 * ship and the unpainted one is `display:none` — which also takes it out of the
 * accessible name. A selected day shows all 24 at every width, so it just says so.
 */
function renderHourlyCaption(selectedDay) {
  const heading = qs('#hourly-heading');
  if (!heading) return;

  if (selectedDay) {
    replace(heading, [`${dayName(selectedDay)} · 24 hours · rain chance`]);
    return;
  }

  replace(heading, [
    'Next ',
    el('span', { className: 'hourly__count-narrow', text: '8' }),
    el('span', { className: 'hourly__count-wide', text: '12' }),
    ' hours · rain chance',
  ]);
}

// -- Rain bars ----------------------------------------------------------------

function renderRain(weather, nowIso, prefs) {
  const section = qs('[data-rain-section]');
  const bars = rainBars(weather.minutely_15, nowIso);
  const visible = Boolean(prefs?.showRainBars) && bars.length > 0;

  if (section) section.hidden = !visible;
  if (!visible) return;

  // Intensity is carried by the board's four-step ramp rather than by one flat
  // ink fill: a drizzle and a downpour used to be drawn in exactly the same
  // colour, so the strip only ever answered "wet or not", never "how hard".
  const nodes = bars.map((bar, i) => el('div', {
    className: `rain-strip__bar rain-strip__bar--r${rampStep(bar.level)}`,
    style: {
      // A wet bar is at least visible even at a trace amount; dry bars stay
      // at the floor set in CSS so the strip reads as a full-width axis.
      height: bar.wet ? `${Math.max(12, bar.level * 100)}%` : '4%',
      '--i': String(i),
    },
  }));

  replace(qs('[data-rain-bars]'), nodes);

  // A wall of bars is meaningless to a screen reader, so the container carries
  // role="img" and this sentence is its entire accessible content.
  const summary = rainSummary(weather.minutely_15, nowIso);
  const wetCount = bars.filter((b) => b.wet).length;
  qs('[data-rain-bars]').setAttribute(
    'aria-label',
    wetCount === 0
      ? 'No rain expected in the next 12 hours.'
      : `Rain expected in ${wetCount} of the next 48 quarter-hour periods. ${summary.text}.`
  );

  // The caption row's middle mark. The other two are static: the section
  // heading on the left, the 12-hour horizon on the right.
  renderChangeMark(qs('[data-rain-change]'), summary);

  // A flat strip of empty bars looks broken rather than dry, so say which it is.
  qs('[data-rain-note]').textContent = wetCount === 0
    ? 'Nothing falling in this window.'
    : 'Each bar is 15 minutes. Precipitation resolves to 15-minute steps.';
}

// -- Days ---------------------------------------------------------------------

function renderDaily(weather, tempUnit, prefs, selectedDay, onSelectDay) {
  const daily = weather.daily;
  const list = qs('[data-daily]');
  if (!daily?.time || !list) return;

  const showRanges = Boolean(prefs?.showRanges);
  qs('.daily')?.classList.toggle('daily--no-ranges', !showRanges);

  // The bar is only meaningful against the week it sits in, so the scale is the
  // whole visible week rather than each row's own span.
  const lows = daily.temperature_2m_min ?? [];
  const highs = daily.temperature_2m_max ?? [];
  const weekMin = Math.min(...lows);
  const weekMax = Math.max(...highs);
  const spread = weekMax - weekMin;

  const rows = daily.time.map((date, i) => {
    const { icon, label } = describe(daily.weather_code[i], 1);
    // Board: "Today", then "Sun 6", "Mon 7" — the weekday alone leaves you
    // counting rows to work out which date you are looking at. Sliced from the
    // ISO string rather than parsed, because `new Date('2026-09-09')` is UTC
    // midnight and reads as the 8th anywhere west of Greenwich.
    const name = i === 0 ? 'Today' : `${dayName(date)} ${Number(date.slice(8, 10))}`;
    const selected = selectedDay === date;

    const cells = [
      el('span', { className: 'daily__day', text: name }),
      el('span', { className: 'daily__icon' }, [weatherIcon(icon, { size: 22 })]),
    ];

    if (showRanges) cells.push(rangeBar(lows[i], highs[i], weekMin, spread, icon));

    cells.push(el('span', { className: 'daily__temps' }, [
      el('span', {
        className: 'daily__low',
        text: formatTemp(lows[i], tempUnit),
      }),
      ' ',
      el('span', { text: formatTemp(highs[i], tempUnit) }),
    ]));

    // The whole row is the control. The icon and the bar say nothing out loud,
    // so the button's name is assembled here instead: day, sky, and the range.
    const button = el('button', {
      className: `daily__row${selected ? ' daily__row--selected' : ''}`,
      type: 'button',
      'aria-pressed': String(selected),
      'aria-controls': 'hourly-heading',
      'aria-label': `${name}, ${label.toLowerCase()}, ` +
        `${formatTemp(lows[i], tempUnit)} to ${formatTemp(highs[i], tempUnit)}` +
        `${selected ? '. Showing its 24 hours.' : '. Show its 24 hours.'}`,
      onClick: () => onSelectDay?.(date),
    }, cells);

    return el('li', {}, [button]);
  });

  replace(list, rows);
}

/**
 * The day's slice of the week's temperature range, as the board draws it: a
 * rule-coloured track with the occupied span painted over it. Amber is spent
 * here on a clear day and nowhere else in the row.
 */
function rangeBar(low, high, weekMin, spread, icon) {
  const track = el('div', {
    className: 'daily__range',
    // The numbers are already in the temperatures column beside it; the bar is
    // the same fact drawn, so it stays out of the accessibility tree.
    'aria-hidden': 'true',
  });

  if (Number.isFinite(low) && Number.isFinite(high) && spread > 0) {
    track.append(el('div', {
      className: `daily__span${spanModifier(icon)}`,
      style: {
        '--from': `${((low - weekMin) / spread) * 100}%`,
        // A day that sits at a single temperature still has to draw as a mark.
        '--width': `${Math.max(2, ((high - low) / spread) * 100)}%`,
      },
    }));
  }

  return track;
}

/** Clear days take the sun accent, dry cloud takes the mid tint, wet takes ink. */
function spanModifier(icon) {
  const base = icon.replace(/-night$/, '');
  if (base === 'clear') return ' daily__span--clear';
  if (base === 'partly' || base === 'cloudy' || base === 'fog') return ' daily__span--cloud';
  return '';
}

/** Open-Meteo can hand back null for a probability; the bar still needs a number. */
function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

// -- Metrics ------------------------------------------------------------------

function renderMetrics(weather, now, windUnit, clock) {
  const parts = [];

  if (now?.wind_speed_10m != null) {
    parts.push(`${formatWind(now.wind_speed_10m, windUnit)} ` +
               `${windDirection(now.wind_direction_10m)}`);
  }
  if (now?.relative_humidity_2m != null) {
    parts.push(formatHumidity(now.relative_humidity_2m));
  }
  const uv = weather.daily?.uv_index_max?.[0];
  if (uv != null) parts.push(`UV ${Math.round(uv)} ${uvLabel(uv)}`);

  const sunset = weather.daily?.sunset?.[0];
  if (sunset) parts.push(`Sunset ${formatClock(sunset, clock)}`);

  qs('[data-metrics]').textContent = parts.join(MIDDOT);
}
