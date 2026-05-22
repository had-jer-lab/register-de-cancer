# Export CSV Amélioré - Documentation

## Vue d'ensemble
Modification du système d'export CSV du registre du cancer pour fournir des statistiques détaillées par daira avec données médicales enrichies.

---

## ⚙️ Architecture

### 1. Backend (Django)

#### Fichier créé: `backend/patients/views_export.py`
Trois endpoints API pour l'export statistique:

**a) `/api/patients/export/daira-statistics/`** (GET)
- Export statistiques par daira
- Paramètres: `year` (optional), `wilaya` (optional)
- Retourne JSON avec colonnes:
  - `Wilaya`: Nom de la province
  - `Daira`: Nom du district/commune
  - `Nombre_Cas`: Total des cas de cancer
  - `Homme`: Compte des patients masculins
  - `Femme`: Compte des patients féminins
  - `Age_Moyen`: Âge moyen des patients (1 décimale)
  - `Cancer_Dominant`: Type de cancer le plus fréquent
  - `Annee`: Année de diagnostic

**b) `/api/patients/export/wilaya-statistics/`** (GET)
- Export statistiques par wilaya (province)
- Paramètres: `year` (optional)
- Structure identique à daira-statistics, avec `Daira` vide

**c) `/api/patients/export/metadata/`** (GET)
- Métadonnées pour filtres frontend
- Retourne: années disponibles, wilayas, total des cas

#### Fichier modifié: `backend/patients/urls.py`
Ajout des routes pour les 3 endpoints:
```python
path('export/daira-statistics/', export_daira_statistics, name='export-daira-stats'),
path('export/wilaya-statistics/', export_wilaya_statistics, name='export-wilaya-stats'),
path('export/metadata/', get_export_metadata, name='export-metadata'),
```

### 2. Frontend (React)

#### Fichier créé: `frontend/src/utils/csvExportApi.js`
Utilitaires JavaScript pour l'export CSV:

**Fonctions principales:**

1. **`fetchAndExportDairaStatistics(year, dairaOrWilaya)`**
   - Appelle API `/api/patients/export/daira-statistics/`
   - Résout les filtres daira → wilaya automatiquement
   - Génère et télécharge fichier CSV

2. **`fetchAndExportWilayaStatistics(year)`**
   - Appelle API `/api/patients/export/wilaya-statistics/`
   - Génère et télécharge fichier CSV wilaya-level

3. **`getExportMetadata()`**
   - Récupère années/wilayas disponibles
   - Utile pour initialiser les filtres

**Fonctions utilitaires:**
- `resolveWilayaFilter()`: Convertit daira → wilaya (tous les dairas = Tlemcen)
- `generateAndDownloadCSV()`: Génère CSV avec BOM UTF-8 pour Excel

#### Fichier modifié: `frontend/src/pages/Statistics.jsx`
Modifications du bouton CSV:

**Avant:** Ligne 1456
```javascript
<button onClick={()=>{const BOM='\uFEFF'; const headers=['Rang','Wilaya',...]; ...}} >
  {Icon.download} CSV
</button>
```

**Après:** Appel à la nouvelle API
```javascript
<button onClick={() => {
  const year = filters.yearStart || null;
  const wilaya = filters.daira || null;
  fetchAndExportDairaStatistics(year, wilaya);
}} style={{...}}>
  {Icon.download} CSV
</button>
```

---

## 📊 Flux de données

```
Frontend UI (Statistics.jsx)
    ↓
[Clic bouton CSV]
    ↓
csvExportApi.fetchAndExportDairaStatistics(year, dairaOrWilaya)
    ↓
[Résoudre daira → wilaya si nécessaire]
    ↓
HTTP GET /api/patients/export/daira-statistics/?year=X&wilaya=Y
    ↓
Backend Python (views_export.py)
    ↓
[Requête DB, agrégation par daira]
    ↓
JSON Response:
{
  "success": true,
  "data": [
    {
      "Wilaya": "Tlemcen",
      "Daira": "Mansourah",
      "Nombre_Cas": 84,
      "Homme": 50,
      "Femme": 34,
      "Age_Moyen": 52.4,
      "Cancer_Dominant": "Sein",
      "Annee": 2023
    },
    ...
  ],
  "count": N
}
    ↓
[Transformer en CSV avec BOM]
    ↓
Télécharger: registre_cancer_daira_statistics_YYYY-MM-DD.csv
```

---

## 📝 Format CSV généré

