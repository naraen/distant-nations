import * as turf from '@turf/turf';

export function buildDistanceRing(centerLatLong, km, toleranceKm) {
    const center = turf.point(centerLatLong);
    
    return turf.difference(turf.featureCollection([
      turf.circle(center, km + toleranceKm, { units: 'kilometers' }, 32),
      turf.circle(center, km - toleranceKm, { units: 'kilometers' }, 32)
    ])
    );  
}

export function intersectsRing(feature, ring) {
  return turf.booleanIntersects(turf.featureCollection([ring, feature]));
}

export function isOutOfBounds(feature){
  const [minX, , maxX] = turf.bbox(feature);
  return {  
    isWestOverflow: minX <-180, /*overflow west */
    isEastOverflow: maxX > 180  /*overflow east*/  
  }
}

export function wrapToMap(feature) {
  const bbox = turf.polygon([
    [
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90],
      [-180, 90]
    ]
  ])

  const bounds = isOutOfBounds(feature);
  if (!bounds.isWestOverflow && !bounds.isEastOverflow) return feature;

  let withinBounds = turf.intersect(turf.featureCollection([feature, bbox]));

  let outOfBounds = turf.difference(turf.featureCollection([feature, bbox]));
  const coords = outOfBounds.geometry.coordinates[0];

  coords.forEach(coord => {
    if (bounds.isEastOverflow) coord[0] = coord[0] - 360;
    if (bounds.isWestOverflow) coord[0] = coord[0] + 360;
  })

  return turf.union(turf.featureCollection([withinBounds, outOfBounds]));
}