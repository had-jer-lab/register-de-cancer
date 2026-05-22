/**
 * === STRUCTURE DES DONNÉES ===
 * 
 * RAW_DATA: Array<{
 *   cancer: string (ex: "sein", "prostate")
 *   age: string (ex: "30–44", "60+")
 *   sex: string ("M" | "F")
 *   year: number (2018-2026)
 *   month: string (ex: "Jan", "Fév")
 *   wilaya: string (nom de la wilaya)
 *   daira: string | null (pour Tlemcen, null pour autres wilayas)
 *   stade: string ("Stade I", "Stade II", "Stade III", "Stade IV")
 *   mode: string ("Symptômes", "Dépistage", "Urgence", "Incidental")
 *   traitement: string ("Chirurgie", "Chimio", "Radio", etc.)
 *   cases: number (nombre de cas)
 * }>
 * 
 * === STATISTIQUES DÉRIVÉES ===
 * 
 * Agrégation par wilaya:
 * {
 *   [wilaya_name]: {
 *     cases: number,
 *     sex: { M: number, F: number },
 *     age: { [age_group]: number },
 *     cancer: { [cancer_type]: number },
 *     years: { [year]: number }
 *   }
 * }
 * 
 * Agrégation par daïra (Tlemcen uniquement):
 * {
 *   [daira_name]: {
 *     cases: number,
 *     sex: { M: number, F: number },
 *     dominant_cancer: string,
 *     years: { [year]: number }
 *   }
 * }
 * 
 * === FILTRES ===
 * 
 * filters: {
 *   yearStart: string (ex: "2018")
 *   yearEnd: string (ex: "2026")
 *   sex: "" | "M" | "F"
 *   age: "" | "0–14" | "15–29" | "30–44" | "45–59" | "60+"
 *   cancer: "" | cancer_id
 *   wilaya: "" | wilaya_name
 *   daira: "" | daira_name (si Tlemcen sélectionné)
 * }
 * 
 * === FLUX DE DONNÉES ===
 * 
 * filters → filterData(RAW_DATA, filters) → filteredData
 *                                              ↓
 *                                     aggregateByWilaya()
 *                                              ↓
 *                                    Map (ChoroplethMap)
 *                                              ↓
 *                                     Charts (Pie, Bar, Line)
 * 
 */

export const DATA_SCHEMA = {
  description: "Vue d'ensemble de la structure des données et du flux"
};
