import React from 'react';

/**
 * Componente de Filtros para Estadísticas de Cáncer
 * Proporciona controles para filtrar los datos por múltiples dimensiones
 */
function FilterPanel({
  filters,
  setFilters,
  yearRange,
  cancers = [],
  wilayas = [],
  dairas = []
}) {
  const handleChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === '' ? '' : value
    }));
  };

  const resetFilters = () => {
    setFilters({
      yearStart: yearRange[0]?.toString() || '',
      yearEnd: yearRange[1]?.toString() || '',
      sex: '',
      age: '',
      cancer: '',
      wilaya: '',
      daira: ''
    });
  };

  // Generar años para selección
  const years = [];
  if (yearRange && yearRange.length === 2) {
    for (let i = yearRange[0]; i <= yearRange[1]; i++) {
      years.push(i);
    }
  }

  const styleContainer = {
    background: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  };

  const styleLabel = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '6px',
    display: 'block'
  };

  const styleSelect = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#1e293b',
    background: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  };

  const styleGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    marginBottom: '15px'
  };

  const styleButtonGroup = {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  };

  const styleButton = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  return (
    <div style={styleContainer}>
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
          🔍 Filtres d'Analyse
        </h3>
        <button
          onClick={resetFilters}
          style={{
            ...styleButton,
            background: '#f3f4f6',
            color: '#4b5563'
          }}
          onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
          onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
        >
          ↻ Réinitialiser
        </button>
      </div>

      {/* Période - Année */}
      <div style={styleGrid}>
        <div>
          <label style={styleLabel}>📅 Année de début</label>
          <select
            value={filters.yearStart || ''}
            onChange={(e) => handleChange('yearStart', e.target.value)}
            style={styleSelect}
          >
            <option value="">Toutes les années</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={styleLabel}>📅 Année de fin</label>
          <select
            value={filters.yearEnd || ''}
            onChange={(e) => handleChange('yearEnd', e.target.value)}
            style={styleSelect}
          >
            <option value="">Toutes les années</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Genre et Âge */}
      <div style={styleGrid}>
        <div>
          <label style={styleLabel}>👥 Genre</label>
          <select
            value={filters.sex || ''}
            onChange={(e) => handleChange('sex', e.target.value)}
            style={styleSelect}
          >
            <option value="">Tous les genres</option>
            <option value="M">👨 Hommes</option>
            <option value="F">👩 Femmes</option>
          </select>
        </div>
        <div>
          <label style={styleLabel}>👶 Tranche d'âge</label>
          <select
            value={filters.age || ''}
            onChange={(e) => handleChange('age', e.target.value)}
            style={styleSelect}
          >
            <option value="">Tous les âges</option>
            <option value="0–14">0–14 ans</option>
            <option value="15–29">15–29 ans</option>
            <option value="30–44">30–44 ans</option>
            <option value="45–59">45–59 ans</option>
            <option value="60+">60+ ans</option>
          </select>
        </div>
      </div>

      {/* Type de Cancer */}
      <div style={styleGrid}>
        <div>
          <label style={styleLabel}>🏥 Type de Cancer</label>
          <select
            value={filters.cancer || ''}
            onChange={(e) => handleChange('cancer', e.target.value)}
            style={styleSelect}
          >
            <option value="">Tous les types</option>
            {cancers.map(cancer => (
              <option key={cancer.id} value={cancer.id}>
                {cancer.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Wilaya et Daira */}
      <div style={styleGrid}>
        <div>
          <label style={styleLabel}>📍 Wilaya</label>
          <select
            value={filters.wilaya || ''}
            onChange={(e) => handleChange('wilaya', e.target.value)}
            style={styleSelect}
          >
            <option value="">Toutes les wilayas</option>
            {wilayas.map(wilaya => (
              <option key={wilaya} value={wilaya}>{wilaya}</option>
            ))}
          </select>
        </div>

        {/* Dairas (solo si Tlemcen está seleccionado) */}
        {filters.wilaya === 'Tlemcen' && (
          <div>
            <label style={styleLabel}>📍 Daïra (Tlemcen)</label>
            <select
              value={filters.daira || ''}
              onChange={(e) => handleChange('daira', e.target.value)}
              style={styleSelect}
            >
              <option value="">Toutes les daïras</option>
              {dairas.map(daira => (
                <option key={daira} value={daira}>{daira}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Info de filtros activos */}
      <div style={{
        padding: '10px 12px',
        background: '#f0f9ff',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#0369a1',
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        {filters.yearStart && <span>📅 Depuis {filters.yearStart}</span>}
        {filters.yearEnd && <span>📅 Jusqu'à {filters.yearEnd}</span>}
        {filters.sex === 'M' && <span>👨 Hommes uniquement</span>}
        {filters.sex === 'F' && <span>👩 Femmes uniquement</span>}
        {filters.age && <span>👶 {filters.age} ans</span>}
        {filters.cancer && <span>🏥 Cancer sélectionné</span>}
        {filters.wilaya && <span>📍 {filters.wilaya}</span>}
        {filters.daira && <span>📍 {filters.daira}</span>}
      </div>
    </div>
  );
}

export default FilterPanel;
