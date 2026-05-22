import React, { useMemo, useState, useEffect } from 'react';

export const X_AXIS_OPTIONS = [
  { value: 'wilaya', label: 'Wilaya' },
  { value: 'daira', label: 'Daira' },
  { value: 'year', label: 'Année' },
  { value: 'month', label: 'Mois' },
  { value: 'cancer', label: 'Type de cancer' },
  { value: 'sex', label: 'Sexe' },
  { value: 'age', label: 'Tranche d\'âge' },
  { value: 'stade', label: 'Stade' },
  { value: 'mode', label: 'Mode diagnostic' },
  { value: 'traitement', label: 'Traitement' },
];

export const Y_AXIS_OPTIONS = [
  { value: 'cases', label: 'Nombre de cas' },
  { value: 'percentage', label: 'Pourcentage' },
  { value: 'avg_age', label: 'Age moyen' },
];

const AxisSelector = ({
  customAnalysis,
  onCustomAnalysisChange,
  axisX,
  axisY,
  onAxisXChange,
  onAxisYChange,
  errorMessage
}) => {
  const [xInput, setXInput] = useState(axisX || '');
  const [yInput, setYInput] = useState(axisY || '');
  const [showXSuggestions, setShowXSuggestions] = useState(false);
  const [showYSuggestions, setShowYSuggestions] = useState(false);
  const [xMatched, setXMatched] = useState('');
  const [yMatched, setYMatched] = useState('');

  const normalize = (value) => (value || '').toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  // Mappings for intelligent matching
  const xMap = {
    wilaya: 'wilaya',
    wilayas: 'wilaya',
    daira: 'daira',
    dairas: 'daira',
    annee: 'year',
    année: 'year',
    mois: 'month',
    cancer: 'cancer',
    'type de cancer': 'cancer',
    'type cancer': 'cancer',
    sexe: 'sex',
    sex: 'sex',
    'tranche d age': 'age',
    'tranche age': 'age',
    age: 'age',
    stade: 'stade',
    'mode diagnostic': 'mode',
    'mode de diagnostic': 'mode',
    mode: 'mode',
    traitement: 'traitement',
  };

  const yMap = {
    'nombre de cas': 'cases',
    'nombre cas': 'cases',
    cas: 'cases',
    count: 'cases',
    cases: 'cases',
    pourcentage: 'percentage',
    pourcentages: 'percentage',
    percent: 'percentage',
    percentage: 'percentage',
    '%': 'percentage',
    'age moyen': 'avg_age',
    'âge moyen': 'avg_age',
    'moyenne d age': 'avg_age',
    'moyenne d âge': 'avg_age',
    'moyenne age': 'avg_age',
    'moyenne âge': 'avg_age',
    moyenne: 'avg_age',
    avg_age: 'avg_age',
    'average age': 'avg_age',
  };

  // Enhanced mapping with fuzzy matching
  const mapX = (value) => {
    const key = normalize(value);
    if (!key) return '';
    
    // Exact match
    if (xMap[key]) return xMap[key];
    
    // Partial match - find any key that includes the normalized input
    const found = Object.keys(xMap).find(k => k.includes(key) || key.includes(k));
    if (found) return xMap[found];
    
    // Levenshtein-like scoring for close matches
    let bestMatch = '';
    let bestScore = 0;
    for (const k of Object.keys(xMap)) {
      const score = getSimilarityScore(key, k);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = xMap[k];
      }
    }
    return bestMatch;
  };

  const mapY = (value) => {
    const key = normalize(value);
    if (!key) return '';
    
    // Exact match
    if (yMap[key]) return yMap[key];
    
    // Partial match
    const found = Object.keys(yMap).find(k => k.includes(key) || key.includes(k));
    if (found) return yMap[found];
    
    // Levenshtein-like scoring
    let bestMatch = '';
    let bestScore = 0;
    for (const k of Object.keys(yMap)) {
      const score = getSimilarityScore(key, k);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = yMap[k];
      }
    }
    return bestMatch;
  };

  // Simple similarity score (0-1)
  const getSimilarityScore = (str1, str2) => {
    const s1 = str1.length;
    const s2 = str2.length;
    const longer = s1 > s2 ? s1 : s2;
    if (longer === 0) return 1.0;
    const editDistance = getEditDistance(str1, str2);
    return (longer - editDistance) / longer;
  };

  // Levenshtein distance
  const getEditDistance = (s1, s2) => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  const xMappedValue = mapX(xInput);
  const yMappedValue = mapY(yInput);

  // Get display labels for matched values
  const getDisplayLabel = (mappedValue, options) => {
    const opt = options.find(o => o.value === mappedValue);
    return opt ? opt.label : '';
  };

  useEffect(() => {
    setXInput(axisX || '');
    setXMatched(mapX(axisX || ''));
  }, [axisX]);

  useEffect(() => {
    setYInput(axisY || '');
    setYMatched(mapY(axisY || ''));
  }, [axisY]);

  const filteredXAxis = useMemo(() => {
    if (!xInput) return X_AXIS_OPTIONS;
    const normalized = normalize(xInput).toLowerCase();
    return X_AXIS_OPTIONS.filter(opt => 
      opt.label.toLowerCase().includes(normalized) ||
      opt.value.toLowerCase().includes(normalized)
    );
  }, [xInput]);

  const filteredYAxis = useMemo(() => {
    if (!yInput) return Y_AXIS_OPTIONS;
    const normalized = normalize(yInput).toLowerCase();
    return Y_AXIS_OPTIONS.filter(opt => 
      opt.label.toLowerCase().includes(normalized) ||
      opt.value.toLowerCase().includes(normalized)
    );
  }, [yInput]);

  const selectXAxis = (label, value) => {
    setXInput(label);
    onAxisXChange(label);
    setXMatched(value);
    setShowXSuggestions(false);
  };

  const selectYAxis = (label, value) => {
    setYInput(label);
    onAxisYChange(label);
    setYMatched(value);
    setShowYSuggestions(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#475569' }}>Analyse personnalisée</label>
        <input
          type="text"
          value={customAnalysis}
          placeholder="e.g., Nombre de cas par wilaya"
          onChange={(e) => onCustomAnalysisChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ position: 'relative' }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#475569' }}>X Axis (Catégorie)</label>
        <input
          type="text"
          value={xInput}
          placeholder="Ex: Wilaya, Année, Sexe..."
          onFocus={() => setShowXSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowXSuggestions(false), 150);
            const matched = mapX(xInput);
            if (matched) {
              setXMatched(matched);
              onAxisXChange(xInput);
            } else if (xInput.trim().length > 0) {
              setXInput('');
              setXMatched('');
              onAxisXChange('');
            }
          }}
          onChange={(e) => {
            setXInput(e.target.value);
            onAxisXChange(e.target.value);
            const matched = mapX(e.target.value);
            setXMatched(matched);
          }}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: xMappedValue ? '1.5px solid #059669' : '1.5px solid #cbd5e1',
            fontFamily: 'inherit',
            background: xMappedValue ? '#f0fdf4' : '#fff'
          }}
        />
        {showXSuggestions && filteredXAxis.length > 0 && (
          <div style={{
            position: 'absolute',
            zIndex: 20,
            top: '100%',
            left: 0,
            right: 0,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            maxHeight: 160,
            overflowY: 'auto',
            marginTop: 4,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {filteredXAxis.map((opt) => (
              <div
                key={opt.value}
                onMouseDown={() => selectXAxis(opt.label, opt.value)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  hover: { background: '#f8fafc' }
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>valeur: {opt.value}</div>
              </div>
            ))}
          </div>
        )}
        {xMappedValue && (
          <div style={{
            marginTop: 6,
            fontSize: 11,
            color: '#059669',
            background: '#f0fdf4',
            padding: '6px 10px',
            borderRadius: 6,
            fontWeight: 600
          }}>
            ✓ Reconnu: {getDisplayLabel(xMappedValue, X_AXIS_OPTIONS)}
          </div>
        )}
        {!xMappedValue && xInput && (
          <div style={{
            marginTop: 6,
            fontSize: 11,
            color: '#dc2626',
            fontWeight: 500
          }}>
            ⚠ Entrée non reconnue
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#475569' }}>Y Axis (Métrique)</label>
        <input
          type="text"
          value={yInput}
          placeholder="Ex: Nombre de cas, Pourcentage..."
          onFocus={() => setShowYSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowYSuggestions(false), 150);
            const matched = mapY(yInput);
            if (matched) {
              setYMatched(matched);
              onAxisYChange(yInput);
            } else if (yInput.trim().length > 0) {
              setYInput('');
              setYMatched('');
              onAxisYChange('');
            }
          }}
          onChange={(e) => {
            setYInput(e.target.value);
            onAxisYChange(e.target.value);
            const matched = mapY(e.target.value);
            setYMatched(matched);
          }}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: yMappedValue ? '1.5px solid #059669' : '1.5px solid #cbd5e1',
            fontFamily: 'inherit',
            background: yMappedValue ? '#f0fdf4' : '#fff'
          }}
        />
        {showYSuggestions && filteredYAxis.length > 0 && (
          <div style={{
            position: 'absolute',
            zIndex: 20,
            top: '100%',
            left: 0,
            right: 0,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            maxHeight: 160,
            overflowY: 'auto',
            marginTop: 4,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {filteredYAxis.map((opt) => (
              <div
                key={opt.value}
                onMouseDown={() => selectYAxis(opt.label, opt.value)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>valeur: {opt.value}</div>
              </div>
            ))}
          </div>
        )}
        {yMappedValue && (
          <div style={{
            marginTop: 6,
            fontSize: 11,
            color: '#059669',
            background: '#f0fdf4',
            padding: '6px 10px',
            borderRadius: 6,
            fontWeight: 600
          }}>
            ✓ Reconnu: {getDisplayLabel(yMappedValue, Y_AXIS_OPTIONS)}
          </div>
        )}
        {!yMappedValue && yInput && (
          <div style={{
            marginTop: 6,
            fontSize: 11,
            color: '#dc2626',
            fontWeight: 500
          }}>
            ⚠ Entrée non reconnue
          </div>
        )}
      </div>

      {errorMessage && (
        <div style={{ color: '#dc2626', fontSize: 12, padding: '10px 12px', background: '#fee2e2', borderRadius: 6, border: '1px solid #fecaca' }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default AxisSelector;
