/**
 * Utilidades para filtrar y agregar datos de estadísticas de cáncer
 */

/**
 * Filtra RAW_DATA según los filtros proporcionados
 * @param {Array} rawData - Los datos sin filtrar
 * @param {Object} filters - Los filtros a aplicar
 * @returns {Array} Datos filtrados
 */
export function filterData(rawData, filters) {
  return rawData.filter(d => {
    // Filtro de año
    if (filters.yearStart && d.year < parseInt(filters.yearStart)) return false;
    if (filters.yearEnd && d.year > parseInt(filters.yearEnd)) return false;
    
    // Filtro de sexo
    if (filters.sex && d.sex !== filters.sex) return false;
    
    // Filtro de edad
    if (filters.age && d.age !== filters.age) return false;
    
    // Filtro de cáncer
    if (filters.cancer && d.cancer !== filters.cancer) return false;
    
    // Filtro de wilaya/daira
    if (filters.wilaya) {
      if (d.wilaya !== filters.wilaya) return false;
      // Si selecciona una daira, filtrar por daira
      if (filters.daira && d.daira !== filters.daira) return false;
    }
    
    return true;
  });
}

/**
 * Agrega datos por un campo específico
 * @param {Array} data - Los datos a agregar
 * @param {string} key - La clave por la que agregar (ej: "wilaya", "cancer")
 * @returns {Array} Array de objetos {id, label, value}
 */
export function aggregateBy(data, key) {
  const map = {};
  data.forEach(d => {
    const value = d[key];
    if (!map[value]) {
      map[value] = 0;
    }
    map[value] += d.cases;
  });
  
  return Object.entries(map)
    .map(([k, v]) => ({ id: k, label: k, value: v }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Agrega datos por wilaya con desglose detallado
 * @param {Array} data - Los datos a agregar
 * @returns {Object} Objeto con estadísticas por wilaya
 */
export function aggregateByWilaya(data) {
  const map = {};
  
  data.forEach(d => {
    const wilaya = d.wilaya;
    if (!map[wilaya]) {
      map[wilaya] = {
        cases: 0,
        sex: { M: 0, F: 0 },
        age: {},
        cancer: {},
        stade: { 'Stade I': 0, 'Stade II': 0, 'Stade III': 0, 'Stade IV': 0 },
        years: {}
      };
    }
    
    map[wilaya].cases += d.cases;
    map[wilaya].sex[d.sex] = (map[wilaya].sex[d.sex] || 0) + d.cases;
    map[wilaya].age[d.age] = (map[wilaya].age[d.age] || 0) + d.cases;
    map[wilaya].cancer[d.cancer] = (map[wilaya].cancer[d.cancer] || 0) + d.cases;
    map[wilaya].stade[d.stade] = (map[wilaya].stade[d.stade] || 0) + d.cases;
    map[wilaya].years[d.year] = (map[wilaya].years[d.year] || 0) + d.cases;
  });
  
  return map;
}

/**
 * Agrega datos por daira (para Tlemcen)
 * @param {Array} data - Los datos filtrados por wilaya Tlemcen
 * @returns {Object} Objeto con estadísticas por daira
 */
export function aggregateByDaira(data) {
  const map = {};
  
  data.forEach(d => {
    if (!d.daira) return; // Solo para dairas
    
    if (!map[d.daira]) {
      map[d.daira] = {
        cases: 0,
        sex: { M: 0, F: 0 },
        cancer: {},
        coordinates: null // Será llenado desde GeoJSON
      };
    }
    
    map[d.daira].cases += d.cases;
    map[d.daira].sex[d.sex] = (map[d.daira].sex[d.sex] || 0) + d.cases;
    map[d.daira].cancer[d.cancer] = (map[d.daira].cancer[d.cancer] || 0) + d.cases;
  });
  
  // Encontrar cáncer dominante para cada daira
  Object.keys(map).forEach(daira => {
    const cancers = map[daira].cancer;
    map[daira].dominant_cancer = Object.entries(cancers)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  });
  
  return map;
}

/**
 * Obtiene el rango de años disponibles en los datos
 * @param {Array} rawData - Los datos sin filtrar
 * @returns {Array} Array [minYear, maxYear]
 */
export function getYearRange(rawData) {
  const years = [...new Set(rawData.map(d => d.year))].sort((a, b) => a - b);
  return [years[0], years[years.length - 1]];
}

/**
 * Calcula la distribución porcentual
 * @param {Array} data - Los datos a calcular
 * @param {string} key - La clave por la que calcular (ej: "sex")
 * @returns {Array} Array de {label, value, percentage}
 */
export function calculatePercentage(data, key) {
  const aggregated = aggregateBy(data, key);
  const total = aggregated.reduce((sum, d) => sum + d.value, 0);
  
  return aggregated.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
  }));
}

/**
 * Agrupa datos por período (año-mes)
 * @param {Array} data - Los datos a agrupar
 * @returns {Array} Array de {month, year, cases}
 */
export function aggregateByYearMonth(data) {
  const map = {};
  
  data.forEach(d => {
    const key = `${d.year}-${d.month}`;
    if (!map[key]) {
      map[key] = { year: d.year, month: d.month, cases: 0 };
    }
    map[key].cases += d.cases;
  });
  
  return Object.values(map).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return months.indexOf(a.month) - months.indexOf(b.month);
  });
}
