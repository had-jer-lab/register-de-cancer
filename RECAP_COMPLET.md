# 📚 RÉSUMÉ COMPLET : De QGIS aux Cartes Interactives

## 🎯 Objectif Global

Créer une application web qui affiche une **map géographique de l'Algérie** colorée selon les **statistiques de cancer** par wilaya et daïra.

---

## 📋 Les 3 Options pour Obtenir les Données Géographiques

| Option | Temps | Difficulté | Recommandé |
|--------|-------|-----------|-----------|
| **Overpass Turbo** | 5 min | Facile | ⭐⭐⭐ MEILLEUR |
| **QGIS** | 30 min | Moyen | ⭐⭐ |
| **GeoJSON.io** | 10 min | Très facile | ⭐⭐ (limité) |

---

## ⚡ PATH RAPIDE (RECOMMANDÉ) : Overpass Turbo

Si vous n'avez que 10 minutes :

### Étape 1 : Allez sur https://overpass-turbo.eu

### Étape 2 : Zoomez sur l'Algérie

### Étape 3 : Exécutez cette requête

```
[bbox:20.0628,0.662444,37.0931,8.668589];
(
  relation["boundary"="administrative"]["admin_level"="4"];
);
out body geom;
```

### Étape 4 : Cliquez "Export" → "GeoJSON"

### Étape 5 : Sauvegardez en
```
frontend/public/geojson/algeria-wilayas.geojson
```

### Étape 6 : Répétez pour les daïras (admin_level="5")

**Résultat en 10 minutes** ✅

---

## 🗺️ PATH COMPLET : Utiliser QGIS

Si vous voulez faire les choses correctement :

### 1. Installer QGIS
   - https://qgis.org
   - ~200 MB

### 2. Importer les données OSM
   - Menu → Vector → Download OpenStreetMap Data
   - Ou : Layer → Add Vector Layer → Overpass

### 3. Ajouter vos propres données
   - Connecter une table Excel de patients
   - Mapper par wilaya
   - Colorier selon les cas

### 4. Exporter en GeoJSON
   - Clic droit → Export As...
   - Format: GeoJSON
   - CRS: EPSG:4326 (très important!)
   - Encodage: UTF-8

### 5. Placer dans le projet
```
frontend/public/geojson/
```

---

## 🔗 Architecture Complète

```
1. DONNÉES GÉOGRAPHIQUES
   ↓
   Overpass Turbo OU QGIS
   ↓
   GeoJSON (58 wilayas + daïras)
   ↓

2. DONNÉES STATISTIQUES
   ↓
   Django Backend API
   ↓
   JSON: {code, name, cases, percentage, dairat: [...]}
   ↓

3. FUSION (React)
   ↓
   enrichGeoJsonWithStats()
   ↓
   GeoJSON enrichi avec stats
   ↓

4. AFFICHAGE (Leaflet)
   ↓
   Carte interactive colorée
   ↓
   Clic = Drill-down aux daïras
```

---

## 📁 Fichiers à Créer/Modifier

### Structure minimale requise :

```
frontend/
├── public/
│   └── geojson/
│       ├── algeria-wilayas.geojson    ← Créer (Overpass)
│       └── algeria-dairat.geojson     ← Créer (Overpass)
├── src/
│   ├── components/statistics/
│   │   └── WilayaMap.jsx              ✅ DÉJÀ CRÉÉ
│   ├── hooks/
│   │   └── useGeographicStats.js      ✅ DÉJÀ CRÉÉ
│   └── utils/
│       └── mapColors.js               ✅ DÉJÀ CRÉÉ
└── ...

backend/
├── statistic/
│   └── views.py                       ← Ajouter endpoint
├── config/
│   └── urls.py                        ← Enregistrer route
└── ...
```

---

## ✅ CHECKLIST D'EXÉCUTION