**Exemple de contenu fichier:**
```csv
Wilaya,Daira,Nombre_Cas,Homme,Femme,Age_Moyen,Cancer_Dominant,Annee
Tlemcen,Mansourah,84,50,34,52.4,Sein,2023
Tlemcen,Aïn Fezza,62,36,26,49.8,Poumon,2023
Tlemcen,Nedroma,45,18,27,55.2,Colorectal,2023
```

**Caractéristiques:**
- Format: CSV comma-separated values
- Encodage: UTF-8 avec BOM (`\uFEFF`) pour compatibilité Excel
- Échappement: Guillemets doublés pour valeurs contenant `,`, `"`, ou newlines
- Nommage: `registre_cancer_daira_statistics_YYYY-MM-DD.csv`
- Ouvre directement dans Excel/Calc

---

## 🔧 Configuration requise

### Backend
- Django 5.0+
- Python 3.13+
- Modèles: Cancer, Patient, Commune, Wilaya, CancerType
- Champs requis:
  - Patient: `sexe` (M/F), `date_naissance`, `commune` (FK)
  - Cancer: `date_diagnostic`, `cancer_type` (FK)
  - Commune: `wilaya` (FK), `name`

### Frontend
- React avec support de hooks (useState)
- Fetch API native (ou polyfill)
- ES6 modules

---

## ✅ Cas d'utilisation

### 1. Export tous les dairas Tlemcen
- Cliquer bouton CSV
- Aucun filtre sélectionné
- Résultat: Tous les dairas 2023

### 2. Export Mansourah 2023
- Filtre daira: "Mansourah"
- Année: 2023
- API reçoit: `year=2023&wilaya=Tlemcen`
- Résultat: Données Mansourah uniquement

### 3. Export analyses par année
- Cliquer bouton CSV avec année filtrée
- API filtre par année ET wilaya sélectionnée
- Résultat: Statistiques pour année/wilaya choisie

---

## 🐛 Gestion des erreurs

**Frontend (csvExportApi.js):**
- Vérifie réponse API (`response.ok`)
- Contrôle JSON valide (`result.success`)
- Gère données vides ("Aucune donnée à exporter")
- Alert utilisateur en français pour erreurs

**Backend (views_export.py):**
- Try/except global retourne JSON avec `"success": false`
- Filtre année sûr (try/except int conversion)
- Gère patients/cancers sans commune/wilaya

---

## 🚀 Déploiement

1. **Backend:**
   - Vérifier que `views_export.py` est dans `patients/`
   - Vérifier imports dans `urls.py`
   - Aucune migration DB requise

2. **Frontend:**
   - Vérifier que `csvExportApi.js` est dans `utils/`
   - Vérifier import dans `Statistics.jsx`
   - Build React normalement

3. **Test:**
   - Ouvrir Statistics page
   - Cliquer CSV → fichier téléchargé
   - Ouvrir dans Excel → vérifie colonnes

---

## 📋 Columnas de sortie

| N° | Colonne | Type | Source | Exemple |
|----|---------|------|--------|---------|
| 1 | Wilaya | String | Wilaya.name | "Tlemcen" |
| 2 | Daira | String | Commune.name | "Mansourah" |
| 3 | Nombre_Cas | Int | COUNT(Cancer) | 84 |
| 4 | Homme | Int | COUNT(Patient.sexe='M') | 50 |
| 5 | Femme | Int | COUNT(Patient.sexe='F') | 34 |
| 6 | Age_Moyen | Float | AVG(Patient.age) | 52.4 |
| 7 | Cancer_Dominant | String | MAX(CancerType.name) | "Sein" |
| 8 | Annee | Int | YEAR(Cancer.date_diagnostic) | 2023 |

---

## 🔐 Sécurité & Validation

- ✅ Paramètres sanitized (int conversion)
- ✅ Données filtrées (deleted_at = null)
- ✅ Pas d'injection SQL (ORM Django)
- ✅ CORS héritée du config existant
- ✅ Pas de données sensibles exposées

---

## Résumé des fichiers modifiés

| Chemin | Statut | Modification |
|--------|--------|--------------|
| `backend/patients/views_export.py` | ✨ Créé | 3 endpoints API export |
| `backend/patients/urls.py` | ✏️ Modifié | +3 route paths |
| `frontend/src/utils/csvExportApi.js` | ✨ Créé | Fonctions export CSV |
| `frontend/src/pages/Statistics.jsx` | ✏️ Modifié | Import + bouton CSV |

---

Version: 1.0 - Implantation complète
Date: 2025-01-xx
