import React from 'react';

const DataPreview = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ color: '#6b7280', fontSize: 12 }}>Aucune donnée correspondante</div>;
  const previewRows = data.slice(0, 12);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8fafc', color: '#334155' }}>
            <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>Wilaya</th>
            <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>Daïra</th>
            <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>Année</th>
            <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>Cancer</th>
            <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>Sexe</th>
            <th style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>Cas</th>
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, i) => (
            <tr key={`preview-${i}`} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
              <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{row.wilaya}</td>
              <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{row.daira || '-'}</td>
              <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{row.year}</td>
              <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{row.cancer}</td>
              <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{row.sex}</td>
              <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{row.cases}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > previewRows.length && (
        <div style={{ marginTop: 8, color: '#64748b', fontSize: 11 }}>Affichage {previewRows.length} sur {data.length} enregistrements</div>
      )}
    </div>
  );
};

export default DataPreview;
