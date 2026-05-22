import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { aggregateByWilaya } from '../utils/dataAggregation';

/**
 * Componente de Mapa Choroplético Profesional
 * Muestra un mapa coloreado de las wilayas según los casos de cáncer
 */
function ProfessionalChoroplethMap({ filteredData, onWilayaClick = null }) {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wilayaStats, setWilayaStats] = useState({});
  const [selectedWilaya, setSelectedWilaya] = useState(null);

  // Cargar GeoJSON
  useEffect(() => {
    fetch('/geojson/algeria-wilayas-professional.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading GeoJSON:', err);
        setLoading(false);
      });
  }, []);

  // Actualizar estadísticas cuando cambian los datos filtrados
  useEffect(() => {
    if (filteredData && filteredData.length > 0) {
      const stats = aggregateByWilaya(filteredData);
      setWilayaStats(stats);
    }
  }, [filteredData]);

  // Función para obtener color según número de casos
  const getChoroplethColor = (cases) => {
    if (!cases || cases === 0) return '#e5e7eb';           // Gris
    if (cases < 1000) return '#dcfce7';                    // Verde muy claro
    if (cases < 5000) return '#86efac';                    // Verde claro
    if (cases < 15000) return '#4ade80';                   // Verde
    if (cases < 30000) return '#22c55e';                   // Verde oscuro
    if (cases < 50000) return '#fbbf24';                   // Amarillo
    if (cases < 75000) return '#f97316';                   // Naranja
    if (cases < 100000) return '#ef4444';                  // Rojo
    if (cases < 150000) return '#dc2626';                  // Rojo oscuro
    return '#7f1d1d';                                      // Rojo muy oscuro
  };

  // Estilo de features
  const style = (feature) => {
    const wilayaName = feature.properties.wilaya_name;
    const cases = wilayaStats[wilayaName]?.cases || 0;
    
    return {
      fillColor: getChoroplethColor(cases),
      weight: selectedWilaya === wilayaName ? 3 : 2,
      opacity: 0.9,
      color: selectedWilaya === wilayaName ? '#000' : '#333',
      dashArray: selectedWilaya === wilayaName ? '' : '',
      fillOpacity: selectedWilaya === wilayaName ? 0.95 : 0.8,
      cursor: 'pointer'
    };
  };

  // Eventos de hover
  const highlightFeature = (e) => {
    const layer = e.target;
    layer.setStyle({
      weight: 3,
      color: '#000',
      fillOpacity: 0.95
    });
    layer.bringToFront();
  };

  const resetHighlight = (e) => {
    const layer = e.target;
    layer.setStyle(style(layer.feature));
  };

  // Tooltip y popup
  const onEachFeature = (feature, layer) => {
    const wilayaName = feature.properties.wilaya_name;
    const stats = wilayaStats[wilayaName] || { cases: 0, sex: { M: 0, F: 0 } };
    const cases = stats.cases || 0;
    const totalCases = Object.values(wilayaStats).reduce((sum, w) => sum + (w.cases || 0), 0) || 1;
    const percentage = ((cases / totalCases) * 100).toFixed(2);

    // Tooltip
    const tooltipContent = `<b>${wilayaName}</b><br/>Cas: <strong>${cases.toLocaleString('fr-FR')}</strong>`;
    layer.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top',
      className: 'wilaya-tooltip',
      offset: [0, -10]
    });

    // Popup detallado
    const popupContent = `
      <div style="font-family: Arial; font-size: 13px; min-width: 280px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
          📍 ${wilayaName}
        </h3>
        <div style="margin: 10px 0;">
          <p style="margin: 5px 0;"><b>Cas total:</b> <span style="color: #dc2626; font-size: 16px; font-weight: bold;">${cases.toLocaleString('fr-FR')}</span></p>
          <p style="margin: 5px 0;"><b>Pourcentage:</b> <span style="color: #2563eb; font-weight: bold;">${percentage}%</span></p>
        </div>
        <div style="background: #f9fafb; padding: 8px; border-radius: 6px; margin: 10px 0; font-size: 12px;">
          <p style="margin: 3px 0;">👨 Hommes: <strong>${stats.sex?.M || 0}</strong></p>
          <p style="margin: 3px 0;">👩 Femmes: <strong>${stats.sex?.F || 0}</strong></p>
        </div>
        <p style="margin: 10px 0; color: #666; font-size: 11px;">Cliquez pour plus de détails</p>
      </div>
    `;
    layer.bindPopup(popupContent, { maxWidth: 300 });

    // Eventos
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: () => {
        setSelectedWilaya(wilayaName);
        if (onWilayaClick) onWilayaClick(wilayaName);
      }
    });
  };

  if (loading) {
    return (
      <div style={{
        height: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#64748b'
      }}>
        ⏳ Chargement de la carte choroplèthe...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <MapContainer
        center={[28.0339, 1.6596]}
        zoom={5}
        maxBounds={[[19, -9], [38, 12]]}
        maxBoundsViscosity={1.0}
        style={{
          height: '600px',
          width: '100%',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
          maxZoom={18}
        />
        {geoData && <GeoJSON data={geoData} style={style} onEachFeature={onEachFeature} />}
      </MapContainer>

      {/* Légende Choroplèthe */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'white',
        padding: '16px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        minWidth: '220px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
          📊 Légende - Cas de Cancer
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <LegendItem color="#e5e7eb" label="Pas de données" />
          <LegendItem color="#dcfce7" label="0 - 1K cas" />
          <LegendItem color="#86efac" label="1K - 5K cas" />
          <LegendItem color="#4ade80" label="5K - 15K cas" />
          <LegendItem color="#22c55e" label="15K - 30K cas" />
          <LegendItem color="#fbbf24" label="30K - 50K cas" />
          <LegendItem color="#f97316" label="50K - 75K cas" />
          <LegendItem color="#ef4444" label="75K - 100K cas" />
          <LegendItem color="#dc2626" label="100K - 150K cas" />
          <LegendItem color="#7f1d1d" label=">150K cas" />
        </div>
      </div>

      {/* Info de Wilaya Seleccionada */}
      {selectedWilaya && wilayaStats[selectedWilaya] && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'white',
          padding: '16px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 999,
          maxWidth: '300px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
            {selectedWilaya}
          </h4>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#475569' }}>
            <p><b>Cas total:</b> {wilayaStats[selectedWilaya].cases.toLocaleString('fr-FR')}</p>
            <p><b>Hommes:</b> {wilayaStats[selectedWilaya].sex?.M || 0}</p>
            <p><b>Femmes:</b> {wilayaStats[selectedWilaya].sex?.F || 0}</p>
          </div>
          <button
            onClick={() => setSelectedWilaya(null)}
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            ✕ Fermer
          </button>
        </div>
      )}

      <style>{`
        .wilaya-tooltip {
          background-color: rgba(15, 23, 42, 0.9) !important;
          border-radius: 6px !important;
          padding: 8px 12px !important;
          color: white !important;
          font-size: 12px !important;
          border: none !important;
        }
        .wilaya-tooltip::before {
          border-top-color: rgba(15, 23, 42, 0.9) !important;
        }
      `}</style>
    </div>
  );
}

/**
 * Componente de items de leyenda
 */
function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '24px',
        height: '24px',
        background: color,
        border: '1px solid #cbd5e1',
        borderRadius: '4px'
      }} />
      <span style={{ fontSize: '12px', color: '#475569' }}>{label}</span>
    </div>
  );
}

export default ProfessionalChoroplethMap;
