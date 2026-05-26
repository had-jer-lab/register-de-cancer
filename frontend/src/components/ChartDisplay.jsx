import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#2563eb', '#e05c4b', '#059669', '#f59e0b', '#7c3aed', '#0891b2', '#6366f1', '#84cc16'];

const ChartDisplay = ({ chartData, chartType, axisX, axisY }) => {
  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) return <div style={{ padding: 22, color: '#64748b' }}>Aucune donnï؟½e de graphiques.</div>;

  const renderCommon = (children) => (
    <div style={{ background: 'white', borderRadius: 12, padding: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  );

  if (chartType === 'pie') {
    return renderCommon(
      <PieChart width={450} height={300}>
        <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={100} paddingAngle={2}>
          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    );
  }

  if (chartType === 'line') {
    return renderCommon(
      <LineChart width={570} height={300} data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
      </LineChart>
    );
  }

  if (chartType === 'area') {
    return renderCommon(
      <AreaChart width={570} height={300} data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke="#2563eb" fillOpacity={1} fill="url(#colorValue)" />
      </AreaChart>
    );
  }

  return renderCommon(
    <BarChart width={570} height={300} data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="label" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="value" fill="#2563eb" />
    </BarChart>
  );
};

export default ChartDisplay;
