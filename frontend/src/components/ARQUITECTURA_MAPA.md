# 🗺️ ARQUITECTURA DE MAPA Y ESTADÍSTICAS - GUÍA COMPLETA

## 📋 ÍNDICE
1. [Estructura de Datos](#estructura-de-datos)
2. [Componentes](#componentes)
3. [Flujo de Datos](#flujo-de-datos)
4. [Cómo Integrar](#cómo-integrar)
5. [GeoJSON](#geojson)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 📊 Estructura de Datos

### RAW_DATA
```javascript
// Cada elemento tiene esta estructura:
{
  cancer: "sein",                    // ID del tipo de cáncer
  age: "30–44",                      // Grupo de edad
  sex: "F",                          // Género (M|F)
  year: 2023,                        // Año
  month: "Jan",                      // Mes
  wilaya: "Alger",                   // Nombre de la wilaya
  daira: "Alger Centre",             // Nombre de la daira (solo Tlemcen, null otros)
  stade: "Stade I",                  // Estadio del cáncer
  mode: "Symptômes",                 // Modo de diagnóstico
  traitement: "Chirurgie",           // Tipo de tratamiento
  cases: 125                         // Número de casos
}
```

### Filtros Aplicables
```javascript
{
  yearStart: "2018",                 // Año de inicio
  yearEnd: "2026",                   // Año de fin
  sex: "F",                          // Filtro por género
  age: "30–44",                      // Filtro por edad
  cancer: "sein",                    // Filtro por tipo de cáncer
  wilaya: "Alger",                   // Filtro por wilaya
  daira: "Alger Centre"              // Filtro por daira (solo si wilaya=Tlemcen)
}
```

---

## 🧩 Componentes

### 1. FilterPanel (`src/components/FilterPanel.js`)
**Responsabilidad:** Proporciona controles UI para filtrar datos

**Props:**
- `filters` (Object): Estado actual de filtros
- `setFilters` (Function): Actualizador de estado
- `yearRange` (Array): [minYear, maxYear]
- `cancers` (Array): Lista de tipos de cáncer
- `wilayas` (Array): Lista de wilayas
- `dairas` (Array): Lista de dairas

**Ejemplo:**
```jsx
<FilterPanel
  filters={filters}
  setFilters={setFilters}
  yearRange={[2018, 2026]}
  cancers={CANCERS}
  wilayas={WILAYAS}
  dairas={DAIRAS}
/>
```

### 2. ProfessionalChoroplethMap (`src/components/ProfessionalChoroplethMap.js`)
**Responsabilidad:** Renderizar mapa choroplético interactivo

**Props:**
- `filteredData` (Array): Datos ya filtrados
- `onWilayaClick` (Function): Callback cuando se hace clic en wilaya

**Features:**
- ✅ Coloreado automático según casos
- ✅ Tooltip al hover (nombre + casos)
- ✅ Popup detallado al clic
- ✅ Leyenda profesional
- ✅ Selección visual de wilaya
- ✅ Centrado automático en Argelia

**Ejemplo:**
```jsx
<ProfessionalChoroplethMap
  filteredData={filteredData}
  onWilayaClick={(wilayaName) => {
    console.log(`Clicked on ${wilayaName}`);
  }}
/>
```

### 3. Utilidades (`src/utils/dataAggregation.js`)
**Funciones disponibles:**

- `filterData(rawData, filters)` → Array filtrado
- `aggregateBy(data, key)` → Array de {id, label, value}
- `aggregateByWilaya(data)` → Object con stats detalladas por wilaya
- `aggregateByDaira(data)` → Object con stats detalladas por daira
- `getYearRange(rawData)` → [minYear, maxYear]
- `calculatePercentage(data, key)` → Array con porcentajes
- `aggregateByYearMonth(data)` → Array con serie temporal

---

## 🔄 Flujo de Datos

```
┌─────────────┐
│  RAW_DATA   │ (Datos sin filtrar)
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│  filterData()        │ ← Aplicar filtros seleccionados
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  filteredData        │ (Datos filtrados)
└──────┬───────────────┘
       │
       ├──────────────────────┬────────────────────┬──────────────────┐
       │                      │                    │                  │
       ▼                      ▼                    ▼                  ▼
┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐  ┌──────────┐
│ Choropleth Map  │  │  Bar Chart     │  │  Line Chart      │  │ Pie      │
│ (by Wilaya)     │  │  (by Cancer)   │  │  (Evolution)     │  │ Chart    │
└─────────────────┘  └────────────────┘  └──────────────────┘  │ (Gender) │
                                                                 └──────────┘
```

---

## 🔧 Cómo Integrar en Statistics.jsx

### Paso 1: Importar componentes y utilidades
```javascript
import FilterPanel from '../components/FilterPanel';
import ProfessionalChoroplethMap from '../components/ProfessionalChoroplethMap';
import { 
  filterData, 
  aggregateByWilaya, 
  getYearRange 
} from '../utils/dataAggregation';
```

### Paso 2: Inicializar estado
```javascript
const [filters, setFilters] = useState({
  yearStart: '',
  yearEnd: '',
  sex: '',
  age: '',
  cancer: '',
  wilaya: '',
  daira: ''
});

const [filteredData, setFilteredData] = useState(RAW_DATA);
```

### Paso 3: Actualizar datos cuando cambian filtros
```javascript
useEffect(() => {
  const newFiltered = filterData(RAW_DATA, filters);
  setFilteredData(newFiltered);
}, [filters]);
```

### Paso 4: Renderizar componentes
```jsx
<FilterPanel
  filters={filters}
  setFilters={setFilters}
  yearRange={getYearRange(RAW_DATA)}
  cancers={CANCERS}
  wilayas={WILAYAS}
  dairas={DAIRAS}
/>

<ProfessionalChoroplethMap
  filteredData={filteredData}
  onWilayaClick={(wilaya) => {
    setFilters(f => ({ ...f, wilaya }));
  }}
/>
```

---

## 🗺️ GeoJSON

### Ubicación
- **Wilayas profesional:** `/frontend/public/geojson/algeria-wilayas-professional.geojson`
- **Formato:** FeatureCollection con 48 wilayas
- **Propiedades por feature:**
  - `wilaya_code`: Código de wilaya (01-48)
  - `wilaya_name`: Nombre de la wilaya
  - `lat`, `lng`: Coordenadas centrales
  - `geometry`: Polygon con coordenadas reales

### Estructura GeoJSON
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "wilaya_code": "16",
        "wilaya_name": "Alger",
        "lat": 36.7538,
        "lng": 3.0588
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[2.8, 36.95], [3.4, 36.95], ...]]
      }
    }
  ]
}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Filtrar por año
```javascript
setFilters({
  ...filters,
  yearStart: '2023',
  yearEnd: '2026'
});
// → Datos entre 2023 y 2026
```

