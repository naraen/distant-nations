import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import countriesData from './geo/countries.geo.json';
import graticulesData from './geo/latitude-lines.geo.json';


// ==============================
// DOM ELEMENTS
// ==============================
const distanceSliders = [
  document.getElementById('distanceSlider'),
  document.getElementById('distanceSliderB')
];
const distanceValues = [
  document.getElementById('distanceValue'),
  document.getElementById('distanceValueB')
];

const toleranceSlider = document.getElementById('toleranceSlider');
const toleranceValue = document.getElementById('toleranceValue');

const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomDisplay = document.querySelector('.zoom-display');

// ==============================
// MAP SETUP
// ==============================
const italyLatLng = [41.9028, 12.4964];
let selectedCountries = [
];

const worldBounds = L.latLngBounds(
  [-85, -180],  // south-west
  [85, 180]     // north-east
);

const map = L.map('map', {
  zoomControl: false,
  worldCopyJump: false,
  minZoom: 2,
  maxBounds: worldBounds,
  maxBoundsViscosity: 1.0
}).setView(italyLatLng, 4);

let ringLayerGroup = L.layerGroup()
  .addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  noWrap: true
}).addTo(map);



// ---------------------------
// SVG hatch pattern
// ---------------------------
const hatchPatternName = 'intersectionHatch';
/*
This approach is inspired by plugin  https://github.com/samanbey/leaflet-hatchclass

The variation adopted, uses fillColor instead of injecting a css class & referencing it in the style object 
using className attribute.   This is more consistent across the code, since className cannot be changed
through leafletjs once the layer is rendered. 
*/
function addHatchPatterns() {

  let svgElem = document.querySelector('#svgForFillPatterns');
  if (svgElem) {
    return;
  }

  svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.appendChild(svgElem);

  const fillPattern = `<svg id="svgForFillPatterns" width="0" height="0" style="position:absolute">
        <defs>
            <pattern id="intersectionHatch" 
              x="0" 
              y="0" 
              width="8" 
              height="8" 
              patternUnits="userSpaceOnUse"
              patternContentUnits="userSpaceOnUse" 
              patternTransform="rotate(45)"
              >
                <path stroke="orange" stroke-width="4" d="M0 2h8"></path>
                <path stroke="#8a2be2" stroke-width="4" d="M0 6h8"></path>
            </pattern>
        </defs>
    </svg>`
  svgElem.outerHTML = fillPattern;
}

addHatchPatterns();

// ==============================
// STYLE CONSTANTS (LOGICAL ONLY)
// ==============================
const Styles = {
  country: {
    default: { fillColor: '', color: '#777', weight: 1, fillOpacity: 0.1 },
    selected: { fillColor: '', color: '#ff8800', weight: 3, fillOpacity: 0.3 },
    selectedB: { fillColor: '', color: '#8a2be2', weight: 2, fillOpacity: 0.4 },
    hatched: { fillColor: 'url("#intersectionHatch")', fillOpacity: .7, opacity: .4, weight: 1 },
  },
  ring: [
    {
      color: '#ff8800',
      weight: 2,
      fillColor: '#ff8800',
      fillOpacity: 0.15,
      dashArray: '6,4',
      interactive: false
    },
    {
      color: '#8a2be2',
      weight: 2,
      fillColor: '#8a2be2',
      fillOpacity: 0.15,
      dashArray: '6,4',
      interactive: false
    }
  ],
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

let countriesLayer;

// ==============================
// LOAD COUNTRIES
// ==============================
  countriesLayer = L.geoJSON(countriesData, {
    style: Styles.country.default,
    onEachFeature: (feature, layer) => {
      layer.on('click', () => selectCountry(feature, layer));
      layer.bindTooltip(feature.properties.admin, { sticky: true });
    }
  }).addTo(map);


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
  if (selectedCountries.length === 2) {
    resetSelection();
  }
  selectedCountries.push({
    distanceSlider: distanceSliders[selectedCountries.length],
    distanceValue: distanceValues[selectedCountries.length],
    feature,
    layer,
    ring: null
  });

  updateRings();
}


