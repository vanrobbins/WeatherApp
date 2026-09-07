import { describe, it, expect } from 'vitest';
import { mergeLocations, needsWrite } from '../src/js/data/merge-locations.js';

const bloomington = { id: '39.17,-86.52', name: 'Bloomington' };
const tokyo       = { id: '35.69,139.69', name: 'Tokyo' };
const paris       = { id: '48.85,2.35',   name: 'Paris' };

describe('mergeLocations', () => {
  it('keeps guest cities when the account has none (new signup)', () => {
    expect(mergeLocations([], [bloomington, tokyo]))
      .toEqual([bloomington, tokyo]);
  });

  it('keeps cloud cities when this browser has none (fresh device)', () => {
    expect(mergeLocations([paris], []))
      .toEqual([paris]);
  });

  // The regression that matters: signing in on a new device must not
  // wipe the list the account already has.
  it('never drops cloud cities in favour of guest ones', () => {
    const merged = mergeLocations([paris, tokyo], [bloomington]);
    expect(merged).toHaveLength(3);
    expect(merged.map((l) => l.name)).toEqual(['Paris', 'Tokyo', 'Bloomington']);
  });

  it('de-duplicates cities present on both sides', () => {
    const merged = mergeLocations([bloomington, paris], [bloomington]);
    expect(merged).toHaveLength(2);
  });

  it('treats near-identical coordinates as the same place', () => {
    // Same city, slightly different geocoder hits — both round to 39.17,-86.52.
    const fromSearch = { id: '39.17,-86.52', name: 'Bloomington' };
    const fromGeo    = { id: '39.17,-86.52', name: 'Bloomington Township' };
    expect(mergeLocations([fromSearch], [fromGeo])).toHaveLength(1);
  });

  it('handles both sides empty', () => {
    expect(mergeLocations([], [])).toEqual([]);
  });

  it('tolerates missing arguments', () => {
    expect(mergeLocations()).toEqual([]);
    expect(mergeLocations(undefined, [tokyo])).toEqual([tokyo]);
  });

  it('skips malformed entries without an id', () => {
    expect(mergeLocations([{ name: 'No id' }], [tokyo])).toEqual([tokyo]);
  });
});

describe('needsWrite', () => {
  it('is false when the merge changed nothing', () => {
    const cloud = [paris, tokyo];
    expect(needsWrite(cloud, mergeLocations(cloud, []))).toBe(false);
  });

  it('is true when guest cities were added', () => {
    const cloud = [paris];
    expect(needsWrite(cloud, mergeLocations(cloud, [tokyo]))).toBe(true);
  });
});
