// ==============================
// DOM ELEMENTS
// ==============================
const distanceSlider = document.getElementById('distanceSlider');
const distanceValue = document.getElementById('distanceValue');
const toleranceSlider = document.getElementById('toleranceSlider');
const toleranceValue = document.getElementById('toleranceValue');

const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomDisplay = document.querySelector('.zoom-display');

// ==============================
// MAP SETUP
// ==============================
const italyLatLng = [41.9028, 12.4964];
const italyLngLat = [12.4964, 41.9028];

let selectedCenterLatLng = italyLatLng;
let selectedCenterLngLat = italyLngLat;
let selectedCountryLayer = null;
let thresholdLayer =null;

const map = L.map('map', {
  zoomControl: false,
  worldCopyJump: false,
  minZoom:2
}).setView(italyLatLng, 4);



L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  noWrap: true
}).addTo(map);


// ==============================
// STYLE CONSTANTS (LOGICAL ONLY)
// ==============================
const Styles = {
  country: {
    default: { color: '#777', weight: 1, fillOpacity: 0.1 },
    selected: { color: 'orange', weight: 3, fillOpacity: 0.3 },
    match: { color: 'blue', weight: 2, fillOpacity: 0.4 }
  },
  radius: {
    color: 'red',
    fillOpacity: 0,
    interactive: false
  },
  grid: {
    color: '#999',
    weight: 1,
    opacity: 0.4,
    interactive: false
  },
  equator: {
    color: '#ff0000',
    weight: 2,
    opacity: 0.4,
    interactive: false
  },
  tropic: {
    color: '#ff8800',
    weight: 2,
    opacity: 0.4,
    interactive: false
  },
  polar: {
    color: '#6a5acd',   // soft slate blue
    weight: 2,
    opacity: 0.4,
    interactive: false
  }
};

// ==============================
// MARKERS & LAYERS
// ==============================
let centerMarker = L.marker(selectedCenterLatLng)
  .addTo(map)
  .bindPopup('Italy');

let countriesLayer;
let countriesData;

// ==============================
// LOAD COUNTRIES
// ==============================
fetch('countries.geojson')
  .then(res => res.json())
  .then(data => {
    countriesData = data;

    countriesLayer = L.geoJSON(countriesData, {
      style: Styles.country.default,
      onEachFeature: (feature, layer) => {
        layer.on('click', () => selectCountry(feature, layer));
        layer.bindTooltip(feature.properties.admin, { sticky: true });
      }
    }).addTo(map);

    const defaultFeature = countriesData.features.find(
      f => f.properties.admin === 'Italy'
    );

    if (defaultFeature) {
      const defaultLayer = countriesLayer
        .getLayers()
        .find(l => l.feature === defaultFeature);
      selectCountry(defaultFeature, defaultLayer);
    }
  });

// ==============================
// GEOMETRY HELPERS
// ==============================
function getMainlandCentroid(feature) {
  if (feature.geometry.type === 'Polygon') {
    return turf.centroid(feature).geometry.coordinates;
  }

  if (feature.geometry.type === 'MultiPolygon') {
    let largest = null;
    let maxArea = 0;

    feature.geometry.coordinates.forEach(coords => {
      const poly = turf.polygon(coords);
      const area = turf.area(poly);
      if (area > maxArea) {
        maxArea = area;
        largest = poly;
      }
    });

    if (largest) {
      return turf.centroid(largest).geometry.coordinates;
    }
  }

  return turf.centroid(feature).geometry.coordinates;
}

// ==============================
// COUNTRY SELECTION
// ==============================
function selectCountry(feature, layer) {
  if (selectedCountryLayer) {
    selectedCountryLayer.setStyle(Styles.country.default);
  }

  selectedCountryLayer = layer;
  layer.setStyle(Styles.country.selected);

  const centroid = getMainlandCentroid(feature);
  selectedCenterLngLat = centroid;
  selectedCenterLatLng = [centroid[1], centroid[0]];

  centerMarker
    .setLatLng(selectedCenterLatLng)
    .setPopupContent(feature.properties.admin)
    .openPopup();

  drawRadius();
}

