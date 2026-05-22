import React from 'react';

const Filters = ({ filters, onChange, allWilayas, allDairas, allCancers, availableYears }) => {
  const handleInput = (key) => (e) => {
    const val = e.target.value;
    onChange({ ...filters, [key]: val });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(180px,1fr))', gap: 12 }}>
      <div>
        <label style={{ fontSize: 11, marginBottom: 5, display: 'block', color: '#475569' }}>Sexe</label>
        <select value={filters.sex} onChange={handleInput('sex')} style={{ width: '100%', borderRadius: 8, border: '1.5px solid #cbd5e1', padding: '8px 10px' }}>
          <option value="">Tous</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, marginBottom: 5, display: 'block', color: '#475569' }}>Tranche d'âge</label>
        <select value={filters.age} onChange={handleInput('age')} style={{ width: '100%', borderRadius: 8, border: '1.5px solid #cbd5e1', padding: '8px 10px' }}>
          <option value="">Tous</option>
          {['0–14', '15–29', '30–44', '45–59', '60+'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, marginBottom: 5, display: 'block', color: '#475569' }}>Type de cancer</label>
        <select value={filters.cancer} onChange={(e) => onChange({ ...filters, cancer: e.target.value })} style={{ width: '100%', borderRadius: 8, border: '1.5px solid #cbd5e1', padding: '8px 10px' }}>
          <option value="">Tous</option>
          {allCancers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, marginBottom: 5, display: 'block', color: '#475569' }}>Wilaya</label>
        <select value={filters.wilaya} onChange={handleInput('wilaya')} style={{ width: '100%', borderRadius: 8, border: '1.5px solid #cbd5e1', padding: '8px 10px' }}>
          <option value="">Toutes</option>
          {allWilayas.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, marginBottom: 5, display: 'block', color: '#475569' }}>Daira</label>
        <select value={filters.daira} onChange={handleInput('daira')} style={{ width: '100%', borderRadius: 8, border: '1.5px solid #cbd5e1', padding: '8px 10px' }}>
          <option value="">Toutes</option>
          {allDairas.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, marginBottom: 5, display: 'block', color: '#475569' }}>Année début</label>
          <select value={filters.yearStart} onChange={handleInput('yearStart')} style={{ width: '100%', borderRadius: 8, border: '1.5px solid #cbd5e1', padding: '8px 10px' }}>
            <option value=""> -- </option>
            {availableYears.map((year) => <option key={`start-${year}`} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, marginBottom: 5, display: 'block', color: '#475569' }}>Année fin</label>
          <select value={filters.yearEnd} onChange={handleInput('yearEnd')} style={{ width: '100%', borderRadius: 8, border: '1.5px solid #cbd5e1', padding: '8px 10px' }}>
            <option value=""> -- </option>
            {availableYears.map((year) => <option key={`end-${year}`} value={year}>{year}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Filters;
