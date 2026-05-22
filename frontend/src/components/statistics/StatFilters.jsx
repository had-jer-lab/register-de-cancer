import React from 'react';

export const StatFilters = ({ filters, onFilterChange, loading, allDairat = [] }) => {
  const handleChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sexe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sexe
          </label>
          <select
            value={filters.sexe}
            onChange={(e) => handleChange('sexe', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            <option value="all">Tous</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>

        {/* Âge */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tranche d'âge
          </label>
          <select
            value={filters.age}
            onChange={(e) => handleChange('age', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            <option value="all">Toutes</option>
            <option value="0-14">0-14 ans</option>
            <option value="15-29">15-29 ans</option>
            <option value="30-44">30-44 ans</option>
            <option value="45-59">45-59 ans</option>
            <option value="60+">60+ ans</option>
          </select>
        </div>

        {/* Année */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Année
          </label>
          <select
            value={filters.annee}
            onChange={(e) => handleChange('annee', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            <option value="all">Toutes</option>
            <option value="2020">2020</option>
            <option value="2021">2021</option>
            <option value="2022">2022</option>
            <option value="2023">2023</option>
            <option value="2024">2024</option>
          </select>
        </div>

        {/* Daïra */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daïra
          </label>
          <select
            value={filters.daira}
            onChange={(e) => handleChange('daira', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            <option value="all">Toutes</option>
            {allDairat.map((daira) => (
              <option key={daira.code} value={daira.code}>
                {daira.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default StatFilters;
