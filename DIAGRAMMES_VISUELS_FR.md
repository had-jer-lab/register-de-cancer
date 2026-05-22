# 📊 Diagrammes Visuels : Du Concept à l'Application

## 1. Architecture Générale du Système

```
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION WEB                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         FRONTEND (React + Leaflet)                    │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ StatisticsPage / DashboardPage                │  │   │
│  │  │                                                │  │   │
│  │  │  ┌──────────────────────────────────────────┐ │  │   │
│  │  │  │ WilayaMap Component                     │ │  │   │
│  │  │  │ ├─ MapContainer (Leaflet)              │ │  │   │
│  │  │  │ ├─ GeoJSON Layer (Wilayas 58 régions) │ │  │   │
│  │  │  │ ├─ CircleMarker Layer (Drill-down)    │ │  │   │
│  │  │  │ └─ Legend + Popups                     │ │  │   │
│  │  │  └──────────────────────────────────────────┘ │  │   │
│  │  │                                                │  │   │
│  │  │  ┌──────────────────────────────────────────┐ │  │   │
│  │  │  │ useGeographicStats = Hook                │ │  │   │
│  │  │  │ ├─ Charger GeoJSON wilayas             │ │  │   │
│  │  │  │ ├─ Charger GeoJSON daïras             │ │  │   │
│  │  │  │ ├─ Appeler API backend                │ │  │   │
│  │  │  │ ├─ Retourner data + geoJsons         │ │  │   │
│  │  │  │ └─ Fallback Mock si API échoue       │ │  │   │
│  │  │  └──────────────────────────────────────────┘ │  │   │
│  │  │                                                │  │   │
│  │  │  ┌──────────────────────────────────────────┐ │  │   │
│  │  │  │ enrichGeoJsonWithStats = Fonction        │ │  │   │
│  │  │  │ ├─ Fusionner GeoJSON + Stats            │ │  │   │
│  │  │  │ ├─ Ajouter cases, percentage, etc       │ │  │   │
│  │  │  │ └─ Retourner GeoJSON enrichi           │ │  │   │
│  │  │  └──────────────────────────────────────────┘ │  │   │
│  │  │                                                │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                     PUBLIC FILES                             │
│  ├─ /geojson/algeria-wilayas.geojson (58 polygones)        │
│  └─ /geojson/algeria-dairat.geojson (1500+ polygones)      │
├─────────────────────────────────────────────────────────────┤
│                  BACKEND (Django + API)                      │
│                                                               │
│  GET /api/statistics/geographic/                            │
│  ├─ Query Patient table par wilaya                         │
│  ├─ Count cases par wilaya                                 │
│  ├─ Count cases par daïra                                  │
│  ├─ Analyser facteurs de risque                            │
│  └─ Retourner JSON structuré                               │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│              BASE DE DONNÉES (SQLite)                        │
│                                                               │
│  Patient Table:                                             │
│  ├─ id, name, gender, age                                 │
│  ├─ wilaya_code, daira_code                               │
│  ├─ cancer_type, risk_factor                              │
│  └─ ...                                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Flux de Données (Cycle de Vie Complet)

```
INITIALISATION
│
├─ React monta le composant WilayaMap
│  │
│  └─ useEffect déclenché
│     │
│     ├─ Charger GeoJSON wilayas depuis /geojson/...
│     ├─ Charger GeoJSON daïras depuis /geojson/...
│     └─ Appeler API GET /api/statistics/geographic/
│        │
│        ├─ Si API OK ✅ → setData(response.data.wilayas)
│        └─ Si API échoue ❌ → setData(MOCK_DATA)
│
ENRICHISSEMENT
│
├─ useMemo détecte changement: geoJsonWilayas OU data
│  │
│  └─ Exécute enrichGeoJsonWithStats()
│     │
│     ├─ For each feature dans GeoJSON
│     │  │
│     │  ├─ Extraire ID du GeoJSON (ex: feature.properties.id = "16")
│     │  ├─ Chercher correspondance dans data (ex: data.find(w => w.code == "16"))
│     │  └─ Fusionner: feature.properties.cases = 654321
│     │
│     └─ Retourner GeoJSON enrichi
│
AFFICHAGE
│
├─ <GeoJSON data={enrichedGeoJson} style={wilayaStyle} />
│  │
│  └─ Pour chaque polygon:
│     │
│     ├─ getColorByCount(feature.properties.cases)
│     │  └─ Retourne couleur: #4ade80 (vert) → #7f1d1d (rouge)
│     │
│     ├─ Appliquer fillColor = couleur
│     ├─ Appliquer fillOpacity = 0.7
│     ├─ Créer popup au clic
│     └─ Afficher sur la carte
│
INTERACTION UTILISATEUR
│
├─ Utilisateur clique sur wilaya Alger (polygon rouge)
│  │
│  ├─ Événement "click" déclenché
│  ├─ onWilayaClick(feature) → onCircleClick("16")
│  │
│  └─ handleWilayaClick():
│     │
│     ├─ setSelectedWilaya({code: "16", name: "Alger", ...})
│     ├─ setActiveLayer("dairat")
│     │
│     └─ mapRef.current.flyToBounds(wilayaBounds, {
│           padding: [40, 40],
│           duration: 1.2 seconds
│        })
│
DRILL-DOWN
│
├─ Vue change: activeLayer = "dairat"
│  │
│  └─ Composant re-render:
│     │
│     ├─ Masquer GeoJSON des wilayas
│     ├─ Filtrer GeoJSON daïras: only wilaya_code == "16"
│     ├─ Afficher polygones daïras
│     ├─ Afficher cercles daïras avec stats
│     │
│     └─ Bouton "← Alger" apparaît en haut à gauche
│
RETOUR
│
├─ Utilisateur clique "← Alger"
│  │
│  └─ handleBackClick():
│     │
│     ├─ setActiveLayer("wilayas")
│     ├─ setSelectedWilaya(null)
│     │
│     └─ mapRef.current.flyTo([28.0339, 1.6596], 5, {
│           duration: 1.2 seconds
│        })
│
└─ Vue retourne à wilayas colorées
```

---

## 3. Structure GeoJSON Avant et Après Enrichissement

### AVANT (GeoJSON brut d'Overpass):

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "3714029",
        "name": "Alger",
        "admin_level": 4,
        "boundary": "administrative"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [3.058821, 36.737324],
          [3.103921, 36.703241],
          ...3000 coordonnées...
        ]]
      }
    }
  ]
}
```

