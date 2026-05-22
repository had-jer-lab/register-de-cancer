/**
 * Utilities for zone analysis and pollution integration
 */

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param {Object} point - {lat: number, lng: number}
 * @param {Array} polygon - Array of [lat, lng] coordinates
 * @returns {boolean} True if point is inside polygon
 */
export function isPointInPolygon(point, polygon) {
  const { lat, lng } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0]; // lng, lat
    const xj = polygon[j][1], yj = polygon[j][0]; // lng, lat

    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Complete mock pollution data with all parameters
 */
const COMPLETE_POLLUTION_DATA = {
  "Tlemcen": { aqi: 50, pm25: 18, eau: "Moyenne", risque: "Faible" },
  "Oran": { aqi: 78, pm25: 35, eau: "Bonne", risque: "Élevé" },
  "Alger": { aqi: 72, pm25: 28, eau: "Bonne", risque: "Moyen" },
  "Annaba": { aqi: 85, pm25: 42, eau: "Mauvaise", risque: "Critique" },
  "Saïda": { aqi: 67, pm25: 26, eau: "Moyenne", risque: "Moyen" },
  "Sétif": { aqi: 55, pm25: 22, eau: "Bonne", risque: "Moyen" },
  "Constantine": { aqi: 68, pm25: 28, eau: "Moyenne", risque: "Élevé" },
  "Béjaïa": { aqi: 45, pm25: 18, eau: "Bonne", risque: "Faible" },
  "Biskra": { aqi: 62, pm25: 24, eau: "Moyenne", risque: "Moyen" },
  "Blida": { aqi: 58, pm25: 23, eau: "Bonne", risque: "Moyen" },
  "Bouira": { aqi: 52, pm25: 20, eau: "Bonne", risque: "Faible" },
  "Tamanrasset": { aqi: 35, pm25: 12, eau: "Mauvaise", risque: "Faible" },
  "Tébessa": { aqi: 48, pm25: 19, eau: "Moyenne", risque: "Faible" },
  "Tiaret": { aqi: 61, pm25: 24, eau: "Moyenne", risque: "Moyen" },
  "Tizi Ouzou": { aqi: 49, pm25: 19, eau: "Bonne", risque: "Faible" },
  "Djelfa": { aqi: 43, pm25: 17, eau: "Moyenne", risque: "Faible" },
  "Jijel": { aqi: 56, pm25: 22, eau: "Bonne", risque: "Moyen" },
  "Médéa": { aqi: 59, pm25: 23, eau: "Bonne", risque: "Moyen" },
  "Mostaganem": { aqi: 64, pm25: 25, eau: "Bonne", risque: "Moyen" },
  "M'Sila": { aqi: 41, pm25: 16, eau: "Moyenne", risque: "Faible" },
  "Mascara": { aqi: 63, pm25: 25, eau: "Moyenne", risque: "Moyen" },
  "Ouargla": { aqi: 68, pm25: 30, eau: "Moyenne", risque: "Élevé" },
  "El Bayadh": { aqi: 46, pm25: 18, eau: "Mauvaise", risque: "Faible" },
  "Illizi": { aqi: 32, pm25: 11, eau: "Mauvaise", risque: "Faible" },
  "Bordj Bou Arréridj": { aqi: 57, pm25: 22, eau: "Moyenne", risque: "Moyen" },
  "Boumerdès": { aqi: 60, pm25: 24, eau: "Bonne", risque: "Moyen" },
  "El Tarf": { aqi: 53, pm25: 21, eau: "Moyenne", risque: "Moyen" },
  "Tindouf": { aqi: 28, pm25: 10, eau: "Mauvaise", risque: "Faible" },
  "Tissemsilt": { aqi: 54, pm25: 21, eau: "Moyenne", risque: "Moyen" },
  "El Oued": { aqi: 40, pm25: 15, eau: "Mauvaise", risque: "Faible" },
  "Khenchela": { aqi: 47, pm25: 19, eau: "Moyenne", risque: "Faible" },
  "Souk Ahras": { aqi: 51, pm25: 20, eau: "Moyenne", risque: "Moyen" },
  "Tipaza": { aqi: 65, pm25: 26, eau: "Bonne", risque: "Moyen" },
  "Mila": { aqi: 50, pm25: 20, eau: "Bonne", risque: "Moyen" },
  "Aïn Defla": { aqi: 55, pm25: 22, eau: "Moyenne", risque: "Moyen" },
  "Naâma": { aqi: 36, pm25: 14, eau: "Mauvaise", risque: "Faible" },
  "Aïn Témouchent": { aqi: 66, pm25: 27, eau: "Bonne", risque: "Moyen" },
  "Ghardaïa": { aqi: 42, pm25: 16, eau: "Mauvaise", risque: "Faible" },
  "Relizane": { aqi: 58, pm25: 23, eau: "Bonne", risque: "Moyen" },
  "Timimoun": { aqi: 30, pm25: 11, eau: "Mauvaise", risque: "Faible" },
  "Bordj Badji Mokhtar": { aqi: 25, pm25: 9, eau: "Mauvaise", risque: "Faible" },
  "Ouled Djellal": { aqi: 39, pm25: 15, eau: "Moyenne", risque: "Faible" },
  "Béni Abbès": { aqi: 29, pm25: 10, eau: "Mauvaise", risque: "Faible" },
  "In Salah": { aqi: 31, pm25: 12, eau: "Mauvaise", risque: "Faible" },
  "In Guezzam": { aqi: 26, pm25: 9, eau: "Mauvaise", risque: "Faible" },
  "Touggourt": { aqi: 37, pm25: 14, eau: "Mauvaise", risque: "Faible" },
  "Djanet": { aqi: 27, pm25: 10, eau: "Mauvaise", risque: "Faible" },
  "El M'Ghair": { aqi: 44, pm25: 17, eau: "Mauvaise", risque: "Faible" },
  "El Meniaa": { aqi: 33, pm25: 13, eau: "Mauvaise", risque: "Faible" }
};

