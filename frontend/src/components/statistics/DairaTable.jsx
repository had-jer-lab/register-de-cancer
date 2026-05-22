import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const DairaTable = ({ data = [], selectedWilaya = null, loading = false }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Prepare table data - can be categories, daïras, or mixed
  const tableData = Array.isArray(data) ? data : [];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!tableData.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center text-gray-500">
        Aucune donnée disponible {selectedWilaya ? `pour ${selectedWilaya.name}` : ''}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide w-12">#</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide">Catégorie</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs uppercase tracking-wide w-20">Cas</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs uppercase tracking-wide w-20">% Total</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide flex-1">Distribution</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => {
              const isExpanded = expandedRows.has(index);
              const hasChildren = row.children && row.children.length > 0;
              const percentage = row.percentage || (row.cases / tableData.reduce((sum, r) => sum + (r.cases || 0), 0) * 100).toFixed(1);
              const barWidth = Math.round((row.cases / Math.max(...tableData.map(r => r.cases || 0))) * 100);

              return (
                <React.Fragment key={index}>
                  <tr className={`border-b border-gray-100 hover:bg-gray-50 transition ${isExpanded ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-700 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{row.name || row.categorie || `Catégorie ${index + 1}`}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">{(row.cases || 0).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{typeof percentage === 'string' ? percentage : percentage.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasChildren && (
                        <button
                          onClick={() => toggleExpanded(index)}
                          className="inline-flex items-center justify-center p-1 hover:bg-gray-200 rounded transition"
                          title={isExpanded ? "Réduire" : "Développer"}
                        >
                          <ChevronDown
                            size={16}
                            className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded child rows */}
                  {isExpanded && hasChildren && (
                    row.children.map((child, childIndex) => {
                      const childPercentage = child.percentage || (child.cases / row.cases * 100).toFixed(1);
                      const childBarWidth = Math.round((child.cases / row.cases) * 100);

                      return (
                        <tr
                          key={`${index}-child-${childIndex}`}
                          className="bg-blue-50 border-b border-gray-100 hover:bg-blue-100 transition"
                        >
                          <td className="px-4 py-2 text-gray-600"></td>
                          <td className="px-4 py-2 pl-12 text-gray-700 text-sm">
                            <span className="inline-block ml-4">
                              └ {child.name || child.daira_name || `Sous-catégorie ${childIndex + 1}`}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700 text-sm">{(child.cases || 0).toLocaleString('fr-FR')}</td>
                          <td className="px-4 py-2 text-right text-gray-600 text-sm">
                            {typeof childPercentage === 'string' ? childPercentage : childPercentage.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full"
                                style={{ width: `${childBarWidth}%` }}
                              ></div>
                            </div>
                          </td>
                          <td></td>
                        </tr>
                      );
                    })
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* No data message */}
      {tableData.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          Aucune donnée à afficher
        </div>
      )}

      {/* Footer */}
      {tableData.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 flex justify-between items-center">
          <span>
            {tableData.length} enregistrement{tableData.length !== 1 ? 's' : ''} affiché{tableData.length !== 1 ? 's' : ''}
          </span>
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            Voir plus →
          </button>
        </div>
      )}
    </div>
  );
};

export default DairaTable;
