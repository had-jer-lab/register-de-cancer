// Color scale for choropleth map based on case count
export const CASE_TIERS = {
  FAIBLE: { min: 0, max: 10, color: '#4ade80', label: 'Faible', bg: 'bg-green-500' },
  MOYEN: { min: 11, max: 20, color: '#fbbf24', label: 'Moyen', bg: 'bg-amber-400' },
  ELEVE: { min: 21, max: 50, color: '#fb923c', label: 'Élevé', bg: 'bg-orange-400' },
  TRES_ELEVE: { min: 51, max: 100, color: '#dc2626', label: 'Très élevé', bg: 'bg-red-600' },
  CRITIQUE: { min: 101, max: Infinity, color: '#7f1d1d', label: 'Critique', bg: 'bg-red-900' },
};

/**
 * Get color tier based on case count
 */
export const getColorTier = (cases) => {
  if (cases <= 10) return CASE_TIERS.FAIBLE;
  if (cases <= 20) return CASE_TIERS.MOYEN;
  if (cases <= 50) return CASE_TIERS.ELEVE;
  if (cases <= 100) return CASE_TIERS.TRES_ELEVE;
  return CASE_TIERS.CRITIQUE;
};

/**
 * Get color hex by case count
 */
export const getColorByCount = (cases) => {
  return getColorTier(cases).color;
};

/**
 * Get label by case count
 */
export const getLabelByCount = (cases) => {
  return getColorTier(cases).label;
};

/**
 * Format percentage
 */
export const formatPercentage = (percentage) => {
  return `${percentage.toFixed(2)}%`;
};

/**
 * Format number with thousand separator
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('fr-FR').format(num);
};

/**
 * Risk factor color mapping
 */
export const RISK_FACTOR_COLORS = {
  eau: { icon: 'Droplets', color: '#185FA5', name: 'Qualité de l\'eau' },
  pollution: { icon: 'Wind', color: '#7f1d1d', name: 'Pollution de l\'air' },
  tabac: { icon: 'Cigarette', color: '#854F0B', name: 'Tabagisme' },
  soleil: { icon: 'Sun', color: '#EF9F27', name: 'Exposition solaire' },
  heredite: { icon: 'Dna', color: '#533AB7', name: 'Hérédité génétique' },
};

/**
 * Get risk level label
 */
export const getRiskLabel = (value) => {
  if (value < 25) return 'Faible';
  if (value < 50) return 'Modéré';
  if (value < 75) return 'Élevé';
  return 'Critique';
};

/**
 * Get risk level color
 */
export const getRiskColor = (value) => {
  if (value < 25) return '#4ade80';
  if (value < 50) return '#fbbf24';
  if (value < 75) return '#fb923c';
  return '#dc2626';
};