### APRÈS (enrichi avec stats):

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "3714029",
        "name": "Alger",
        "admin_level": 4,
        "boundary": "administrative",
        
        // ← AJOUTS ENRICHISSEMENT
        "cases": 654321,
        "percentage": 19.5,
        "risk_factors": {
          "eau": 245,
          "pollution": 512,
          "tabac": 678,
          "soleil": 234,
          "heredite": 523
        },
        "dairat": [
          {
            "code": "1601",
            "name": "Alger Centre",
            "cases": 123456
          },
          {
            "code": "1602",
            "name": "Sidi M'Hamed",
            "cases": 87654
          }
        ]
      },
      "geometry": { ...même polygon... }
    }
  ]
}
```

---

## 4. Mapping des Codes Wilayas Standard

```
┌─────────────────────────────────────────────────┐
│    Code ↔ Wilaya Correspondence Table           │
├──────┬─────────────────────────────────────────┤
│ Code │ Wilaya          │ Latitude │ Longitude  │
├──────┼─────────────────┼──────────┼────────────┤
│  01  │ Adrar           │ 27.88    │ -0.29     │
│  02  │ Chlef           │ 36.17    │ 1.34      │
│  03  │ Laghouat        │ 33.80    │ 2.87      │
│  04  │ Oum El Bouaghi  │ 35.87    │ 4.29      │
│  05  │ Batna           │ 35.57    │ 5.21      │
│  06  │ Béjaïa          │ 36.73    │ 5.06      │
│  07  │ Biskra          │ 34.82    │ 5.73      │
│  08  │ Béchar          │ 31.63    │ -2.23     │
│  09  │ Tlemcen         │ 35.30    │ -0.98     │
│  10  │ Tiaret          │ 35.38    │ 1.31      │
│  11  │ Tizi Ouzou      │ 36.72    │ 4.04      │
│  12  │ Alger           │ 36.78    │ 3.06      │
│ ...  │ ...             │ ...      │ ...       │
│  58  │ Sidi Okba       │ 33.20    │ 4.50      │
└──────┴─────────────────┴──────────┴────────────┘

