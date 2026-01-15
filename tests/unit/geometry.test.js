import { describe, it, expect } from 'vitest';
import { buildDistanceRing, isOutOfBounds, wrapToMap } from '../../src/js/geometry';
import * as turf from '@turf/turf';

describe('Distance ring', () => {
  const coordSouthAfrica = [25.240498917081457, -28.72831074393398];
  const coordChile = [-71.46841364925989,-38.33640945981953];

  it('creates a valid ring polygon', () => {
    const ring = buildDistanceRing([0, 0], 1000, 50);

    expect(ring).toBeTruthy();
    expect(ring.geometry.type).toBe('Polygon');
  });

  it('inner radius is smaller than outer', () => {
    const ring = buildDistanceRing([0, 0], 500, 100);
    expect(ring.geometry.coordinates.length).toBeGreaterThan(0);
  });

  it('should overflow on the east', () => {
    const ring = buildDistanceRing( coordSouthAfrica, 9000, 25);
    expect(isOutOfBounds(ring).isEastOverflow).toBe(true);
  });

  it('wrap: east overflow should wrap around to west', () => {
    const ring = buildDistanceRing( coordSouthAfrica, 9000, 25);
    const adjustedRing = wrapToMap(ring)
    expect(isOutOfBounds(adjustedRing).isEastOverflow).toBe(false);
  });

  it('should overflow on the west', () => {
    const ring = buildDistanceRing( coordChile, 6500, 25);
    expect(isOutOfBounds(ring).isWestOverflow).toBe(true);
  });

  it('wrap: west overflow should wrap around to east', () => {
    const ring = buildDistanceRing( coordChile, 6500, 25);
    const adjustedRing = wrapToMap(ring)
    expect(isOutOfBounds(adjustedRing).isWestOverflow).toBe(false);
  });


});

// Distance ring math
// Country intersection logic
// Graticule generation
// Which countries intersect which ring
// Styling decisions (pure functions)
