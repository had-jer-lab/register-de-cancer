# Guide Complet : QGIS → GeoJSON → React Leaflet

## 📍 PARTIE 1 : TÉLÉCHARGER ET INSTALLER QGIS

### Étape 1 : Installation
1. Visitez [qgis.org](https://qgis.org)
2. Téléchargez QGIS (version stable recommandée : 3.36+)
3. Installez avec les options par défaut
4. Lancez QGIS

### Étape 2 : Configuration initiale
- Laissez le système de coordonnées par défaut (peut être changé plus tard)
- Vous verrez une zone blanche = la toile vierge de travail

---

## 📥 PARTIE 2 : RÉCUPÉRER LES DONNÉES GÉOGRAPHIQUES

### Option A : Données officielles algériennes (RECOMMANDÉ)

**Sources fiables :**
1. **OpenStreetMap (OSM)**
   - Site : [openstreetmap.org](https://www.openstreetmap.org)
   - Gratuit et précis
   - Couvre toute l'Algérie

2. **Overpass API** (extraction OSM)
   - Site : [overpass-turbo.eu](https://overpass-turbo.eu)
   - Exporte directement en GeoJSON
   - Cherchez: `[name="Algeria"][admin_level=4]` (wilayas)

3. **Natural Earth Data**
   - Site : [naturalearthdata.com](https://www.naturalearthdata.com)
   - Données géopolitiques mondiales
   - Téléchargez "Admin level 1" pour les régions

### Option B : Utiliser Overpass Turbo (PLUS RAPIDE)

**Étapes :**

```
1. Allez sur https://overpass-turbo.eu
2. Zoomez sur l'Algérie
3. Exécutez cette requête pour les WILAYAS :

[bbox:20.0628,0.662444,37.0931,8.668589];
(
  relation["boundary"="administrative"]["admin_level"="4"];
);
out body geom;

4. Exécutez cette requête pour les DAÏRAS :

[bbox:20.0628,0.662444,37.0931,8.668589];
(
  relation["boundary"="administrative"]["admin_level"="5"];
);
out body geom;

5. Cliquez sur "Exporter" → "GeoJSON"
6. Sauvegardez les fichiers
```

### Option C : Utiliser QGIS + OSM

**Étapes :**

```
1. Dans QGIS : Menu → Layer → Add Layer → Add Vector Layer
2. Protocole : Browser
3. Expansion XYZ Tiles → OpenStreetMap
4. Double-cliquez pour ajouter la couche de base
5. Menu → Vector → Download OpenStreetMap Data
   - Utilisez Overpass pour télécharger les limites administratives
```

---

## 🗺️ PARTIE 3 : CRÉER LA CARTE DANS QGIS

### Étape 1 : Ajouter les données GeoJSON

```
Menu → Layer → Add Layer → Add Vector Layer
→ File → Sélectionnez votre GeoJSON des wilayas
Répétez pour les daïras
```

### Étape 2 : Vérifier les données

```
1. Double-cliquez sur la couche (gauche)
2. Onglet "Attributes"
3. Vérifiez les colonnes : id, name, admin_level, etc.
4. Remarquez la colonne "name" = nom de la wilaya/daïra
```

### Étape 3 : Styliser les wilayas

```
1. Clic droit sur la couche wilayas → Properties
2. Onglet "Symbology"
3. Sélectionnez "Categorized" ou "Graduated"
4. Column : "name" (ou votre colonne d'identification)
5. Color ramp : choisissez un gradient
6. Classification : "Natural Breaks" ou "Quantiles"
7. Appliquez
```

### Étape 4 : Ajouter les étiquettes (noms)

```
1. Clic droit sur la couche → Properties
2. Onglet "Labels"
3. Label with : [name] ou [admin_name]
4. Personnalisez la fonte et la couleur
5. Appliquez
```

### Étape 5 : Configurer le système de coordonnées

```
IMPORTANT : Pour Leaflet, utilisez WGS84 (EPSG:4326)

1. Projet → Properties
2. Onglet "CRS"
3. Filtre : EPSG:4326
4. Sélectionnez "WGS 84"
5. Appliquez
```

---

## 💾 PARTIE 4 : EXPORTER EN GeoJSON

### Étape 1 : Exporter la couche wilayas

```
1. Clic droit sur la couche wilayas
2. Export → Save Features As...
3. Format : GeoJSON
4. Filename : algeria-wilayas.geojson
5. CRS : EPSG:4326 (très important!)
6. Encodage : UTF-8 (pour les accents)
7. Enregistrez dans : frontend/public/geojson/
```

### Étape 2 : Exporter la couche daïras

```
Répétez le processus pour les daïras
Filename : algeria-dairat.geojson
Même dossier
```

### Étape 3 : Vérifier les fichiers GeoJSON

Ouvrez le fichier dans VS Code :

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Alger",
        "id": "16",
        "admin_level": "4"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng1, lat1], [lng2, lat2], ...]]
      }
    }
  ]
}
```

**Vérifications essentielles :**
- ✅ `"type": "FeatureCollection"`
- ✅ Chaque feature a `"properties"` avec le nom et l'ID
- ✅ Les coordonnées sont en `[longitude, latitude]` (pas l'inverse!)
- ✅ Le fichier n'est pas vide
- ✅ Syntaxe JSON valide

---

## 🔗 PARTIE 5 : INTÉGRER DANS REACT + LEAFLET

### Structure des fichiers

```
frontend/
├── public/
│   └── geojson/
│       ├── algeria-wilayas.geojson
│       └── algeria-dairat.geojson
├── src/
│   ├── components/
│   │   └── statistics/
│   │       └── WilayaMap.jsx
│   ├── hooks/
│   │   └── useGeographicStats.js
│   └── utils/
│       └── mapColors.js
```

### Étape 1 : Créer le hook de données

Fichier : `src/hooks/useGeographicStats.js`

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useGeographicStats = (filters = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [geoJsonWilayas, setGeoJsonWilayas] = useState(null);
  const [geoJsonDairat, setGeoJsonDairat] = useState(null);

  // Charger les fichiers GeoJSON
  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        const wiResponse = await fetch('/geojson/algeria-wilayas.geojson');
        const wData = await wiResponse.json();
        setGeoJsonWilayas(wData);

        const daResponse = await fetch('/geojson/algeria-dairat.geojson');
        const dData = await daResponse.json();
        setGeoJsonDairat(dData);
      } catch (err) {
        console.error('Erreur chargement GeoJSON:', err);
      }
    };
    loadGeoJson();
  }, []);

  // Charger les données statistiques du backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/statistics/geographic', {
          params: filters,
          timeout: 5000
        });
        setData(response.data.wilayas || []);
        setError(null);
      } catch (err) {
        console.error('Erreur API:', err);
        setError(err.message);
        // Charger les données mock en cas d'erreur
        setData(getMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return {
    data,
    geoJsonWilayas,
    geoJsonDairat,
    loading,
    error
  };
};

// Données de démonstration
function getMockData() {
  return [
    {
      code: '16',
      name: 'Alger',
      cases: 654321,
      percentage: 19.5,
      dairat: [
        { code: '1601', name: 'Alger Centre', cases: 123456 },
        { code: '1602', name: 'Sidi M\'Hamed', cases: 87654 }
      ]
    },
    // ... autres wilayas
  ];
}
```