Note: Le code Alger peut être 12 ou 16 selon la source
      Utilisez le code de votre table Patient dans la BD
```

---

## 5. Types de Géométries GeoJSON Utilisées

```
POLYGONS (pour les wilayas et daïras)

    ╔═══════════╗
    ║           ║
    ║  WILAYA   ║  coordinates: [
    ║           ║    [[long1, lat1], [long2, lat2], ..., [long1, lat1]]
    ║           ║  ]
    ╚═══════════╝


MULTIPOLYGONS (pour les wilayas avec îles/enclaves)

    ┌─────┐     ┌───────────┐
    │île 1│     │  Poly 1   │  coordinates: [
    └─────┘     │           │    [[...], [...], ...],  ← Polymère 1
                └───────────┘    [[...], [...], ...],  ← Polygone 2
                                 ...
                               ]


POINTS (pour les centroïdes)

       •          coordinates: [longitude, latitude]
      /|\         Important: Overpass retourne [lng, lat]
     / | \        Mais Leaflet veut [lat, lng] donc swap!
```

---

## 6. Cycle de Coloration sur la Carte

```
Cases Statistique
       │
       ├─ 0      → getColorByCount(0)     → #d4d4d8 (gris)     [NO DATA]
       │
       ├─ 5      → getColorByCount(5)     → #4ade80 (vert)     [FAIBLE]
       │
       ├─ 15     → getColorByCount(15)    → #fbbf24 (jaune)    [MOYEN]
       │
       ├─ 35     → getColorByCount(35)    → #fb923c (orange)   [ÉLEVÉ]
       │
       ├─ 75     → getColorByCount(75)    → #dc2626 (rouge)    [TRÈS ÉLEVÉ]
       │
       └─ 200    → getColorByCount(200)   → #7f1d1d (rouge foncé) [CRITIQUE]

Visual Legend:
    🟩 0-10        Cases faibles
    🟨 11-20       Cases modérés
    🟧 21-50       Cases importants
    🟥 51-100      Cases très importants
    🟥 >100        Cases critiques
```

---

## 7. Interaction Utilisateur : Drill-Down et Navigation

```
ÉTAT INITIAL
│
│   Wilaya View
│   ┌──────────────────────────────┐
│   │  Alger (rouge)               │  ← 654K cas
│   │                              │
│   │  Oran (orange)               │  ← 389K cas
│   │                              │
│   │  Constantine (jaune)         │  ← 445K cas
│   └──────────────────────────────┘
│   [Légende]
│
│   UTILISATEUR CLIQUE ALGER ↓
│
DRILL-DOWN
│
│   Daïra View (Alger)
│   ┌──────────────────────────────┐
│   || ← Alger                      │  Back Button
│   │                              │
│   │  Alger Centre (rouge)        │  ← 123K cas
│   │                              │
│   │  Sidi M'Hamed (orange)       │  ← 87K cas
│   │                              │
│   │  Ben Aknoun (jaune)          │  ← 45K cas
│   └──────────────────────────────┘
│   [Légende]
│
│   UTILISATEUR CLIQUE "← Alger" ↓
│
RETOUR AU DÉBUT
│
   (Same as initial)
```

---

## 8. Tableau Comparatif: Overpass vs QGIS vs GeoJSON.io

```
┌─────────────────┬───────────────┬────────────┬──────────────┐
│ Critère         │ Overpass Turbo│ QGIS       │ GeoJSON.io   │
├─────────────────┼───────────────┼────────────┼──────────────┤
│ Installation    │ Aucune ✅     │ 200 MB ❌  │ Aucune ✅    │
│ Temps setup     │ 30 sec        │ 10 min     │ 1 min        │
│ Courbe apprenti │ Facile ✅     │ Moyen      │ Très facile  │
│ Données qualité │ Excellent     │ Excellent  │ Limité       │
│ Édition avancée │ Non           │ Oui ✅     │ Oui (simple) │
│ Données perso   │ Non           │ Oui ✅     │ Oui (simple) │
│ Export GeoJSON  │ Oui ✅        │ Oui ✅     │ Oui ✅       │
│ Gratuit         │ Oui ✅        │ Oui ✅     │ Oui ✅       │
├─────────────────┼───────────────┼────────────┼──────────────┤
│ RECOMMANDATION  │ ⭐ MEILLEUR   │ ⭐ Complet │ ⭐ Simple    │
│ POUR PROJET     │ POUR DÉPART   │ POUR AVANCÉ│ TEST RAPIDE  │
└─────────────────┴───────────────┴────────────┴──────────────┘
```

---

## 9. Requête Overpass et Résultat

```
INPUT (Requête):
[bbox:20.0628,0.662444,37.0931,8.668589];
(
  relation["boundary"="administrative"]["admin_level"="4"];
);
out body geom;

