# 🔗 Aide-Mémoire : Liaison Données-Géométrie

## Architecture complète : Données → GeoJSON → Leaflet

```
Backend (Django)
      ↓
  API JSON
      ↓
  useGeographicStats Hook
      ↓
  enrichGeoJsonWithStats()
      ↓
  GeoJSON enrichi avec stats
      ↓
  <GeoJSON /> (Leaflet)
      ↓
  Carte colorée + Popups
```

---

## 1️⃣ STRUCTURE DES DONNÉES BACKEND

### Endpoint Django : `/api/statistics/geographic/`

```python
# backend/statistic/views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Count, Q
from patients.models import Patient

@api_view(['GET'])
def geographic_statistics(request):
    """
    GET /api/statistics/geographic/
    
    Optinal params:
    - wilaya_code: Filtrer par wilaya (ex: ?wilaya_code=16)
    - year: Filtrer par année (ex: ?year=2024)
    """
    
    # Compter par wilaya
    wilaya_stats = Patient.objects.values(
        'wilaya__code',
        'wilaya__name'
    ).annotate(
        cases=Count('id')
    ).order_by('-cases')
    
    total_cases = Patient.objects.count()
    
    data = {
        'total_cases': total_cases,
        'total_wilayas': wilaya_stats.count(),
        'wilayas': []
    }
    
    for w in wilaya_stats:
        wilaya_code = w['wilaya__code']
        
        # Compter par daïra
        dairat_stats = Patient.objects.filter(
            wilaya__code=wilaya_code
        ).values(
            'daira__code',
            'daira__name'
        ).annotate(
            cases=Count('id')
        ).order_by('-cases')
        
        # Compter les facteurs de risque
        risk_data = Patient.objects.filter(
            wilaya__code=wilaya_code
        ).values('risk_factor').annotate(count=Count('id'))
        
        risk_factors = {r['risk_factor']: r['count'] for r in risk_data}
        
        # Ajouter les types de cancer
        cancer_types = Patient.objects.filter(
            wilaya__code=wilaya_code
        ).values('cancer_type').annotate(count=Count('id'))
        
        data['wilayas'].append({
            'code': wilaya_code,
            'name': w['wilaya__name'],
            'cases': w['cases'],
            'percentage': round((w['cases'] / total_cases * 100), 1),
            'dairat': [
                {
                    'code': d['daira__code'],
                    'name': d['daira__name'],
                    'cases': d['cases'],
                    'percentage': round((d['cases'] / w['cases'] * 100), 1)
                }
                for d in dairat_stats
            ],
            'risk_factors': risk_factors,
            'cancer_types': {c['cancer_type']: c['count'] for c in cancer_types},
            'demographics': {
                'males': Patient.objects.filter(
                    wilaya__code=wilaya_code,
                    gender='M'
                ).count(),
                'females': Patient.objects.filter(
                    wilaya__code=wilaya_code,
                    gender='F'
                ).count()
            }
        })
    
    return Response(data)
```

### Response JSON attendue :

```json
{
  "total_cases": 3364164,
  "total_wilayas": 58,
  "wilayas": [
    {
      "code": "16",
      "name": "Alger",
      "cases": 654321,
      "percentage": 19.5,
      "dairat": [
        {
          "code": "1601",
          "name": "Alger Centre",
          "cases": 123456,
          "percentage": 18.9
        },
        {
          "code": "1602",
          "name": "Sidi M'Hamed",
          "cases": 87654,
          "percentage": 13.4
        }
      ],
      "risk_factors": {
        "eau": 245,
        "pollution": 512,
        "tabac": 678,
        "soleil": 234,
        "heredite": 523
      },
      "cancer_types": {
        "sein": 234,
        "prostate": 189,
        "poumon": 145
      },
      "demographics": {
        "males": 345678,
        "females": 308643
      }
    }
  ]
}
```

---

## 2️⃣ HOOK REACT : FUSIONNER LES DONNÉES

### Fichier : `src/hooks/useGeographicStats.js`

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useGeographicStats = (filters = {}) => {
  const [data, setData] = useState([]);
  const [geoJsonWilayas, setGeoJsonWilayas] = useState(null);
  const [geoJsonDairat, setGeoJsonDairat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les fichiers GeoJSON (statique, une fois)
  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        // Wilayas
        const wiRes = await fetch('/geojson/algeria-wilayas.geojson');
        const wiData = await wiRes.json();
        setGeoJsonWilayas(wiData);

        // Daïras
        const daRes = await fetch('/geojson/algeria-dairat.geojson');
        const daData = await daRes.json();
        setGeoJsonDairat(daData);
      } catch (err) {
        console.error('Erreur chargement GeoJSON:', err);
      }
    };

    loadGeoJson();
  }, []);

  // Charger les statistiques du backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/api/statistics/geographic/', {
          params: filters,
          timeout: 10000
        });

        setData(response.data.wilayas || []);
      } catch (err) {
        console.error('Erreur API:', err);
        setError(err.message);
        // FALLBACK: charger les données mock
        setData(loadMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [filters]);

  return {
    data,                      // Stats du backend
    geoJsonWilayas,            // GeoJSON wilayas
    geoJsonDairat,             // GeoJSON daïras
    loading,
    error
  };
};

