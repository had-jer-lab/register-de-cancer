import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../utils/apiConfig';



// Mock data for demonstration - will be replaced by real API
const MOCK_DATA = {
  total_cases: 3364164,
  total_categories: 87,
  dominant_wilaya: "Alger",
  wilayas: [
    {
      code: "16",
      name: "Alger",
      cases: 654321,
      percentage: 19.5,
      risk_factors: { eau: 45, pollution: 62, tabac: 58, soleil: 35, heredite: 48 },
      dairat: [
        { code: "1601", name: "Alger Centre", cases: 123456, percentage: 18.9 },
        { code: "1602", name: "Bab El Oued", cases: 98765, percentage: 15.1 },
        { code: "1603", name: "Kouba", cases: 87654, percentage: 13.4 }
      ]
    },
    {
      code: "25",
      name: "Constantine",
      cases: 445678,
      percentage: 13.2,
      risk_factors: { eau: 38, pollution: 45, tabac: 52, soleil: 42, heredite: 40 },
      dairat: [
        { code: "2501", name: "Constantine Centre", cases: 156789, percentage: 35.2 },
        { code: "2502", name: "Ain Abid", cases: 98765, percentage: 22.1 }
      ]
    },
    {
      code: "31",
      name: "Oran",
      cases: 389234,
      percentage: 11.6,
      risk_factors: { eau: 42, pollution: 55, tabac: 60, soleil: 40, heredite: 45 },
      dairat: [
        { code: "3101", name: "Oran Centre", cases: 145234, percentage: 37.3 },
        { code: "3102", name: "Es Senia", cases: 98765, percentage: 25.4 }
      ]
    },
    {
      code: "15",
      name: "Tizi Ouzou",
      cases: 267845,
      percentage: 8.0,
      risk_factors: { eau: 35, pollution: 40, tabac: 48, soleil: 38, heredite: 35 },
      dairat: [
        { code: "1501", name: "Tizi Ouzou Centre", cases: 98765, percentage: 36.8 },
        { code: "1502", name: "Draâ El Mizan", cases: 65234, percentage: 24.3 }
      ]
    },
    {
      code: "19",
      name: "Sétif",
      cases: 234567,
      percentage: 7.0,
      risk_factors: { eau: 40, pollution: 48, tabac: 55, soleil: 45, heredite: 42 },
      dairat: [
        { code: "1901", name: "Sétif Centre", cases: 87654, percentage: 37.4 },
        { code: "1902", name: "Aïn Oulmene", cases: 54321, percentage: 23.2 }
      ]
    },
    {
      code: "06",
      name: "Béjaïa",
      cases: 198765,
      percentage: 5.9,
      risk_factors: { eau: 32, pollution: 38, tabac: 45, soleil: 32, heredite: 38 },
      dairat: [
        { code: "0601", name: "Béjaïa Centre", cases: 78654, percentage: 39.5 },
        { code: "0602", name: "Akbou", cases: 54321, percentage: 27.3 }
      ]
    }
  ]
};

/**
 * Custom hook for fetching and managing geographic statistics
 */
export const useGeographicStats = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    sexe: 'all',
    age: 'all',
    annee: 'all',
    daira: 'all',
  });

  // Fetch data on filter change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE}/statistics/geographic`, {
          params: filters,
          timeout: 5000,
        });
        setData(response.data);
      } catch (err) {
        // Fallback to mock data if API fails
        console.warn('API not available, using mock data:', err.message);
        setData(MOCK_DATA);
        // Don't set error - use mock data gracefully
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      sexe: 'all',
      age: 'all',
      annee: 'all',
      daira: 'all',
    });
  };

  return {
    data,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
  };
};

export default useGeographicStats;


