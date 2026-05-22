import React, { useState } from 'react';
import { Home, MapPin, RotateCcw, BarChart2, Download } from 'lucide-react';
import { useGeographicStats } from '../../../hooks/useGeographicStats';
import WilayaMap from '../../../components/statistics/WilayaMap';
import RiskFactorPanel from '../../../components/statistics/RiskFactorPanel';
import DairaTable from '../../../components/statistics/DairaTable';
import StatFilters from '../../../components/statistics/StatFilters';

export const GeographicStats = () => {
  const [breadcrumb, setBreadcrumb] = useState(['Accueil', 'Répartition Géographique']);
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [selectedDaira, setSelectedDaira] = useState(null);
  const [chartType, setChartType] = useState('map'); // 'map', 'bar', 'scatter'

  const {
    data: statsData,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
  } = useGeographicStats();

  const handleWilayaDrill = (wilaya) => {
    setSelectedWilaya(wilaya);
    setBreadcrumb([
      'Accueil',
      'Répartition Géographique',
      `${wilaya.name}`,
    ]);
  };

  const handleReturnToWilayas = () => {
    setSelectedWilaya(null);
    setSelectedDaira(null);
    setBreadcrumb(['Accueil', 'Répartition Géographique']);
    resetFilters();
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Erreur: {error}
      </div>
    );
  }

  // Prepare table data based on selection
  const tableData = selectedWilaya
    ? selectedWilaya.dairat || []
    : statsData?.wilayas || [];

  // All daïras for filter dropdown
  const allDairat = statsData?.wilayas?.flatMap((w) => w.dairat || []) || [];

  const totalCases = statsData?.total_cases || 0;
  const totalCategories = statsData?.total_categories || 0;
  const dominantWilaya = statsData?.dominant_wilaya || 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-full px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-gray-400">›</span>}
                <button
                  onClick={handleReturnToWilayas}
                  className={
                    idx === breadcrumb.length - 1
                      ? 'text-gray-900 font-medium'
                      : 'text-blue-600 hover:text-blue-700'
                  }
                >
                  {item}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Title and Stats */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedWilaya ? `Daïras - ${selectedWilaya.name}` : 'Par Wilaya'}
              </h1>
              <p className="text-sm text-gray-500">
                {selectedWilaya
                  ? `Analyse détaillée des daïras de ${selectedWilaya.name}`
                  : 'Tous sexes · Tous âges · 2022-2026 · Toutes daïras'}
              </p>
            </div>

            {/* Stat Chips */}
            <div className="flex gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {totalCases.toLocaleString('fr-FR')}
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">
                  Total
                </div>
              </div>
              <div className="text-right border-l border-gray-200 pl-4">
                <div className="text-2xl font-bold text-gray-900">
                  {totalCategories}
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">
                  Catégories
                </div>
              </div>
              <div className="text-right border-l border-gray-200 pl-4">
                <div className="text-2xl font-bold text-gray-900">
                  {dominantWilaya}
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">
                  Dominant
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('map')}
                className={`p-2 rounded border transition ${
                  chartType === 'map'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                title="Carte"
              >
                <MapPin size={16} />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded border transition ${
                  chartType === 'bar'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                title="Graphique en barres"
              >
                <BarChart2 size={16} />
              </button>
              <button
                onClick={resetFilters}
                className="p-2 rounded border bg-white text-gray-600 border-gray-200 hover:border-gray-300 transition"
                title="Réinitialiser"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Export buttons */}
            <div className="ml-auto flex gap-2">
              <button className="px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center gap-2 transition">
                <Download size={14} />
                PDF
              </button>
              <button className="px-3 py-2 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 text-sm font-medium flex items-center gap-2 transition">
                <Download size={14} />
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full px-6 py-6 space-y-6">
        {/* Filters */}
        <StatFilters
          filters={filters}
          onFilterChange={updateFilters}
          loading={loading}
          allDairat={allDairat}
        />

        {/* Map Section */}
        {chartType === 'map' && (
          <>
            <div>
              <WilayaMap
                data={selectedWilaya ? selectedWilaya.dairat || [] : statsData?.wilayas || []}
                onWilayaDrill={handleWilayaDrill}
                onDairaSelect={setSelectedDaira}
              />
            </div>

            {/* Gradient Legend */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">
                Gradient d'intensité des cas {selectedWilaya ? 'par daïra' : 'par wilaya'}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600">Faible</span>
                <div className="flex gap-1 flex-1 max-w-xl">
                  {[
                    '#f0f0f0',
                    '#fef3c7',
                    '#fed7aa',
                    '#fb923c',
                    '#dc2626',
                  ].map((color, i) => (
                    <div
                      key={i}
                      className="flex-1 h-6 rounded"
                      style={{ backgroundColor: color }}
                    ></div>
                  ))}
                </div>
                <span className="text-xs text-gray-600">Élevé</span>
              </div>
            </div>
          </>
        )}

        {/* Risk Factor Panel */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Facteurs de Risque</h2>
          <RiskFactorPanel
            wilaya={selectedWilaya}
            daira={selectedDaira}
          />
        </div>

        {/* Data Table */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {selectedWilaya ? `Daïras de ${selectedWilaya.name}` : 'Répartition par Wilaya'}
          </h2>
          <DairaTable
            data={tableData}
            selectedWilaya={selectedWilaya}
            loading={loading}
          />
        </div>

        {/* Return Button */}
        {selectedWilaya && (
          <div className="flex justify-center pt-4">
            <button
              onClick={handleReturnToWilayas}
              className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              ← Retour aux Wilayas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeographicStats;
