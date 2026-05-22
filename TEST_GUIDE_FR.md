# Guide de Test - Export CSV Améliored

## ✅ Checklist de vérification

### Phase 1: Vérification des fichiers

- [ ] `backend/patients/views_export.py` existe (370+ lignes)
- [ ] `frontend/src/utils/csvExportApi.js` existe (190+ lignes)
- [ ] `backend/patients/urls.py` contient imports views_export
- [ ] `backend/patients/urls.py` contient 3 path() pour export/*
- [ ] `frontend/src/pages/Statistics.jsx` importe csvExportApi
- [ ] `frontend/src/pages/Statistics.jsx` bouton CSV modifié (ligne ~1457)

### Phase 2: Tests API Backend

**Endpoint 1: GET /api/patients/export/metadata/**

```bash
curl -X GET http://localhost:8000/api/patients/export/metadata/
```

Résultat attendu:
```json
{
  "success": true,
  "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024, ...],
  "wilayas": ["Tlemcen", "Alger", ...],
  "total_cases": 1234
}
```

**Endpoint 2: GET /api/patients/export/daira-statistics/**

Pas de filtres:
```bash
curl -X GET http://localhost:8000/api/patients/export/daira-statistics/
```

Avec filtres:
```bash
curl -X GET "http://localhost:8000/api/patients/export/daira-statistics/?year=2023&wilaya=Tlemcen"
```

Résultat attendu:
```json
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
    }
  ],
  "count": 5
}
```

**Endpoint 3: GET /api/patients/export/wilaya-statistics/**

```bash
curl -X GET "http://localhost:8000/api/patients/export/wilaya-statistics/?year=2023"
```

Résultat: Structure identique à daira mais avec Daira vide

### Phase 3: Validation Frontend

**Test du bouton d'export:**

1. Ouvrir la page Statistics dans le navigateur (localhost:3000/statistics)
2. Sélectionner une analyse (ex: "Cas par Wilaya")
3. Laisser les filtres par défaut (année 2023)
4. Cliquer le bouton "CSV"

Résultat attendu:
- Fichier téléchargé: `registre_cancer_daira_statistics_YYYY-MM-DD.csv`
- Ouverture automatique ou affichage du téléchargement

**Vérifier le contenu du CSV:**

Ouvrir dans Excel:
```
Wilaya,Daira,Nombre_Cas,Homme,Femme,Age_Moyen,Cancer_Dominant,Annee
Tlemcen,Mansourah,84,50,34,52.4,Sein,2023
Tlemcen,Aïn Fezza,62,36,26,49.8,Poumon,2023
```

Validations:
- [ ] BOM UTF-8 présent (pas de caractères corrompus)
- [ ] Guillemets correctement échappés
- [ ] Colonnes dans le bon ordre
- [ ] Nombres formatés correctement
- [ ] Accents français conservés (Tlemcen, Sein, etc.)

### Phase 4: Tests d'intégration

**Scenario 1: Export sans filtres**
1. Ouvrir Statistics
2. Pas de filtre sélectionné
3. Cliquer CSV
4. ✓ Arquivo téléchargé avec tous les dairas

**Scenario 2: Export avec filtrage daira**
1. Sélectionner filtre daira = "Mansourah"
2. Sélectionner année = 2023
3. Cliquer CSV
4. ✓ Fichier contient UNIQUEMENT Mansourah
5. ✓ Vérifier que l'API a reçu `wilaya=Tlemcen`

**Scenario 3: Export avec filtrage wilaya**
1. Sélectionner filtre daira = "Alger" (ou autre wilaya)
2. Cliquer CSV
3. ✓ Fichier contient données pour "Alger"
4. ✓ L'API a reçu `wilaya=Alger` (pas de conversion daira)

**Scenario 4: Export données vides**
1. Sélectionner année = 2010 (data qu'n'existe pas)
2. Cliquer CSV
3. ✓ Alert: "Aucune donnée à exporter"

**Scenario 5: Gestion d'erreur API**
1. Arrêter le serveur Django
2. Cliquer CSV
3. ✓ Alert: "Erreur lors de l'export: ... (message d'erreur)"

### Phase 5: Validation des données

**Validation Mathematique:**

Pour chaque daira:
- [ ] `Nombre_Cas = Homme + Femme` (généralement, sauf données manquantes)
- [ ] `Age_Moyen` entre 30 et 80 (plausibilité)
- [ ] `Cancer_Dominant` est dans la liste des types connus
- [ ] `Annee` correspond à l'année de diagnostic

**Validation Métier:**

- [ ] Tlemcen doit avoir ~30 dairas dans résultat
- [ ] Total des cas ≈ somme des cas daira
- [ ] Types cancer dominants varient par daira
- [ ] Distributions male/femelle réalistes (typiquement 45-55%)

### Phase 6: Performance

**Test charge:**
1. Export avec 5 ans de data (2019-2023)
2. Tlemcen entière (30+ dairas)
3. ✓ Temps réponse < 2 secondes
4. ✓ CSV généré correctement

**Navigation après export:**
1. Export CSV
2. Cliquer sur un autre filtre
3. Changer d'analyse
4. ✓ Pas d'erreurs, pas de ralentissement

---

## 🐛 Debugging

### Problème: "API error"

**Vérification:**
1. Backend Django tourne?
   ```bash
   curl http://localhost:8000/api/patients/
   ```
2. Routes enregistrées?
   ```bash
   python manage.py show_urls | grep export
   ```
3. Console navigateur (F12):
   - Network tab: vérifier requête GET /api/patients/export/...
   - Vérifier status code (200 = OK, 404 = route not found)
   - Vérifier JSON response

### Problème: "Invalid response from API"

**Vérification:**
1. JSON valide? Copier réponse dans jsonvalidator.org
2. Champs requis présents?
   - `success: true`
   - `data: [...]`
   - Chaque objet data a Wilaya, Daira, Nombre_Cas, etc.

### Problème: CSV vide

**Vérification:**
1. Données existent en DB?
   ```bash
   python manage.py shell
   >>> from patients.models import Cancer
   >>> Cancer.objects.count()
   ```
2. Données correspondent aux filtres?
   ```bash
   >>> Cancer.objects.filter(date_diagnostic__year=2023).count()
   ```

### Problème: Caractères corrompus dans Excel

**Solution:**
- Vérifier BOM UTF-8 présent dans fichier
- Ouvrir Excel → Data → From Text/CSV
- Sélectionner "UTF-8" encoding

---

## 📊 Commandes de gestion

### Générer donnees test

```bash
cd backend
python manage.py populate_sample_data
```

### Vérifier modèles

```bash
python manage.py shell
>>> from patients.models import Cancer, Patient, Commune, Wilaya
>>> Cancer.objects.count()
>>> Patient.objects.count()
>>> Patient.objects.values_list('sexe', flat=True).distinct()
```

### Tester API directement

```bash
python manage.py shell
>>> from patients.views_export import export_daira_statistics
>>> from django.test import RequestFactory
>>> rf = RequestFactory()
>>> request = rf.get('/api/patients/export/daira-statistics/?year=2023&wilaya=Tlemcen')
>>> response = export_daira_statistics(request)
>>> import json
>>> json.loads(response.content)
```

---

## 📝 Checklist de déploiement

### Avant production
- [ ] Tests locaux passent tous
- [ ] No console errors (F12)
- [ ] Aucune dépendance manquante
- [ ] Migrations Django appliquées
- [ ] CORS configuré si frontend ≠ backend

### Après déploiement
- [ ] Test bouton CSV produit fichier téléchargé
- [ ] Fichier Excel s'ouvre correctement
- [ ] Données actproduit sont visibles
- [ ] Performance acceptable

---

## 🆘 Support

En cas de problème, vérifier:
1. **Backend error logs**: `python manage.py runserver` (console)
2. **Frontend errors**: Ouvrir DevTools (F12) → Console
3. **Network tab**: Voir detals requête API
4. **Database**: Vérifier données existent