// Données de secours
function loadMockData() {
  return [
    {
      code: '16',
      name: 'Alger',
      cases: 654321,
      percentage: 19.5,
      dairat: [
        { code: '1601', name: 'Alger Centre', cases: 123456 }
      ]
    }
    // ... plus de wilayas
  ];
}
```

---

## 3️⃣ FONCTION ENRICHISSEMENT : LIER LES DONNÉES

### Fichier : `src/utils/dataMapper.js`

```javascript
/**
 * Enrichit un GeoJSON avec les données statistiques
 * 
 * Avant :
 * {
 *   type: "Feature",
 *   geometry: {...},
 *   properties: { name: "Alger", id: "1", ... }
 * }
 * 
 * Après :
 * {
 *   type: "Feature",
 *   geometry: {...},
 *   properties: { 
 *     name: "Alger",
 *     id: "1",
 *     cases: 654321,          ← AJOUTÉ
 *     percentage: 19.5,       ← AJOUTÉ
 *     risk_factors: {...},    ← AJOUTÉ
 *     dairat: [...]          ← AJOUTÉ
 *   }
 * }
 */
export const enrichGeoJsonWithStats = (
  geoJsonData,
  statisticsData,
  matchKey = {
    geo: 'id',      // Colonne du GeoJSON à matcher
    stats: 'code'   // Colonne des stats à matcher
  }
) => {
  if (!geoJsonData || !statisticsData) return geoJsonData;

  return {
    ...geoJsonData,
    features: geoJsonData.features.map(feature => {
      const geoValue = feature.properties[matchKey.geo];
      
      // Chercher la correspondance dans les stats
      const statsRecord = statisticsData.find(stat => 
        stat[matchKey.stats] === geoValue ||
        stat[matchKey.stats] === String(geoValue) ||
        stat.name?.toLowerCase() === feature.properties.name?.toLowerCase()
      );

      // Fusionner
      return {
        ...feature,
        properties: {
          ...feature.properties,
          cases: statsRecord?.cases || 0,
          percentage: statsRecord?.percentage || 0,
          risk_factors: statsRecord?.risk_factors || {},
          dairat: statsRecord?.dairat || [],
          cancer_types: statsRecord?.cancer_types || {},
          _matched: !!statsRecord  // Debug
        }
      };
    })
  };
};

/**
 * Détermine la couleur en fonction du nombre de cas
 */
export const getColorByCount = (cases) => {
  if (cases === 0) return '#d4d4d8';      // Gris
  if (cases <= 10) return '#4ade80';      // Vert
  if (cases <= 20) return '#fbbf24';      // Jaune
  if (cases <= 50) return '#fb923c';      // Orange
  if (cases <= 100) return '#dc2626';     // Rouge
  return '#7f1d1d';                       // Rouge très foncé
};

/**
 * Calcule le centroïde d'une feature (utile pour les cercles)
 */
export const getCentroid = (feature) => {
  if (feature.geometry.type === 'Point') {
    const [lng, lat] = feature.geometry.coordinates;
    return [lat, lng];  // Leaflet = [lat, lng]
  }

  const coords = feature.geometry.coordinates[0] || 
                 feature.geometry.coordinates;
  
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

  coords.flat(Infinity).forEach((val, idx) => {
    if (idx % 2 === 0) { // lng
      minLng = Math.min(minLng, val);
      maxLng = Math.max(maxLng, val);
    } else { // lat
      minLat = Math.min(minLat, val);
      maxLat = Math.max(maxLat, val);
    }
  });

  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
};
```

---

## 4️⃣ COMPOSANT CARTE : AFFICHER

### Fichier : `src/components/statistics/WilayaMap.jsx` (SIMPLIFIÉ)

```javascript
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import { useGeographicStats } from '../../hooks/useGeographicStats';
import { enrichGeoJsonWithStats, getColorByCount } from '../../utils/dataMapper';