### Étape 2 : Créer la fonction d'association données-géométrie

Fichier : `src/utils/dataMapper.js`

```javascript
/**
 * Associe les données statistiques aux features GeoJSON
 * @param {Object} geoJsonData - Le GeoJSON original
 * @param {Array} statisticsData - Les données de cancer
 * @param {String} geoIdProperty - Propriété du GeoJSON contenant l'ID
 * @param {String} dataIdProperty - Propriété des données contenant l'ID
 * @returns {Object} GeoJSON enrichi avec les stats
 */
export const enrichGeoJsonWithStats = (
  geoJsonData,
  statisticsData,
  geoIdProperty = 'id',
  dataIdProperty = 'code'
) => {
  if (!geoJsonData || !statisticsData) return geoJsonData;

  return {
    ...geoJsonData,
    features: geoJsonData.features.map(feature => {
      const featureId = feature.properties[geoIdProperty];
      const stats = statisticsData.find(
        stat => stat[dataIdProperty] === featureId
      );

      return {
        ...feature,
        properties: {
          ...feature.properties,
          cases: stats?.cases || 0,
          percentage: stats?.percentage || 0,
          risk_factors: stats?.risk_factors || {},
          dairat: stats?.dairat || []
        }
      };
    })
  };
};

/**
 * Crée une palette de couleurs basée sur les valeurs
 */
export const getColorTier = (cases) => {
  if (cases === 0) return '#d4d4d8';
  if (cases <= 10) return '#4ade80';     // Vert
  if (cases <= 20) return '#fbbf24';     // Jaune
  if (cases <= 50) return '#fb923c';     // Orange
  if (cases <= 100) return '#dc2626';    // Rouge
  return '#7f1d1d';                       // Rouge très sombre
};

/**
 * Calcule le centroïde d'une feature
 */
export const calculateCentroid = (feature) => {
  if (feature.geometry.type === 'Point') {
    const [lng, lat] = feature.geometry.coordinates;
    return [lat, lng]; // Leaflet utilise [lat, lng]
  }

  const coordinates = feature.geometry.coordinates[0] || feature.geometry.coordinates;
  let sumLng = 0, sumLat = 0, count = 0;

  coordinates.forEach(coord => {
    if (Array.isArray(coord[0])) {
      coord.forEach(([lng, lat]) => {
        sumLng += lng;
        sumLat += lat;
        count++;
      });
    } else {
      const [lng, lat] = coord;
      sumLng += lng;
      sumLat += lat;
      count++;
    }
  });

  return [sumLat / count, sumLng / count];
};
```

