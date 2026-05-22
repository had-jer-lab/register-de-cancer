/**
 * Utility functions for exporting cancer registry statistics to CSV
 */

/**
 * Export detailed statistics by daira to CSV
 * Columns: Wilaya, Daira, Nombre_Cas, Homme, Femme, Age_Moyen, Cancer_Dominant, Annee
 */
export const fetchAndExportDairaStatistics = async (year = null, wilaya = null) => {
  try {
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
    alert(`Error exporting data: ${error.message}`);
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

    // Filter to only include daira-less rows (wilaya level)
    const wilayaOnlyData = result.data.filter(row => row.Daira === '');

    generateAndDownloadCSV(
      wilayaOnlyData,
      'registre_cancer_wilaya_statistics',
      ['Wilaya', 'Nombre_Cas', 'Homme', 'Femme', 'Age_Moyen', 'Cancer_Dominant', 'Annee']
    );

  } catch (error) {
    console.error('Error exporting wilaya statistics:', error);
    alert(`Error exporting data: ${error.message}`);
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
    alert('No data to export');
    return;
  }

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const separator = ';';

  // Create header row (semicolon-separated)
  const headerRow = headers.join(separator);

  // Create data rows (semicolon-separated, with proper escaping)
  const dataRows = data.map(row => {
    return headers.map(header => {
      let value = row[header] !== undefined ? row[header] : '';

      // Handle null / undefined
      if (value === null || value === undefined) {
        value = '';
      }

      // Convert to string
      value = String(value);

      // Escape quotes and wrap in quotes if contains separator, quote, or newline
      if (value.includes(separator) || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }

      return value;
    }).join(separator);
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

/**
 * Export current chart data to simple CSV (for quick exports without API call)
 * Used when displaying pre-aggregated data
 */
export const exportChartDataToCSV = (chartData, filename = 'export') => {
  if (!chartData || chartData.length === 0) {
    alert('No data to export');
    return;
  }

  const BOM = '\uFEFF';
  const separator = ';';
  const headers = ['Wilaya', 'Nombre_Cas'];

  const headerRow = headers.join(separator);
  const dataRows = chartData.map(row => {
    const label = row.label !== undefined ? String(row.label) : '';
    const cases = row.value !== undefined ? row.value : (row['Nombre_Cas'] !== undefined ? row['Nombre_Cas'] : '');

    const escapeValue = value => {
      let v = value === null || value === undefined ? '' : String(value);
      if (v.includes(separator) || v.includes('"') || v.includes('\n')) {
        v = '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    };

    return [escapeValue(label), escapeValue(cases)].join(separator);
  });

  const csvContent = BOM + [headerRow, ...dataRows].join('\n');
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
