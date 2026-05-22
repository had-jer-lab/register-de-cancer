import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🎨 Fonction de coloration choroplèthe
const getChoroplethColor = (cases) => {
  if (!cases || cases === 0) return '#e5e7eb';        // Gris clair
  if (cases < 30000) return '#84cc16';                // Vert lime
  if (cases < 60000) return '#fbbf24';                // Orange
  if (cases < 100000) return '#f97316';               // Orange foncé
  if (cases < 150000) return '#dc2626';               // Rouge
  return '#7f1d1d';                                   // Rouge très foncé
};

export const WilayaMap = ({ data = [], onWilayaDrill = null, onDairaSelect = null }) => {
  const [activeLayer, setActiveLayer] = useState('wilayas');
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [geoJsonWilayas, setGeoJsonWilayas] = useState(null);
  const [geoJsonDairat, setGeoJsonDairat] = useState(null);
  const mapRef = React.useRef(null);

  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        const wiLayasResp = await fetch('/geojson/algeria-wilayas.geojson');
        const dairatResp = await fetch('/geojson/algeria-dairat.geojson');

        if (wiLayasResp.ok) {
          const wiData = await wiLayasResp.json();
          setGeoJsonWilayas(wiData);
        }
        if (dairatResp.ok) {
          const diData = await dairatResp.json();
          setGeoJsonDairat(diData);
        }
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
      }
    };

    loadGeoJson();
  }, []);

  const getWilayaColor = (wilayaCode) => {
    const wilaya = data.find((w) => w.code === wilayaCode);
    if (!wilaya) return '#d4d4d8';
    return getColorByCount(wilaya.cases || 0);
  };

  const enrichedWilayas = geoJsonWilayas
    ? {
        ...geoJsonWilayas,
        features: geoJsonWilayas.features.map((feature) => {
          const wilayaData = data.find(
            (w) => w.code === feature.properties.wilaya_code || w.name === feature.properties.wilaya_name
          );
          return {
            ...feature,
            properties: {
              ...feature.properties,
              cases: wilayaData?.cases || 0,
              percentage: wilayaData?.percentage || 0,
              tier: wilayaData?.tier || 'Faible',
            },
          };
        }),
      }
    : null;

  const enrichedDairat =
    selectedWilaya && geoJsonDairat
      ? {
          ...geoJsonDairat,
          features: geoJsonDairat.features
            .filter((f) => f.properties.wilaya_code === selectedWilaya.code)
            .map((feature) => {
              const dairaData = selectedWilaya.dairat?.find(
                (d) => d.code === feature.properties.daira_code
              );
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  cases: dairaData?.cases || 0,
                  percentage: dairaData?.percentage || 0,
                },
              };
            }),
        }
      : null;

  const wilayaStyle = (feature) => {
    return {
      fillColor: getWilayaColor(feature.properties.wilaya_code),
      weight: 2,
      opacity: 0.8,
      color: '#666',
      dashArray: '3',
      fillOpacity: 0.7,
      cursor: 'pointer',
    };
  };

  const dairaStyle = (feature) => {
    const cases = feature.properties.cases || 0;
    return {
      fillColor: getColorByCount(cases),
      weight: 1.5,
      opacity: 0.8,
      color: '#555',
      fillOpacity: 0.65,
      cursor: 'pointer',
    };
  };

  const onWilayaClick = (feature) => {
    const wilaya = data.find(
      (w) => w.code === feature.properties.wilaya_code || w.name === feature.properties.wilaya_name
    );
    if (wilaya) {
      setSelectedWilaya(wilaya);
      setActiveLayer('dairat');
      if (onWilayaDrill) onWilayaDrill(wilaya);
    }
  };

  const onCircleClick = (wilayaCode) => {
    const wilaya = data.find((w) => w.code === wilayaCode);
    if (wilaya) {
      setSelectedWilaya(wilaya);
      setActiveLayer('dairat');
      if (onWilayaDrill) onWilayaDrill(wilaya);
      
      // Fly to bounds
      if (mapRef.current && enrichedDairat) {
        const wilayaDairat = enrichedDairat.features;
        if (wilayaDairat.length > 0) {
          try {
            let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
            wilayaDairat.forEach((f) => {
              const coords = f.geometry.coordinates[0] || f.geometry.coordinates;
              coords.flat(Infinity).forEach((val, i) => {
                if (i % 2 === 1) {
                  minLat = Math.min(minLat, val);
                  maxLat = Math.max(maxLat, val);
                } else {
                  minLng = Math.min(minLng, val);
                  maxLng = Math.max(maxLng, val);
                }
              });
            });
            mapRef.current.flyToBounds(
              [[minLat, minLng], [maxLat, maxLng]],
              { padding: [40, 40], duration: 1.2 }
            );
          } catch (e) {
            console.error('Fly to bounds error:', e);
          }
        }
      }
    }
  };

  const onDairaClick = (feature) => {
    if (onDairaSelect) {
      onDairaSelect({
        code: feature.properties.daira_code,
        name: feature.properties.daira_name,
        cases: feature.properties.cases,
        wilaya_code: feature.properties.wilaya_code,
      });
    }
  };

  const handleWilayaEachFeature = (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(
      `<div class="p-2"><strong>${props.wilaya_name || props.name}</strong><br/>
       Cas: ${props.cases?.toLocaleString() || 0}<br/>
       ${props.percentage ? `% Total: ${props.percentage.toFixed(1)}%` : ''}</div>`
    );
    layer.on('click', () => onWilayaClick(feature));
  };

  const handleDairaEachFeature = (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(
      `<div class="p-2"><strong>${props.daira_name || props.name}</strong><br/>
       Cas: ${props.cases?.toLocaleString() || 0}<br/>
       ${props.percentage ? `% Wilaya: ${props.percentage.toFixed(1)}%` : ''}</div>`
    );
    layer.on('click', () => onDairaClick(feature));
  };

  const MapContent = () => {
    const map = useMap();
    mapRef.current = map;

    return (
      <>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Wilayas layer */}
        {activeLayer === 'wilayas' && enrichedWilayas && (
          <>
            <GeoJSON data={enrichedWilayas} style={wilayaStyle} onEachFeature={handleWilayaEachFeature} />
            
            {/* Circle markers for wilayas */}
            {enrichedWilayas.features.map((feature, idx) => {
              const centroid = getCentroid(feature);
              const wilayaCode = feature.properties.wilaya_code;
              const wilaya = data.find((w) => w.code === wilayaCode);
              const cases = wilaya?.cases || 0;
              
              if (cases === 0) return null;
              
              const radius = Math.max(8, Math.min(40, Math.sqrt(cases) * 1.2));
              const color = getColorScale(cases);
              
              return (
                <CircleMarker
                  key={`circle-${idx}`}
                  center={[centroid[1], centroid[0]]}
                  radius={radius}
                  fill={true}
                  fillColor={color}
                  fillOpacity={0.85}
                  stroke={true}
                  color="white"
                  weight={2}
                  eventHandlers={{
                    click: () => onCircleClick(wilayaCode),
                  }}
                >
                  <Tooltip>
                    <div className="text-center">
                      <strong>{wilaya?.name}</strong>
                      <br />
                      Cas: {cases.toLocaleString()}
                      <br />
                      {wilaya?.percentage ? `${wilaya.percentage.toFixed(1)}%` : ''}
                    </div>
                  </Tooltip>
                  {/* Text label inside circle */}
                  <div
                    className="absolute text-white text-center font-bold text-xs"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                    }}
                  >
                    {cases > 1000 ? `${(cases / 1000).toFixed(1)}k` : cases}
                  </div>
                </CircleMarker>
              );
            })}
          </>
        )}

        {/* Daïrat layer */}
        {activeLayer === 'dairat' && enrichedDairat && (
          <>
            <GeoJSON data={enrichedDairat} style={dairaStyle} onEachFeature={handleDairaEachFeature} />
            
            {/* Circle markers for daïras */}
            {enrichedDairat.features.map((feature, idx) => {
              const centroid = getCentroid(feature);
              const cases = feature.properties.cases || 0;
              
              if (cases === 0) return null;
              
              const radius = Math.max(6, Math.min(30, Math.sqrt(cases) * 1.0));
              const color = getColorScale(cases);
              
              return (
                <CircleMarker
                  key={`daira-circle-${idx}`}
                  center={[centroid[1], centroid[0]]}
                  radius={radius}
                  fill={true}
                  fillColor={color}
                  fillOpacity={0.85}
                  stroke={true}
                  color="white"
                  weight={2}
                >
                  <Tooltip>
                    <div className="text-center">
                      <strong>{feature.properties.daira_name}</strong>
                      <br />
                      Cas: {cases.toLocaleString()}
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </>
        )}
      </>
    );
  };

  const handleBackClick = () => {
    setActiveLayer('wilayas');
    setSelectedWilaya(null);
    // Fly back to Algeria center
    if (mapRef.current) {
      mapRef.current.flyTo([28.0339, 1.6596], 5, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[500px] rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md border border-gray-200 p-3 z-10 max-w-xs">
        <div className="text-xs font-semibold text-gray-700 mb-2">Légende</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4ade80' }}></div>
            <span>Faible (0-10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
            <span>Moyen (11-20)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fb923c' }}></div>
            <span>Élevé (21-50)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
            <span>Très élevé (51-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7f1d1d' }}></div>
            <span>Critique (>100)</span>
          </div>
        </div>
      </div>

      {/* Back button / Layer indicator */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md border border-gray-200 px-3 py-2 z-50">
        {activeLayer === 'dairat' && selectedWilaya && (
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ChevronLeft size={16} />
            ← {selectedWilaya.name}
          </button>
        )}
        {activeLayer === 'wilayas' && (
          <div className="text-sm text-gray-700 font-medium">Cliquez sur un cercle pour zoomer</div>
        )}
        {activeLayer === 'dairat' && !selectedWilaya && (
          <div className="text-sm text-gray-700 font-medium">Daïras</div>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={[28.0339, 1.6596]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <MapContent />
      </MapContainer>
    </div>
  );
};

export const WilayaMap = ({ data = [], onWilayaDrill = null, onDairaSelect = null }) => {
  const [activeLayer, setActiveLayer] = useState('wilayas'); // 'wilayas' or 'dairat'
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [geoJsonWilayas, setGeoJsonWilayas] = useState(null);
  const [geoJsonDairat, setGeoJsonDairat] = useState(null);

  const mapRef = React.useRef(null);

  // Load GeoJSON files
  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        const wiLayasResp = await fetch('/geojson/algeria-wilayas.geojson');
        const dairatResp = await fetch('/geojson/algeria-dairat.geojson');

        if (wiLayasResp.ok) {
          const wiData = await wiLayasResp.json();
          setGeoJsonWilayas(wiData);
        }
        if (dairatResp.ok) {
          const diData = await dairatResp.json();
          setGeoJsonDairat(diData);
        }
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
      }
    };

    loadGeoJson();
  }, []);

  // Function to get color for wilaya
  const getWilayaColor = (wilayaCode) => {
    const wilaya = data.find((w) => w.code === wilayaCode);
    if (!wilaya) return '#d4d4d8';
    return getColorByCount(wilaya.cases || 0);
  };

  // Populate features with case data
  const enrichedWilayas = geoJsonWilayas
    ? {
        ...geoJsonWilayas,
        features: geoJsonWilayas.features.map((feature) => {
          const wilayaData = data.find(
            (w) => w.code === feature.properties.wilaya_code || w.name === feature.properties.wilaya_name
          );
          return {
            ...feature,
            properties: {
              ...feature.properties,
              cases: wilayaData?.cases || 0,
              percentage: wilayaData?.percentage || 0,
              tier: wilayaData?.tier || 'Faible',
            },
          };
        }),
      }
    : null;

  const enrichedDairat =
    selectedWilaya && geoJsonDairat
      ? {
          ...geoJsonDairat,
          features: geoJsonDairat.features
            .filter((f) => f.properties.wilaya_code === selectedWilaya.code)
            .map((feature) => {
              const dairaData = selectedWilaya.dairat?.find(
                (d) => d.code === feature.properties.daira_code
              );
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  cases: dairaData?.cases || 0,
                  percentage: dairaData?.percentage || 0,
                },
              };
            }),
        }
      : null;

  // Wilaya style
  const wilayaStyle = (feature) => {
    const cases = feature.properties.cases || 0;
    return {
      fillColor: getWilayaColor(feature.properties.wilaya_code),
      weight: 2,
      opacity: 0.8,
      color: '#666',
      dashArray: '3',
      fillOpacity: 0.7,
      cursor: 'pointer',
    };
  };

  // Daïra style
  const dairaStyle = (feature) => {
    const cases = feature.properties.cases || 0;
    return {
      fillColor: getColorByCount(cases),
      weight: 1.5,
      opacity: 0.8,
      color: '#555',
      fillOpacity: 0.65,
      cursor: 'pointer',
    };
  };

  // Wilaya click handler
  const onWilayaClick = (feature) => {
    const wilaya = data.find(
      (w) => w.code === feature.properties.wilaya_code || w.name === feature.properties.wilaya_name
    );
    if (wilaya) {
      setSelectedWilaya(wilaya);
      setActiveLayer('dairat');
      if (onWilayaDrill) onWilayaDrill(wilaya);
    }
  };

  // Daïra click handler
  const onDairaClick = (feature) => {
    if (onDairaSelect) {
      onDairaSelect({
        code: feature.properties.daira_code,
        name: feature.properties.daira_name,
        cases: feature.properties.cases,
        wilaya_code: feature.properties.wilaya_code,
      });
    }
  };

  // Handle layer interaction
  const handleWilayaEachFeature = (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(
      `<div class="p-2"><strong>${props.wilaya_name || props.name}</strong><br/>
       Cas: ${props.cases?.toLocaleString() || 0}<br/>
       ${props.percentage ? `% Total: ${props.percentage.toFixed(1)}%` : ''}</div>`
    );
    layer.on('click', () => onWilayaClick(feature));
  };

  const handleDairaEachFeature = (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(
      `<div class="p-2"><strong>${props.daira_name || props.name}</strong><br/>
       Cas: ${props.cases?.toLocaleString() || 0}<br/>
       ${props.percentage ? `% Wilaya: ${props.percentage.toFixed(1)}%` : ''}</div>`
    );
    layer.on('click', () => onDairaClick(feature));
  };

  const MapContent = () => {
    const map = useMap();
    mapRef.current = map;

    return (
      <>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Wilayas layer */}
        {activeLayer === 'wilayas' && enrichedWilayas && (
          <GeoJSON data={enrichedWilayas} style={wilayaStyle} onEachFeature={handleWilayaEachFeature} />
        )}

        {/* Daïrat layer */}
        {activeLayer === 'dairat' && enrichedDairat && (
          <GeoJSON data={enrichedDairat} style={dairaStyle} onEachFeature={handleDairaEachFeature} />
        )}
      </>
    );
  };

  return (
    <div className="relative w-full h-[500px] rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md border border-gray-200 p-3 z-10 max-w-xs">
        <div className="text-xs font-semibold text-gray-700 mb-2">Légende</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f0f0f0' }}></div>
            <span>Faible (0-500)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fef3c7' }}></div>
            <span>Moyen (501-2000)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fed7aa' }}></div>
            <span>Élevé (2001-5000)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
            <span>Très élevé (5001+)</span>
          </div>
        </div>
      </div>

      {/* Breadcrumb / Layer indicator */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md border border-gray-200 px-3 py-2 z-10">
        {activeLayer === 'dairat' && selectedWilaya && (
          <button
            onClick={() => {
              setActiveLayer('wilayas');
              setSelectedWilaya(null);
            }}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ChevronLeft size={16} />
            Retour aux Wilayas
          </button>
        )}
        {activeLayer === 'wilayas' && (
          <div className="text-sm text-gray-700 font-medium">Cliquez sur une wilaya pour zoomer</div>
        )}
        {activeLayer === 'dairat' && (
          <div className="text-sm text-gray-700 font-medium">
            Daïras de <strong>{selectedWilaya?.name}</strong>
          </div>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={[28.0339, 1.6596]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <MapContent />
      </MapContainer>
    </div>
  );
};

export default WilayaMap;
