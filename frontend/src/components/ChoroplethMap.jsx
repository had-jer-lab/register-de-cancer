import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Coordonnées des wilayas (même données que Statistics.jsx)
const WILAYA_COORDINATES = {
  "Adrar": [27.9768, -0.2928],
  "Chlef": [36.1667, 1.3333],
  "Laghouat": [33.8000, 2.8667],
  "Oum El Bouaghi": [35.8667, 7.1167],
  "Batna": [35.5500, 6.1667],
  "Béjaïa": [36.7500, 5.0667],
  "Biskra": [34.8500, 5.7333],
  "Béchar": [31.6167, -2.2167],
  "Blida": [36.4167, 2.8333],
  "Bouira": [36.3667, 3.9000],
  "Tamanrasset": [22.7850, 5.5228],
  "Tébessa": [35.4000, 8.1167],
  "Tlemcen": [34.8783, -1.3150],
  "Tiaret": [35.3667, 1.3167],
  "Tizi Ouzou": [36.7167, 4.0500],
  "Alger": [36.7538, 3.0588],
  "Djelfa": [34.6667, 3.2667],
  "Jijel": [36.8167, 5.7667],
  "Sétif": [36.1833, 5.4167],
  "Saïda": [35.2667, 0.6333],
  "Skikda": [36.8667, 6.9167],
  "Sidi Bel Abbès": [35.1833, -0.6500],
  "Annaba": [36.9000, 7.7600],
  "Guelma": [36.4667, 7.4333],
  "Constantine": [36.3650, 6.6147],
  "Médéa": [36.3833, 2.7500],
  "Mostaganem": [35.9333, 0.0833],
  "M'Sila": [35.6833, 4.5333],
  "Mascara": [35.3833, -0.1333],
  "Ouargla": [31.9500, 5.3267],
  "Oran": [35.7425, -0.6417],
  "El Bayadh": [33.6833, 1.0000],
  "Illizi": [26.5000, 8.5000],
  "Bordj Bou Arréridj": [35.8500, 4.7667],
  "Ouled Djellal": [33.3333, 4.3333],
  "Khenchela": [35.4333, 7.1500],
  "Souk Ahras": [35.8167, 7.8667],
  "Mila": [36.4500, 6.2500],
  "Ain Defla": [36.2667, 1.9667],
  "Relizane": [35.7333, 0.5167],
  "El Tarf": [36.7333, 8.3167],
  "Tissemassilt": [34.9667, 0.4000],
  "Ghardaïa": [32.4833, 3.8667],
  "Tindouf": [27.6667, -8.0000],
  "Aïn Temouchent": [35.3000, -1.1333],
  "Naâma": [33.2667, -0.2167],
  "Muaskar": [32.8167, 0.5667],
  "El Meghaier": [31.1000, 5.5000],
  "El Menia": [30.9500, 4.3333],
  "Adrar Souttouf": [22.8000, 5.3000],
  "Foum El Gliss": [30.8333, -2.0000],
  "In Salah": [27.1833, 2.4833],
  "In Gezzam": [22.0000, 5.8000],
  "Touggourt": [33.1167, 6.0667],
  "Djanet": [24.2500, 9.4667],
  "El Oued": [33.3667, 6.6167],
  "Khemis Miliana": [36.2667, 1.8000],
  "Souk Nahr": [36.5000, 6.9000],
  "Beni Medel": [36.6667, 4.8333],
  "Draâ Ben Khedda": [36.5333, 4.6500],
  "Dellys": [36.8833, 3.9333],
  "Tipaza": [36.5833, 2.4333]
};