### Ejemplo 2: Filtrar por cáncer de mama en mujeres
```javascript
setFilters({
  ...filters,
  cancer: 'sein',
  sex: 'F'
});
// → Solo cáncer de mama en mujeres
```

### Ejemplo 3: Obtener estadísticas por wilaya
```javascript
import { aggregateByWilaya } from '../utils/dataAggregation';

const wilayaStats = aggregateByWilaya(filteredData);
console.log(wilayaStats['Alger']);
// → {
//   cases: 25000,
//   sex: { M: 8000, F: 17000 },
//   cancer: { sein: 12000, colorectal: 5000, ... },
//   ...
// }
```

### Ejemplo 4: Serie temporal
```javascript
import { aggregateByYearMonth } from '../utils/dataAggregation';

const timeline = aggregateByYearMonth(filteredData);
// → [
//   { year: 2018, month: 'Jan', cases: 150 },
//   { year: 2018, month: 'Feb', cases: 180 },
//   ...
// ]
```

---

## 🎨 Leyenda Choroplèthe

| Rango | Color | Significado |
|-------|-------|-------------|
| Sin datos | Gris | Ningún caso |
| 0 - 1K | Verde muy claro | Muy bajo |
| 1K - 5K | Verde claro | Bajo |
| 5K - 15K | Verde | Medio-bajo |
| 15K - 30K | Verde oscuro | Medio |
| 30K - 50K | Amarillo | Medio-alto |
| 50K - 75K | Naranja | Alto |
| 75K - 100K | Rojo | Muy alto |
| 100K - 150K | Rojo oscuro | Crítico |
| >150K | Rojo muy oscuro | Muy crítico |

---

## 📱 Responsividad

- Todos los componentes son responsive
- Grid de filtros se adapta a pantallaspequeñas
- Mapa ocupa 100% del ancho disponible
- Tooltip y popup se posicionan automáticamente

---

## 🚀 Próximos Pasos

1. **Drill-down a dairas:** Implementar clic en wilaya Tlemcen para mostrar dairas con círculos proporcionales
2. **Heatmap:** Agregar capa de heatmap para zonas muy touchadas
3. **Exportar:** Implementar exportación a PDF/CSV
4. **Time slider:** Agregar slider temporal para animación
5. **Comparativas:** Permitir comparación entre dos períodos

---

## 📞 Soporte

Para preguntas o bugs, contacte al equipo de desarrollo.
