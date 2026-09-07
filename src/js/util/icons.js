/**
 * Weather icons — one set, both themes.
 *
 * Per the canvas: 64×64 viewBox, drawn in `currentColor` so a single set works
 * on paper and on the night ground. Amber (`--sun`) appears only on the sun
 * disc and rays and the storm bolt — it is not a UI accent anywhere else.
 *
 * Shipped inline rather than hotlinked: they render with the first paint,
 * inherit colour for free, and survive offline.
 */

const SUN_DISC = `
  <g class="wx__sun" fill="none" stroke="var(--sun)" stroke-width="1.7" stroke-linecap="round">
    <circle cx="44" cy="16" r="7"/>
    <line x1="44" y1="6" x2="44" y2="3"/><line x1="44" y1="26" x2="44" y2="29"/>
    <line x1="34" y1="16" x2="31" y2="16"/><line x1="54" y1="16" x2="57" y2="16"/>
    <line x1="51.07" y1="8.93" x2="53.19" y2="6.81"/>
    <line x1="51.07" y1="23.07" x2="53.19" y2="25.19"/>
    <line x1="36.93" y1="23.07" x2="34.81" y2="25.19"/>
    <line x1="36.93" y1="8.93" x2="34.81" y2="6.81"/>
  </g>`;

const SUN_LARGE = `
  <g class="wx__sun" fill="none" stroke="var(--sun)" stroke-width="2" stroke-linecap="round">
    <circle cx="32" cy="32" r="12"/>
    <line x1="32" y1="14" x2="32" y2="8"/><line x1="32" y1="50" x2="32" y2="56"/>
    <line x1="14" y1="32" x2="8" y2="32"/><line x1="50" y1="32" x2="56" y2="32"/>
    <line x1="19.3" y1="19.3" x2="15" y2="15"/><line x1="44.7" y1="44.7" x2="49" y2="49"/>
    <line x1="19.3" y1="44.7" x2="15" y2="49"/><line x1="44.7" y1="19.3" x2="49" y2="15"/>
  </g>`;

const MOON = `
  <path class="wx__moon" d="M42 34a16 16 0 0 1-20.5-20.5A17 17 0 1 0 42 34z"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"/>`;

// Sits where the sun disc sits in the `partly` icon — high and to the right,
// so the cloud passes beneath it instead of swallowing it. An earlier version
// centred it lower and the crescent read as a stem poking out of the cloud.
const MOON_SMALL = `
  <path class="wx__moon" d="M49.5 17.5A8.5 8.5 0 0 1 40 8a9 9 0 1 0 9.5 9.5z"
        fill="var(--ground)" stroke="currentColor" stroke-width="1.7"
        stroke-linecap="round" stroke-linejoin="round"/>`;

const CLOUD = `
  <g class="wx__cloud" fill="currentColor">
    <rect x="10" y="26" width="38" height="14" rx="7"/>
    <circle cx="24" cy="24" r="11"/><circle cx="42" cy="27" r="8"/>
  </g>`;

const CLOUD_ONLY = `
  <g class="wx__cloud" fill="currentColor">
    <rect x="10" y="30" width="42" height="15" rx="7.5"/>
    <circle cx="25" cy="27" r="12"/><circle cx="44" cy="31" r="9"/>
  </g>`;

/** Falling strokes: rain, drizzle, showers differ only in weight and length. */
const drops = (count = 3, { width = 2.2, len = 7, dash = '' } = {}) => {
  const xs = { 3: [20, 30, 40], 4: [17, 27, 37, 47] }[count] ?? [20, 30, 40];
  return `<g class="wx__drops" stroke="currentColor" stroke-width="${width}"
              stroke-linecap="round"${dash}>
    ${xs.map((x, i) => `<line x1="${x}" y1="46" x2="${x}" y2="${46 + len}"
       style="--i:${i}"/>`).join('')}
  </g>`;
};

const FLAKES = `
  <g class="wx__flakes" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    ${[20, 30, 40].map((x, i) => `
      <g style="--i:${i}" transform="translate(${x} 51)">
        <line x1="-3.5" y1="0" x2="3.5" y2="0"/>
        <line x1="0" y1="-3.5" x2="0" y2="3.5"/>
        <line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5"/>
        <line x1="-2.5" y1="2.5" x2="2.5" y2="-2.5"/>
      </g>`).join('')}
  </g>`;

const BOLT = `
  <path class="wx__bolt" d="M32 44l-6 10h6l-2 8 8-11h-6l2-7z"
        fill="var(--sun)" stroke="none"/>`;

const FOG_LINES = `
  <g class="wx__fog" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
    ${[38, 45, 52].map((y, i) => `
      <line x1="${12 + i * 2}" y1="${y}" x2="${52 - i * 2}" y2="${y}" style="--i:${i}"/>`).join('')}
  </g>`;

const ICON_SET = {
  clear:          SUN_LARGE,
  'clear-night':  MOON,
  partly:         `${SUN_DISC}${CLOUD}`,
  'partly-night': `${MOON_SMALL}${CLOUD}`,
  cloudy:         CLOUD_ONLY,
  fog:            `${CLOUD_ONLY}${FOG_LINES}`,
  drizzle:        `${CLOUD}${drops(4, { width: 1.6, len: 5 })}`,
  rain:           `${CLOUD}${drops(3)}`,
  showers:        `${SUN_DISC}${CLOUD}${drops(3)}`,
  'showers-night': `${MOON_SMALL}${CLOUD}${drops(3)}`,
  freezing:       `${CLOUD}${drops(2, { width: 2 })}${FLAKES}`,
  snow:           `${CLOUD}${FLAKES}`,
  thunder:        `${CLOUD}${BOLT}`,
  hail:           `${CLOUD}${BOLT}${drops(3, { width: 2.6, len: 4 })}`,
  unknown:        `<circle cx="32" cy="32" r="14" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-dasharray="3 5"/>`,
};

/**
 * Build an icon element.
 *
 * @param {string} name  key from wmo.js `describe().icon`
 * @param {{size?: number, label?: string}} [options]
 *        `label` gives the icon an accessible name; omit it when adjacent text
 *        already says the same thing, and the icon is hidden from assistive tech.
 */
export function weatherIcon(name, { size = 64, label = '' } = {}) {
  const body = ICON_SET[name] ?? ICON_SET.unknown;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('class', `wx wx--${name}`);
  if (label) svg.setAttribute('aria-label', label);
  else svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = body;

  return svg;
}

/**
 * The live ring from board section 06 — a solid dot inside a hairline ring that
 * breathes on a 2.4s cycle. It marks a reading that goes stale on its own, so
 * in this app it belongs to exactly one line: the rain claim.
 *
 * Purely decorative: the sentence beside it already says what it means, so it
 * is hidden from assistive technology rather than given a redundant label.
 */
export function liveRing(size = 14) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'live-ring');
  svg.innerHTML =
    '<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<circle class="live-ring__halo" cx="12" cy="12" r="10" fill="none" ' +
    'stroke="currentColor" stroke-width="1"/>';
  return svg;
}

export const hasIcon = (name) => Object.hasOwn(ICON_SET, name);
export const iconNames = () => Object.keys(ICON_SET);
