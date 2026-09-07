import { describe, it, expect } from 'vitest';
import { hasIcon, iconNames } from '../src/js/util/icons.js';
import { describe as describeCode } from '../src/js/util/wmo.js';

/**
 * wmo.js and icons.js are edited independently, so it is easy to add a weather
 * code whose icon key nothing draws. That failure is silent at runtime — the
 * fallback renders and nobody notices the wrong picture. This closes the gap.
 */
describe('icon coverage', () => {
  // Every code Open-Meteo documents.
  const ALL_WMO = [
    0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
    71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
  ];

  it('draws an icon for every documented WMO code, day and night', () => {
    const missing = [];
    for (const code of ALL_WMO) {
      for (const isDay of [1, 0]) {
        const { icon } = describeCode(code, isDay);
        if (!hasIcon(icon)) missing.push(`${code} (${isDay ? 'day' : 'night'}) -> ${icon}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has an icon for the unknown-code fallback', () => {
    expect(hasIcon(describeCode(9999, 1).icon)).toBe(true);
  });

  it('defines no icon that nothing can reach', () => {
    const reachable = new Set();
    for (const code of [...ALL_WMO, 9999]) {
      for (const isDay of [1, 0]) reachable.add(describeCode(code, isDay).icon);
    }
    const orphans = iconNames().filter((name) => !reachable.has(name));
    expect(orphans).toEqual([]);
  });
});