export const WilayaMap = ({ filters = {} }) => {
  // 1. Charger les données + GeoJSON
  const { data, geoJsonWilayas, loading } = useGeographicStats(filters);

  // 2. Enrichir le GeoJSON avec les statistiques
  const enrichedGeoJson = useMemo(() => {
    return enrichGeoJsonWithStats(geoJsonWilayas, data, {
      geo: 'id',
      stats: 'code'
    });
  }, [geoJsonWilayas, data]);

  // 3. Fonction de style
  const wilayaStyle = (feature) => ({
    fillColor: getColorByCount(feature.properties.cases || 0),
    weight: 2,
    opacity: 0.8,
    color: '#666',
    fillOpacity: 0.7
  });

  // 4. Fonction pour chaque feature
  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const popup = `
      <div style="font-family: Arial; font-size: 12px;">
        <strong>${props.name}</strong><br/>
        <strong>Cas:</strong> ${props.cases?.toLocaleString() || 0}<br/>
        <strong>% Total:</strong> ${props.percentage?.toFixed(1) || 0}%<br/>
        <hr style="margin: 5px 0;"/>
        <strong>Facteurs de risque:</strong><br/>
        ${Object.entries(props.risk_factors || {})
          .map(([key, val]) => `${key}: ${val}`)
          .join('<br/>')}
      </div>
    `;
    layer.bindPopup(popup);
  };

  if (loading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="relative w-full h-96 rounded-lg border overflow-hidden">
      <MapContainer
        center={[28.0339, 1.6596]}
        zoom={5}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />
        
        {enrichedGeoJson && (
          <GeoJSON
            data={enrichedGeoJson}
            style={wilayaStyle}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* Légende */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded shadow">
        <div className="text-sm font-bold mb-2">Cas de cancer</div>
        <div className="text-xs space-y-1">
          <div>🟢 0-10</div>
          <div>🟡 11-20</div>
          <div>🟠 21-50</div>
          <div>🔴 51-100</div>
          <div>🟥 >100</div>
        </div>
      </div>
    </div>
  );
};
```

---

## 5️⃣ EXEMPLE D'UTILISATION COMPLÈTE

### Dans votre page Stats :

```javascript
import { WilayaMap } from '../components/statistics/WilayaMap';
import { useGeographicStats } from '../hooks/useGeographicStats';

export default function StatisticsPage() {
  const [filters, setFilters] = useState({});
  const { data, loading, error } = useGeographicStats(filters);

  // Options de filtrage
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Statistiques par Région</h1>

      {/* Filtres */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <button
          onClick={() => handleFilterChange({ year: 2024 })}
          className="mr-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          2024
        </button>
        <button
          onClick={() => handleFilterChange({ year: 2023 })}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          2023
        </button>
      </div>

      {/* Cartes et stats */}
      {loading ? (
        <p>Chargement des données...</p>
      ) : error ? (
        <p className="text-red-500">Erreur: {error}</p>
      ) : (
        <>
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-100 p-4 rounded">
              <p className="text-sm text-gray-600">Total cas</p>
              <p className="text-2xl font-bold">
                {data.reduce((sum, w) => sum + (w.cases || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-green-100 p-4 rounded">
              <p className="text-sm text-gray-600">Wilayas</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <div className="bg-orange-100 p-4 rounded">
              <p className="text-sm text-gray-600">Wilaya top</p>
              <p className="text-2xl font-bold">
                {data[0]?.name} ({data[0]?.cases})
              </p>
            </div>
          </div>

          {/* Carte */}
          <WilayaMap filters={filters} />

          {/* Tableau détaillé */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Wilaya</th>
                  <th className="border p-2 text-right">Cas</th>
                  <th className="border p-2 text-right">%</th>
                  <th className="border p-2 text-left">Top risque</th>
                </tr>
              </thead>
              <tbody>
                {data.map(wilaya => (
                  <tr key={wilaya.code} className="hover:bg-gray-50">
                    <td className="border p-2 font-medium">{wilaya.name}</td>
                    <td className="border p-2 text-right">
                      {wilaya.cases.toLocaleString()}
                    </td>
                    <td className="border p-2 text-right">
                      {wilaya.percentage.toFixed(1)}%
                    </td>
                    <td className="border p-2 text-sm">
                      {Object.entries(wilaya.risk_factors || {})
                        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 📊 Diagramme de flux complet

```
┌─────────────────────────────┐
│   Django Backend API        │
│   /api/statistics/geographic│
└────────────┬────────────────┘
             │ GET
             ↓
    ┌────────────────────┐
    │  useGeographicStats│ Hook React
    └────────┬───────────┘
             │
        ┌────┴─────┐
        ↓          ↓
    [Stats]   [GeoJSON]
   Backend    Files
        │          │
        └────┬─────┘
             ↓
    enrichGeoJsonWithStats()
             ↓
    [Enriched GeoJSON]
    + cases pour chaque région
             ↓
        ┌────────────────┐
        │ getColorByCount│ ← Fonction de coloration
        └────┬───────────┘
             ↓
   ┌──────────────────────┐
   │  <GeoJSON /> Leaflet │
   │  (affichage coloré)  │
   └──────────────────────┘
```

---

## 🚀 Checklist finale

- [ ] Backend retourne JSON structuré avec `code`, `name`, `cases`, `dairat`
- [ ] Hook `useGeographicStats` charge GeoJSON + données
- [ ] Fonction `enrichGeoJsonWithStats` fusionne correctement
- [ ] Champ `geo: 'id'` et `stats: 'code'` s'alignent
- [ ] Couleurs appliquées selon `getColorByCount`
- [ ] Popups affichent les infos enrichies
- [ ] Pas d'erreurs console 

C'est prêt! 🎉
