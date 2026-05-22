# ⚡ Guide Rapide : Overpass Turbo (Sans QGIS)

## C'est quoi Overpass Turbo ?

C'est un outil en ligne qui vous permet de **télécharger gratuitement les limites géographiques** de OpenStreetMap sans installer QGIS. C'est la solution la plus simple! ✨

---

## 📍 ÉTAPE 1 : Accéder à Overpass Turbo

Ouvrez : **https://overpass-turbo.eu**

Vous verrez une carte du monde avec une interface de coding à gauche.

---

## 📋 ÉTAPE 2 : Chercher l'Algérie

1. Sur la carte, **zoomez sur l'Algérie** (clic gauche + drag)
2. Ou utilisez le champ "Search" en haut à gauche : tapez "Algeria"

**Zoom conseillé :** zoom 4-5 (vue de tout le pays)

---

## 🔍 ÉTAPE 3 : Récupérer les WILAYAS (provinces)

### Copier-Collez cette requête :

```
[bbox:20.0628,0.662444,37.0931,8.668589];
(
  relation["boundary"="administrative"]["admin_level"="4"]["name"];
);
out body geom center;
```

**Explications :**
- `bbox:20.0628,0.662444,37.0931,8.668589` = Boîte englobante de l'Algérie
- `admin_level="4"` = Niveau administratif 4 = Wilayas
- `out body geom center` = Retourner les coordonnées et le centre

### Comment faire :

1. Effacez le contenu du champ de texte (à gauche)
2. Collez la requête
3. Cliquez sur le bouton **"Run"** (ou appuyez sur `Ctrl+Shift+O`)
4. Attendez 10-30 secondes (cela dépend du serveur)
5. Les wilayas apparaîtront en rouge sur la carte

---

## 🏘️ ÉTAPE 4 : Récupérer les DAÏRAS (communes)

### Copier-Collez cette requête :

```
[bbox:20.0628,0.662444,37.0931,8.668589];
(
  relation["boundary"="administrative"]["admin_level"="5"]["name"];
);
out body geom center;
```

**Seule différence :** `admin_level="5"` au lieu de `"4"`

### Exécution :

1. Remplacez la requête précédente par celle-ci
2. Cliquez sur **"Run"**
3. Attendez... (l peut y avoir beaucoup de daïras)

---

## 💾 ÉTAPE 5 : Exporter en GeoJSON

### Après l'exécution d'une requête :

1. Cliquez sur le menu **"Export"** (bouton bleu)
2. Sélectionnez **"GeoJSON"**
3. Un fichier `.geojson` sera téléchargé
4. Renommez-le en :
   - `algeria-wilayas.geojson` (pour les wilayas)
   - `algeria-dairat.geojson` (pour les daïras)

---

## 📁 ÉTAPE 6 : Placer les fichiers au bon endroit

```
frontend/
└── public/
    └── geojson/
        ├── algeria-wilayas.geojson  ← Mettez le fichier ici
        └── algeria-dairat.geojson   ← Et celui-ci ici
```

**Command terminal :**

```powershell
# Windows
Move-Item -Path "C:\Users\[VotreUser]\Downloads\algeria-wilayas.geojson" -Destination "c:\Users\TOSHIBA\Desktop\Syst-me-de-Registre-de-Cancer\frontend\public\geojson\"
Move-Item -Path "C:\Users\[VotreUser]\Downloads\algeria-dairat.geojson" -Destination "c:\Users\TOSHIBA\Desktop\Syst-me-de-Registre-de-Cancer\frontend\public\geojson\"
```

---

## ✅ ÉTAPE 7 : Vérifier les fichiers

Ouvrez `algeria-wilayas.geojson` dans VS Code.

**Devrait ressembler à :**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "3714029",
        "name": "Alger",
        "admin_level": "4"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [ [...coordonnées...] ]
      }
    },
    // ... plus de wilayas
  ]
}
```

**Points essentiels :**
- ✅ Type: `FeatureCollection`
- ✅ Plusieurs features (une par wilaya)
- ✅ Chaque feature a `"properties"` avec le nom
- ✅ `"geometry"` avec les vrais polygones
- ✅ Pas d'erreur syntaxe JSON

---

## 🎯 REQUÊTES ALTERNATIVES

### Si vous voulez SEULEMENT une wilaya (Tlemcen par exemple) :

```
[bbox:20.0628,0.662444,37.0931,8.668589];
(
  relation["boundary"="administrative"]["admin_level"="4"]["name"="Tlemcen"];
);
out body geom;
```

### Si vous voulez les communes (level 8) :

```
[bbox:20.0628,0.662444,37.0931,8.668589];
(
  way["place"="village"];
);
out body geom;
```

### Si vous voulez les routes :

```
[bbox:20.0628,0.662444,37.0931,8.668589];
(
  way["highway"="primary"];
);
out body geom;
```

---

## 🐛 DÉPANNAGE

### Problème : "No results found"
**Solution :** 
- Assurez-vous que vous êtes zoomé sur l'Algérie
- Vérifiez que la boîte englobante bbox est correcte

### Problème : Erreur "Parse Error"
**Solution :** 
- Vérifiez les guillemets (`"` au lieu de `'`)
- Pas d'accents dans les noms de variables

### Problème : Le fichier est vide
**Solution :** 
- Réexécutez la requête
- Attendez plus longtemps

### Problème : Les coordonnées semblent bizarres
**Solution :** 
- Vérifiez qu'elles sont en format `[longitude, latitude]`
- Pour Leaflet, vous devez les convertir en `[latitude, longitude]`

---

## 🔄 CONVERTIR POUR LEAFLET

Si vos coordonnées sont au mauvais format :

```javascript
// Overpass retourne [lng, lat]
// Leaflet veut [lat, lng]

function convertGeoJSON(geojson) {
  geojson.features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates[0].forEach(coord => {
        [coord[0], coord[1]] = [coord[1], coord[0]]; // Swap
      });
    }
  });
  return geojson;
}
```

---

## ⏱️ TEMPS ESTIMÉ

| Tâche | Durée |
|-------|-------|
| Accéder à Overpass Turbo | 30 secondes |
| Télécharger wilayas | 2 minutes |
| Télécharger daïras | 2 minutes |
| Placement des fichiers | 1 minute |
| Vérification | 1 minute |
| **TOTAL** | **~6 minutes** |

---

## 📊 DONNÉES OBTENUES

**Après ces étapes, vous aurez :**

✅ 58 wilayas avec polygones précis
✅ 1500+ daïras (communes)
✅ Noms en français et arabe
✅ Limites géographiques officielles
✅ Format compatible React Leaflet

---

## 🚀 PROCHAINE ÉTAPE

Une fois les fichiers en place :

```javascript
// Votre composant React n'a besoin que de :

useEffect(() => {
  fetch('/geojson/algeria-wilayas.geojson')
    .then(r => r.json())
    .then(data => {
      // Afficher sur la carte!
      <GeoJSON data={data} />
    });
}, []);
```

---

## 📚 RESSOURCES ADDITIONNELLES

- **Overpass Query Language :** https://wiki.openstreetmap.org/wiki/Overpass_API
- **Liste complète des tags OSM :** https://taginfo.openstreetmap.org
- **Validateur GeoJSON :** https://geojson.io

---

**C'est tout! Vous avez maintenant les vraies cartes géographiques de l'Algérie! 🎉**
