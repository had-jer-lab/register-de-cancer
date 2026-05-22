import React from 'react';
import { Droplets, Wind, Cigarette, Sun, Dna } from 'lucide-react';
import { RISK_FACTOR_COLORS, getRiskColor, getRiskLabel } from '../../utils/mapColors';

const RISK_ICONS = {
  Droplets,
  Wind,
  Cigarette,
  Sun,
  Dna,
};

export const RiskFactorPanel = ({ wilaya = {}, daira = null }) => {
  const riskData = daira?.risk_factors || wilaya?.risk_factors || {};

  const riskFactors = [
    { key: 'eau', ...RISK_FACTOR_COLORS.eau, value: riskData.eau || 0 },
    { key: 'pollution', ...RISK_FACTOR_COLORS.pollution, value: riskData.pollution || 0 },
    { key: 'tabac', ...RISK_FACTOR_COLORS.tabac, value: riskData.tabac || 0 },
    { key: 'soleil', ...RISK_FACTOR_COLORS.soleil, value: riskData.soleil || 0 },
    { key: 'heredite', ...RISK_FACTOR_COLORS.heredite, value: riskData.heredite || 0 },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Facteurs de risque</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {riskFactors.map((factor) => {
          const IconComponent = RISK_ICONS[factor.icon];
          const barColor = getRiskColor(factor.value);
          const label = getRiskLabel(factor.value);
          
          return (
            <div
              key={factor.key}
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: `${factor.color}20` }}
              >
                {IconComponent && (
                  <IconComponent
                    size={24}
                    style={{ color: factor.color }}
                  />
                )}
              </div>
              
              <div className="text-center mb-2">
                <p className="text-sm font-medium text-gray-900">{factor.name}</p>
              </div>
              
              <div className="w-full">
                <div className="w-full bg-gray-300 rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(factor.value, 100)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-900">
                    {Math.round(factor.value)}
                  </span>
                  <span className="text-xs font-medium text-gray-600">
                    {label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskFactorPanel;
