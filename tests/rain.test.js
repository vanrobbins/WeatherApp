import { describe, it, expect } from 'vitest';
import { rainSummary, rainBars, rampStep, phraseMinutes, RAINING, DRY } from '../src/js/data/rain.js';

/** Build a minutely_15 block from an array of mm values, starting 14:00. */
function minutely(values, startHour = 14) {
  const time = values.map((_, i) => {
    const total = startHour * 60 + i * 15;
    const h = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const m = String(total % 60).padStart(2, '0');
    return `2026-09-05T${h}:${m}`;
  });
  return { time, precipitation: values };
}

describe('rainSummary', () => {
  it('reports when rain stops, quantised to 15 minutes', () => {
    // Raining now, dry from the third step: 2 steps = 30 minutes.
    const result = rainSummary(minutely([0.5, 0.4, 0, 0, 0]), '2026-09-05T14:00');
    expect(result.state).toBe(RAINING);
    expect(result.changesInMinutes).toBe(30);
    expect(result.text).toBe('Stops in about 30 minutes');
  });

  // The whole point of the module: never claim precision the data lacks.
  it('marks any figure as an estimate', () => {
    const result = rainSummary(minutely([0.5, 0, 0]), '2026-09-05T14:00');
    expect(result.isEstimate).toBe(true);
    // Every numeric figure must be hedged: "about 15", never a bare "15".
    expect(result.text).toMatch(/about \d/);
    expect(result.text.match(/\d+/g).every((n) => result.text.includes(`about ${n}`)))
      .toBe(true);
  });

  it('reports when rain starts while currently dry', () => {
    const result = rainSummary(minutely([0, 0, 0, 1.2]), '2026-09-05T14:00');
    expect(result.state).toBe(DRY);
    expect(result.changesInMinutes).toBe(45);
    expect(result.text).toBe('Rain in about 45 minutes');
  });

  it('treats a trace below the threshold as dry', () => {
    // 0.02mm in a 15-minute step is not weather anyone notices.
    const result = rainSummary(minutely([0.02, 0.01, 0]), '2026-09-05T14:00');
    expect(result.state).toBe(DRY);
  });

  it('says nothing changes rather than inventing a time', () => {
    const dry = rainSummary(minutely([0, 0, 0, 0]), '2026-09-05T14:00');
    expect(dry.changesInMinutes).toBeNull();
    expect(dry.text).toBe('No rain in the next 12 hours');
    expect(dry.isEstimate).toBe(false);

    const wet = rainSummary(minutely([2, 2, 2, 2]), '2026-09-05T14:00');
    expect(wet.text).toBe('Rain continuing past 12 hours');
  });

  it('anchors to the current time, not the start of the array', () => {
    // Now is 14:30 (index 2). Rain stops at index 4 => 30 minutes.
    const result = rainSummary(minutely([5, 5, 5, 5, 0, 0]), '2026-09-05T14:30');
    expect(result.changesInMinutes).toBe(30);
  });

  it('survives a missing or empty block', () => {
    expect(rainSummary(undefined, '2026-09-05T14:00').text).toBe('');
    expect(rainSummary({ time: [], precipitation: [] }, '2026-09-05T14:00').text).toBe('');
  });
});

describe('phraseMinutes', () => {
  it('never overstates precision', () => {
    expect(phraseMinutes(15)).toBe('about 15 minutes');
    expect(phraseMinutes(60)).toBe('about 1 hour');
    expect(phraseMinutes(120)).toBe('about 2 hours');
    expect(phraseMinutes(90)).toBe('about 1.5 hours');
    expect(phraseMinutes(0)).toBe('under 15 minutes');
  });
});

describe('rainBars', () => {
  it('normalises against the window peak', () => {
    const bars = rainBars(minutely([0, 1, 2, 4]), '2026-09-05T14:00');
    expect(bars).toHaveLength(4);
    expect(bars[0].level).toBe(0);
    expect(bars[3].level).toBe(1);
    expect(bars[2].level).toBe(0.5);
  });

  it('renders a dry window as flat zero rather than dividing by zero', () => {
    const bars = rainBars(minutely([0, 0, 0]), '2026-09-05T14:00');
    expect(bars.every((b) => b.level === 0)).toBe(true);
    expect(bars.every((b) => b.wet === false)).toBe(true);
  });

  it('starts from now, not the array head', () => {
    const bars = rainBars(minutely([9, 9, 1, 2]), '2026-09-05T14:30');
    expect(bars).toHaveLength(2);
    expect(bars[0].mm).toBe(1);
  });
});

describe('rampStep', () => {
  it('maps a 0..1 level onto the four board ramp steps, darkest first', () => {
    expect(rampStep(1)).toBe(1);
    expect(rampStep(0.5)).toBe(1);
    expect(rampStep(0.49)).toBe(2);
    expect(rampStep(0.2)).toBe(2);
    expect(rampStep(0.19)).toBe(3);
    expect(rampStep(0.1)).toBe(3);
    expect(rampStep(0.09)).toBe(4);
    expect(rampStep(0)).toBe(4);
  });

  it('treats a missing reading as the lightest step rather than throwing', () => {
    expect(rampStep(undefined)).toBe(4);
    expect(rampStep(null)).toBe(4);
    expect(rampStep(NaN)).toBe(4);
  });
});