### Phase 1 : Données géographiques
- [ ] Aller sur https://overpass-turbo.eu (5 min)
- [ ] Télécharger wilayas GeoJSON (2 min)
- [ ] Télécharger daïras GeoJSON (2 min)
- [ ] Placer dans `frontend/public/geojson/` (1 min)
- [ ] Vérifier les fichiers (2 min)

**✅ Phase 1 complète en ~12 minutes**

### Phase 2 : Frontend
- [ ] Composants React déjà créés ✅
- [ ] Hooks prêts ✅
- [ ] Lancer `npm start`
- [ ] Vérifier la carte s'affiche

**✅ Phase 2 complète en 2 minutes**

### Phase 3 : Backend
- [ ] Créer l'endpoint `/api/statistics/geographic/`
- [ ] Retourner JSON avec: code, name, cases, dairat
- [ ] Tester avec Postman

**⏳ Phase 3 : À faire selon votre backend**

### Phase 4 : Licence
- [ ] Vérifier les attributions carte
- [ ] Crédits OpenStreetMap
- [ ] Documentation de source

---

## 💾 Template Backend (Copier-Coller)

Fichier : `backend/statistic/views.py`

```python
from django.http import JsonResponse
from django.db.models import Count
from rest_framework.decorators import api_view
from rest_framework.response import Response
from patients.models import Patient

@api_view(['GET'])
def geographic_stats(request):
    """
    GET /api/statistics/geographic/
    Retourne les stats par wilaya et daïra
    """
    try:
        total = Patient.objects.count()

        # Stats par wilaya
        wilayas = Patient.objects.values(
            'wilaya__code',
            'wilaya__name'
        ).annotate(cases=Count('id')).order_by('-cases')

        result = {'total_cases': total, 'wilayas': []}

        for w in wilayas:
            code = w['wilaya__code']

            # Stats par daïra
            dairat = Patient.objects.filter(
                wilaya__code=code
            ).values(
                'daira__code',
                'daira__name'
            ).annotate(cases=Count('id'))

            result['wilayas'].append({
                'code': code,
                'name': w['wilaya__name'],
                'cases': w['cases'],
                'percentage': round((w['cases'] / total) * 100, 1),
                'dairat': [
                    {
                        'code': d['daira__code'],
                        'name': d['daira__name'],
                        'cases': d['cases']
                    }
                    for d in dairat
                ]
            })

        return Response(result)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=500
        )
```

Fichier : `backend/config/urls.py`

```python
from django.contrib import admin
from django.urls import path, include
from statistic import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/statistics/geographic/', views.geographic_stats),
    # ... autres routes
]
```

---

## 🎨 Palettes de Couleurs Recommandées

### Option 1 : Gradient chaud (recommandé)
```
0-10:     #4ade80  (vert)
11-20:    #fbbf24  (jaune)
21-50:    #fb923c  (orange)
51-100:   #dc2626  (rouge)
>100:     #7f1d1d  (rouge foncé)
```

### Option 2 : Bleu-rouge
```
0-50:     #3b82f6  (bleu)
51-100:   #f97316  (orange)
>100:     #991b1b  (rouge foncé)
```

### Option 3 : Viridis
```
Min:      #440154  (violet)
Moyen:    #31688e  (bleu)
Max:      #fde724  (jaune)
```

---

## 🧪 Tester Localement

### 1. Démarrer le serveur dev
```bash
cd frontend
npm start
```

### 2. Ouvrir http://localhost:3000

### 3. Aller à la page Statistics

### 4. La map doit afficher :
- [ ] Wilayas colorées
- [ ] Légende en bas à droite
- [ ] Popups au clic
- [ ] Zoom smooth

### 5. Si carte vide :
```javascript
// Dans la console du navigateur:
fetch('/geojson/algeria-wilayas.geojson')
  .then(r => r.json())
  .then(d => console.log(d))
```

Devrait afficher le GeoJSON. Si erreur 404 = fichier manquant.

---

## 📦 Dépendances NPM (à installer si absent)

