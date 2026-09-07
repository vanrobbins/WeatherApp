/**
 * Page transitions, by weather — board section 11 of the canvas.
 *
 * "The app already knows the condition at your location, so the move that
 * carries you from landing into sign in borrows it. Direction is the tell:
 * wind pushes sideways, rain falls, sun opens outward from where the sun sits,
 * lightning does not travel at all."
 *
 * Always an opaque sheet, never a cross-fade. The sheet is the arriving screen
 * itself, painted on the ground colour, so nothing has to be drawn twice.
 */

import { el } from '../util/dom.js';

/** The board's four leading-edge opacities, cycled across the streaks. */
const LEAD_OPACITY = [0.3, 0.46, 0.62, 0.78];

export const MOVES = ['gust', 'fall', 'iris', 'flash'];

/** Wind at or above this reads as weather you can feel, in km/h. */
const GUSTY_KMH = 25;

/**
 * Which move the current conditions call for.
 *
 * Order matters: a thunderstorm is a thunderstorm however hard the wind blows,
 * and wind you can lean on outranks the drizzle falling through it.
 */
export function moveForWeather(weather) {
  const now = weather?.current;
  const code = now?.weather_code;

  if (code === 95 || code === 96 || code === 99) return 'flash';
  if ((now?.wind_speed_10m ?? 0) >= GUSTY_KMH) return 'gust';
  if (code >= 51 && code <= 86) return 'fall';           // drizzle through snow
  if (now?.is_day && (code === 0 || code === 1 || code === 2)) return 'iris';
  return 'gust';                                          // overcast, fog, night
}

/** The move to actually play, honouring an explicit choice over the live one. */
export function chosenMove(prefs, weather) {
  const pick = prefs?.transitionMove ?? 'live';
  return MOVES.includes(pick) ? pick : moveForWeather(weather);
}

/**
 * Play a transition on a screen that is about to be shown.
 *
 * Returns immediately; the animation cleans up after itself. Reduced motion is
 * handled globally in _reset.scss ("transitions cut"), which collapses the
 * duration to nothing — so this needs no guard of its own beyond the switch.
 */
export function playTransition(screen, { move, seconds = 1.2 } = {}) {
  if (!screen || !MOVES.includes(move)) return;

  cleanup(screen);

  screen.style.setProperty('--dur-move', `${seconds}s`);
  screen.dataset.move = move;

  // The flourish that rakes ahead of the leading edge. The board draws nine
  // streaks for the gust and a curtain of drops for the fall; the iris opens
  // from a point and the flash does not travel, so neither has one.
  const lead = buildLead(move);
  if (lead) screen.append(lead);

  const done = () => cleanup(screen);
  screen.addEventListener('animationend', done, { once: true });
  // A screen navigated away from mid-move never fires animationend.
  setTimeout(done, seconds * 1000 + 200);
}

function cleanup(screen) {
  delete screen.dataset.move;
  screen.style.removeProperty('--dur-move');
  screen.querySelector('.sheet-lead')?.remove();
}

function buildLead(move) {
  if (move === 'gust') {
    // Nine ink streaks at staggered lengths, exactly as the board lists them.
    return el('div', { className: 'sheet-lead sheet-lead--gust', 'aria-hidden': 'true' },
      [90, 140, 70, 160, 100, 130, 80, 120, 150].map((width, i) =>
        el('span', {
          style: {
            width: `${width}px`,
            '--i': String(i),
            '--o': String(LEAD_OPACITY[i % LEAD_OPACITY.length]),
          },
        })));
  }

  if (move === 'fall') {
    return el('div', { className: 'sheet-lead sheet-lead--fall', 'aria-hidden': 'true' },
      [60, 110, 70, 130, 80, 120, 60, 100, 140, 80, 110, 70].map((height, i) =>
        el('span', {
          style: {
            height: `${height}px`,
            '--i': String(i),
            '--o': String(LEAD_OPACITY[i % LEAD_OPACITY.length]),
          },
        })));
  }

  if (move === 'flash') {
    return el('div', { className: 'sheet-lead sheet-lead--flash', 'aria-hidden': 'true' });
  }

  return null;   // iris opens from a point and needs no leading edge
}
