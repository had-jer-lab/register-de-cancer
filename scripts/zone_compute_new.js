export function computeCompletePollutionData(
  patientsInZone,
  zonePoints = [],
  pollutionData = {},
  wilayaCoordinates = {},
  maxNearby = 3
) {
  const normalizedPoints = normalizeZonePoints(zonePoints);
  if (normalizedPoints.length === 0) {
    return {
      aqi: 0,
      pm25: 0,
      eau: 'Moyenne',
      risque: 'Faible',
      nearbyWilayas: []
    };
  }

  const centroid = normalizedPoints.reduce(
    (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 }
  );
  centroid.lat /= normalizedPoints.length;
  centroid.lng /= normalizedPoints.length;

  const distances = Object.entries(wilayaCoordinates)
    .map(([wilaya, coords]) => ({
      wilaya,
      coords,
      distance: Math.sqrt(getSquaredDistance([centroid.lat, centroid.lng], coords))
    }))
    .filter((item) => Number.isFinite(item.distance))
    .sort((a, b) => a.distance - b.distance);

  if (distances.length === 0) {
    return {
      aqi: 0,
      pm25: 0,
      eau: 'Moyenne',
      risque: 'Faible',
      nearbyWilayas: []
    };
  }

  const nearest = distances[0];
  const nearestEntry = getPollutionEntry(nearest.wilaya, pollutionData);
  if (nearest.distance < 2.0 && nearestEntry) {
    return {
      ...nearestEntry,
      nearbyWilayas: [nearest.wilaya]
    };
  }

  const topWilayas = distances.slice(0, maxNearby);
  const weighted = topWilayas.reduce(
    (acc, item) => {
      const entry = getPollutionEntry(item.wilaya, pollutionData);
      if (!entry) return acc;
      const weight = item.distance === 0 ? 1e6 : 1 / (item.distance * item.distance);
      acc.weight += weight;
      acc.aqi += entry.aqi * weight;
      acc.pm25 += (entry.pm25 || 0) * weight;
      acc.eau[entry.eau] = (acc.eau[entry.eau] || 0) + weight;
      acc.risque[entry.risque] = (acc.risque[entry.risque] || 0) + weight;
      acc.nearbyWilayas.push(item.wilaya);
      return acc;
    }, {
      weight: 0,
      aqi: 0,
      pm25: 0,
      eau: {},
      risque: {},
      nearbyWilayas: []
    })
  );

  if (weighted.weight === 0) {
    return {
      aqi: 0,
      pm25: 0,
      eau: 'Moyenne',
      risque: 'Faible',
      nearbyWilayas: topWilayas.map((item) => item.wilaya)
    };
  }

  const bestEau = Object.entries(weighted.eau).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Moyenne';
  const bestRisque = Object.entries(weighted.risque).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Faible';

  return {
    aqi: Math.round(weighted.aqi / weighted.weight),
    pm25: Math.round(weighted.pm25 / weighted.weight),
    eau: bestEau,
    risque: bestRisque,
    nearbyWilayas: weighted.nearbyWilayas.slice(0, maxNearby)
  };
}