export default function ChoroplethMap({ data, RAW_DATA, filters }) {
  const [wilayaCases, setWilayaCases] = useState({});

  // Calculer les cas par wilaya
  useEffect(() => {
    const casesByWilaya = {};
    
    // Compter les cas pour chaque wilaya
    RAW_DATA.forEach(d => {
      const wilaya = d.wilaya;
      if (!casesByWilaya[wilaya]) {
        casesByWilaya[wilaya] = { cases: 0, records: 0 };
      }
      casesByWilaya[wilaya].cases += d.cases;
      casesByWilaya[wilaya].records += 1;
    });

    setWilayaCases(casesByWilaya);
  }, [RAW_DATA]);

  // Déterminer la couleur basée sur l'intensité
  const getColor = (casesCount) => {
    if (!casesCount || casesCount === 0) return '#f0f0f0';
    
    const max = Math.max(...Object.values(wilayaCases).map(w => w.cases || 0), 1);
    const ratio = casesCount / max;

    // Gradient : blanc -> jaune clair -> orange -> rouge foncé
    if (ratio < 0.1) return '#fffacd'; // Jaune très clair
    if (ratio < 0.2) return '#ffeed4'; // Beige
    if (ratio < 0.3) return '#ffe4b5'; // Blé
    if (ratio < 0.4) return '#ffd9a6'; // Orange clair
    if (ratio < 0.5) return '#ffcb7a'; // Orange moyen
    if (ratio < 0.6) return '#ffb84d'; // Orange
    if (ratio < 0.7) return '#ff9f1f'; // Orange vif
    if (ratio < 0.8) return '#ff8517'; // Orange-rouge
    if (ratio < 0.9) return '#f0542a'; // Orange-rouge foncé
    return '#dc2626'; // Rouge intense
  };

  if (!Object.keys(wilayaCases).length) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        borderRadius: '8px'
      }}>
        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Chargement des données de la carte...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '6px 6px 0 0',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
          Gradient d'intensité des cas par wilaya
        </div>
        <div style={{
          display: 'flex',
          gap: '2px',
          height: '20px',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          {['#fffacd', '#ffeed4', '#ffe4b5', '#ffd9a6', '#ffcb7a', '#ffb84d', '#ff9f1f', '#ff8517', '#f0542a', '#dc2626'].map((color, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: color,
                border: '1px solid rgba(0,0,0,0.1)'
              }}
              title={`${(i * 10)}% - ${(i + 1) * 10}%`}
            />
          ))}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '11px',
          color: '#6b7280'
        }}>
          <span>Faible</span>
          <span>Élevé</span>
        </div>
      </div>

      <MapContainer
        center={[28.0339, 1.6596]}
        zoom={5.5}
        style={{
          height: '500px',
          width: '100%',
          borderRadius: '0 0 6px 6px'
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Afficher les cercles pour chaque wilaya */}
        {Object.entries(WILAYA_COORDINATES).map(([wilayaName, coords]) => {
          const caseData = wilayaCases[wilayaName] || { cases: 0, records: 0 };
          const fillColor = getColor(caseData.cases);
          const max = Math.max(...Object.values(wilayaCases).map(w => w.cases || 0), 1);
          
          return (
            <CircleMarker
              key={wilayaName}
              center={coords}
              radius={8} // Rayon en pixels pour le marqueur
              pathOptions={{
                color: '#fff',
                weight: 2,
                opacity: 1,
                fill: true,
                fillColor: fillColor,
                fillOpacity: 0.7
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{wilayaName}</div>
              </Tooltip>
              <Popup>
                <div style={{ fontFamily: 'Arial, sans-serif', width: '220px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '14px' }}>{wilayaName}</h3>
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                    <div style={{ margin: '5px 0', fontSize: '12px' }}>
                      <span style={{ color: '#6b7280' }}>Cas détectés:</span>
                      <span style={{ fontWeight: 'bold', color: '#dc2626', marginLeft: '5px' }}>
                        {caseData.cases.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div style={{ margin: '5px 0', fontSize: '12px' }}>
                      <span style={{ color: '#6b7280' }}>Enregistrements:</span>
                      <span style={{ fontWeight: 'bold', marginLeft: '5px' }}>{caseData.records}</span>
                    </div>
                    <div style={{ margin: '8px 0 0 0', padding: '8px 0 0 0', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        Intensité: <span style={{ fontWeight: 'bold', color: fillColor }}>
                          {((caseData.cases / max) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{
                        marginTop: '5px',
                        height: '6px',
                        background: '#e5e7eb',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          background: fillColor,
                          width: ((caseData.cases / max) * 100) + '%'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: '#f0fdf4',
        borderRadius: '6px',
        borderLeft: '4px solid #059669',
        fontSize: '12px',
        color: '#166534'
      }}>
        <strong>Conseil :</strong> Survolez les marqueurs pour voir le nom de la wilaya. Cliquez pour afficher les
        détails complets : nombre de cas, intensité relative, et répartition.
      </div>
    </div>
  );
}