PROCESS (Overpass API):
1. Définer boîte limites Algérie
2. Chercher toutes relations OSM
3. Filtrer: boundary=administrative ET admin_level=4 (wilayas)
4. Récupérer géométries et corps

OUTPUT (GeoJSON):
{
  "version": 0.6,
  "generator": "Overpass API",
  "elements": [
    {
      "type": "relation",
      "id": 3714029,
      "members": [...],
      "tags": {
        "name": "Alger",
        "admin_level": "4",
        "boundary": "administrative"
      }
    }
  ]
}

CONVERT to GeoJSON:
Cliquez "Export" → "GeoJSON" → Téléchargez
```

---

## 10. Stack Technologique Complet

```
┌─────────────────────────────────────────────────────────┐
│                 WEB APPLICATION STACK                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ CLIENT (Browser)                                 │   │
│  │ ├─ React 19.2                  [UI Framework]   │   │
│  │ ├─ react-leaflet 5.0           [Map Component] │   │
│  │ ├─ Leaflet.js 1.9.4            [Map Library]   │   │
│  │ ├─ Tailwind CSS 4.1            [Styling]       │   │
│  │ ├─ lucide-react 0.5            [Icons]         │   │
│  │ └─ Axios 1.13.6                [HTTP Client]   │   │
│  └──────────────────────────────────────────────────┘   │
│                      ↕ HTTP/REST                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ SERVER (Django Backend)                          │   │
│  │ ├─ Django 4+                   [Web Framework] │   │
│  │ ├─ Django REST Framework       [API]            │   │
│  │ ├─ PostgreSQL/SQLite           [Database]       │   │
│  │ └─ Django Q Objects            [Queries]        │   │
│  └──────────────────────────────────────────────────┘   │
│                      ↕ File System                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ DATA LAYER                                       │   │
│  │ ├─ public/geojson/*.geojson    [Map Data]      │   │
│  │ ├─ SQLite/PostgreSQL database  [Patient Data]  │   │
│  │ └─ Server static files         [Assets]        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘

Dependencies Installation:
npm install (Frontend)
pip install -r requirements.txt (Backend)
```

---

## 11. Checklist Visuelle: Progression

```
SEMAINE 1 : DATA SETUP
├─ ☐ Télécharger GeoJSON Overpass        [5 min]
├─ ☐ Placer dans frontend/public/geojson [1 min]
├─ ☐ Vérifier fichiers               [2 min]
└─ ✅ STATUS: GeoJSON Ready

SEMAINE 1 : FRONTEND
├─ ✅ WilayaMap.jsx DÉJÀ CRÉÉ
├─ ✅ useGeographicStats.js DÉJÀ CRÉÉ
├─ ✅ mapColors.js DÉJÀ CRÉÉ
├─ ✅ npm start fonctionne
└─ ✅ STATUS: Frontend Ready

SEMAINE 2 : BACKEND
├─ ☐ Créer /api/statistics/geographic/
├─ ☐ Query Patient par wilaya
├─ ☐ Tester l'endpoint
└─ ⏳ STATUS: In Progress

SEMAINE 2 : INTÉGRATION
├─ ☐ Connecter Frontend → Backend
├─ ☐ Vérifier les couleurs changent
├─ ☐ Tester drill-down
└─ ⏳ STATUS: Final Testing

TOTAL TIME: 2-3 semaines pour un projet complet
```

---

Vous avez maintenant une compréhension complète du système! 🎓
