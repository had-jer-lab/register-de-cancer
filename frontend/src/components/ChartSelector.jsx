import React from 'react';

const CHART_OPTIONS = [
  { value: 'bar', label: 'Bar chart' },
  { value: 'stacked_bar', label: 'Stacked bar chart' },
  { value: 'horizontal', label: 'Horizontal bar chart' },
  { value: 'line', label: 'Line chart' },
  { value: 'area', label: 'Area chart' },
  { value: 'scatter', label: 'Scatter plot' },
  { value: 'radar', label: 'Radar chart' },
  { value: 'pie', label: 'Pie chart' },
  { value: 'donut', label: 'Donut chart' },
  { value: 'heatmap', label: 'Heatmap' },
];

const ChartSelector = ({ chartType, onChartTypeChange, allowPie }) => {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#475569' }}>Type de graphique</label>
      <select value={chartType} onChange={(e) => onChartTypeChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontFamily: 'inherit' }}>
        {CHART_OPTIONS.filter(opt => (opt.value === 'pie' || opt.value === 'donut' ? allowPie : true)).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

export default ChartSelector;