### Étape 3 : Composant carte Leaflet

Fichier : `src/components/statistics/WilayaMap.jsx` (DÉJÀ CRÉÉ - voir le code fourni précédemment)

---

## 📊 PARTIE 6 : RELIER LES DONNÉES AUX RÉGIONS

### Structure des données du backend

Le backend doit retourner :

```json
{
  "total_cases": 3364164,
  "wilayas": [
    {
      "code": "16",
      "name": "Alger",
      "cases": 654321,
      "percentage": 19.5,
      "risk_factors": {
        "eau": 45,
        "pollution": 62,
        "tabac": 78,
        "soleil": 34,
        "heredite": 82
      },
      "dairat": [
        {
          "code": "1601",
          "name": "Alger Centre",
          "cases": 123456,
          "percentage": 18.9
        }
      ]
    }
  ]
}
```

### Pipeline complet (Frontend)

```javascript
// 1. Charger les GeoJSON
const { geoJsonWilayas, data } = useGeographicStats();

// 2. Enrichir les GeoJSON avec les stats
const enrichedWilayas = enrichGeoJsonWithStats(
  geoJsonWilayas,
  data,
  'id',      // Propriété dans le GeoJSON
  'code'     // Propriété dans les données
);

// 3. Calculer les centroïdes pour les cercles
const getWilayaCentroid = (feature) => {
  return calculateCentroid(feature);
};

// 4. Appliquer les couleurs
const getWilayaColor = (cases) => {
  return getColorTier(cases);
};

// 5. Afficher sur la carte Leaflet
<GeoJSON
  data={enrichedWilayas}
  style={(feature) => ({
    fillColor: getWilayaColor(feature.properties.cases),
    fillOpacity: 0.7,
    color: 'white',
    weight: 2
  })}
  onEachFeature={(feature, layer) => {
    layer.bindPopup(`
      <strong>${feature.properties.name}</strong><br/>
      Cas: ${feature.properties.cases.toLocaleString()}<br/>
      % Total: ${feature.properties.percentage.toFixed(1)}%
    `);
  }}
/>
```

