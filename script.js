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


const map = L.map('map', {
  zoomControl: false,
  worldCopyJump: false,
  minZoom:2
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

function addHatchPatterns(){
  
  let svgElem = document.querySelector('#svgForFillPatterns');
  if (svgElem) {
    return;
  }
  
  svgElem = document.createElementNS('http://www.w3.org/2000/svg','svg')
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
  svgElem.outerHTML=fillPattern;

  const styleDefinition = `<style>
        .intersectionHatch {
            fill: url("#intersectionHatch");
        }
    </style>`;

  let styleElem = document.createElement('style');
	document.body.appendChild(styleElem);
	styleElem.outerHTML = styleDefinition;
}

addHatchPatterns();

// ==============================
// STYLE CONSTANTS (LOGICAL ONLY)
// ==============================
const Styles = {
  country: {
    default: { color: '#777', weight: 1, fillOpacity: 0.1 },
    selected: { color: 'orange', weight: 3, fillOpacity: 0.3 },
    selectedB: { color: '#8a2be2', weight: 2, fillOpacity: 0.4},
    hatched: { className:hatchPatternName, fillOpacity: .7, opacity: .4, weight: 1 },
  },
  ring:[
    {
      color: '#ff8800',
      weight: 2,
      fillColor: '#ff8800',
      fillOpacity: 0.15,
      dashArray: '6,4',
      interactive: false
    },
    {
      color:'#8a2be2',
      weight: 2,
      fillColor: '#8a2be2',
      fillOpacity: 0.15,
      dashArray: '6,4',
      interactive: false
    }
  ],
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
  if (selectedCountries.length === 2) {
    resetSelection();
  }
  selectedCountries.push({
    distanceSlider: distanceSliders[selectedCountries.length] ,
    distanceValue: distanceValues[selectedCountries.length],
    feature, 
    layer,
    ring:null
  });

  updateRings();
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

function updateRings() {
  const toleranceKm = Number(toleranceSlider.value);
  toleranceValue.textContent=toleranceKm;

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
  const selectedCountry=selectedCountries[selectionIdx];
    
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

  const ring = turf.difference(
    turf.circle(center, km + toleranceKm, { units: 'kilometers'}),
    turf.circle(center, km - toleranceKm, { units: 'kilometers' })
  );


  // Draw threshold ring
  L.geoJSON(ring, {
    style: Styles.ring[selectionIdx]
  }).addTo(ringLayerGroup);

  selectedCountry.ring = ring;
}

// ---------------------------
// Styling logic
// ---------------------------
function removeHatchClass(layer){
      let currClassName = layer._path.getAttribute('class');
      if (currClassName.indexOf(hatchPatternName) > -1){
        layer._path.setAttribute('class', currClassName.replace(hatchPatternName + ' ',''));
      }
}

function addHatchClass(layer) {
      let currClassName = layer._path.getAttribute('class');
      if (currClassName.indexOf(hatchPatternName) === -1){
        layer._path.setAttribute('class', hatchPatternName + ' ' + currClassName);
      }
}

function updateStyles() {
  countriesLayer.eachLayer(layer => {
    if (selectedCountries[0] && layer === selectedCountries[0].layer){
      return;
    }

    if (selectedCountries[1] && layer === selectedCountries[1].layer){
      return;
    }
    const feature = layer.feature;

    const hitA = selectedCountries[0] && turf.booleanIntersects(selectedCountries[0].ring, feature);
    const hitB = selectedCountries[1] && turf.booleanIntersects(selectedCountries[1].ring, feature);

    if (hitA && hitB) {
      addHatchClass(layer);
      layer.setStyle(Styles.country.hatched);
    } else if (hitA) {
      removeHatchClass(layer);
      layer.setStyle(Styles.country.selected);
    } else if (hitB) {
      removeHatchClass(layer);
      layer.setStyle(Styles.country.selectedB);
    } else {
      removeHatchClass(layer);
      layer.setStyle(Styles.country.default);
    }
  });
}

// ---------------------------
// Reset
// ---------------------------
function resetSelection() {
  ringLayerGroup.clearLayers();
  selectedCountries = [];
  countriesLayer.eachLayer(layer => {
    layer.setStyle(Styles.country.default);
  });
}


// ==============================
// CONTROL EVENTS
// ==============================
distanceSliders.forEach( (distanceSlider) => {
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
