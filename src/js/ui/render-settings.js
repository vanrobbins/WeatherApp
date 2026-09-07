/**
 * Settings — every switch here changes something the app actually does.
 *
 * The canvas draws seventeen switches including alert scheduling (rain-start
 * lead time, severe weather, a daily digest). Those need push notifications and
 * a scheduler this static app has no way to provide, so they are omitted rather
 * than rendered as controls that quietly do nothing.
 *
 * Dependent rows indent and dim to 40% when their parent is off — never hidden,
 * per the canvas.
 */

import { el, replace, qs } from '../util/dom.js';

const GROUPS = [
  {
    title: 'Units',
    rows: [
      { type: 'segmented', key: 'unitSystem', name: 'Unit system',
        options: [['metric', 'Metric'], ['imperial', 'Imperial']] },
      { type: 'segmented', key: 'clock', name: 'Clock',
        options: [['24h', '24h'], ['12h', '12h']] },
    ],
  },
  {
    title: 'Appearance',
    rows: [
      { type: 'segmented', key: 'theme', name: 'Theme',
        options: [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']] },
      { type: 'static', name: 'Amber reserved for sun',
        note: 'The accent marks sunlight and nothing else.' },
    ],
  },
  {
    title: 'Motion',
    rows: [
      { type: 'switch', key: 'animatedIcons', name: 'Animated weather icons' },
      { type: 'switch', key: 'weatherTransitions', name: 'Weather-matched transitions',
        note: 'Screens move the way the condition moves.' },
      { type: 'segmented', key: 'transitionMove', name: 'Move', dependsOn: 'weatherTransitions',
        options: [['live', 'Live'], ['gust', 'Gust'], ['fall', 'Fall'],
                  ['iris', 'Iris'], ['flash', 'Flash']] },
      { type: 'segmented', key: 'transitionLength', name: 'Length', dependsOn: 'weatherTransitions',
        options: [['0.8', '0.8s'], ['1.2', '1.2s'], ['1.8', '1.8s']] },
      { type: 'switch', key: 'reduceMotion', name: 'Reduce motion',
        note: 'Loops hold their first frame; transitions cut.' },
    ],
  },
  {
    title: 'What the forecast shows',
    rows: [
      { type: 'switch', key: 'showRainBars', name: 'Minute-level rain bars',
        note: 'Resolves to 15-minute steps.' },
      { type: 'switch', key: 'showHourly', name: '12-hour strip' },
      { type: 'switch', key: 'showRanges', name: 'Daily range bars' },
      { type: 'switch', key: 'showFeelsLike', name: 'Feels-like reading' },
    ],
  },
];

export function renderSettings(state, { onChange, onSignOut, onRemovePlace }) {
  const { prefs } = state;

  const groups = GROUPS.map((group) => el('section', { className: 'settings__group' }, [
    el('h2', { className: 'label settings__group-title', text: group.title }),
    el('div', {}, group.rows.map((row) => renderRow(row, prefs, onChange))),
  ]));

  groups.push(renderPlaces(state, onRemovePlace));

  replace(qs('[data-settings-groups]'), groups);
  renderAccount(state, onSignOut);
}

/**
 * Saved places, with the control that removes them.
 *
 * The header tabs used to carry a small × beside each city. Removal is
 * destructive and the tabs are the thing you tap constantly to switch between
 * places, so the two sat a few pixels apart — this puts the destructive action
 * somewhere you have to go on purpose.
 */
function renderPlaces(state, onRemovePlace) {
  const places = state.savedLocations ?? [];

  const rows = places.length === 0
    ? [el('p', {
        className: 'setting__note settings__empty',
        text: 'No places saved yet. Add one from the + in the header.',
      })]
    : places.map((place) => el('div', { className: 'setting' }, [
        el('div', { className: 'setting__text' }, [
          el('p', { className: 'setting__name', text: place.name }),
          el('p', {
            className: 'setting__note',
            text: [place.region, place.country].filter(Boolean).join(' · '),
          }),
        ]),
        el('button', {
          className: 'link-button',
          type: 'button',
          text: 'Remove',
          'aria-label': `Remove ${place.name}`,
          onClick: () => onRemovePlace?.(place.id),
        }),
      ]));

  return el('section', { className: 'settings__group' }, [
    el('h2', { className: 'label settings__group-title', text: 'Saved places' }),
    el('div', {}, rows),
  ]);
}

function renderRow(row, prefs, onChange) {
  // Section 08 of the canvas: "Dependents indent 26px and dim to 40% when their
  // parent is off — never hidden." Hiding them would make the parent switch
  // look like it removed a feature rather than turned one off.
  const dependent = Boolean(row.dependsOn);
  const inactive = dependent && !prefs[row.dependsOn];

  const text = el('div', { className: 'setting__text' }, [
    el('p', { className: 'setting__name', text: row.name }),
    row.note ? el('p', { className: 'setting__note', text: row.note }) : null,
  ]);

  let control = null;

  if (row.type === 'switch') {
    control = el('button', {
      className: 'switch',
      type: 'button',
      role: 'switch',
      'aria-checked': String(Boolean(prefs[row.key])),
      'aria-label': row.name,
      onClick: (event) => {
        const next = !(prefs[row.key]);
        event.currentTarget.setAttribute('aria-checked', String(next));
        onChange({ [row.key]: next });
      },
    });
  }

  // A rule the system states rather than offers. The board draws it as a switch
  // that is always on; a switch that cannot be turned off is a dead control, so
  // it is marked as fixed instead — and marked, rather than left as an empty
  // slot that reads as a switch that failed to render.
  if (row.type === 'static') {
    control = el('span', { className: 'setting__fixed label', text: 'Always' });
  }

  if (row.type === 'segmented') {
    control = el('div', { className: 'segmented', role: 'group', 'aria-label': row.name },
      row.options.map(([value, label]) => el('button', {
        className: 'segmented__option',
        type: 'button',
        text: label,
        'aria-pressed': String(prefs[row.key] === value),
        onClick: () => onChange({ [row.key]: value }),
      })));
  }

  const className = ['setting',
    dependent ? 'setting--child' : '',
    inactive ? 'setting--disabled' : ''].filter(Boolean).join(' ');

  if (inactive && control) control.setAttribute('aria-disabled', 'true');

  return el('div', { className }, [text, control]);
}

function renderAccount(state, onSignOut) {
  const node = qs('[data-settings-account]');
  if (!node) return;

  const count = state.savedLocations?.length ?? 0;
  const text = state.user
    ? `Signed in as ${state.user.email ?? 'your account'} · ${count} place${count === 1 ? '' : 's'} saved · syncing`
    : `Guest · ${count} place${count === 1 ? '' : 's'} saved on this device only`;

  const children = [el('span', { text })];
  if (state.user) {
    children.push(el('button', {
      className: 'link-button settings__signout',
      type: 'button',
      text: 'Sign out',
      onClick: () => onSignOut?.(),
    }));
  }
  replace(node, children);
}