// ==============================
// DISTANCE RING
// ==============================
function crossesAntimeridian(feature) {
  const [minX, , maxX] = turf.bbox(feature);
  return minX < -180 || maxX > 180;
}

function wrapToMap (feature) {
  if (!crossesAntimeridian(feature)) return feature;
  
  const coords = feature.geometry.coordinates[0];

  coords.forEach( coord => {
    if (coord[0] > 180) coord[0] = coord[0] - 360;
    if (coord[0] < -180) coord[0] = coord[0] + 360;
  } )

  return feature;
}

function drawRadius() {
  if (!countriesData) return;

  const km = Number(distanceSlider.value);
  const toleranceKm = Number(toleranceSlider.value);

  distanceValue.textContent = km;
  toleranceValue.textContent = toleranceKm;

  const center = turf.point(selectedCenterLngLat);

  const ring = turf.difference(
    wrapToMap(turf.circle(center, km + toleranceKm, { units: 'kilometers', steps:1024 })),
    wrapToMap(turf.circle(center, km, { units: 'kilometers', steps:1024 }))
  );

// Remove previous threshold visualization
if (thresholdLayer) {
  map.removeLayer(thresholdLayer);
}

// Draw threshold ring
thresholdLayer = L.geoJSON(ring, {
  style: {
    color: '#ff8800',
    weight: 2,
    fillColor: '#ff8800',
    fillOpacity: 0.15,
    dashArray: '6,4',
    interactive: false
  }
}).addTo(map);

  countriesLayer.eachLayer(layer => {
    if (layer === selectedCountryLayer) {
      return;
    }
    const isMatch = turf.booleanIntersects(ring, layer.feature);
    layer.setStyle(isMatch ? Styles.country.match : Styles.country.default);
  });
}

// ==============================
// CONTROL EVENTS
// ==============================
distanceSlider.addEventListener('input', drawRadius);
toleranceSlider.addEventListener('input', drawRadius);

zoomInBtn.addEventListener('click', e => {
  e.preventDefault();
  map.zoomIn();
});

zoomOutBtn.addEventListener('click', e => {
  e.preventDefault();
  map.zoomOut();
});

map.on('zoomend', () => {
  zoomDisplay.textContent = map.getZoom();
});

zoomDisplay.textContent = map.getZoom();

// ==============================
// GRATICULE
// ==============================
const graticuleLayer = L.layerGroup().addTo(map);

function addLatitudeLabel(lat, text) {
  L.marker([lat, -165], {
    icon: L.divIcon({
      className: 'lat-label',
      html: text
    }),
    interactive: false
  }).addTo(graticuleLayer);
}

function addLongitudeLabel(lng, text) {
  L.marker([-80, lng], {
    icon: L.divIcon({
      className: 'lng-label',
      html: text
    }),
    interactive: false
  }).addTo(graticuleLayer);
}

function formatLongitude(lng) {
  if (lng === 0) return '0°';
  return `${Math.abs(lng)}° ${lng > 0 ? 'E' : 'W'}`;
}

function addGraticule(latInterval = 10, lngInterval = 10) {
  for (let lat = -90; lat <= 90; lat += latInterval) {
    L.polyline([[lat, -180], [lat, 180]], Styles.grid).addTo(graticuleLayer);
  }

  for (let lng = -180; lng <= 180; lng += lngInterval) {
    L.polyline(
      [
        [-90, lng],
        [90, lng]
      ],
      {
        color: '#999',
        weight: 1,
        opacity: 0.4,
        interactive: false
      }
    ).addTo(graticuleLayer);

    // Skip ±180 to avoid clutter at edges
    if (lng !== -180 && lng !== 180) {
      addLongitudeLabel(lng, formatLongitude(lng));
    }
  }
}

addGraticule(10, 10); 


fetch('latitude-lines.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: feature => Styles[feature.properties.type],
      onEachFeature: (feature, layer) => {
        const lat = feature.geometry.coordinates[0][1];

        addLatitudeLabel(lat, feature.properties.label);

      }
    }).addTo(graticuleLayer);
  });
