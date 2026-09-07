import { describe, it, expect } from 'vitest';
import {
  cToF, kmhToMph, formatTemp, formatWind, windDirection,
  formatHour, formatClock, dayName, parseLocalTime, uvLabel,
  TEMP_C, TEMP_F, WIND_KMH, WIND_MPH,
} from '../src/js/util/format.js';

describe('temperature conversion', () => {
  it('converts the fixed points', () => {
    expect(cToF(0)).toBe(32);
    expect(cToF(100)).toBe(212);
    expect(cToF(-40)).toBe(-40);
  });

  it('formats to whole degrees in the requested unit', () => {
    expect(formatTemp(27.5, TEMP_F)).toBe('82°');
    expect(formatTemp(27.5, TEMP_C)).toBe('28°');
  });

  it('renders a placeholder rather than NaN for missing data', () => {
    expect(formatTemp(undefined, TEMP_F)).toBe('--');
    expect(formatTemp(null, TEMP_C)).toBe('--');
  });

  it('handles below-zero without dropping the sign', () => {
    expect(formatTemp(-12, TEMP_C)).toBe('-12°');
    expect(formatTemp(-20, TEMP_F)).toBe('-4°');
  });
});

describe('wind conversion', () => {
  it('converts km/h to mph', () => {
    expect(formatWind(16.09, WIND_MPH)).toBe('10 mph');
    expect(formatWind(16.09, WIND_KMH)).toBe('16 km/h');
  });

  it('keeps calm conditions at zero rather than blanking them', () => {
    expect(formatWind(0, WIND_MPH)).toBe('0 mph');
  });
});

describe('windDirection', () => {
  it('maps cardinal degrees', () => {
    expect(windDirection(0)).toBe('N');
    expect(windDirection(90)).toBe('E');
    expect(windDirection(180)).toBe('S');
    expect(windDirection(270)).toBe('W');
  });

  it('wraps 360 back to N rather than overflowing the array', () => {
    expect(windDirection(360)).toBe('N');
    expect(windDirection(359)).toBe('N');
  });

  it('handles the intercardinal buckets', () => {
    expect(windDirection(45)).toBe('NE');
    expect(windDirection(225)).toBe('SW');
  });
});

describe('local time parsing', () => {
  // The whole point: these strings are the *location's* clock, not the browser's.
  it('parses without applying the browser timezone', () => {
    expect(parseLocalTime('2026-09-05T22:00')).toEqual({
      year: 2026, month: 9, day: 5, hour: 22, minute: 0,
    });
  });

  it('parses a date-only string', () => {
    expect(parseLocalTime('2026-09-05')).toEqual({
      year: 2026, month: 9, day: 5, hour: 0, minute: 0,
    });
  });

  it('returns null for junk instead of throwing', () => {
    expect(parseLocalTime('')).toBeNull();
    expect(parseLocalTime(undefined)).toBeNull();
  });

  // The clock preference must actually reach the formatter — a 24h setting
  // that still renders "4:00 AM" is the bug this pins down.
  it('formats hours in 24-hour time by default', () => {
    expect(formatHour('2026-09-05T22:00')).toBe('22');
    expect(formatHour('2026-09-05T00:00')).toBe('00');
    expect(formatHour('2026-09-05T09:00')).toBe('09');
  });

  it('formats hours in 12-hour time when asked', () => {
    expect(formatHour('2026-09-05T22:00', '12h')).toBe('10 PM');
    expect(formatHour('2026-09-05T00:00', '12h')).toBe('12 AM');
    expect(formatHour('2026-09-05T12:00', '12h')).toBe('12 PM');
    expect(formatHour('2026-09-05T09:00', '12h')).toBe('9 AM');
  });

  it('formats sunrise/sunset in both clocks, minutes zero-padded', () => {
    expect(formatClock('2026-09-05T07:18')).toBe('07:18');
    expect(formatClock('2026-09-05T20:05')).toBe('20:05');
    expect(formatClock('2026-09-05T07:18', '12h')).toBe('7:18 AM');
    expect(formatClock('2026-09-05T20:05', '12h')).toBe('8:05 PM');
    expect(formatClock('2026-09-05T00:07', '12h')).toBe('12:07 AM');
  });

  it('derives the weekday from the calendar date', () => {
    expect(dayName('2026-09-05')).toBe('Sat');
    expect(dayName('2026-09-06')).toBe('Sun');
  });
});

describe('uvLabel', () => {
  it('buckets by the WHO bands', () => {
    expect(uvLabel(0)).toBe('Low');
    expect(uvLabel(2.9)).toBe('Low');
    expect(uvLabel(3)).toBe('Moderate');
    expect(uvLabel(6)).toBe('High');
    expect(uvLabel(8)).toBe('Very high');
    expect(uvLabel(11)).toBe('Extreme');
  });
});