---

## 🔧 PARTIE 7 : BACKEND - API STATISTIQUES

Fichier : `backend/statistic/views.py`

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Count, Sum
from patients.models import Patient
from accounts.models import User

@api_view(['GET'])
def geographic_statistics(request):
    """
    Retourne les statistiques par wilaya et daïra
    """
    
    # Compter les cas par wilaya
    wilayas_stats = Patient.objects.values(
        'wilaya__code',
        'wilaya__name'
    ).annotate(
        cases=Count('id')
    ).order_by('-cases')
    
    total_cases = Patient.objects.count()
    
    response_data = {
        'total_cases': total_cases,
        'total_wilayas': wilayas_stats.count(),
        'wilayas': []
    }
    
    for wilaya in wilayas_stats:
        # Compter les cas par daïra pour cette wilaya
        dairat_stats = Patient.objects.filter(
            wilaya__code=wilaya['wilaya__code']
        ).values(
            'daira__code',
            'daira__name'
        ).annotate(
            cases=Count('id')
        ).order_by('-cases')
        
        # Compter les facteurs de risque
        risk_factors = Patient.objects.filter(
            wilaya__code=wilaya['wilaya__code']
        ).values('risk_factor').annotate(count=Count('id'))
        
        response_data['wilayas'].append({
            'code': wilaya['wilaya__code'],
            'name': wilaya['wilaya__name'],
            'cases': wilaya['cases'],
            'percentage': round((wilaya['cases'] / total_cases) * 100, 1),
            'dairat': [
                {
                    'code': d['daira__code'],
                    'name': d['daira__name'],
                    'cases': d['cases']
                }
                for d in dairat_stats
            ],
            'risk_factors': {
                rf['risk_factor']: rf['count']
                for rf in risk_factors
            }
        })
    
    return Response(response_data)
```

Fichier : `backend/config/urls.py`

```python
urlpatterns = [
    # ... autres URLs
    path('api/statistics/geographic', views.geographic_statistics, name='geographic-stats'),
]
```

---

## ✅ CHECKLIST DE VALIDATION

- [ ] QGIS installé et fonctionnel
- [ ] GeoJSON pour wilayas téléchargé (min 48 wilayas)
- [ ] GeoJSON pour daïras téléchargé
- [ ] Système de coordonnées : EPSG:4326 ✓
- [ ] Fichiers sauvegardés en UTF-8
- [ ] Fichiers placés dans `frontend/public/geojson/`
- [ ] Composant WilayaMap.jsx créé ✓
- [ ] Hook useGeographicStats.js créé ✓
- [ ] Backend API retourne les stats ✓
- [ ] Carte affiche les wilayas colorées ✓
- [ ] Clic sur wilaya = drill-down aux daïras ✓
- [ ] Back button = retour aux wilayas ✓

---

## 📞 RESSOURCES ALTERNATIVES

**Si QGIS est trop complexe :**

1. **Overpass Turbo (le plus simple)**
   - https://overpass-turbo.eu
   - Exporte directement en GeoJSON
   - Aucune installation nécessaire

2. **GeoJSON.io**
   - https://geojson.io
   - Éditeur visuel de GeoJSON
   - Permet de modifier les données

3. **Repository GitHub official Algérie**
   - https://github.com/datasets/geo-countries
   - Données GeoJSON prêtes à l'emploi

---

## 🎓 NOTES PÉDAGOGIQUES

- **Pourquoi QGIS ?** Outil professionnel utilisé par les géographes et urbanistes
- **Pourquoi GeoJSON ?** Format standard web, compatible avec Leaflet
- **Pourquoi EPSG:4326 ?** Coordonnées GPS universelles (lon, lat)
- **Pourquoi WGS84 ?** Standard GPS international
- **Pourquoi UTF-8 ?** Support des accents français et arabes

---

Vous êtes maintenant prêts à créer les meilleures cartes géographiques pour votre système! 🗺️