// ==============================
// DISTANCE RING
// ==============================
function wrapToMap(feature) {
  const bbox = turf.polygon([
    [
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90],
      [-180, 90]
    ]
  ])

  const [minX, , maxX] = turf.bbox(feature);
  if (minX >= -180 && maxX <= 180) return feature;

  let withinBounds = turf.intersect(turf.featureCollection([feature, bbox]));

  let outOfBounds = turf.difference(turf.featureCollection([feature, bbox]));
  const coords = outOfBounds.geometry.coordinates[0];

  coords.forEach(coord => {
    if (maxX > 180) coord[0] = coord[0] - 360;
    if (minX < -180) coord[0] = coord[0] + 360;
  })

  return turf.union(turf.featureCollection([withinBounds, outOfBounds]));
}

function updateRings() {
  const toleranceKm = Number(toleranceSlider.value);
  toleranceValue.textContent = toleranceKm;

  ringLayerGroup.clearLayers();

  if (selectedCountries[0]) {
    createRing(0);
  }

  if (selectedCountries[1]) {
    createRing(1);
  }

  updateStyles();
}


function createRing(selectionIdx) {
  const selectedCountry = selectedCountries[selectionIdx];

  const km = Number(selectedCountry.distanceSlider.value);
  selectedCountry.distanceValue.textContent = km;

  const toleranceKm = Number(toleranceSlider.value);

  const centroid = getMainlandCentroid(selectedCountry.feature);
  const selectedLatLong = [centroid[1], centroid[0]];

  const marker = L.marker(selectedLatLong)
    .bindPopup(selectedCountry.feature.properties.admin)
    .addTo(ringLayerGroup)
    .openPopup();

  const center = turf.point(centroid);

  
  const ring = turf.difference(turf.featureCollection([
    turf.circle(center, km + toleranceKm, { units: 'kilometers' }, 32),
    turf.circle(center, km - toleranceKm, { units: 'kilometers' }, 32)
  ])
  );

  // Draw threshold ring
  L.geoJSON(wrapToMap(ring), {
    style: Styles.ring[selectionIdx]
  }).addTo(ringLayerGroup);

  selectedCountry.ring = ring;
}

// ---------------------------
// Styling logic
// ---------------------------
function updateStyles() {
  if (selectedCountries.length > 0) {
    document.getElementById('controls').classList.remove('hidden');
    document.getElementById('toleranceSlider').parentElement.classList.remove('hidden');
    document.getElementById('distanceSlider').parentElement.classList.remove('hidden');
  }

  if (selectedCountries.length === 2) {
    document.getElementById('distanceSliderB').parentElement.classList.remove('hidden');
  }

  countriesLayer.eachLayer(layer => {
    if (selectedCountries[0] && layer === selectedCountries[0].layer) {
      return;
    }

    if (selectedCountries[1] && layer === selectedCountries[1].layer) {
      return;
    }
    const feature = layer.feature;

    const hitA = selectedCountries[0] && turf.booleanIntersects(selectedCountries[0].ring, feature);
    const hitB = selectedCountries[1] && turf.booleanIntersects(selectedCountries[1].ring, feature);

    if (hitA && hitB) {
      layer.setStyle(Styles.country.hatched);
    } else if (hitA) {
      layer.setStyle(Styles.country.selected);
    } else if (hitB) {
      layer.setStyle(Styles.country.selectedB);
    } else {
      layer.setStyle(Styles.country.default);
    }
  });
}

// ---------------------------
// Reset
// ---------------------------
function resetSelection() {
  document.getElementById('controls').classList.add('hidden');
  document.getElementById('toleranceSlider').parentElement.classList.add('hidden');
  document.getElementById('distanceSlider').parentElement.classList.add('hidden');
  document.getElementById('distanceSliderB').parentElement.classList.add('hidden');


  ringLayerGroup.clearLayers();
  selectedCountries = [];
  countriesLayer.eachLayer(layer => {
    layer.setStyle(Styles.country.default);
  });
}


// ==============================
// CONTROL EVENTS
// ==============================
distanceSliders.forEach((distanceSlider) => {
  distanceSlider.addEventListener('input', updateRings);
})
toleranceSlider.addEventListener('input', updateRings);

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

const helpBtn = document.querySelector('.help-btn');
const helpPanel = document.getElementById('help-panel');

function toggleHelp() {
  helpPanel.classList.toggle('open');
}

helpBtn.addEventListener('click', toggleHelp);

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


L.geoJSON(graticulesData, {
  style: feature => Styles[feature.properties.type],
  onEachFeature: (feature, layer) => {
    const lat = feature.geometry.coordinates[0][1];

    addLatitudeLabel(lat, feature.properties.label);

  }
}).addTo(graticuleLayer);
