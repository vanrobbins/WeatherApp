import { describe, it, expect } from 'vitest';
import { describe as describeCode, isKnown, ICONS } from '../src/js/util/wmo.js';

describe('WMO code interpretation', () => {
  it('describes common daytime conditions', () => {
    expect(describeCode(0, 1)).toMatchObject({ label: 'Clear', icon: 'clear' });
    expect(describeCode(3, 1)).toMatchObject({ label: 'Overcast', icon: 'cloudy' });
    expect(describeCode(61, 1)).toMatchObject({ label: 'Light rain', icon: 'rain' });
    expect(describeCode(95, 1)).toMatchObject({ label: 'Thunderstorm', icon: 'thunder' });
  });

  it('swaps to a night icon only for codes that have one', () => {
    expect(describeCode(0, 0).icon).toBe('clear-night');
    expect(describeCode(2, 0).icon).toBe('partly-night');
    // Rain looks the same at night — no pointless variant.
    expect(describeCode(61, 0).icon).toBe('rain');
    expect(describeCode(3, 0).icon).toBe('cloudy');
  });

  it('accepts booleans as well as the API 1/0', () => {
    expect(describeCode(0, false).icon).toBe('clear-night');
    expect(describeCode(0, true).icon).toBe('clear');
  });

  it('falls back for unmapped codes rather than returning undefined', () => {
    const result = describeCode(1234, 1);
    expect(result.label).toBe('Unknown');
    expect(result.icon).toBe(ICONS.UNKNOWN);
    expect(result.code).toBe(1234);
  });

  it('survives a missing code', () => {
    expect(describeCode(undefined, 1).label).toBe('Unknown');
  });

  it('reports which codes are mapped', () => {
    expect(isKnown(0)).toBe(true);
    expect(isKnown(99)).toBe(true);
    expect(isKnown(1234)).toBe(false);
  });
});