/**
 * Backward-compatible AQI-only data
 */
const pollutionData = Object.fromEntries(
  Object.entries(COMPLETE_POLLUTION_DATA).map(([wilaya, data]) => [wilaya, data.aqi])
);

/**
 * Compute average AQI for cities in the zone
 * @param {Array} patientsInZone - Patients inside the zone
 * @returns {number} Average AQI
 */
const getSquaredDistance = (a, b) => {
  const dx = Number(a[0]) - Number(b[0]);
  const dy = Number(a[1]) - Number(b[1]);
  return dx * dx + dy * dy;
};

const normalizeZonePoints = (points) => {
  if (!Array.isArray(points)) return [];
  return points
    .map(point => {
      if (Array.isArray(point) && point.length >= 2) return [Number(point[0]), Number(point[1])];
      if (point && typeof point === 'object' && point.lat !== undefined && point.lng !== undefined) return [Number(point.lat), Number(point.lng)];
      return null;
    })
    .filter(Boolean);
};

const getNearestWilayasFromPoints = (zonePoints, wilayaCoordinates, maxCount = 3) => {
  const normalized = normalizeZonePoints(zonePoints);
  if (normalized.length === 0 || !wilayaCoordinates) return [];

  const distances = {};
  Object.entries(wilayaCoordinates).forEach(([wilaya, coords]) => {
    normalized.forEach(point => {
      const dist = getSquaredDistance(point, coords);
      if (distances[wilaya] === undefined || dist < distances[wilaya]) {
        distances[wilaya] = dist;
      }
    });
  });

  return Object.entries(distances)
    .sort(([, a], [, b]) => a - b)
    .slice(0, maxCount)
    .map(([wilaya]) => wilaya);
};

const getPollutionEntry = (wilaya, pollutionData) => {
  return (pollutionData?.[wilaya] || COMPLETE_POLLUTION_DATA[wilaya] || null);
};

