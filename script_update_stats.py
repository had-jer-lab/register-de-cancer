import pathlib, re
root = pathlib.Path('c:/Users/TOSHIBA/Desktop/Syst-me-de-Registre-de-Cancer')
stat_file = root / 'frontend' / 'src' / 'pages' / 'Statistics.jsx'
zone_file = root / 'frontend' / 'src' / 'utils' / 'zoneUtils.js'
stat_text = stat_file.read_text(encoding='utf-8')
zone_text = zone_file.read_text(encoding='utf-8')
start_token = 'function ChoroplethMap({ data, apiData, rawData, cancers, patients }) {'
start = stat_text.find(start_token)
if start == -1:
    raise SystemExit('Start token not found in Statistics.jsx')
brace = 0
end = None
for i, ch in enumerate(stat_text[start:]):
    if ch == '{':
        brace += 1
    elif ch == '}':
        brace -= 1
        if brace == 0:
            end = start + i + 1
            break
if end is None:
    raise SystemExit('End of ChoroplethMap not found')
new_choropleth = r'''function ChoroplethMap({ data, apiData, rawData, cancers, patients }) {
  const [activeMarkerType, setActiveMarkerType] = useState(null);
  const [customMarkers, setCustomMarkers] = useState([]);
  const [customZones, setCustomZones] = useState([]);
  const [visibleFixedMarkers, setVisibleFixedMarkers] = useState({ industrie: true, eau: true, risque: true });
  const [savedMaps, setSavedMaps] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('envMaps') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [expandedMapId, setExpandedMapId] = useState(null);
  const [editingMapId, setEditingMapId] = useState(null);
  const [editingMapDraft, setEditingMapDraft] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [pendingName, setPendingName] = useState('');
  const [drawingZone, setDrawingZone] = useState(false);
  const [tempZonePoints, setTempZonePoints] = useState([]);
  const [zoneName, setZoneName] = useState('');
  const [zoneNameError, setZoneNameError] = useState('');
  const [editingMarkerId, setEditingMarkerId] = useState(null);
  const [editingMarkerName, setEditingMarkerName] = useState('');

  const patientsSource = useMemo(() => {
    if (Array.isArray(rawData) && rawData.length > 0) return rawData;
    if (Array.isArray(apiData?.raw_data) && apiData.raw_data.length > 0) return apiData.raw_data;
    return Array.isArray(patients) ? patients : [];
  }, [rawData, apiData, patients]);

  useEffect(() => {
    localStorage.setItem('envMaps', JSON.stringify(savedMaps));
  }, [savedMaps]);

  const PREDEFINED_MARKERS = useMemo(() => ([
    { id: 'industrie-1', name: 'Cimenterie Lafarge Oggaz', lat: 34.92, lng: -1.28, type: 'industrie', title: 'Type: Industrie lourde', pollutant: 'PM2.5, CO2' },
    { id: 'industrie-2', name: 'Zone Ind. Béni Mester', lat: 34.95, lng: -1.35, type: 'industrie', title: 'Type: Industrie lourde', pollutant: 'PM2.5, CO2' },
    { id: 'industrie-3', name: 'Textile Tlemcen', lat: 34.88, lng: -1.31, type: 'industrie', title: 'Type: Industrie textile', pollutant: 'PM2.5, CO2' },
    { id: 'industrie-4', name: 'Carrière Béni Snous', lat: 34.76, lng: -1.44, type: 'industrie', title: 'Type: Carrière', pollutant: 'PM2.5, CO2' },
    { id: 'eau-1', name: 'Barrage Beni Bahdel', lat: 34.72, lng: -1.58, type: 'eau', title: 'Source d\'eau', pollutant: 'Qualité Moyenne' },
    { id: 'eau-2', name: 'Oued Tafna', lat: 34.78, lng: -1.45, type: 'eau', title: 'Source d\'eau', pollutant: 'Qualité Moyenne' },
    { id: 'eau-3', name: 'Retenue Hammam Boughrara', lat: 35.07, lng: -1.53, type: 'eau', title: 'Source d\'eau', pollutant: 'Qualité Moyenne' },
    { id: 'eau-4', name: 'Station Ghazaouet', lat: 35.10, lng: -1.86, type: 'eau', title: 'Source d\'eau', pollutant: 'Qualité Bonne' },
    { id: 'risque-1', name: 'Décharge Chetouane', lat: 34.90, lng: -1.28, type: 'risque', title: 'Point de risque', pollutant: 'Sol contaminé' },
    { id: 'risque-2', name: 'Carrière Sabra', lat: 34.82, lng: -1.30, type: 'risque', title: 'Point de risque', pollutant: 'Poussière silice' },
    { id: 'risque-3', name: 'Décharge sauvage Remchi', lat: 35.06, lng: -1.43, type: 'risque', title: 'Point de risque', pollutant: 'Sol contaminé' }
  ]), []);

  const PREDEFINED_BY_TYPE = useMemo(() => {
    return PREDEFINED_MARKERS.reduce((acc, marker) => {
      acc[marker.type] = acc[marker.type] || [];
      acc[marker.type].push(marker);
      return acc;
    }, { industrie: [], eau: [], risque: [] });
  }, [PREDEFINED_MARKERS]);

  const displayMarkers = editingMapDraft ? editingMapDraft.markers : customMarkers;
  const displayZones = editingMapDraft ? editingMapDraft.zones : customZones;

  const getAqiColor = (aqi) => {
    if (aqi <= 50) return { color: '#16a34a', label: 'Bon', bg: '#ecfdf5' };
    if (aqi <= 100) return { color: '#ca8a04', label: 'Modéré', bg: '#fef9c3' };
    if (aqi <= 150) return { color: '#ea580c', label: 'Mauvais', bg: '#fff7ed' };
    return { color: '#dc2626', label: 'Dangereux', bg: '#fef2f2' };
  };

  const mapCursor = activeMarkerType && activeMarkerType !== 'zone' ? 'crosshair' : 'grab';

  const getLatLngFromRow = (row) => {
    const lat = Number(row.latitude ?? row.lat ?? row.latitud ?? row.latitute);
    const lng = Number(row.longitude ?? row.lng ?? row.long ?? row.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };

  const getZoneCentroid = (points) => {
    if (!Array.isArray(points) || points.length === 0) return null;
    const sum = points.reduce((acc, point) => ({ lat: acc.lat + Number(point[0]), lng: acc.lng + Number(point[1]) }), { lat: 0, lng: 0 });
    return [sum.lat / points.length, sum.lng / points.length];
  };

  const getCirclePolygon = ([lat, lng], meters, steps = 32) => {
    const coords = [];
    const earthRadius = 6371000;
    for (let i = 0; i < steps; i += 1) {
      const angle = (Math.PI * 2 * i) / steps;
      const dLat = (meters / earthRadius) * Math.cos(angle);
      const dLng = (meters / (earthRadius * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
      coords.push([lat + (dLat * 180) / Math.PI, lng + (dLng * 180) / Math.PI]);
    }
    return coords;
  };

  const patientsInZone = useCallback((zonePoints) => {
    if (!Array.isArray(zonePoints) || zonePoints.length === 0) return [];
    return patientsSource.filter((row) => {
      const point = getLatLngFromRow(row);
      if (!point) return false;
      return isPointInPolygon(point, zonePoints);
    });
  }, [patientsSource]);

  const saveCurrentMap = () => {
    if (!customZones.length && !displayMarkers.length && Object.values(visibleFixedMarkers).every((v) => !v)) {
      alert('Ajoutez des zones ou des markers avant de sauvegarder.');
      return;
    }
    const mapName = window.prompt('Nom de la carte :');
    if (!mapName || !mapName.trim()) {
      return;
    }
    const newMap = {
      id: Date.now(),
      name: mapName.trim(),
      markers: displayMarkers,
      zones: displayZones,
      visibleFixedMarkers,
      createdAt: new Date().toISOString()
    };
    setSavedMaps((prev) => [...prev, newMap]);
    setSelectedMapId(newMap.id);
    setExpandedMapId(newMap.id);
    setEditingMapId(null);
    setEditingMapDraft(null);
  };

  const getMapSummary = (savedMap) => {
    const zone = savedMap.zones?.[0];
    const aqi = zone?.pollution?.aqi ?? 0;
    return {
      name: savedMap.name,
      aqi,
      date: new Date(savedMap.createdAt).toLocaleDateString('fr-FR'),
      points: savedMap.markers?.length || 0,
      zones: savedMap.zones?.length || 0,
      wilayas: Array.from(new Set([...(savedMap.zones || []).map((z) => z.pollution?.nearbyWilayas || []).flat().filter(Boolean)])).slice(0, 3).join(' · ') || 'Tlemcen'
    };
  };

  const flyToPoint = (position, zoom = 12) => {
    if (mapRef && position) {
      mapRef.flyTo(position, zoom, { duration: 1.1 });
    }
  };

  const createZone = () => {
    setZoneNameError('');
    if (!zoneName.trim()) {
      setZoneNameError('Le nom de la zone est obligatoire.');
      return;
    }
    if (tempZonePoints.length < 3) {
      setZoneNameError('Dessinez au moins 3 points.');
      return;
    }
    const patients = patientsInZone(tempZonePoints);
    const pollution = computeCompletePollutionData(patients, tempZonePoints, {}, WILAYA_COORDINATES, 3);
    const zone = {
      id: Date.now(),
      name: zoneName.trim(),
      points: tempZonePoints,
      centroid: getZoneCentroid(tempZonePoints),
      pollution,
      stats: computeZoneStats(patients),
      createdAt: new Date().toISOString()
    };
    if (editingMapDraft) {
      setEditingMapDraft((prev) => ({ ...prev, zones: [...(prev?.zones || []), zone] }));
    } else {
      setCustomZones((prev) => [...prev, zone]);
    }
    setDrawingZone(false);
    setTempZonePoints([]);
    setZoneName('');
    setActiveMarkerType(null);
  };

  const cancelZone = () => {
    setDrawingZone(false);
    setTempZonePoints([]);
    setZoneName('');
    setZoneNameError('');
    setActiveMarkerType(null);
  };

  const handleMapClick = (latlng) => {
    if (activeMarkerType === 'zone') {
      setTempZonePoints((prev) => [...prev, [latlng.lat, latlng.lng]]);
      return;
    }
    if (!activeMarkerType) return;
    setPendingPoint({ lat: latlng.lat, lng: latlng.lng, type: activeMarkerType });
    setPendingName('');
  };

  const commitPendingMarker = () => {
    if (!pendingPoint) return;
    const name = pendingName.trim() || `${pendingPoint.type.charAt(0).toUpperCase() + pendingPoint.type.slice(1)} ${displayMarkers.filter((m) => m.type === pendingPoint.type).length + 1}`;
    const marker = {
      id: Date.now(),
      type: pendingPoint.type,
      name,
      lat: pendingPoint.lat,
      lng: pendingPoint.lng,
      createdAt: new Date().toISOString()
    };
    if (editingMapDraft) {
      setEditingMapDraft((prev) => ({ ...prev, markers: [...(prev?.markers || []), marker] }));
    } else {
      setCustomMarkers((prev) => [...prev, marker]);
    }
    setPendingPoint(null);
    setPendingName('');
    setActiveMarkerType(null);
  };

  const deleteCustomMarker = (id) => {
    if (editingMapDraft) {
      setEditingMapDraft((prev) => ({ ...prev, markers: prev.markers.filter((marker) => marker.id !== id) }));
    } else {
      setCustomMarkers((prev) => prev.filter((marker) => marker.id !== id));
    }
  };

  const createZoneAroundMarker = (marker) => {
    const circle = getCirclePolygon([marker.lat, marker.lng], 8000, 32);
    const patients = patientsInZone(circle);
    const pollution = computeCompletePollutionData(patients, circle, {}, WILAYA_COORDINATES, 3);
    const zone = {
      id: Date.now(),
      name: f'Zone autour de {marker.name}',
      points: circle,
      centroid: getZoneCentroid(circle),
      pollution,
      stats: computeZoneStats(patients),
      createdAt: new Date().toISOString()
    };
    if (editingMapDraft) {
      setEditingMapDraft((prev) => ({ ...prev, zones: [...(prev?.zones || []), zone] }));
    } else {
      setCustomZones((prev) => [...prev, zone]);
    }
  };

  const editSavedMap = (map) => {
    setEditingMapId(map.id);
    setEditingMapDraft({ ...map, markers: [...(map.markers || [])], zones: [...(map.zones || [])] });
    setExpandedMapId(map.id);
  };

  const confirmEditSavedMap = () => {
    if (!editingMapDraft) return;
    setSavedMaps((prev) => prev.map((map) => (map.id === editingMapDraft.id ? editingMapDraft : map)));
    setEditingMapId(null);
    setEditingMapDraft(null);
  };

  const removeSavedMap = (map) => {
    if (!window.confirm(f'Supprimer {map.name} ?')) return;
    setSavedMaps((prev) => prev.filter((item) => item.id !== map.id));
    if (selectedMapId === map.id) setSelectedMapId(null);
    if (expandedMapId === map.id) setExpandedMapId(null);
    if (editingMapId === map.id) {
      setEditingMapId(null);
      setEditingMapDraft(null);
    }
  };

  const getZoneText = (type) => {
    if (type === 'industrie') return '🏭';
    if (type === 'eau') return '💧';
    if (type === 'risque') return '⚠️';
    return '📍';
  };

  const getSavedMapStats = (map) => {
    const zone = map.zones?.[0] || null;
    const aqiValue = zone?.pollution?.aqi ?? 0;
    const aqiInfo = getAqiColor(aqiValue);
    return {
      aqiValue,
      aqiLabel: aqiInfo.label,
      aqiColor: aqiInfo.color,
      pm25: zone?.pollution?.pm25 ?? 'N/A',
      eau: zone?.pollution?.eau ?? 'Moyenne',
      risque: zone?.pollution?.risque ?? 'Faible',
      markersInZone: zone ? (map.markers || []).length : 0,
      correlations: [
        { name: 'Leucémie', value: aqiValue > 80 ? 'Élevé' : aqiValue > 50 ? 'Moyen' : 'Faible' },
        { name: 'Colorectal', value: aqiValue > 70 ? 'Moyen' : 'Faible' }
      ]
    };
  };

  const saveEditingDraft = (field, value) => {
    if (!editingMapDraft) return;
    setEditingMapDraft((prev) => ({ ...prev, [field]: value }));
  };

  const activeMapDisplay = editingMapDraft || { markers: customMarkers, zones: customZones };
  const displayMapMarkers = activeMapDisplay.markers || [];
  const displayMapZones = activeMapDisplay.zones || [];

  return (
    <div style={{ display: 'flex', gap: 14, width: '100%', alignItems: 'flex-start', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ width: 280, minWidth: 280, maxHeight: 600, overflow: 'hidden', background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
        <div style={{ padding: 18, borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #0f766e, #22c55e)', color: 'white', borderRadius: '12px 12px 0 0' }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Points d'intérêt</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>Gérez les outils, les points fixes et vos repères manuels.</div>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', maxHeight: 'calc(100% - 80px)' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Outils</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { key: 'zone', label: '📍 Nouvelle zone', color: '#059669' },
                { key: 'industrie', label: '🏭 Industrie', color: '#dc2626' },
                { key: 'eau', label: '💧 Source eau', color: '#2563eb' },
                { key: 'risque', label: '⚠️ Risque', color: '#ea580c' }
              ].map((tool) => (
                <button
                  key={tool.key}
                  onClick={() => {
                    setActiveMarkerType(tool.key);
                    setDrawingZone(tool.key === 'zone');
                    if (tool.key === 'zone') {
                      setTempZonePoints([]);
                      setZoneName('');
                      setZoneNameError('');
                    } else {
                      setPendingPoint(null);
                    }
                  }}
                  style={{
                    width: '100%', minHeight: 44, borderRadius: 12, border: '1px solid #e2e8f0',
                    background: activeMarkerType === tool.key ? `${tool.color}20` : 'white',
                    color: activeMarkerType === tool.key ? tool.color : '#334155',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>🏭 Sites industriels Tlemcen</div>
            {['industrie','eau','risque'].map((type) => (
              <div key={type} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {type === 'industrie' ? 'INDUSTRIELS' : type === 'eau' ? 'SOURCES D\'EAU' : 'RISQUES'}
                  </div>
                  <button
                    onClick={() => setVisibleFixedMarkers((prev) => ({ ...prev, [type]: !prev[type] }))}
                    style={{
                      fontSize: 11, padding: '6px 10px', borderRadius: 8,
                      border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', cursor: 'pointer'
                    }}
                  >
                    {visibleFixedMarkers[type] ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                {visibleFixedMarkers[type] && PREDEFINED_BY_TYPE[type].map((marker) => (
                  <div key={marker.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 12, color: '#334155' }}><span style={{ marginRight: 6 }}>{type === 'industrie' ? '🏭' : type === 'eau' ? '💧' : '⚠️'}</span>{marker.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right', minWidth: 115 }}>
                      {marker.lat.toFixed(2)}, {marker.lng.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>📍 Mes points</div>
            {displayMarkers.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', padding: '18px 10px', borderRadius: 12, background: '#f8fafc' }}>
                Aucun point ajouté
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    onClick={() => flyToPoint([marker.lat, marker.lng], 13)}
                    style={{
                      padding: 12, borderRadius: 12, background: 'white', border: '1px solid #e2e8f0',
                      cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 10
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: marker.type === 'industrie' ? '#fee2e2' : marker.type === 'eau' ? '#eff6ff' : '#fff7ed', color: marker.type === 'industrie' ? '#b91c1c' : marker.type === 'eau' ? '#1d4ed8' : '#c2410c', fontSize: 14, fontWeight: 700 }}>
                      {marker.type === 'industrie' ? '🏭' : marker.type === 'eau' ? '💧' : '⚠️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      {editingMarkerId === marker.id ? (
                        <input
                          autoFocus
                          value={editingMarkerName}
                          onChange={(e) => setEditingMarkerName(e.target.value)}
                          onBlur={() => {
                            setCustomMarkers((prev) => prev.map((item) => item.id === marker.id ? { ...item, name: editingMarkerName || item.name } : item));
                            setEditingMarkerId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setCustomMarkers((prev) => prev.map((item) => item.id === marker.id ? { ...item, name: editingMarkerName || item.name } : item));
                              setEditingMarkerId(null);
                            }
                          }}
                          style={{ width: '100%', fontSize: 12, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                        />
                      ) : (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{marker.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCustomMarker(marker.id);
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
                      title="Supprimer"
                    >
                      🗑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMarkerId(marker.id);
                        setEditingMarkerName(marker.name);
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: 14 }}
                      title="Modifier"
                    >
                      ✏️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 520, position: 'relative', minHeight: 600, borderRadius: 12, overflow: 'hidden', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
        <MapContainer
          center={[34.8783, -1.3150]}
          zoom={9}
          minZoom={6}
          style={{ width: '100%', height: '100%', cursor: mapCursor }}
          whenCreated={(map) => setMapRef(map)}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapClickHandler enabled={Boolean(mapRef)} onMapClick={handleMapClick} />

          {visibleFixedMarkers.industrie && PREDEFINED_BY_TYPE.industrie.map((marker) => (
            <Fragment key={marker.id}>
              <Polygon
                positions={getCirclePolygon([marker.lat, marker.lng], 8000)}
                pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.08, weight: 1 }}
              />
              <CircleMarker
                center={[marker.lat, marker.lng]}
                radius={10}
                pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{marker.name}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>{marker.title}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Polluant: {marker.pollutant}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>Rayon impact: ~8km</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createZoneAroundMarker(marker);
                    }}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #dc2626', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}
                  >
                    + Créer zone autour
                  </button>
                </Popup>
              </CircleMarker>
            </Fragment>
          ))}

          {visibleFixedMarkers.eau && PREDEFINED_BY_TYPE.eau.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={8}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.8, weight: 2 }}
            >
              <Popup>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{marker.name}</div>
                <div style={{ fontSize: 12, color: '#475569' }}>{marker.title}</div>
              </Popup>
            </CircleMarker>
          ))}

          {visibleFixedMarkers.risque && PREDEFINED_BY_TYPE.risque.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={8}
              pathOptions={{ color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.8, weight: 2 }}
            >
              <Popup>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{marker.name}</div>
                <div style={{ fontSize: 12, color: '#475569' }}>{marker.title}</div>
              </Popup>
            </CircleMarker>
          ))}

          {displayMapMarkers.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={8}
              pathOptions={{
                color: marker.type === 'industrie' ? '#dc2626' : marker.type === 'eau' ? '#2563eb' : '#ea580c',
                fillColor: marker.type === 'industrie' ? '#dc2626' : marker.type === 'eau' ? '#2563eb' : '#ea580c',
                fillOpacity: 0.85,
                weight: 2
              }}
            >
              <Popup>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{marker.name}</div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Type: {marker.type}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCustomMarker(marker.id);
                  }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #dc2626', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}
                >
                  Supprimer
                </button>
              </Popup>
            </CircleMarker>
          ))}

          {displayMapZones.map((zone) => {
            const aqiStyle = getAqiColor(zone.pollution?.aqi ?? 0);
            return (
              <Fragment key={zone.id}>
                <Polygon
                  positions={zone.points}
                  pathOptions={{ color: aqiStyle.color, fillColor: aqiStyle.color, fillOpacity: 0.18, weight: 2 }}
                  eventHandlers={{ click: () => flyToPoint(zone.centroid || getZoneCentroid(zone.points), 11) }}
                />
                {zone.centroid && (
                  <CircleMarker center={zone.centroid} radius={4} pathOptions={{ color: aqiStyle.color, fillColor: aqiStyle.color, fillOpacity: 1, weight: 1 }}>
                    <Popup>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{zone.name}</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>AQI {zone.pollution?.aqi ?? 'N/A'}</div>
                    </Popup>
                  </CircleMarker>
                )}
              </Fragment>
            );
          })}
        </MapContainer>

        {pendingPoint && (
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 320, background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{getZoneText(pendingPoint.type)} Nom du marker</div>
            <input
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              placeholder="Saisissez un nom"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={commitPendingMarker}
                style={{ flex: 1, borderRadius: 10, border: 'none', background: '#059669', color: 'white', padding: '10px 12px', cursor: 'pointer', fontWeight: 700 }}
              >
                Ajouter
              </button>
              <button
                onClick={() => setPendingPoint(null)}
                style={{ flex: 1, borderRadius: 10, border: '1px solid #cbd5e1', background: 'white', color: '#475569', padding: '10px 12px', cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {drawingZone && (
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 'min(420px, calc(100% - 32px))', background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)', padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Nom de la zone"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none' }}
              />
              {zoneNameError && <div style={{ color: '#dc2626', fontSize: 12 }}>{zoneNameError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={createZone}
                  style={{ flex: 1, borderRadius: 10, border: 'none', background: '#059669', color: 'white', padding: '10px 12px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Valider zone
                </button>
                <button
                  onClick={cancelZone}
                  style={{ flex: 1, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', color: '#475569', padding: '10px 12px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Cliquez sur la carte pour ajouter des sommets. Points actifs : {tempZonePoints.length}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: 320, minWidth: 320, maxHeight: 600, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
        <div style={{ padding: 18, borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #2563eb, #22c55e)', color: 'white', borderRadius: '12px 12px 0 0' }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Mes Cartes Environnementales</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>{savedMaps.length} cartes sauvegardées</div>
          <button
            onClick={saveCurrentMap}
            style={{ marginTop: 12, width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.16)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            💾 Sauvegarder vue actuelle
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {savedMaps.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, padding: '40px 10px', fontStyle: 'italic' }}>
              Aucune carte sauvegardée
            </div>
          ) : (
            savedMaps.map((map) => {
              const summary = getMapSummary(map);
              const isExpanded = expandedMapId === map.id;
              const isEditing = editingMapId === map.id;
              const stats = getSavedMapStats(map);
              return (
                <div key={map.id} style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)', overflow: 'hidden' }}>
                  <div style={{ padding: 14, cursor: 'pointer' }} onClick={() => {
                    setExpandedMapId(isExpanded ? null : map.id);
                    flyToPoint((map.zones?.[0]?.centroid) || [34.8783, -1.3150], 10);
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{summary.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{summary.points} points · {summary.date}</div>
                      </div>
                      <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 999, background: '#eef2ff', color: '#4338ca', fontWeight: 700 }}>
                        AQI {summary.aqi || '--'}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>Wilayas: {summary.wilayas}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedMapId(isExpanded ? null : map.id); flyToPoint((map.zones?.[0]?.centroid) || [34.8783, -1.3150], 10); }}
                      style={{ flex: 1, borderRadius: 10, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', padding: '10px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      👁 Voir
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); editSavedMap(map); }}
                      style={{ flex: 1, borderRadius: 10, border: '1px solid #38bdf8', background: '#ecfeff', color: '#0f766e', padding: '10px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✏️ Modif
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSavedMap(map); }}
                      style={{ flex: 1, borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', padding: '10px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      🗑 Suppr
                    </button>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Stats Zone</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <div style={{ padding: 10, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>AQI</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: stats.aqiColor }}>{stats.aqiValue} · {stats.aqiLabel}</div>
                        </div>
                        <div style={{ padding: 10, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>PM2.5</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{stats.pm25} µg/m³</div>
                        </div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8f0', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Qualité eau</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{stats.eau}</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8f0', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Risque cancer</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{stats.risque}</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Markers dans zone</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{stats.markersInZone}</div>
                        <div style={{ margin: '12px 0 6px', fontSize: 11, fontWeight: 700, color: '#475569' }}>Corrélations cancers</div>
                        {stats.correlations.map((item) => (
                          <div key={item.name} style={{ fontSize: 12, color: '#334155' }}>{item.name} → {item.value}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isEditing && editingMapDraft && (
                    <div style={{ padding: '14px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Modifier {editingMapDraft.name}</div>
                      <input
                        value={editingMapDraft.name}
                        onChange={(e) => saveEditingDraft('name', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 12, fontSize: 12 }}
                      />
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Markers</div>
                      {(editingMapDraft.markers || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Aucun marker attaché</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                          {editingMapDraft.markers.map((marker) => (
                            <div key={marker.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderRadius: 10, background: 'white', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: 12, color: '#0f172a' }}>{marker.name}</div>
                              <button
                                onClick={() => setEditingMapDraft((prev) => ({ ...prev, markers: prev.markers.filter((item) => item.id !== marker.id) }))}
                                style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}
                              >
                                🗑
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={confirmEditSavedMap}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✓ Confirmer modifications
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
'''
stat_text = stat_text[:start] + new_choropleth + stat_text[end:]
stat_file.write_text(stat_text, encoding='utf-8')

pattern = r'export function computeCompletePollutionData\([\s\S]*?\n\}'
replacement = r'''export function computeCompletePollutionData(
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
'''
zone_text = re.sub(pattern, replacement, zone_text, count=1, flags=re.MULTILINE)
zone_file.write_text(zone_text, encoding='utf-8')
print('Updated files successfully')
