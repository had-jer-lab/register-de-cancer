/**
 * Utility functions for exporting cancer registry statistics to CSV
 */

// List of all dairas in Tlemcen for filtering validation
const TLEMCEN_DAIRAS = [
  "Aïn Fezza", "Aïn Ghoraba", "Aïn Kebira", "Aïn Tallout", "Beni Bahdel",
  "Beni Boussaid", "Beni Ourtilane", "Beni Snous", "Bensekrane", "Beni Ouarsous",
  "Chetouane", "El Aricha", "El Fehoul", "Fellaoucene", "Ghazaouet", "Hammam Boughrara",
  "Hennaya", "Maghnia", "Mansourah", "Nedroma", "Ouled Mimoun", "Remchi",
  "Sabra", "Sebdou", "Sidi Abdelli", "Sidi Medjahed", "Souahlia", "Souani",
  "Tlemcen", "Zenata"
];

/**
 * Convert daira/wilaya filter to wilaya name for API
 * If filter is a daira, returns parent wilaya (Tlemcen)
 * If filter is a wilaya, returns that wilaya
 */
const resolveWilayaFilter = (dairaOrWilayaFilter) => {
  if (!dairaOrWilayaFilter) return null;
  
  // Check if it's a Tlemcen daira
  if (TLEMCEN_DAIRAS.includes(dairaOrWilayaFilter)) {
    return "Tlemcen";
  }
  
  // Otherwise assume it's a wilaya name
  return dairaOrWilayaFilter;
};

/**
 * Export detailed statistics by daira to CSV
 * Columns: Wilaya, Daira, Nombre_Cas, Homme, Femme, Age_Moyen, Cancer_Dominant, Annee
 */
export const fetchAndExportDairaStatistics = async (year = null, dairaOrWilaya = null) => {
  try {
    // Resolve the wilaya from daira or wilaya
    const wilaya = resolveWilayaFilter(dairaOrWilaya);
    
    // Build query params
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (wilaya) params.append('wilaya', wilaya);

    // Fetch data from backend API
    const response = await fetch(
      `/api/patients/export/daira-statistics/?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response from API');
    }

    // Generate CSV
    generateAndDownloadCSV(
      result.data,
      'registre_cancer_daira_statistics',
      ['Wilaya', 'Daira', 'Nombre_Cas', 'Homme', 'Femme', 'Age_Moyen', 'Cancer_Dominant', 'Annee']
    );

  } catch (error) {
    console.error('Error exporting daira statistics:', error);
    alert(`Erreur lors de l'export: ${error.message}`);
  }
};

/**
 * Export aggregated statistics by wilaya to CSV
 * Columns: Wilaya, Nombre_Cas, Homme, Femme, Age_Moyen, Cancer_Dominant, Annee
 */
export const fetchAndExportWilayaStatistics = async (year = null) => {
  try {
    const params = new URLSearchParams();
    if (year) params.append('year', year);

    const response = await fetch(
      `/api/patients/export/wilaya-statistics/?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response from API');
    }

    // Wilaya export - all data
    generateAndDownloadCSV(
      result.data,
      'registre_cancer_wilaya_statistics',
      ['Wilaya', 'Nombre_Cas', 'Homme', 'Femme', 'Age_Moyen', 'Cancer_Dominant', 'Annee']
    );

  } catch (error) {
    console.error('Error exporting wilaya statistics:', error);
    alert(`Erreur lors de l'export: ${error.message}`);
  }
};

/**
 * Generic CSV generation and download function
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Base filename (without extension)
 * @param {Array} headers - Column names in order
 */
const generateAndDownloadCSV = (data, filename, headers) => {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  // Create header row (comma-separated)
  const headerRow = headers.join(',');

  // Create data rows (comma-separated, with proper escaping)
  const dataRows = data.map(row => {
    return headers.map(header => {
      let value = row[header] !== undefined ? row[header] : '';

      // Handle null / undefined
      if (value === null || value === undefined) {
        value = '';
      }

      // Convert to string
      value = String(value);

      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }

      return value;
    }).join(',');
  });

  // Combine header and data
  const csvContent = BOM + [headerRow, ...dataRows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const timestamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filename}_${timestamp}.csv`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Get available export metadata (years, wilayas, etc.)
 */
export const getExportMetadata = async () => {
  try {
    const response = await fetch('/api/patients/export/metadata/');

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error('Invalid response from API');
    }

    return result;

  } catch (error) {
    console.error('Error fetching export metadata:', error);
    return null;
  }
};