export function computeAQI(patientsInZone, zonePoints = [], pollutionData = {}, wilayaCoordinates = {}, maxNearby = 3) {
  const wilayas = [...new Set(
    patientsInZone
      .map(p => p.wilaya_name)
      .filter(Boolean)
  )];

  const targetWilayas = wilayas.length > 0
    ? wilayas
    : getNearestWilayasFromPoints(zonePoints, wilayaCoordinates, maxNearby);

  if (targetWilayas.length === 0) return 0;

  const aqiValues = targetWilayas
    .map(wilaya => getPollutionEntry(wilaya, pollutionData)?.aqi)
    .filter(aqi => typeof aqi === 'number');

  if (aqiValues.length === 0) return 0;
  return Math.round(aqiValues.reduce((sum, aqi) => sum + aqi, 0) / aqiValues.length);
}

/**
 * Compute zone statistics
 * @param {Array} patientsInZone - Patients inside the zone
 * @returns {Object} Zone statistics
 */
export function computeZoneStats(patientsInZone) {
  if (patientsInZone.length === 0) {
    return {
      total: 0,
      dominantCancer: 'Aucun',
      genderStats: { male: 0, female: 0 }
    };
  }

  // Count cancers
  const cancerCounts = {};
  patientsInZone.forEach(patient => {
    const cancerType = patient.dernier_cancer?.organe || 'Inconnu';
    cancerCounts[cancerType] = (cancerCounts[cancerType] || 0) + 1;
  });

  // Find dominant cancer
  const dominantCancer = Object.entries(cancerCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Aucun';

  // Gender stats
  const genderCounts = patientsInZone.reduce((acc, patient) => {
    const gender = patient.sexe === 'M' ? 'male' : 'female';
    acc[gender]++;
    return acc;
  }, { male: 0, female: 0 });

  const total = patientsInZone.length;
  const genderStats = {
    male: Math.round((genderCounts.male / total) * 100),
    female: Math.round((genderCounts.female / total) * 100)
  };

  return {
    total,
    dominantCancer,
    genderStats
  };
}

/**
 * Get risk level based on AQI
 * @param {number} aqi - Air Quality Index
 * @returns {string} Risk level ('Critique', 'Élevé', 'Moyen', 'Faible')
 */
export function getRiskLevel(aqi) {
  if (aqi >= 150) return 'Critique';
  if (aqi >= 100) return 'Élevé';  
  if (aqi >= 50)  return 'Moyen';
  return 'Faible';
}

/**
 * Get color for zone based on risk level
 * @param {string} riskLevel - Risk level
 * @returns {string} Color code
 */
export function getZoneColor(riskLevel) {
  switch (riskLevel) {
    case 'High': return '#dc2626'; // red
    case 'Medium': return '#d97706'; // orange
    case 'Low': return '#059669'; // green
    default: return '#059669';
  }
}

/**
 * Get nearby wilayas for a zone based on patient locations or zone polygon points
 * @param {Array} zonePoints - Polygon points for the zone
 * @param {Array} patientsInZone - Patients inside the zone
 * @param {Object} wilayaCoordinates - Lookup table for wilaya coordinates
 * @param {number} maxCount - Maximum number of wilayas to return
 * @returns {Array} List of unique wilaya names
 */
export function getNearbyWilayas(zonePoints = [], patientsInZone = [], wilayaCoordinates = {}, maxCount = 3) {
  if (Array.isArray(patientsInZone) && patientsInZone.length > 0) {
    const wilayas = [...new Set(
      patientsInZone
        .map(p => p.wilaya_name)
        .filter(Boolean)
    )];
    return wilayas.slice(0, maxCount);
  }

  if (!Array.isArray(zonePoints) || zonePoints.length === 0 || !wilayaCoordinates) return [];
  return getNearestWilayasFromPoints(zonePoints, wilayaCoordinates, maxCount);
}

/**
 * Wilaya coordinates for distance calculations
 */
const WILAYA_COORDS = {
  "Tlemcen":        [34.8783, -1.3150],
  "Oran":           [35.6969, -0.6331],
  "Alger":          [36.7538,  3.0588],
  "Annaba":         [36.9000,  7.7667],
  "Constantine":    [36.3667,  6.6167],
  "Sétif":          [36.1833,  5.4167],
  "Sidi Bel Abbès": [35.2000, -0.6333],
  "Skikda":         [36.8667,  6.9000],
  "Béjaïa":         [36.7500,  5.0667],
  "Batna":          [35.5500,  6.1667],
  "Mascara":        [35.4000,  0.1333],
  "Mostaganem":     [35.9333,  0.0833],
  "Ouargla":        [31.9500,  5.3333],
  "Aïn Témouchent": [35.3000, -1.1333],
  "Tiaret":         [35.3667,  1.3167],
  "Médéa":          [36.2667,  2.7500],
  "Blida":          [36.4167,  2.8333],
  "Boumerdès":      [36.7667,  3.4667],
  "Biskra":         [34.8500,  5.7333],
  "Ghardaïa":       [32.4833,  3.6667],
};

const DAIRA_COORDS_TLEMCEN = {
  "Ghazaouet":  [35.0833, -1.8167],
  "Nedroma":    [35.0167, -1.7333],
  "Maghnia":    [34.8167, -1.7333],
  "Remchi":     [35.0667, -1.4333],
  "Bensekrane": [35.0667, -1.2167],
  "Hennaya":    [34.9500, -1.3667],
  "Mansourah":  [34.8667, -1.3333],
  "Chetouane":  [34.9167, -1.2833],
  "Sebdou":     [34.6333, -1.3333],
  "Tlemcen":    [34.8783, -1.3150],
};

const DAIRA_POLLUTION_TLEMCEN = {
  "Ghazaouet":  {
    aqi:62, pm25:26, eau:"Traitée (dessalement)",
    risque:"Moyen",
    note:"Eau dessalée — risque contamination résiduelle",
    correlations:[
      {cancer:"Colorectal", risk:"Moyen", 
       source:"Eau dessalée — trihalométhanes"},
      {cancer:"Thyroïde",   risk:"Moyen",  
       source:"Iode marin + industrie portuaire"},
      {cancer:"Poumon",     risk:"Faible", 
       source:"Embruns marins + port"},
    ]
  },
  "Chetouane":  {
    aqi:48, pm25:18, eau:"Moyenne",
    risque:"Moyen",
    note:"Décharge à proximité — lixiviats",
    correlations:[
      {cancer:"Colorectal", risk:"Élevé",  
       source:"Lixiviats décharge — eau souterraine"},
      {cancer:"Leucémie",   risk:"Moyen",  
       source:"Solvants décharge sauvage"},
      {cancer:"Estomac",    risk:"Moyen",  
       source:"Contamination nappe phréatique"},
    ]
  },
  "Maghnia":    {
    aqi:52, pm25:21, eau:"Moyenne",
    risque:"Moyen",
    note:"Zone frontalière — trafic intense",
    correlations:[
      {cancer:"Poumon",     risk:"Moyen",  
       source:"Gaz d'échappement frontière"},
      {cancer:"Colorectal", risk:"Faible", 
       source:"Qualité eau variable"},
    ]
  },
  "Sebdou":     {
    aqi:35, pm25:11, eau:"Bonne",
    risque:"Faible",
    correlations:[
      {cancer:"Colorectal", risk:"Faible", 
       source:"Agriculture — pesticides faibles"},
    ]
  },
  "Tlemcen":    {
    aqi:42, pm25:15, eau:"Moyenne",
    risque:"Faible",
    correlations:[
      {cancer:"Colorectal", risk:"Faible", 
       source:"Qualité eau réseau urbain"},
      {cancer:"Poumon",     risk:"Faible", 
       source:"Trafic urbain modéré"},
    ]
  },
  "Bensekrane": {
    aqi:40, pm25:14, eau:"Bonne",
    risque:"Faible",
    correlations:[
      {cancer:"Sein",       risk:"Faible", 
       source:"Pesticides agriculture"},
    ]
  },
  "Remchi":     {
    aqi:44, pm25:16, eau:"Bonne",
    risque:"Faible",
    correlations:[
      {cancer:"Colorectal", risk:"Faible", 
       source:"Nitrates agricoles"},
    ]
  },
  "Hennaya":    {
    aqi:38, pm25:13, eau:"Bonne",
    risque:"Faible",
    correlations:[
      {cancer:"Sein",       risk:"Faible", 
       source:"Perturbateurs endocriniens"},
    ]
  },
  "Mansourah":  {
    aqi:45, pm25:17, eau:"Moyenne",
    risque:"Faible",
    correlations:[
      {cancer:"Poumon",     risk:"Faible", 
       source:"Proximité zone industrielle"},
    ]
  },
  "Nedroma":    {
    aqi:50, pm25:19, eau:"Moyenne",
    risque:"Moyen",
    correlations:[
      {cancer:"Thyroïde",   risk:"Moyen",  
       source:"Proximité côte — iode"},
      {cancer:"Colorectal", risk:"Faible", 
       source:"Eau réseau"},
    ]
  },
};

/**
 * Complete pollution data for wilayas
 */
const POLLUTION_DATA = {
  "Tlemcen":        {aqi:42, pm25:15, eau:"Moyenne",   risque:"Faible"},
  "Oran":           {aqi:78, pm25:35, eau:"Bonne",      risque:"Élevé"},
  "Alger":          {aqi:72, pm25:28, eau:"Bonne",      risque:"Moyen"},
  "Annaba":         {aqi:85, pm25:42, eau:"Mauvaise",   risque:"Critique"},
  "Constantine":    {aqi:65, pm25:25, eau:"Moyenne",    risque:"Élevé"},
  "Sétif":          {aqi:55, pm25:22, eau:"Bonne",      risque:"Moyen"},
  "Sidi Bel Abbès": {aqi:55, pm25:20, eau:"Moyenne",   risque:"Moyen"},
  "Skikda":         {aqi:80, pm25:38, eau:"Mauvaise",   risque:"Critique"},
  "Béjaïa":         {aqi:48, pm25:18, eau:"Bonne",      risque:"Faible"},
  "Batna":          {aqi:50, pm25:20, eau:"Moyenne",    risque:"Moyen"},
  "Mascara":        {aqi:38, pm25:12, eau:"Bonne",      risque:"Faible"},
  "Mostaganem":     {aqi:48, pm25:18, eau:"Moyenne",    risque:"Moyen"},
  "Ouargla":        {aqi:68, pm25:30, eau:"Moyenne",    risque:"Élevé"},
  "Aïn Témouchent": {aqi:44, pm25:16, eau:"Bonne",     risque:"Faible"},
  "Tiaret":         {aqi:46, pm25:17, eau:"Bonne",      risque:"Faible"},
  "Médéa":          {aqi:45, pm25:16, eau:"Bonne",      risque:"Faible"},
  "Blida":          {aqi:60, pm25:24, eau:"Bonne",      risque:"Moyen"},
  "Boumerdès":      {aqi:55, pm25:21, eau:"Bonne",      risque:"Moyen"},
  "Biskra":         {aqi:58, pm25:24, eau:"Moyenne",    risque:"Moyen"},
  "Ghardaïa":       {aqi:50, pm25:19, eau:"Moyenne",    risque:"Moyen"},
};

/**
 * Cancer correlations by risk level
 */
const CANCER_CORRELATIONS = {
  "Critique": [
    {cancer:"Poumon",    risk:"Très élevé", source:"Industrie lourde — PM2.5"},
    {cancer:"Leucémie",  risk:"Très élevé", source:"Benzène industriel"},
    {cancer:"Colorectal",risk:"Élevé",      source:"Eau contaminée"},
    {cancer:"Estomac",   risk:"Élevé",      source:"Métaux lourds"},
  ],
  "Élevé": [
    {cancer:"Poumon",    risk:"Élevé",   source:"Pollution atmosphérique"},
    {cancer:"Colorectal",risk:"Moyen",   source:"Qualité eau dégradée"},
    {cancer:"Leucémie",  risk:"Moyen",   source:"Solvants industriels"},
  ],
  "Moyen": [
    {cancer:"Poumon",    risk:"Moyen",  source:"PM2.5 modéré"},
    {cancer:"Colorectal",risk:"Faible", source:"Nitrates eau"},
    {cancer:"Sein",      risk:"Faible", source:"Perturbateurs endocriniens"},
  ],
  "Faible": [
    {cancer:"Colorectal",risk:"Faible", source:"Alimentation/eau"},
    {cancer:"Leucémie",  risk:"Faible", source:"Exposition faible"},
  ],
};

/**
 * Compute complete pollution data for a zone
 * Handles both array [lat,lng] and object {lat,lng} point formats
 * @param {Array} patients - Patients inside the zone
 * @param {Array} points - Polygon points [[lat,lng], ...]
 * @returns {Object} Complete pollution data with correlations
 */
export function computeCompletePollutionData(patients=[], points=[]) {
  // Verify points is a non-empty array
  if (!Array.isArray(points) || points.length === 0) {
    return {
      aqi:0, pm25:0, eau:'—', risque:'—',
      nearbyWilayas:[], correlations:[]
    };
  }

  // Calculate centroid — handle [lat,lng] and {lat,lng}
  let sumLat = 0, sumLng = 0;
  points.forEach(p => {
    if (Array.isArray(p)) {
      sumLat += p[0]; sumLng += p[1];
    } else if (p && typeof p === 'object') {
      sumLat += p.lat || p[0] || 0;
      sumLng += p.lng || p[1] || 0;
    }
  });
  const centLat = sumLat / points.length;
  const centLng = sumLng / points.length;

  console.log('Zone centroid:', centLat, centLng);

  const dairaWithDist = Object.entries(DAIRA_COORDS_TLEMCEN).map(([name, coords]) => ({
    name,
    dist: Math.sqrt(
      Math.pow(centLat - coords[0], 2) +
      Math.pow(centLng - coords[1], 2)
    )
  })).sort((a, b) => a.dist - b.dist);

  const closestDaira = dairaWithDist[0];
  if (closestDaira && closestDaira.dist <= 0.3) {
    const data = DAIRA_POLLUTION_TLEMCEN[closestDaira.name];
    return {
      aqi:   data.aqi,
      pm25:  data.pm25,
      eau:   data.eau,
      risque: data.risque,
      nearbyWilayas: [closestDaira.name],
      correlations: data.correlations || []
    };
  }

  // Find all wilayas with their distance
  const withDist = Object.entries(WILAYA_COORDS).map(([name, coords]) => ({
    name,
    dist: Math.sqrt(
      Math.pow(centLat - coords[0], 2) +
      Math.pow(centLng - coords[1], 2)
    )
  })).sort((a, b) => a.dist - b.dist);

  const closest = withDist[0];
  console.log('Wilaya la plus proche:', closest.name, 'dist:', closest.dist);

  // Use closest wilaya directly
  const data = POLLUTION_DATA[closest.name] || 
               {aqi:45, pm25:18, eau:"Moyenne", risque:"Moyen"};

  const correlations = CANCER_CORRELATIONS[data.risque] || 
                       CANCER_CORRELATIONS["Faible"];

  return {
    aqi:   data.aqi,
    pm25:  data.pm25,
    eau:   data.eau,
    risque: data.risque,
    nearbyWilayas: withDist.slice(0,3).map(w => w.name),
    correlations
  };
}