```bash
npm install axios leaflet react-leaflet lucide-react
```

Vous les avez déjà probablement! ✅

---

## 🔥 Optimisations Avancées

### 1. Caching des GeoJSON
```javascript
// Charger une fois et mettre en cache
const [geoCache, setGeoCache] = useState(null);

useEffect(() => {
  if (!geoCache) {
    fetch('/geojson/algeria-wilayas.geojson')
      .then(r => r.json())
      .then(d => setGeoCache(d));
  }
}, [geoCache]);
```

### 2. Clustering pour grande données
```bash
npm install leaflet.markercluster
```

### 3. Heatmap en 2d
```bash
npm install leaflet.heat
```

---

## 🎓 Concepts Clés Expliqués

**GeoJSON :** Format JSON pour données géographiques (polygones, points, etc.)

**EPSG:4326 :** Système de coordonnées global (latitude, longitude)

**Leaflet :** Librairie JavaScript pour afficher des maps interactives

**Centroïde :** Point central d'un polygone (pour placer symboles au centre)

**Drill-down :** Interaction où clic sur région A affiche détails région A

**Choropleth :** Mapa colorée selon une variable (ex: cas/million d'habitants)

---

## 📞 Ressources Principales

| Besoin | Ressource | Lien |
|--------|-----------|------|
| Données géo | Overpass Turbo | https://overpass-turbo.eu |
| Installation QGIS | QGIS Official | https://qgis.org |
| Docs Leaflet | Leaflet.js | https://leafletjs.com |
| React-Leaflet | NPM docs | https://react-leaflet.js.org |
| GeoJSON spec | RFC 7946 | https://tools.ietf.org/html/rfc7946 |

---

## 🚀 Prochaines Étapes Recommandées

### Court terme (ce week-end)
1. Télécharger GeoJSON Overpass (10 min)
2. Placer dans frontend/public/geojson/ (1 min)
3. Redémarrer React (1 min)
4. Vérifier carte affichée ✅

### Moyen terme (semaine suivante)
1. Créer l'endpoint backend stats
2. Connecter à votre base de données patients
3. Tester l'API avec Postman
4. Vérifier les couleurs changent ✅

### Long terme (après)
1. Ajouter filtres (année, type cancer, etc.)
2. Dashboard avec statistiques additionnelles
3. Export de rapports
4. Analytics/heatmaps

---

## 🆘 Troubleshooting Rapide

| Problème | Cause | Solution |
|----------|-------|----------|
| Carte vide | GeoJSON manquant | Vérifier `frontend/public/geojson/` |
| Carte grise | API pas accessible | Vérifier backend tourne |
| Coordonnées bizarres | Système de coord faux | Utiliser EPSG:4326 obligatoire |
| Erreur JSON | Fichier corrompu | Télécharger à nouveau d'Overpass |
| Pas de couleurs | Stats pas charges | Vérifier API endpoint |

---

## ✨ VOUS ÊTES PRÊTS!

**Tout ce dont vous avez besoin :**

✅ Code React/Leaflet déjà créé  
✅ Composants prêts  
✅ Hooks prêts  
✅ Guide Overpass Turbo  
✅ Template backend  
✅ Données mock pour démo  

**Il vous reste juste à :**

1. Télécharger les vrais GeoJSON (~10 min)
2. Éventuellement créer l'endpoint backend

**Bonne chance pour votre projet! 🎉**

---

## 📝 Fichiers Supplémentaires Créés Pour Vous

- `QGIS_GUIDE_FR.md` - Guide complet QGIS (70+ sections)
- `OVERPASS_TURBO_GUIDE_FR.md` - Guide rapide Overpass (le plus simple)
- `DATA_MAPPING_CHEATSHEET_FR.md` - Aide-mémoire complet avec code
- `prepare_geojson.py` - Script Python pour valider GeoJSON
- `RECAP_COMPLET.md` - CE DOCUMENT

**Tous dans la racine du projet!**
