import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../utils/apiConfig';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// html2canvas et jsPDF chargés depuis CDN facultatif (évite erreur si node_modules non installé faute d'espace disque)
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polygon, Popup, Polyline, Tooltip as LeafletTooltip, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import 'leaflet/dist/leaflet.css';
import FilterPanel from '../components/FilterPanel';
import ProfessionalChoroplethMap from '../components/ProfessionalChoroplethMap';
import AxisSelector, { X_AXIS_OPTIONS, Y_AXIS_OPTIONS } from '../components/AxisSelector';
import ChartSelector from '../components/ChartSelector';
import DataPreview from '../components/DataPreview';
import ChartDisplay from '../components/ChartDisplay';
import StatsSummary from '../components/StatsSummary';
import { 
  filterData, 
  aggregateBy, 
  aggregateByWilaya,
  getYearRange 
} from '../utils/dataAggregation';
import {
  isPointInPolygon,
  computeZoneStats,
  computeAQI,
  getRiskLevel,
  getZoneColor,
  computeCompletePollutionData,
  getNearbyWilayas
} from '../utils/zoneUtils';

// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ── GLOBAL VARIABLES FOR CSV EXPORT ─────────────────────────────────────────

// ── SVG ICONS (médical, professionnel) ────────────────────────────────────────
const Icon = {
  chart: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  pie: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
  line: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  donut: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>,
  hbar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="7" x2="14" y2="7"/><line x1="2" y1="12" x2="20" y2="12"/><line x1="2" y1="17" x2="11" y2="17"/><line x1="2" y1="2" x2="2" y2="22"/></svg>,
  area: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 20 L7 12 L11 15 L15 7 L19 10 L21 6" fill="none"/></svg>,
  filter: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  stats: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>,
  cancer: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>,
  gender: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10" cy="8" r="4"/><path d="M14 4h6m0 0v6m0-6-6 6"/><path d="M2 20c0-4 2.7-7 6-7"/></svg>,
  age: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  calendar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  map: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>,
  stethoscope: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>,
  kpi: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  chevron: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  back: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  check: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  print: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  reset: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  syringe: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>,
  hospital: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  image: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  filePdf: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="8" y="13" fontSize="6" fontWeight="bold" fill="currentColor">PDF</text></svg>,
  save: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  folder: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
};

// ── DATA ──────────────────────────────────────────────────────────────────────
const AGE_GROUPS = ["0–14", "15–29", "30–44", "45–59", "60+"];
let YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
// Wilayas d'Algérie
let WILAYAS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra",
  "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret",
  "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda",
  "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem",
  "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi",
  "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt",
  "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla",
  "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar",
  "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam", "Touggourt",
  "Djanet", "El M'Ghair", "El Meniaa"
];

// Dairas de Tlemcen
const DAIRAS = [
  "Aïn Fezza", "Aïn Ghoraba", "Aïn Kebira", "Aïn Tallout", "Beni Bahdel",
  "Beni Boussaid", "Beni Ourtilane", "Beni Snous", "Bensekrane", "Beni Ouarsous",
  "Chetouane", "El Aricha", "El Fehoul", "Fellaoucene", "Ghazaouet", "Hammam Boughrara",
  "Hennaya", "Maghnia", "Mansourah", "Nedroma", "Ouled Mimoun", "Remchi",
  "Sabra", "Sebdou", "Sidi Abdelli", "Sidi Medjahed", "Souahlia", "Souani",
  "Tlemcen", "Zenata"
];

// Coordonnées GPS approximatives pour les wilayas d'Algérie
const WILAYA_COORDINATES = {
  "Adrar": [27.9768, -0.2928],
  "Chlef": [36.1667, 1.3333],
  "Laghouat": [33.8000, 2.8667],
  "Oum El Bouaghi": [35.8667, 7.1167],
  "Batna": [35.5500, 6.1667],
  "Béjaïa": [36.7500, 5.0667],
  "Biskra": [34.8500, 5.7333],
  "Béchar": [31.6167, -2.2167],
  "Blida": [36.4167, 2.8333],
  "Bouira": [36.3667, 3.9000],
  "Tamanrasset": [22.7850, 5.5228],
  "Tébessa": [35.4000, 8.1167],
  "Tlemcen": [34.8783, -1.3150],
  "Tiaret": [35.3667, 1.3167],
  "Tizi Ouzou": [36.7167, 4.0500],
  "Alger": [36.7538, 3.0588],
  "Djelfa": [34.6667, 3.2667],
  "Jijel": [36.8167, 5.7667],
  "Sétif": [36.1833, 5.4167],
  "Saïda": [34.8333, 0.1500],
  "Skikda": [36.8667, 6.9000],
  "Sidi Bel Abbès": [35.2000, -0.6333],
  "Annaba": [36.9000, 7.7667],
  "Guelma": [36.4667, 7.4333],
  "Constantine": [36.3667, 6.6167],
  "Médéa": [36.2667, 2.7500],
  "Mostaganem": [35.9333, 0.0833],
  "M'Sila": [35.7000, 4.5333],
  "Mascara": [35.4000, 0.1333],
  "Ouargla": [31.9500, 5.3333],
  "Oran": [35.6969, -0.6331],
  "El Bayadh": [33.6833, 1.0167],
  "Illizi": [26.4833, 8.4667],
  "Bordj Bou Arréridj": [36.0667, 4.7667],
  "Boumerdès": [36.7667, 3.4667],
  "El Tarf": [36.7667, 8.3167],
  "Tindouf": [27.6667, -8.1333],
  "Tissemsilt": [35.6000, 1.8167],
  "El Oued": [33.3667, 6.8667],
  "Khenchela": [35.4333, 7.1333],
  "Souk Ahras": [36.2833, 7.9500],
  "Tipaza": [36.5833, 2.4500],
  "Mila": [36.4500, 6.2667],
  "Aïn Defla": [36.2667, 1.9667],
  "Naâma": [33.2667, -0.3000],
  "Aïn Témouchent": [35.3000, -1.1333],
  "Ghardaïa": [32.4833, 3.6667],
  "Relizane": [35.7333, 0.5500],
  "Timimoun": [29.2667, 0.2333],
  "Bordj Badji Mokhtar": [21.3167, 0.9667],
  "Ouled Djellal": [34.4167, 5.0833],
  "Béni Abbès": [30.1333, -2.1667],
  "In Salah": [27.2000, 2.4667],
  "In Guezzam": [19.5667, 5.7667],
  "Touggourt": [33.1167, 6.0667],
  "Djanet": [24.5500, 9.4833],
  "El M'Ghair": [33.9500, 5.9167],
  "El Meniaa": [30.5833, 2.8833]
};

// Coordonnées GPS approximatives pour les dairas de Tlemcen
const DAIRA_COORDINATES = {
  "Aïn Fezza": [34.9667, -1.2833],
  "Aïn Ghoraba": [35.0167, -1.2833],
  "Aïn Kebira": [34.8833, -1.2833],
  "Aïn Tallout": [34.8167, -1.2833],
  "Beni Bahdel": [34.8167, -1.2833],
  "Beni Boussaid": [34.8167, -1.2833],
  "Beni Ourtilane": [34.8167, -1.2833],
  "Beni Snous": [34.8167, -1.2833],
  "Bensekrane": [35.0667, -1.2167],
  "Beni Ouarsous": [34.8167, -1.2833],
  "Chetouane": [34.9167, -1.2833],
  "El Aricha": [34.8833, -1.2833],
  "El Fehoul": [34.8167, -1.2833],
  "Fellaoucene": [34.7167, -1.2833],
  "Ghazaouet": [35.0833, -1.8167],
  "Hammam Boughrara": [35.0667, -1.2833],
  "Hennaya": [34.95, -1.3667],
  "Maghnia": [34.8167, -1.7333],
  "Mansourah": [34.8667, -1.3333],
  "Nedroma": [35.0167, -1.7333],
  "Ouled Mimoun": [34.9, -1.0333],
  "Remchi": [35.0667, -1.4333],
  "Sabra": [34.8167, -1.2833],
  "Sebdou": [34.6333, -1.3333],
  "Sidi Abdelli": [34.8167, -1.2833],
  "Sidi Medjahed": [34.8167, -1.2833],
  "Souahlia": [35.2833, -1.2833],
  "Souani": [34.9167, -1.2833],
  "Tlemcen": [34.8783, -1.3150],
  "Zenata": [34.8167, -1.2833]
};
const STADES = ["Stade I","Stade II","Stade III","Stade IV"];
const AGE_VALUE_MAP = { '0–14':7, '15–29':22, '30–44':37, '45–59':52, '60+':67 };
const MONTH_ORDER = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MODES_DIAG = ["Dépistage","Symptômes","Urgence","Bilan de routine"];
const TRAITEMENTS = ["Chirurgie","Chimiothérapie","Radiothérapie","Thérapie ciblée","Immunothérapie"];
const PALETTE = ["#2563eb","#e05c4b","#059669","#d97706","#7c3aed","#0891b2","#db2777","#f0a070","#6366f1","#84cc16"];

const CANCER_COLORS = {
  'Sein':            '#e05c4b',
  'Breast':          '#e05c4b',
  'Colorectal':      '#f0a070',
  'Poumon':          '#2563eb',
  'Lung':            '#2563eb',
  'Col de l\'utérus':'#7c3aed',
  'Prostate':        '#0891b2',
  'Estomac':         '#059669',
  'Thyroïde':        '#d97706',
  'Leucémie':        '#db2777',
};

const normalizeLabel = (v) => (v || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');

// Similarity scoring
const getSimilarityScore = (str1, str2) => {
  const s1 = str1.length;
  const s2 = str2.length;
  const longer = s1 > s2 ? s1 : s2;
  if (longer === 0) return 1.0;
  const editDistance = getEditDistance(str1, str2);
  return (longer - editDistance) / longer;
};

// Levenshtein distance algorithm
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

const X_AXIS_MAPPING = {
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

const Y_AXIS_MAPPING = {
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
  age: 'avg_age',
  âge: 'avg_age',
  'age moyen': 'avg_age',
  'age moyen ': 'avg_age',
  'âge moyen': 'avg_age',
  'moyenne d age': 'avg_age',
  'moyenne d âge': 'avg_age',
  'moyenne age': 'avg_age',
  'moyenne âge': 'avg_age',
  moyenne: 'avg_age',
  avg_age: 'avg_age',
  'average age': 'avg_age',
  'somme age': 'sum_age',
  'somme âge': 'sum_age',
  'somme des ages': 'sum_age',
  'somme des âges': 'sum_age',
  'sum age': 'sum_age',
  'sum of ages': 'sum_age',
  sum_age: 'sum_age',
};

function findBestXKey(value) {
  if (!value) return '';
  const k = normalizeLabel(value);
  
  // Exact match first
  if (X_AXIS_MAPPING[k]) return X_AXIS_MAPPING[k];
  
  // Partial match - containment
  const partial = Object.entries(X_AXIS_MAPPING).find(([src]) => k.includes(src) || src.includes(k));
  if (partial) return partial[1];
  
  // Fuzzy match with Levenshtein distance
  let bestMatch = '';
  let bestScore = 0;
  for (const [src, val] of Object.entries(X_AXIS_MAPPING)) {
    const score = getSimilarityScore(k, src);
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      bestMatch = val;
    }
  }
  return bestMatch;
}

function findBestYKey(value) {
  if (!value) return '';
  const k = normalizeLabel(value);
  
  // Exact match first
  if (Y_AXIS_MAPPING[k]) return Y_AXIS_MAPPING[k];
  
  // Partial match - containment
  const partial = Object.entries(Y_AXIS_MAPPING).find(([src]) => k.includes(src) || src.includes(k));
  if (partial) return partial[1];
  
  // Fuzzy match with Levenshtein distance
  let bestMatch = '';
  let bestScore = 0;
  for (const [src, val] of Object.entries(Y_AXIS_MAPPING)) {
    const score = getSimilarityScore(k, src);
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      bestMatch = val;
    }
  }
  return bestMatch;
}

function getAxisXKey(label) {
  return findBestXKey(label);
}

function getAxisYKey(label) {
  return findBestYKey(label);
}

function isValidXAxis(label) {
  return Boolean(getAxisXKey(label));
}

function isValidYAxis(label) {
  return Boolean(getAxisYKey(label));
}

function seededRand(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
const rng = seededRand(42);
// FALLBACK DATA (used when API is unavailable)
const FALLBACK_DATA = [];
const FALLBACK_CANCERS = [
  { id: "sein", label: "Sein", color: "#e05c4b" },
  { id: "colorectal", label: "Colorectal", color: "#f0a070" },
  { id: "poumon", label: "Poumon", color: "#2563eb" },
  { id: "col_uterus", label: "Col de l'utérus", color: "#7c3aed" },
  { id: "prostate", label: "Prostate", color: "#0891b2" },
  { id: "estomac", label: "Estomac", color: "#059669" },
  { id: "thyroide", label: "Thyroïde", color: "#d97706" },
  { id: "leucemie", label: "Leucémie", color: "#db2777" },
];
FALLBACK_CANCERS.forEach(c => AGE_GROUPS.forEach(ag => ["M","F"].forEach(sex => YEARS.forEach(year => MONTHS.forEach(month => STADES.forEach(stade => {
  // Générer des données pour les dairas de Tlemcen
  DAIRAS.forEach(daira => {
    let base = 0.5 + rng() * 3;
    if (c.id === "sein" && sex === "F") base = 3 + rng() * 6;
    if (c.id === "sein" && sex === "M") base = rng() * 0.3;
    if (c.id === "prostate" && sex === "M") base = 2 + rng() * 5;
    if (c.id === "prostate" && sex === "F") base = 0;
    if (c.id === "col_uterus" && sex === "F") base = 1.5 + rng() * 4;
    if (c.id === "col_uterus" && sex === "M") base = 0;
    if (ag === "0–14") base *= 0.08;
    if (ag === "60+") base *= 1.6;
    const cases = Math.max(0, Math.round(base * (1 + (year - 2018) * 0.04) * (stade === "Stade I" ? 1.2 : stade === "Stade II" ? 1 : stade === "Stade III" ? 0.7 : 0.4)));
    if (cases > 0) FALLBACK_DATA.push({ cancer: c.id, age: ag, sex, year, month, wilaya: "Tlemcen", daira, stade, mode: MODES_DIAG[Math.floor(rng() * 4)], traitement: TRAITEMENTS[Math.floor(rng() * 5)], cases });
  });
  
  // Générer des données pour les autres wilayas
  WILAYAS.filter(w => w !== "Tlemcen").forEach(wilaya => {
    let base = 0.5 + rng() * 3;
    if (c.id === "sein" && sex === "F") base = 3 + rng() * 6;
    if (c.id === "sein" && sex === "M") base = rng() * 0.3;
    if (c.id === "prostate" && sex === "M") base = 2 + rng() * 5;
    if (c.id === "prostate" && sex === "F") base = 0;
    if (c.id === "col_uterus" && sex === "F") base = 1.5 + rng() * 4;
    if (c.id === "col_uterus" && sex === "M") base = 0;
    if (ag === "0–14") base *= 0.08;
    if (ag === "60+") base *= 1.6;
    const cases = Math.max(0, Math.round(base * (1 + (year - 2018) * 0.04) * (stade === "Stade I" ? 1.2 : stade === "Stade II" ? 1 : stade === "Stade III" ? 0.7 : 0.4)));
    if (cases > 0) FALLBACK_DATA.push({ cancer: c.id, age: ag, sex, year, month, wilaya, daira: null, stade, mode: MODES_DIAG[Math.floor(rng() * 4)], traitement: TRAITEMENTS[Math.floor(rng() * 5)], cases });
  });
}))))));

function aggBy(data, key, labelMap = null) {
  const map = {};
  data.forEach(d => { map[d[key]] = (map[d[key]] || 0) + d.cases; });
  return Object.entries(map).map(([k, v]) => ({ id: k, label: labelMap ? (labelMap[k] || k) : k, value: v })).sort((a, b) => b.value - a.value);
}

function normalizeMode(mode) {
  if (!mode) return 'Non renseigné';
  const m = mode.toString().toLowerCase();
  if (m.includes('dépist') || m.includes('screen')) return 'Dépistage';
  if (m.includes('sympt')) return 'Symptômes';
  if (m.includes('urgent') || m.includes('emerg')) return 'Urgence';
  if (m.includes('routine') || m.includes('bilan')) return 'Bilan de routine';
  return mode;
}

function normalizeTraitement(t) {
  if (!t) return 'Non renseigné';
  const v = t.toString().toLowerCase();
  if (v.includes('chirur') || v.includes('surg')) return 'Chirurgie';
  if (v.includes('chimio') || v.includes('chemo')) return 'Chimiothérapie';
  if (v.includes('radio')) return 'Radiothérapie';
  if (v.includes('ciblé') || v.includes('target')) return 'Thérapie ciblée';
  if (v.includes('immuno')) return 'Immunothérapie';
  return t;
}

function normalizeStatus(s) {
  if (!s) return null;
  const v = s.toString().toLowerCase();
  if (v.includes('traitement') || v.includes('treatment') || v.includes('actif')) return 'en_traitement';
  if (v.includes('guéri') || v.includes('gueri') || v.includes('recovered')) return 'gueri';
  if (v.includes('décédé') || v.includes('decede') || v.includes('dead') || v.includes('mort')) return 'decede';
  return null;
}

function deducePatientStatus(d) {
  const status = normalizeStatus(d.status || d.patient_status || d.etat || d.statut);
  if (status) return status;
  const stage = (d.stade || '').toString().trim();
  if (stage === 'Stade I' || stage === 'Stade II') return 'gueri';
  if (stage === 'Stade III') return 'en_traitement';
  if (stage === 'Stade IV') return 'decede';
  const year = Number(d.year);
  if (year && year <= new Date().getFullYear() - 2) return 'gueri';
  return null;
}

// ── EXTRACTION DES ANNÉES DISPONIBLES ──────────────────────────────────────
function getAvailableYears(dataSource = null) {
  // Use provided data source, FALLBACK_DATA, or empty array
  const data = Array.isArray(dataSource) && dataSource.length > 0
    ? dataSource
    : (typeof FALLBACK_DATA !== 'undefined' && Array.isArray(FALLBACK_DATA) && FALLBACK_DATA.length > 0)
      ? FALLBACK_DATA
      : [];
  
  if (!data.length) return [];
  
  // Extract and sort all years from data, no filtering
  const years = [...new Set(data
    .map(d => d.year)
    .filter(y => y && !isNaN(y))
  )].sort((a, b) => a - b);
  
  return years.length > 0 ? years : [];
}

// ── FILTRES RAPIDES DE PÉRIODE ─────────────────────────────────────────────
function getQuickPeriodFilters(availableYears) {
  const maxYear = availableYears && availableYears.length > 0 ? Math.max(...availableYears) : 2024;
  const minYear = availableYears && availableYears.length > 0 ? Math.min(...availableYears) : 2018;
  return [
    {
      label: "3 dernières années",
      start: Math.max(maxYear - 2, minYear),
      end: maxYear
    },
    {
      label: "5 dernières années", 
      start: Math.max(maxYear - 4, minYear),
      end: maxYear
    },
    {
      label: "Toutes les années",
      start: "",
      end: ""
    }
  ];
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "descriptive", label: "Statistiques Descriptives", icon: Icon.stats, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", desc: "Répartition par type, sexe, tranche d'âge",
    analyses: [
      { id: "by_cancer", label: "Par Type de Cancer", icon: Icon.cancer, desc: "Distribution des cas par type de cancer" },
      { id: "by_sex", label: "Par Sexe", icon: Icon.gender, desc: "Répartition Masculin / Féminin" },
      { id: "by_age", label: "Par Tranche d'âge", icon: Icon.age, desc: "Distribution par groupe d'âge" },
      { id: "top5", label: "Top 5 Cancers", icon: Icon.chart, desc: "Les 5 cancers les plus fréquents" },
      { id: "pivot_cancer_year", label: "Tableau Croisé Cancer × Année", icon: Icon.chart, desc: "Évolution de chaque cancer par année" },
    ]
  },
  { id: "temporal", label: "Évolution Temporelle", icon: Icon.line, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0", desc: "Tendances annuelles, mensuelles, trimestrielles",
    analyses: [
      { id: "by_year", label: "Évolution Annuelle", icon: Icon.calendar, desc: "Progression des cas 2018–2024" },
      { id: "by_month", label: "Répartition Mensuelle", icon: Icon.calendar, desc: "Distribution sur les 12 mois" },
      { id: "by_quarter", label: "Par Trimestre", icon: Icon.calendar, desc: "T1 / T2 / T3 / T4" },
      { id: "compare_periods", label: "Comparer 2 Périodes", icon: Icon.line, desc: "Superposer 2 périodes sur le même graphique" },
      { id: "custom_period", label: "Période Personnalisée", icon: Icon.calendar, desc: "Statistiques sur une période spécifique" },
    ]
  },
  { id: "geographic", label: "Répartition Géographique", icon: Icon.map, color: "#d97706", bg: "#fffbeb", border: "#fde68a", desc: "Comparaison par wilaya — Algérie",
    analyses: [
      { id: "by_wilaya", label: "Par Wilaya", icon: Icon.map, desc: "Classement des wilayas les plus touchées" },
      { id: "compare_wilayas", label: "Comparer 2 Wilayas", icon: Icon.map, desc: "Comparaison côte à côte de 2 wilayas" },
    ]
  },
  { id: "clinical", label: "Données Cliniques", icon: Icon.stethoscope, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", desc: "Stade, traitement, mode de diagnostic",
    analyses: [
      { id: "by_stade", label: "Par Stade (I→IV)", icon: Icon.stethoscope, desc: "Distribution I / II / III / IV" },
      { id: "by_mode_diag", label: "Mode de Diagnostic", icon: Icon.hospital, desc: "Dépistage, symptômes, urgence…" },
      { id: "by_traitement", label: "Type de Traitement", icon: Icon.syringe, desc: "Chirurgie, chimio, radio…" },
      { id: "survie_stade", label: "Taux de Survie", icon: Icon.kpi, desc: "Survie estimée à 1 an par stade" },
      { id: "by_status", label: "Par Statut Patient", icon: Icon.kpi, desc: "En traitement / Guéri / Décédé" },
      { id: "death_stats", label: "Statistiques Décès", icon: Icon.kpi, desc: "Analyse des décès liés au cancer" },
      { id: "taux_guerison", label: "Taux de Guérison", icon: Icon.kpi, desc: "% patients guéris par type de cancer" },
    ]
  },
  { id: "kpi", label: "KPIs & Indicateurs", icon: Icon.kpi, color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", desc: "Tableau de bord synthétique des métriques clés",
    analyses: [
      { id: "kpi_dashboard", label: "Dashboard KPIs", icon: Icon.kpi, desc: "Total, ratio H/F, dominant, survie…" },
    ]
  },
  { id: "custom", label: "Analyse Personnalisée", icon: Icon.plus, color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8", desc: "Choisissez vous-même les champs et le type de graphique",
    analyses: [
      { id: "custom_build", label: "Construire mon analyse", icon: Icon.plus, desc: "Sélectionnez l'axe, les filtres et le graphique librement" },
    ]
  },
];

const CHART_TYPES = [
  { id:"bar",      label:"Histogramme",  icon:Icon.chart, desc:"Comparer des valeurs par catégorie" },
  { id:"line",     label:"Courbe",       icon:Icon.line, desc:"Montrer les tendances dans le temps" },
  { id:"pie",      label:"Camembert",    icon:Icon.pie, desc:"Afficher les proportions" },
  { id:"donut",    label:"Anneau",       icon:Icon.donut, desc:"Proportions avec centre vide" },
  { id:"horizontal",label:"Barres H.",   icon:Icon.hbar, desc:"Barres orientées horizontalement" },
  { id:"area",     label:"Aire",         icon:Icon.area, desc:"Courbe avec zone sous la courbe" },
  { id:"radar",    label:"Radar",        icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="8.5" x2="22" y2="8.5"/><line x1="2" y1="15.5" x2="22" y2="15.5"/></svg>, desc:"Comparer plusieurs variables" },
  { id:"scatter",  label:"Nuage",        icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="5" cy="8" r="2"/><circle cx="19" cy="16" r="2"/></svg>, desc:"Visualiser deux variables" },
  { id:"stacked",  label:"Empilé",       icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="14" width="8" height="6"/><rect x="9" y="8" width="8" height="12"/><rect x="16" y="4" width="8" height="16"/></svg>, desc:"Montrer la composition totale" },
  { id:"waterfall", label:"Cascade",     icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18h6v-6h6v-4h6v10"/></svg>, desc:"Voir la progression cumulée" },
  { id:"bubble",   label:"Bulles",       icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="16" r="3"/><circle cx="14" cy="9" r="5"/><circle cx="5" cy="7" r="2"/></svg>, desc:"Taille = magnitude de valeur" },
  { id:"treemap",  label:"Treemap",      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="9" height="9"/><rect x="12" y="2" width="10" height="5"/><rect x="2" y="12" width="8" height="8"/><rect x="11" y="12" width="11" height="8"/></svg>, desc:"Rectangles proportionnels à valeur" },
  { id:"funnel",   label:"Entonnoir",   icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 3h16M6 8h12M8 13h8M10 18h4"/></svg>, desc:"Montrer une diminution progressive" },
  { id:"gauge",    label:"Jauge",        icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5"/></svg>, desc:"Afficher un KPI en pourcentage" },
  { id:"heatmap",  label:"Heatmap",      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="4" height="4" fill="#fca5a5"/><rect x="7" y="2" width="4" height="4" fill="#fed7aa"/><rect x="12" y="2" width="4" height="4" fill="#fde68a"/><rect x="2" y="7" width="4" height="4" fill="#fed7aa"/><rect x="7" y="7" width="4" height="4" fill="#fde68a"/><rect x="12" y="7" width="4" height="4" fill="#bbf7d0"/></svg>, desc:"Intensité de couleur = valeur" },
];

// ── CHARTS ────────────────────────────────────────────────────────────────────
function CustomPieChart({ data, donut = false, size = 240 }) {
  const [hov, setHov] = useState(null);
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return null;
  let startAngle = -Math.PI / 2;
  const cx = size / 2, cy = size / 2, R = size * 0.39, inner = donut ? R * 0.54 : 0;
  const slices = data.map((d, idx) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const ea = startAngle + angle;
    const col = d.color || PALETTE[idx % PALETTE.length];
    const path = donut
      ? `M${cx+R*Math.cos(startAngle)},${cy+R*Math.sin(startAngle)} A${R},${R},0,${angle>Math.PI?1:0},1,${cx+R*Math.cos(ea)},${cy+R*Math.sin(ea)} L${cx+inner*Math.cos(ea)},${cy+inner*Math.sin(ea)} A${inner},${inner},0,${angle>Math.PI?1:0},0,${cx+inner*Math.cos(startAngle)},${cy+inner*Math.sin(startAngle)} Z`
      : `M${cx},${cy} L${cx+R*Math.cos(startAngle)},${cy+R*Math.sin(startAngle)} A${R},${R},0,${angle>Math.PI?1:0},1,${cx+R*Math.cos(ea)},${cy+R*Math.sin(ea)} Z`;
    const mid = startAngle + angle / 2;
    const slice = { path, color: col, label: d.label, pct: ((d.value/total)*100).toFixed(1), lx: cx+R*0.68*Math.cos(mid), ly: cy+R*0.68*Math.sin(mid), value: d.value };
    startAngle = ea;
    return slice;
  });
  return (
    <svg width={size} height={size} style={{ overflow:"visible" }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={hov===i?2.5:1.5}
          style={{ transform:hov===i?"scale(1.04)":"scale(1)", transformOrigin:`${cx}px ${cy}px`, transition:"transform 0.18s", cursor:"pointer" }}
          onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          <title>{s.label}: {s.value.toLocaleString("fr-FR")} ({s.pct}%)</title>
        </path>
      ))}
      {slices.map((s, i) => parseFloat(s.pct) > 5 && (
        <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fontSize={9.5} fontWeight="700" fill="white" style={{pointerEvents:"none"}}>{s.pct}%</text>
      ))}
      {donut && <>
        <text x={cx} y={cy-8} textAnchor="middle" fontSize={18} fontWeight="700" fill="#0f172a">{total.toLocaleString("fr-FR")}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize={9.5} fill="#94a3b8">total cas</text>
      </>}
    </svg>
  );
}

function CustomBarChart({ data, horizontal=false, yKey='cases', size={w:510,h:275} }) {
  const [hov, setHov] = useState(null);
  const { w, h } = size;
  const pad = { top:18, right:16, bottom:horizontal?28:65, left:horizontal?128:40 };
  const getYAxisLabel = () => {
    if (yKey === 'avg_age') return 'Âge moyen (ans)';
    if (yKey === 'percentage') return '%';
    if (yKey === 'pct_female' || yKey === 'pct_male') return '%';
    return 'Nombre de cas';
  };
  const yLabel = getYAxisLabel();
  const iw = w-pad.left-pad.right, ih = h-pad.top-pad.bottom;
  const maxVal = Math.max(...data.map(d=>d.value), 1);
  const ticks=5, step=Math.ceil(maxVal/ticks/10)*10||1;
  return (
    <svg width={w} height={h}>
      {!horizontal && <text x={-pad.left+8} y={-6} fontSize="10.5" fill="#64748b" fontWeight="500">{yLabel}</text>}
      <g transform={`translate(${pad.left},${pad.top})`}>
        {Array.from({length:ticks+1},(_,i)=>{ const val=i*step; if(val>maxVal*1.15)return null;
          if(horizontal){ const x=(val/maxVal)*iw; return <g key={i}><line x1={x} y1={0} x2={x} y2={ih} stroke="#e2e8f0" strokeWidth={1}/><text x={x} y={ih+14} textAnchor="middle" fontSize={8.5} fill="#94a3b8">{val>=1000?(val/1000).toFixed(0)+"k":val}</text></g>; }
          const y=ih-(val/maxVal)*ih; return <g key={i}><line x1={0} y1={y} x2={iw} y2={y} stroke="#e2e8f0" strokeWidth={1}/><text x={-6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={8.5} fill="#94a3b8">{val>=1000?(val/1000).toFixed(0)+"k":val}</text></g>;
        })}
        {data.map((d,i)=>{ const col=d.color||PALETTE[i%PALETTE.length]; const isHov=hov===i;
          if(horizontal){ const bh=Math.max(8,ih/data.length*0.56); const y=(i/data.length)*ih+(ih/data.length*0.22); const bw=Math.max(0,((d.value??0)/maxVal)*iw);
            return <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
              <rect x={0} y={y} width={bw} height={bh} rx={3} fill={col} opacity={isHov?1:0.85} style={{filter:isHov?`drop-shadow(0 2px 6px ${col}55)`:"none",transition:"all 0.18s"}}><title>{d.label}: {(d.value??0).toLocaleString("fr-FR")}</title></rect>
              <text x={-6} y={y+bh/2} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill="#334155" fontWeight="500">{d.label.length>15?d.label.slice(0,13)+"…":d.label}</text>
              {bw>32&&<text x={bw-7} y={y+bh/2} textAnchor="end" dominantBaseline="middle" fontSize={8.5} fill="white" fontWeight="700">{(d.value??0).toLocaleString("fr-FR")}</text>}
            </g>;
          }
          const bw=Math.max(4,iw/data.length*0.62); const x=(i/data.length)*iw+(iw/data.length*0.19); const bh=Math.max(0,(d.value/maxVal)*ih);
          return <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
            <rect x={x} y={ih-bh} width={bw} height={bh} rx={3} fill={col} opacity={isHov?1:0.85} style={{filter:isHov?`drop-shadow(0 -2px 8px ${col}55)`:"none",transition:"all 0.18s"}}><title>{d.label}: {(d.value??0).toLocaleString("fr-FR")}</title></rect>
            <text x={x+bw/2} y={ih+14} textAnchor="middle" fontSize={8.5} fill="#64748b" transform={data.length>6?`rotate(-38,${x+bw/2},${ih+14})`:""}>{d.label.length>7?d.label.slice(0,6)+"…":d.label}</text>
            {bh>16&&<text x={x+bw/2} y={ih-bh+11} textAnchor="middle" fontSize={8} fill="white" fontWeight="700">{(d.value??0)>=1000?((d.value??0)/1000).toFixed(1)+"k":(d.value??0)}</text>}
          </g>;
        })}
        {!horizontal&&<line x1={0} y1={ih} x2={iw} y2={ih} stroke="#cbd5e1" strokeWidth={1.5}/>}
        {horizontal&&<line x1={0} y1={0} x2={0} y2={ih} stroke="#cbd5e1" strokeWidth={1.5}/>}
      </g>
    </svg>
  );
}

function CustomLineChart({ data, area=false, yKey='cases', size={w:510,h:275} }) {
  const [hov, setHov] = useState(null);
  const { w, h } = size;
  const pad={top:22,right:20,bottom:52,left:44};
  const getYAxisLabel = () => {
    if (yKey === 'avg_age') return 'Âge moyen (ans)';
    if (yKey === 'percentage') return '%';
    if (yKey === 'pct_female' || yKey === 'pct_male') return '%';
    return 'Nombre de cas';
  };
  const yLabel = getYAxisLabel();
  const iw=w-pad.left-pad.right, ih=h-pad.top-pad.bottom;
  const maxVal=Math.max(...data.map(d=>d.value),1);
  const ts=Math.ceil(maxVal/5/10)*10||1;
  const pts=data.map((d,i)=>({x:data.length>1?(i/(data.length-1))*iw:iw/2,y:ih-(d.value/maxVal)*ih,...d}));
  const pathD=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD=pts.length?`M${pts[0].x},${ih} ${pts.map(p=>`L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L${pts[pts.length-1].x},${ih} Z`:"";
  const lc=data[0]?.color||"#2563eb";
  return (
    <svg width={w} height={h}>
      <defs><linearGradient id="aG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lc} stopOpacity="0.18"/><stop offset="100%" stopColor={lc} stopOpacity="0.01"/></linearGradient></defs>
      <text x={-pad.left+8} y={-6} fontSize="10.5" fill="#64748b" fontWeight="500">{yLabel}</text>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {Array.from({length:6},(_,i)=>{ const val=i*ts; const y=ih-(val/maxVal)*ih; return <g key={i}><line x1={0} y1={y} x2={iw} y2={y} stroke="#e2e8f0" strokeWidth={1}/><text x={-7} y={y} textAnchor="end" dominantBaseline="middle" fontSize={8.5} fill="#94a3b8">{val>=1000?(val/1000).toFixed(0)+"k":val}</text></g>; })}
        {area&&<path d={areaD} fill="url(#aG2)"/>}
        <path d={pathD} fill="none" stroke={lc} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" style={{filter:`drop-shadow(0 2px 4px ${lc}33)`}}/>
        {pts.map((p,i)=>(
          <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:"pointer"}}>
            <circle cx={p.x} cy={p.y} r={hov===i?6:4} fill="white" stroke={lc} strokeWidth={2} style={{transition:"r 0.15s"}}/>
            {hov===i&&<><rect x={p.x-38} y={p.y-30} width={76} height={20} rx={5} fill="#0f172a" opacity={0.88}/><text x={p.x} y={p.y-17} textAnchor="middle" fontSize={9} fill="white" fontWeight="600">{p.label}: {p.value.toLocaleString("fr-FR")}</text></>}
            <text x={p.x} y={ih+15} textAnchor="middle" fontSize={8.5} fill="#64748b" transform={data.length>6?`rotate(-38,${p.x},${ih+15})`:""}>{String(p.label).length>8?String(p.label).slice(0,7)+"…":p.label}</text>
          </g>
        ))}
        <line x1={0} y1={ih} x2={iw} y2={ih} stroke="#cbd5e1" strokeWidth={1.5}/>
      </g>
    </svg>
  );
}

function CustomWaterfallChart({ data, size={w:510,h:275} }) {
  const [hov, setHov] = useState(null);
  const { w, h } = size;
  const pad = { top:18, right:16, bottom:65, left:40 };
  const iw = w-pad.left-pad.right, ih = h-pad.top-pad.bottom;
  const maxVal = Math.max(...data.map(d=>d.value), 1);
  const ticks=5, step=Math.ceil(maxVal/ticks/10)*10||1;
  let cumulative = 0;
  const bars = data.map((d,i) => {
    const isNeg = d.value < 0;
    const startY = isNeg ? cumulative : cumulative + d.value;
    const barH = Math.abs(d.value);
    cumulative += d.value;
    return {label:d.label, value:d.value, startY, barH, isNeg, color:d.color||PALETTE[i%PALETTE.length]};
  });
  return (
    <svg width={w} height={h}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {Array.from({length:ticks+1},(_,i)=>{ const val=i*step; if(val>maxVal*1.15)return null;
          const y=ih-(val/maxVal)*ih; return <g key={i}><line x1={0} y1={y} x2={iw} y2={y} stroke="#e2e8f0" strokeWidth={1}/><text x={-6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={8.5} fill="#94a3b8">{val>=1000?(val/1000).toFixed(0)+"k":val}</text></g>;
        })}
        {bars.map((bar,i)=>{ const isHov=hov===i; const x=(i/data.length)*iw+(iw/data.length*0.19); const bw=Math.max(4,iw/data.length*0.62); const y=ih-(bar.startY/maxVal)*ih; const bh=(bar.barH/maxVal)*ih; const col=bar.isNeg?"#f87171":bar.color;
          return <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
            <rect x={x} y={y-bh} width={bw} height={bh} fill={col} opacity={isHov?1:0.85} style={{filter:isHov?`drop-shadow(0 -2px 8px ${col}55)`:"none",transition:"all 0.18s"}}/>
            <text x={x+bw/2} y={ih+14} textAnchor="middle" fontSize={8.5} fill="#64748b">{bar.label.length>7?bar.label.slice(0,6)+"…":bar.label}</text>
            {bh>16&&<text x={x+bw/2} y={y-bh+11} textAnchor="middle" fontSize={8} fill="white" fontWeight="700">{Math.abs(bar.value)>=1000?(Math.abs(bar.value)/1000).toFixed(1)+"k":Math.abs(bar.value)}</text>}
          </g>;
        })}
        <line x1={0} y1={ih} x2={iw} y2={ih} stroke="#cbd5e1" strokeWidth={1.5}/>
      </g>
    </svg>
  );
}

function CustomBubbleChart({ data, size={w:510,h:275} }) {
  const [hov, setHov] = useState(null);
  const { w, h } = size;
  const pad = { top:22, right:20, bottom:52, left:44 };
  const iw = w-pad.left-pad.right, ih = h-pad.top-pad.bottom;
  const maxVal = Math.max(...data.map(d=>d.value), 1);
  const bubbles = data.map((d,i) => ({
    x: ((i+1)/(data.length+1))*iw,
    y: ih - (d.value/maxVal)*ih,
    r: Math.max(8, (d.value/maxVal)*35),
    ...d, color:d.color||PALETTE[i%PALETTE.length]
  }));
  return (
    <svg width={w} height={h}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {Array.from({length:6},(_,i)=>{ const val=i*Math.ceil(maxVal/5/10)*10; const y=ih-(val/maxVal)*ih; return <g key={i}><line x1={0} y1={y} x2={iw} y2={y} stroke="#e2e8f0" strokeWidth={1}/><text x={-7} y={y} textAnchor="end" dominantBaseline="middle" fontSize={8.5} fill="#94a3b8">{val>=1000?(val/1000).toFixed(0)+"k":val}</text></g>; })}
        {bubbles.map((b,i)=>(
          <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:"pointer"}}>
            <circle cx={b.x} cy={b.y} r={hov===i?b.r+3:b.r} fill={b.color} opacity={hov===i?1:0.75} style={{transition:"all 0.18s",filter:hov===i?`drop-shadow(0 2px 6px ${b.color}55)`:"none"}}/>
            {b.r>12&&<text x={b.x} y={b.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="white" fontWeight="700">{b.label.length>4?b.label.slice(0,3):b.label}</text>}
            {hov===i&&<text x={b.x} y={b.y-b.r-12} textAnchor="middle" fontSize={9} fill="#0f172a" fontWeight="600">{b.value.toLocaleString("fr-FR")}</text>}
          </g>
        ))}
        <line x1={0} y1={ih} x2={iw} y2={ih} stroke="#cbd5e1" strokeWidth={1.5}/>
      </g>
    </svg>
  );
}

function CustomTreemapChart({ data, size={w:510,h:275} }) {
  const [hov, setHov] = useState(null);
  const { w, h } = size;
  const total = data.reduce((s,d)=>s+d.value,0);
  const getRects = (data, x, y, w, h) => {
    if(!data.length) return [];
    if(data.length===1) return [{...data[0],x,y,w,h}];
    const mid = Math.floor(data.length/2);
    const totalA = data.slice(0,mid).reduce((s,d)=>s+d.value,0);
    const totalB = data.slice(mid).reduce((s,d)=>s+d.value,0);
    const isHor = w>=h;
    if(isHor) {
      const wA = (totalA/(totalA+totalB))*w;
      return [...getRects(data.slice(0,mid),x,y,wA,h),...getRects(data.slice(mid),x+wA,y,w-wA,h)];
    } else {
      const hA = (totalA/(totalA+totalB))*h;
      return [...getRects(data.slice(0,mid),x,y,w,hA),...getRects(data.slice(mid),x,y+hA,w,h-hA)];
    }
  };
  const rects = getRects([...data].sort((a,b)=>b.value-a.value), 6, 6, w-12, h-12);
  return (
    <svg width={w} height={h}>
      {rects.map((r,i)=>{
        const isHov = hov===i;
        const col = r.color || PALETTE[i%PALETTE.length];
        const fontSize = Math.min(12, Math.max(8, Math.sqrt(r.w*r.h)/4));
        return <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={col} opacity={isHov?1:0.85} stroke="white" strokeWidth={2} style={{filter:isHov?`drop-shadow(0 2px 6px ${col}55)`:"none",transition:"all 0.18s",cursor:"pointer"}}/>
          {r.w>45&&r.h>30&&<text x={r.x+r.w/2} y={r.y+r.h/2-6} textAnchor="middle" fontSize={fontSize} fill="white" fontWeight="600">{r.label.length>12?r.label.slice(0,10)+"…":r.label}</text>}
          {r.w>45&&r.h>30&&<text x={r.x+r.w/2} y={r.y+r.h/2+7} textAnchor="middle" fontSize={fontSize-2} fill="white">{r.value.toLocaleString("fr-FR")}</text>}
        </g>;
      })}
    </svg>
  );
}

function CustomFunnelChart({ data, size={w:510,h:275} }) {
  const [hov, setHov] = useState(null);
  const { w, h } = size;
  const pad = { left:20, right:20, top:20, bottom:20 };
  const iw = w-pad.left-pad.right, ih = h-pad.top-pad.bottom;
  const maxVal = Math.max(...data.map(d=>d.value),1);
  const funnels = data.map((d,i) => ({
    ...d,
    width: (d.value/maxVal)*iw,
    y: pad.top + (i/(data.length))*ih,
    height: ih/data.length*0.8,
    color: d.color || PALETTE[i%PALETTE.length]
  }));
  return (
    <svg width={w} height={h}>
      {funnels.map((f,i) => {
        const isHov = hov===i;
        const x = pad.left + (iw - f.width)/2;
        return <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          <rect x={x} y={f.y} width={f.width} height={f.height} fill={f.color} opacity={isHov?1:0.85} rx={2} style={{filter:isHov?`drop-shadow(0 2px 6px ${f.color}55)`:"none",transition:"all 0.18s",cursor:"pointer"}}/>
          <text x={pad.left-8} y={f.y+f.height/2} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#334155" fontWeight="600">{f.label.length>12?f.label.slice(0,11)+"…":f.label}</text>
          <text x={x+f.width+8} y={f.y+f.height/2} textAnchor="start" dominantBaseline="middle" fontSize={9} fill="#64748b" fontWeight="600">{f.value.toLocaleString("fr-FR")}</text>
        </g>;
      })}
    </svg>
  );
}

function CustomGaugeChart({ data, size={w:240,h:240} }) {
  const { w, h } = size;
  const value = data[0]?.value || 0;
  const label = data[0]?.label || "Valeur";
  const maxVal = Math.max(...data.map(d=>d.value), 100);
  const pct = (value/maxVal)*100;
  const angle = -Math.PI/2 + (pct/100)*(Math.PI); // 0-180 degrees
  const cx = w/2, cy = h/2, R = Math.min(w, h)*0.3;
  const color = data[0]?.color || "#2563eb";
  const needleX = cx + R*Math.cos(angle), needleY = cy + R*Math.sin(angle);
  return (
    <svg width={w} height={h}>
      <defs><linearGradient id="gG1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f87171"/><stop offset="50%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#86efac"/></linearGradient></defs>
      <path d={`M${cx-R},${cy} A${R},${R},0,0,1,${cx+R},${cy}`} stroke="url(#gG1)" strokeWidth={16} fill="none" style={{filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.1))"}}/>
      <circle cx={cx} cy={cy} r={8} fill="white" stroke="#cbd5e1" strokeWidth={2}/>
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={color} strokeWidth={3} strokeLinecap="round"/>
      <text x={cx} y={cy+R+24} textAnchor="middle" fontSize={11} fill="#334155" fontWeight="600">{label}</text>
      <text x={cx} y={cy+R+40} textAnchor="middle" fontSize={18} fill={color} fontWeight="700">{pct.toFixed(0)}%</text>
    </svg>
  );
}

function CustomHeatmapChart({ data, size={w:510,h:275} }) {
  const [hov, setHov] = useState(null);
  const { w, h } = size;
  const pad = { top:30, right:20, bottom:50, left:80 };
  const iw = w-pad.left-pad.right, ih = h-pad.top-pad.bottom;
  const maxVal = Math.max(...data.map(d=>d.value), 1);
  const cols = Math.ceil(Math.sqrt(data.length));
  const cellW = iw/cols, cellH = ih/Math.ceil(data.length/cols);
  const cells = data.map((d,i) => ({
    ...d,
    col: i%cols,
    row: Math.floor(i/cols),
    color: d.color || PALETTE[i%PALETTE.length]
  }));
  const getHeatColor = (val) => {
    const pct = val/maxVal;
    if(pct<0.2) return "#d1d5db"; if(pct<0.4) return "#bbf7d0"; if(pct<0.6) return "#fde68a"; if(pct<0.8) return "#fed7aa"; return "#fca5a5";
  };
  return (
    <svg width={w} height={h}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {cells.map((c,i) => {
          const x = c.col*cellW, y = c.row*cellH;
          const isHov = hov===i;
          const hCol = getHeatColor(c.value);
          return <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
            <rect x={x} y={y} width={cellW-2} height={cellH-2} fill={hCol} stroke="white" strokeWidth={1} opacity={isHov?1:0.9} style={{filter:isHov?`drop-shadow(0 2px 4px ${hCol}55)`:"none",transition:"all 0.15s",cursor:"pointer"}}/>
            {cellW>35&&cellH>25&&<text x={x+cellW/2-1} y={y+cellH/2+2} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#334155" fontWeight="600">{c.value}</text>}
            {isHov&&<title>{c.label}: {c.value.toLocaleString("fr-FR")}</title>}
          </g>;
        })}
      </g>
    </svg>
  );
}

function Legend({ data, total }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:136,maxWidth:188,maxHeight:250,overflowY:"auto"}}>
      {data.map((d,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:7,height:7,borderRadius:2,background:d.color||PALETTE[i%PALETTE.length],flexShrink:0}}/>
          <span style={{fontSize:11,color:"#334155",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label}</span>
          {total>0&&<span style={{fontSize:10,color:"#64748b",fontWeight:600,flexShrink:0}}>{((d.value/total)*100).toFixed(0)}%</span>}
        </div>
      ))}
    </div>
  );
}

function KPIBoard({ filters, apiData, rawData, cancers }) {
  const safeRawData = Array.isArray(rawData) ? rawData : [];
  const apiTotal = Array.isArray(apiData?.raw_data) ? apiData.raw_data.reduce((s,d)=>s+d.cases,0) : null;
  const apiMale = Array.isArray(apiData?.raw_data) ? apiData.raw_data.filter(d=>d.sex==='M').reduce((s,d)=>s+d.cases,0) : null;
  const apiFemale = Array.isArray(apiData?.raw_data) ? apiData.raw_data.filter(d=>d.sex==='F').reduce((s,d)=>s+d.cases,0) : null;
  const fd=safeRawData.filter(d=>(!filters.sex||d.sex===filters.sex)&&(!filters.age||d.age===filters.age)&&(!filters.yearStart||d.year>=parseInt(filters.yearStart))&&(!filters.yearEnd||d.year<=parseInt(filters.yearEnd))&&(!filters.daira||(d.daira===filters.daira || d.wilaya===filters.daira)));
  const total=apiTotal ?? fd.reduce((a,d)=>a+d.cases,0);
  const male=apiMale ?? fd.filter(d=>d.sex==="M").reduce((a,d)=>a+d.cases,0);
  const fem=apiFemale ?? fd.filter(d=>d.sex==="F").reduce((a,d)=>a+d.cases,0);
  const maxYear = Math.max(...[...new Set(fd.map(d=>d.year))].filter(Boolean));
  const y24=fd.filter(d=>d.year===maxYear).reduce((a,d)=>a+d.cases,0);
  const y23=fd.filter(d=>d.year===maxYear-1).reduce((a,d)=>a+d.cases,0);
  const growth=y23>0?(((y24-y23)/y23)*100).toFixed(1):"—";
  const growthTrend = y23 > 0 ? (((y24 - y23) / y23) * 100).toFixed(1) : null;
  const totalPrev = fd.filter(d=>d.year===maxYear-1).reduce((a,d)=>a+d.cases,0);
  const femPrev = fd.filter(d=>d.year===maxYear-1 && d.sex==="F").reduce((a,d)=>a+d.cases,0);
  const totalTrend = totalPrev > 0 ? (((total - totalPrev) / totalPrev) * 100).toFixed(1) : null;
  const femPctPrev = totalPrev > 0 ? (femPrev / totalPrev * 100).toFixed(1) : null;
  const femPctCurr = total > 0 ? (fem / total * 100).toFixed(1) : null;
  const femTrend = femPctPrev && femPctCurr ? (parseFloat(femPctCurr) - parseFloat(femPctPrev)).toFixed(1) : null;
  const dom=aggBy(fd,"cancer",Object.fromEntries(cancers.map(c=>[c.id,c.label])))[0]?.label||"—";
  const survMap2={"Stade I":95,"Stade II":78,"Stade III":55,"Stade IV":25};
  const validRows = fd.filter(d=>survMap2[d.stade]);
  const avgSurv = validRows.length > 0
    ? Math.round(validRows.reduce((a,d)=>a+survMap2[d.stade]*d.cases,0)/Math.max(validRows.reduce((s,d)=>s+d.cases,0),1))
    : 0;
  
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {/* Total cas */}
        <div style={{background:"#f0f4ff",borderRadius:12,padding:"20px 18px",border:"1px solid #dbeafe"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Total cas enregistrés</div>
          <div style={{fontSize:32,fontWeight:800,color:"#2563eb",letterSpacing:"-0.02em"}}>{total.toLocaleString("fr-FR")}</div>
          {totalTrend && <span style={{color: parseFloat(totalTrend) > 0 ? '#059669' : '#dc2626', fontSize: 11}}>{parseFloat(totalTrend) > 0 ? '↑' : '↓'} {Math.abs(totalTrend)}%</span>}
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>tous types confondus</div>
        </div>

        {/* Nouveaux cas */}
        <div style={{background:"#f0fdf4",borderRadius:12,padding:"20px 18px",border:"1px solid #bbf7d0"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Nouveaux cas ({maxYear})</div>
          <div style={{fontSize:32,fontWeight:800,color:"#059669",letterSpacing:"-0.02em"}}>{y24.toLocaleString("fr-FR")}</div>
          {growthTrend && <span style={{color: parseFloat(growthTrend) > 0 ? '#059669' : '#dc2626', fontSize: 11}}>{parseFloat(growthTrend) > 0 ? '↑' : '↓'} {Math.abs(growthTrend)}%</span>}
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>{growth!=="—"?(parseFloat(growth)>0?"+":"")+growth+"%":""} vs {maxYear-1}</div>
        </div>

        {/* Ratio H/F */}
        <div style={{background:"#faf5ff",borderRadius:12,padding:"20px 18px",border:"1px solid #e9d5ff"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Ratio H/F</div>
          <div style={{fontSize:32,fontWeight:800,color:"#7c3aed",letterSpacing:"-0.02em"}}>{fem>0?(male/fem).toFixed(2):"—"}</div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>H: {male.toLocaleString("fr-FR")} · F: {fem.toLocaleString("fr-FR")}</div>
        </div>

        {/* Survie moyenne */}
        <div style={{background:"#fffbeb",borderRadius:12,padding:"20px 18px",border:"1px solid #fed7aa"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Survie moyenne (1 an)</div>
          <div style={{fontSize:32,fontWeight:800,color:"#d97706",letterSpacing:"-0.02em"}}>{avgSurv}%</div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>pondéré par stade</div>
        </div>

        {/* Cancer dominant */}
        <div style={{background:"#fef3f2",borderRadius:12,padding:"20px 18px",border:"1px solid #fecaca"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Cancer dominant</div>
          <div style={{fontSize:32,fontWeight:800,color:"#dc2626",letterSpacing:"-0.02em"}}>{dom}</div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>type le plus fréquent</div>
        </div>

        {/* Part féminine */}
        <div style={{background:"#ecfdf5",borderRadius:12,padding:"20px 18px",border:"1px solid #a7f3d0"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Part féminine</div>
          <div style={{fontSize:32,fontWeight:800,color:"#059669",letterSpacing:"-0.02em"}}>{Math.round((fem/Math.max(total,1))*100)}%</div>
          {femTrend && <span style={{color: parseFloat(femTrend) > 0 ? '#059669' : '#dc2626', fontSize: 11}}>{parseFloat(femTrend) > 0 ? '↑' : '↓'} {Math.abs(femTrend)}%</span>}
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>du total des cas</div>
        </div>
      </div>
    </div>
  );
}

function MapClickHandler({ enabled, onMapClick }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => onMapClick(e.latlng);
    map.on('click', handler);
    return () => map.off('click', handler);
  }, [enabled, onMapClick, map]);
  return null;
}

function ChoroplethMap({ data, apiData, rawData, cancers, patients }) {
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(5);
  const [panelChart, setPanelChart] = useState('cancers');
  const [panelChartType, setPanelChartType] = useState('bars');
  const [activeCancer, setActiveCancer] = useState(null);
  const [wilayaDetail, setWilayaDetail] = useState(null);
  const [wilayaLoading, setWilayaLoading] = useState(false);
  // ━━━ 1. ZONE PERSISTANTE (ne disparaît plus) ━━━
  const [envZones, setEnvZones] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('envZones') || '[]')
    } catch { return [] }
  });

  useEffect(() => {
    localStorage.setItem('envZones', JSON.stringify(envZones))
  }, [envZones])

  const [showEnvPanel, setShowEnvPanel] = useState(false);
  const [drawingZone, setDrawingZone] = useState(false);
  const [tempPoints, setTempPoints] = useState([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [zoneNameError, setZoneNameError] = useState('');
  const [zonePolygonError, setZonePolygonError] = useState('');
  const [selectedEnvZone, setSelectedEnvZone] = useState(null);
  const [mainApiData, setMainApiData] = useState(null);
  const [mainApiLoading, setMainApiLoading] = useState(true);

  // ── Nouveaux états pour les 3 panneaux ──
  const [activeMarkerType, setActiveMarkerType] = useState(null);
  const [customMarkers, setCustomMarkers] = useState([]);
  const [visibleLayers, setVisibleLayers] = useState({
    industrie: true, eau: true, risque: true
  });
  const [savedMaps, setSavedMaps] = useState(() => {
    try { return JSON.parse(localStorage.getItem('envMaps')||'[]') }
    catch { return [] }
  });
  const [expandedMapId, setExpandedMapId] = useState(null);
  const [editingMapId, setEditingMapId] = useState(null);
  const [modal, setModal] = useState(null);

  const FIXED_MARKERS = {
    industrie: [
      { id:'i1', name:'Cimenterie Lafarge Oggaz', lat:34.92, lng:-1.28, 
        polluants:'PM2.5, CO2', rayon:8 },
      { id:'i2', name:'Zone Ind. Béni Mester', lat:34.95, lng:-1.35,
        polluants:'PM10, NOx', rayon:5 },
      { id:'i3', name:'Textile Tlemcen', lat:34.88, lng:-1.31,
        polluants:'COV, colorants', rayon:3 },
      { id:'i4', name:'Carrière Béni Snous', lat:34.76, lng:-1.44,
        polluants:'Silice, poussière', rayon:4 },
    ],
    eau: [
      { id:'e1', name:'Barrage Beni Bahdel', lat:34.72, lng:-1.58,
        qualite:'Bonne', usage:'Eau potable' },
      { id:'e2', name:'Oued Tafna', lat:34.78, lng:-1.45,
        qualite:'Moyenne', usage:'Irrigation' },
      { id:'e3', name:'Retenue Hammam Boughrara', lat:35.07, lng:-1.53,
        qualite:'Bonne', usage:'Eau potable' },
      { id:'e4', name:'Station Ghazaouet', lat:35.10, lng:-1.86,
        qualite:'Traitée', usage:'Dessalement' },
      { id:'e5', name:'Station dessalement Ghazaouet', lat:35.10, lng:-1.86,
        qualite:'Dessalée', usage:'Eau potable Tlemcen',
        risque:'Trihalométhanes — risque Colorectal' },
    ],
    risque: [
      { id:'r1', name:'Décharge Chetouane', lat:34.90, lng:-1.28,
        impact:'Sol contaminé', niveau:'Élevé' },
      { id:'r2', name:'Carrière Sabra', lat:34.82, lng:-1.30,
        impact:'Poussière silice', niveau:'Moyen' },
      { id:'r3', name:'Décharge Remchi', lat:35.06, lng:-1.43,
        impact:'Lixiviats', niveau:'Moyen' },
    ]
  };

  const ENVIRONMENTAL_RISKS = {
    "Tlemcen": {
      aqi: 42,
      eau: "Moyenne",
      industries: ["Cimenterie", "Textile", "Agroalimentaire"],
      pollutants: ["PM2.5", "NO2", "Poussière industrielle"],
      cancerLinks: {
        "Poumon": { risk: "Élevé", source: "Cimenterie — poussière PM2.5" },
        "Estomac": { risk: "Moyen", source: "Pesticides agricoles — eau contaminée" },
        "Colorectal": { risk: "Moyen", source: "Qualité eau potable" },
        "Leucémie": { risk: "Faible", source: "Solvants industriels textiles" },
      }
    },
    "Oran": {
      aqi: 78,
      eau: "Bonne",
      industries: ["Pétrochimie", "Port industriel", "Sidérurgie"],
      pollutants: ["SO2", "COV", "Hydrocarbures", "PM10"],
      cancerLinks: {
        "Poumon": { risk: "Très élevé", source: "Pétrochimie — hydrocarbures" },
        "Colorectal": { risk: "Élevé", source: "Contamination sols industriels" },
        "Leucémie": { risk: "Élevé", source: "Benzène pétrochimique" },
        "Estomac": { risk: "Moyen", source: "Métaux lourds port" },
      }
    },
    "Sidi Bel Abbès": {
      aqi: 55,
      eau: "Moyenne",
      industries: ["Agriculture intensive", "Pesticides", "Textile"],
      pollutants: ["Pesticides", "Nitrates", "PM2.5"],
      cancerLinks: {
        "Sein": { risk: "Élevé", source: "Perturbateurs endocriniens — pesticides" },
        "Colorectal": { risk: "Élevé", source: "Nitrates eau — agriculture" },
        "Poumon": { risk: "Moyen", source: "Brûlage résidus agricoles" },
      }
    },
    "Mascara": {
      aqi: 38,
      eau: "Bonne",
      industries: ["Viticulture", "Agriculture", "Agroalimentaire"],
      pollutants: ["Pesticides", "Fongicides", "Nitrates"],
      cancerLinks: {
        "Colorectal": { risk: "Élevé", source: "Nitrates — agriculture intensive" },
        "Sein": { risk: "Moyen", source: "Perturbateurs endocriniens agricoles" },
        "Poumon": { risk: "Faible", source: "Fumées agroalimentaire" },
      }
    },
    "Mostaganem": {
      aqi: 48,
      eau: "Moyenne",
      industries: ["Port", "Pêche industrielle", "Chimie"],
      pollutants: ["Métaux lourds", "HAP", "Mercure"],
      cancerLinks: {
        "Poumon": { risk: "Élevé", source: "HAP port industriel" },
        "Estomac": { risk: "Élevé", source: "Mercure — poissons contaminés" },
        "Leucémie": { risk: "Moyen", source: "Métaux lourds industrie chimique" },
      }
    },
    "Constantine": {
      aqi: 65,
      eau: "Moyenne",
      industries: ["Sidérurgie", "Cimenterie", "Mécanique"],
      pollutants: ["PM10", "Métaux lourds", "CO", "NO2"],
      cancerLinks: {
        "Poumon": { risk: "Très élevé", source: "Sidérurgie — PM10 + métaux" },
        "Colorectal": { risk: "Élevé", source: "Métaux lourds sols" },
        "Leucémie": { risk: "Élevé", source: "Benzène industrie mécanique" },
      }
    },
    "Annaba": {
      aqi: 85,
      eau: "Mauvaise",
      industries: ["Complexe sidérurgique El Hadjar", "Port", "Chimie"],
      pollutants: ["PM2.5", "SO2", "Métaux lourds", "Dioxines"],
      cancerLinks: {
        "Poumon": { risk: "Critique", source: "El Hadjar — fumées sidérurgiques" },
        "Leucémie": { risk: "Très élevé", source: "Benzène + dioxines industrielles" },
        "Colorectal": { risk: "Élevé", source: "Eau contaminée métaux lourds" },
        "Estomac": { risk: "Élevé", source: "Nitrosamines — pollution eau" },
      }
    },
    "Alger": {
      aqi: 72,
      eau: "Bonne",
      industries: ["Transport dense", "Industrie", "Port"],
      pollutants: ["NO2", "CO", "PM2.5", "Benzène"],
      cancerLinks: {
        "Poumon": { risk: "Très élevé", source: "Trafic dense — NO2 + PM2.5" },
        "Colorectal": { risk: "Moyen", source: "Mode vie urbain" },
        "Sein": { risk: "Moyen", source: "Pollution lumineuse + endocriniens" },
      }
    },
  };

  const RISK_COLORS = {
    "Critique":    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#dc2626' },
    "Très élevé":  { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3', dot: '#e11d48' },
    "Élevé":       { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', dot: '#ea580c' },
    "Moyen":       { bg: '#fefce8', color: '#ca8a04', border: '#fef08a', dot: '#ca8a04' },
    "Faible":      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', dot: '#16a34a' },
  };

  const AQI_COLOR = (aqi) => {
    if (aqi <= 50) return { color: '#16a34a', label: 'Bon', bg: '#f0fdf4' };
    if (aqi <= 100) return { color: '#ca8a04', label: 'Modéré', bg: '#fefce8' };
    if (aqi <= 150) return { color: '#ea580c', label: 'Mauvais', bg: '#fff7ed' };
    return { color: '#dc2626', label: 'Dangereux', bg: '#fef2f2' };
  };

  const POLLUTION_DATA = {
    "Alger":        { aqi:72, pm25:28, pm10:45, no2:38, so2:12, eau:"Bonne",    risque:"Moyen" },
    "Oran":         { aqi:78, pm25:35, pm10:58, no2:42, so2:28, eau:"Bonne",    risque:"Élevé" },
    "Annaba":       { aqi:85, pm25:42, pm10:68, no2:35, so2:45, eau:"Mauvaise", risque:"Critique" },
    "Constantine":  { aqi:65, pm25:25, pm10:48, no2:30, so2:18, eau:"Moyenne",  risque:"Élevé" },
    "Tlemcen":      { aqi:42, pm25:15, pm10:28, no2:18, so2:8,  eau:"Moyenne",  risque:"Faible" },
    "Sétif":        { aqi:55, pm25:22, pm10:38, no2:25, so2:10, eau:"Bonne",    risque:"Moyen" },
    "Sidi Bel Abbès":{ aqi:55, pm25:20, pm10:35, no2:22, so2:9, eau:"Moyenne", risque:"Moyen" },
    "Skikda":       { aqi:80, pm25:38, pm10:62, no2:40, so2:52, eau:"Mauvaise", risque:"Critique" },
    "Béjaïa":       { aqi:48, pm25:18, pm10:32, no2:20, so2:8,  eau:"Bonne",   risque:"Faible" },
    "Batna":        { aqi:50, pm25:20, pm10:36, no2:22, so2:9,  eau:"Moyenne",  risque:"Moyen" },
    "Mascara":      { aqi:38, pm25:12, pm10:22, no2:15, so2:5,  eau:"Bonne",   risque:"Faible" },
    "Mostaganem":   { aqi:48, pm25:18, pm10:30, no2:22, so2:14, eau:"Moyenne", risque:"Moyen" },
    "Relizane":     { aqi:44, pm25:16, pm10:28, no2:18, so2:7,  eau:"Bonne",   risque:"Faible" },
    "Tiaret":       { aqi:46, pm25:17, pm10:30, no2:20, so2:8,  eau:"Bonne",   risque:"Faible" },
    "Blida":        { aqi:60, pm25:24, pm10:40, no2:28, so2:12, eau:"Bonne",   risque:"Moyen" },
    "Médéa":        { aqi:45, pm25:16, pm10:28, no2:18, so2:7,  eau:"Bonne",   risque:"Faible" },
    "Boumerdès":    { aqi:55, pm25:21, pm10:36, no2:25, so2:10, eau:"Bonne",   risque:"Moyen" },
    "Tipaza":       { aqi:45, pm25:16, pm10:28, no2:18, so2:7,  eau:"Bonne",   risque:"Faible" },
    "Ouargla":      { aqi:68, pm25:30, pm10:55, no2:28, so2:22, eau:"Moyenne", risque:"Élevé" },
    "Biskra":       { aqi:58, pm25:24, pm10:42, no2:22, so2:10, eau:"Moyenne", risque:"Moyen" },
  };

  const AQI_LEVEL = (aqi) => {
    if(aqi <= 50)  return { label:'Bon',       color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' };
    if(aqi <= 100) return { label:'Modéré',    color:'#ca8a04', bg:'#fefce8', border:'#fef08a' };
    if(aqi <= 150) return { label:'Mauvais',   color:'#ea580c', bg:'#fff7ed', border:'#fed7aa' };
    return             { label:'Dangereux', color:'#dc2626', bg:'#fef2f2', border:'#fecaca' };
  };

  // Validate zone name
  const validateZoneName = (name, existingZones) => {
    const trimmedName = name.trim();
    
    // Check if empty
    if (!trimmedName) {
      return 'Le nom est obligatoire';
    }
    
    // Check minimum length
    if (trimmedName.length < 3) {
      return 'Le nom doit contenir au moins 3 caractères';
    }
    
    // Check if contains only letters and spaces
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(trimmedName)) {
      return 'Le nom doit contenir uniquement des lettres et des espaces';
    }
    
    // Check if unique
    const nameExists = existingZones.some(
      zone => zone.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      return 'Ce nom de zone existe déjà';
    }
    
    return null;
  };

  // Get auth token
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('access') ||
           localStorage.getItem('access_token') ||
           localStorage.getItem('token') ||
           sessionStorage.getItem('access_token') ||
           document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  }, []);

  const sourceData = useMemo(() => 
    Array.isArray(mainApiData?.raw_data) && mainApiData.raw_data.length > 0 
      ? mainApiData.raw_data 
      : (Array.isArray(rawData) && rawData.length > 0 ? rawData : []),
    [mainApiData, rawData]
  );

  // Fetch main statistics data from API on component mount
  useEffect(() => {
    setMainApiLoading(true);
    const token = getAuthToken();
    const urls = ['/api/statistic/stats/', `${API_BASE}/statistic/stats/`];
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchStats = async () => {
      let firstResponseData = null;

      for (const url of urls) {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (firstResponseData === null) firstResponseData = data;

          const hasRawData = Array.isArray(data?.raw_data) && data.raw_data.length > 0;
          if (hasRawData || url === urls[urls.length - 1]) {
            setMainApiData(data);
            setMainApiLoading(false);
            return;
          }
          console.warn(`Statistics API returned empty raw_data at ${url}, trying fallback.`);
        } catch (err) {
          console.warn(`Statistics API request failed for ${url}:`, err);
        }
      }

      if (firstResponseData !== null) {
        setMainApiData(firstResponseData);
      }
      setMainApiLoading(false);
    };

    fetchStats();
  }, [getAuthToken]);

  const { casesByWilaya, q, maxVal, totalAll } = useMemo(() => {
    const casesByWilaya = {};
    sourceData.forEach(d => {
      if (!d.wilaya) return;
      casesByWilaya[d.wilaya] = (casesByWilaya[d.wilaya] || 0) + d.cases;
    });

    const sorted = Object.values(casesByWilaya).filter(v => v > 0).sort((a,b) => a-b);
    const q = [0.2,0.4,0.6,0.8].map(p => sorted[Math.floor(sorted.length*p)] || 1);
    const maxVal = Math.max(...Object.values(casesByWilaya), 1);
    const totalAll = Object.values(casesByWilaya).reduce((a,b) => a+b, 0);
    return { casesByWilaya, q, maxVal, totalAll };
  }, [sourceData]);

  const getColor = v => !v ? '#f1f5f9' : v<=q[0] ? '#bbf7d0' : v<=q[1] ? '#fde68a' : v<=q[2] ? '#fed7aa' : v<=q[3] ? '#fca5a5' : '#dc2626';
  const getTier  = v => !v ? 'Pas de données' : v<=q[0] ? 'Faible' : v<=q[1] ? 'Moyen' : v<=q[2] ? 'Élevé' : v<=q[3] ? 'Très élevé' : 'Critique';

  const getDairas = (w) => {
    if (sourceData.length === 0) return [];
    
    const dairaMap = {};
    sourceData
      .filter(r => r.wilaya === w && r.daira)
      .forEach(r => {
        if (!dairaMap[r.daira]) {
          dairaMap[r.daira] = { name: r.daira, cases: 0, male: 0, female: 0, cancers: {} };
        }
        dairaMap[r.daira].cases += r.cases;
        if (r.sex === 'M') dairaMap[r.daira].male += r.cases;
        if (r.sex === 'F') dairaMap[r.daira].female += r.cases;
        if (r.cancer) {
          dairaMap[r.daira].cancers[r.cancer] = (dairaMap[r.daira].cancers[r.cancer] || 0) + r.cases;
        }
      });
    
    return Object.values(dairaMap)
      .map(d => {
        const dom = Object.entries(d.cancers).sort((a,b) => b[1]-a[1])[0];
        return {
          ...d,
          dominant: dom ? (cancers.find(c => c.id === dom[0] || c.label === dom[0])?.label || dom[0]) : 'N/A',
          coords: DAIRA_COORDINATES[d.name] || WILAYA_COORDINATES[w] || [28, 1]
        };
      })
      .sort((a,b) => b.cases - a.cases);
  };

  const getWilayaStats = (w) => {
    const safeSourceData = Array.isArray(sourceData) ? sourceData : [];
    const rows = safeSourceData.filter(r => r.wilaya === w);
    const cases = rows.reduce((s,r) => s + r.cases, 0);
    const male = rows.filter(r => r.sex === 'M').reduce((s,r) => s + r.cases, 0);
    const female = rows.filter(r => r.sex === 'F').reduce((s,r) => s + r.cases, 0);
    const totalAll = safeSourceData.reduce((s,r) => s + r.cases, 0);
    
    const cm = {};
    rows.forEach(r => { if(r.cancer) cm[r.cancer] = (cm[r.cancer]||0) + r.cases; });
    const dom = Object.entries(cm).sort((a,b) => b[1]-a[1])[0];
    
    return {
      cases,
      male,
      female,
      dominant: dom ? (cancers.find(c => c.id === dom[0] || c.label === dom[0])?.label || dom[0]) : 'N/A',
      pct: totalAll > 0 ? ((cases / totalAll) * 100).toFixed(1) : '0'
    };
  };

  // ━━━ 2. ANALYSE DONNÉES RÉELLES + EXPLICATIONS ━━━
  const resolvedCancers = useMemo(() => {
    if (!Array.isArray(cancers)) return [];
    return cancers.map(c => ({
      id: c.id,
      label: c.label || c.name || c.id,
      color: c.color || CANCER_COLORS[c.id] || PALETTE[0]
    }));
  }, [cancers]);

  const generateExplanation = (dominantCancer, nearbyIndustrie, nearbyEau, nearbyRisque) => {
    if (!dominantCancer) return []
    
    const cancerName = dominantCancer.label
    const explanations = []
    
    // Règles de corrélation industrie → cancer
    const industrieLinks = {
      'Poumon':     ['Cimenterie', 'PM2.5', 'CO2', 'silice', 'textile', 'carrière'],
      'Leucémie':   ['COV', 'colorants', 'solvants', 'chimie'],
      'Colorectal': ['décharge', 'lixiviat', 'nitrate'],
      'Estomac':    ['décharge', 'pesticide', 'nitrate', 'eau'],
      'Sein':       ['perturbateur', 'pesticide', 'endocrinien'],
      'Thyroïde':   ['iode', 'mer', 'dessalement', 'radiation'],
    }
    
    nearbyIndustrie.forEach(ind => {
      const keywords = industrieLinks[cancerName] || []
      const match = keywords.some(kw => 
        (ind.polluants || '').toLowerCase().includes(kw.toLowerCase()) ||
        ind.name.toLowerCase().includes(kw.toLowerCase())
      )
      if (match) {
        explanations.push({
          source: ind.name,
          type: 'industrie',
          icon: '🏭',
          text: `Émissions de ${ind.polluants} — facteur de risque ${cancerName}`,
          level: 'Élevé'
        })
      }
    })
    
    nearbyEau.forEach(eau => {
      const waterLinks = {
        'Colorectal': ['tafna', 'oued', 'barrage', 'moyenne', 'mauvaise'],
        'Estomac':    ['moyenne', 'mauvaise', 'oued'],
        'Thyroïde':   ['dessalement', 'mer', 'ghazaouet'],
        'Leucémie':   ['mauvaise', 'contaminée'],
      }
      const keywords = waterLinks[cancerName] || []
      const match = keywords.some(kw =>
        eau.name.toLowerCase().includes(kw.toLowerCase()) ||
        (eau.qualite || '').toLowerCase().includes(kw.toLowerCase())
      )
      if (match) {
        explanations.push({
          source: eau.name,
          type: 'eau',
          icon: '💧',
          text: `Qualité eau: ${eau.qualite} — impact potentiel sur ${cancerName}`,
          level: eau.qualite === 'Mauvaise' ? 'Élevé' : 'Moyen'
        })
      }
    })
    
    nearbyRisque.forEach(risque => {
      explanations.push({
        source: risque.name,
        type: 'risque',
        icon: '⚠️',
        text: `${risque.impact} — contamination zone`,
        level: risque.niveau || 'Moyen'
      })
    })
    
    if (explanations.length === 0) {
      explanations.push({
        source: 'Prévalence locale',
        type: 'general',
        icon: '📊',
        text: `Prévalence naturelle de ${cancerName} dans la région`,
        level: 'Faible'
      })
    }
    
    return explanations
  };

  const MapController = () => {
    const map = useMap();
    useEffect(() => { setMapRef(map); }, [map]);
    return null;
  };

  const ZoomWatcher = () => {
    const map = useMap();
    useEffect(() => {
      const handler = () => setCurrentZoom(map.getZoom());
      map.on('zoomend', handler);
      handler();
      return () => map.off('zoomend', handler);
    }, [map]);
    return null;
  };

  const flyTo = (name) => {
    setSelectedWilaya(name);
    setWilayaLoading(true);
    
    // Fetch wilaya detail from API
    const token = getAuthToken();
    axios.get(`/api/statistics/wilaya/${encodeURIComponent(name)}/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    .then(res => {
      setWilayaDetail(res.data);
      setWilayaLoading(false);
    })
    .catch(() => {
      setWilayaDetail(null);
      setWilayaLoading(false);
    });
    
    if (mapRef && WILAYA_COORDINATES[name]) {
      mapRef.flyTo(WILAYA_COORDINATES[name], name==='Tlemcen'?9:8, { duration:1.2 });
    }
  };

  const flyBack = () => {
    setSelectedWilaya(null);
    if (mapRef) mapRef.flyTo([28.0339,1.6596], 5, { duration:1.0 });
  };

  const dairas = selectedWilaya ? getDairas(selectedWilaya) : [];
  const maxDaira = dairas.length ? Math.max(...dairas.map(d=>d.cases),1) : 1;
  const stats = selectedWilaya ? getWilayaStats(selectedWilaya) : null;

  const LEGEND = [['#f1f5f9','Pas de données'],['#bbf7d0','Faible'],['#fde68a','Moyen'],['#fed7aa','Élevé'],['#fca5a5','Très élevé'],['#dc2626','Critique']];

  const createDivIcon = (emoji, color) => L.divIcon({
    html: `<div style="
      background:${color};
      border:2px solid white;
      border-radius:50%;
      width:32px;height:32px;
      display:flex;align-items:center;
      justify-content:center;
      font-size:16px;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      cursor:pointer;
    ">${emoji}</div>`,
    className:'',
    iconSize:[32,32],
    iconAnchor:[16,16],
    popupAnchor:[0,-16]
  });

  const industrieIcon = createDivIcon('🏭','#dc2626');
  const eauIcon = createDivIcon('💧','#0891b2');
  const risqueIcon = createDivIcon('⚠️','#d97706');

  return (
    <div style={{
      display:'flex',
      flexDirection:'row',
      gap:6,
      width:'100%',
      alignItems:'flex-start',
      overflowX:'auto',
      overflowY:'hidden'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* ── PANNEAU GAUCHE: Points d'intérêt ── */}
      <div style={{
        width:200, flexShrink:0,
        background:'white', borderRadius:12,
        border:'1.5px solid #e2e8f0',
        boxShadow:'0 4px 20px rgba(0,0,0,0.08)',
        maxHeight:500, overflowY:'auto', position:'sticky', top:10
      }}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#059669,#10b981)',
          padding:'8px 10px'}}>
          <div style={{fontWeight:800,fontSize:12,color:'white'}}>
            📍 Points d'intérêt
          </div>
        </div>

        <div style={{padding:'8px 10px'}}>
          {/* Outils */}
          <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',marginBottom:8}}>Outils</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,
            marginBottom:14}}>
            {[
              {id:'zone', icon:'📍', label:'Nouvelle zone', color:'#2563eb'},
              {id:'industrie', icon:'🏭', label:'Industrie', color:'#dc2626'},
              {id:'eau', icon:'💧', label:'Source eau', color:'#0891b2'},
              {id:'risque', icon:'⚠️', label:'Risque', color:'#d97706'},
            ].map(tool => (
              <button key={tool.id}
                onClick={() => setActiveMarkerType(
                  activeMarkerType===tool.id ? null : tool.id
                )}
                style={{
                  padding:'6px 4px', borderRadius:8, cursor:'pointer',
                  border:`1.5px solid ${activeMarkerType===tool.id 
                    ? tool.color : '#e2e8f0'}`,
                  background: activeMarkerType===tool.id 
                    ? tool.color+'15' : 'white',
                  color: activeMarkerType===tool.id ? tool.color : '#64748b',
                  fontFamily:'inherit', fontSize:10, fontWeight:600,
                  display:'flex', flexDirection:'column',
                  alignItems:'center', gap:3, transition:'all 0.2s'
                }}>
                <span style={{fontSize:14}}>{tool.icon}</span>
                {tool.label}
              </button>
            ))}
          </div>

          {/* Sites fixes */}
          <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',marginBottom:8}}>
            🏭 Sites Tlemcen
          </div>

          {/* INDUSTRIELS */}
          <div style={{display:'flex',justifyContent:'space-between',
            alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:700,color:'#dc2626'}}>
              INDUSTRIELS
            </span>
            <button onClick={()=>setVisibleLayers(v=>
              ({...v,industrie:!v.industrie}))}
              style={{fontSize:9,padding:'2px 8px',borderRadius:4,
                border:'1px solid #fecaca',background:'#fef2f2',
                color:'#dc2626',cursor:'pointer',fontFamily:'inherit'}}>
              {visibleLayers.industrie ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {FIXED_MARKERS.industrie.map(m => (
            <div key={m.id} style={{display:'flex',alignItems:'center',
              gap:6,padding:'4px 0',borderBottom:'1px solid #f8fafc',
              cursor:'pointer'}}
              onClick={() => mapRef?.flyTo([m.lat,m.lng], 12)}>
              <span style={{fontSize:13}}>🏭</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:600,color:'#334155'}}>
                  {m.name}
                </div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{m.polluants}</div>
              </div>
            </div>
          ))}

          {/* SOURCES D'EAU */}
          <div style={{display:'flex',justifyContent:'space-between',
            alignItems:'center',margin:'10px 0 6px'}}>
            <span style={{fontSize:10,fontWeight:700,color:'#0891b2'}}>
              SOURCES D'EAU
            </span>
            <button onClick={()=>setVisibleLayers(v=>
              ({...v,eau:!v.eau}))}
              style={{fontSize:9,padding:'2px 8px',borderRadius:4,
                border:'1px solid #bae6fd',background:'#f0f9ff',
                color:'#0891b2',cursor:'pointer',fontFamily:'inherit'}}>
              {visibleLayers.eau ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {FIXED_MARKERS.eau.map(m => (
            <div key={m.id} style={{display:'flex',alignItems:'center',
              gap:6,padding:'4px 0',borderBottom:'1px solid #f8fafc',
              cursor:'pointer'}}
              onClick={() => mapRef?.flyTo([m.lat,m.lng], 12)}>
              <span style={{fontSize:13}}>💧</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:600,color:'#334155'}}>
                  {m.name}
                </div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{m.qualite}</div>
              </div>
            </div>
          ))}

          {/* RISQUES */}
          <div style={{display:'flex',justifyContent:'space-between',
            alignItems:'center',margin:'10px 0 6px'}}>
            <span style={{fontSize:10,fontWeight:700,color:'#d97706'}}>
              RISQUES
            </span>
            <button onClick={()=>setVisibleLayers(v=>
              ({...v,risque:!v.risque}))}
              style={{fontSize:9,padding:'2px 8px',borderRadius:4,
                border:'1px solid #fed7aa',background:'#fffbeb',
                color:'#d97706',cursor:'pointer',fontFamily:'inherit'}}>
              {visibleLayers.risque ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {FIXED_MARKERS.risque.map(m => (
            <div key={m.id} style={{display:'flex',alignItems:'center',
              gap:6,padding:'4px 0',borderBottom:'1px solid #f8fafc',
              cursor:'pointer'}}
              onClick={() => mapRef?.flyTo([m.lat,m.lng], 12)}>
              <span style={{fontSize:13}}>⚠️</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:600,color:'#334155'}}>
                  {m.name}
                </div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{m.impact}</div>
              </div>
            </div>
          ))}

          {/* Markers manuels */}
          {customMarkers.length > 0 && (
            <>
              <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',
                textTransform:'uppercase',margin:'12px 0 6px'}}>
                📍 Mes points ({customMarkers.length})
              </div>
              {customMarkers.map(m => (
                <div key={m.id} style={{display:'flex',alignItems:'center',
                  gap:6,padding:'4px 0',borderBottom:'1px solid #f8fafc'}}>
                  <span style={{fontSize:13}}>
                    {m.type==='industrie'?'🏭':
                     m.type==='eau'?'💧':'⚠️'}
                  </span>
                  <div style={{flex:1,fontSize:10,fontWeight:600,
                    color:'#334155'}}>{m.name}</div>
                  <button onClick={()=>setCustomMarkers(prev=>
                    prev.filter(x=>x.id!==m.id))}
                    style={{background:'none',border:'none',
                      color:'#94a3b8',cursor:'pointer',fontSize:14}}>
                    ×
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Zones */}
          <div style={{borderTop:'1px solid #e2e8f0',marginTop:12,paddingTop:12}}>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',
              textTransform:'uppercase',marginBottom:8}}>
              🗺️ Créer une zone
            </div>
            
            <input
              placeholder="Nom de la zone..."
              value={newZoneName}
              onChange={e=>setNewZoneName(e.target.value)}
              style={{width:'100%',padding:'7px 10px',borderRadius:7,
                border:'1.5px solid #e2e8f0',fontSize:11,
                fontFamily:'inherit',marginBottom:6,boxSizing:'border-box'}}
            />
            
            {!drawingZone ? (
              <button
                onClick={()=>{
                  if(!newZoneName.trim()) return
                  setDrawingZone(true)
                  setTempPoints([])
                }}
                disabled={!newZoneName.trim()}
                style={{width:'100%',padding:'7px',borderRadius:7,
                  border:'none',
                  background:newZoneName.trim()?'#059669':'#cbd5e1',
                  color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                📍 Placer les points
              </button>
            ) : (
              <div>
                <div style={{fontSize:10,color:'#065f46',fontWeight:600,
                  padding:'6px 8px',background:'#dcfce7',borderRadius:5,
                  marginBottom:6}}>
                  {tempPoints.length} point(s) — cliquez sur la carte
                </div>
                <div style={{display:'flex',gap:5}}>
                  <button
                    onClick={()=>{
                      if(tempPoints.length < 3) return

                      // ━━━ ANALYSE DONNÉES RÉELLES ━━━
                      const centLat = tempPoints.reduce((s, p) => {
                        const lat = Array.isArray(p) ? p[0] : p.lat
                        return s + lat
                      }, 0) / tempPoints.length
                      const centLng = tempPoints.reduce((s, p) => {
                        const lng = Array.isArray(p) ? p[1] : p.lng
                        return s + lng
                      }, 0) / tempPoints.length

                      console.log('✅ Centroid exact:', centLat, centLng)

                      let closestLocation = null
                      let minDist = Infinity
                      let locationType = 'wilaya'

                      Object.entries(DAIRA_COORDINATES).forEach(([name, coords]) => {
                        const dist = Math.sqrt(
                          Math.pow(centLat - coords[0], 2) +
                          Math.pow(centLng - coords[1], 2)
                        )
                        if (dist < minDist && dist < 0.3) {
                          minDist = dist
                          closestLocation = name
                          locationType = 'daira'
                        }
                      })

                      if (!closestLocation) {
                        Object.entries(WILAYA_COORDINATES).forEach(([name, coords]) => {
                          const dist = Math.sqrt(
                            Math.pow(centLat - coords[0], 2) +
                            Math.pow(centLng - coords[1], 2)
                          )
                          if (dist < minDist) {
                            minDist = dist
                            closestLocation = name
                            locationType = 'wilaya'
                          }
                        })
                      }

                      console.log('📍 Location détectée:', closestLocation, '('+locationType+')', 'dist:', minDist)

                      // Filtrer sourceData pour cette localité
                      const zonePatients = sourceData.filter(d => 
                        d.wilaya === closestLocation || 
                        d.daira === closestLocation ||
                        (closestLocation === 'Tlemcen' && d.wilaya === 'Tlemcen')
                      )

                      // Stats réelles
                      const totalCases = zonePatients.reduce((s,d) => s+d.cases, 0)
                      
                      // Cancers par fréquence (données réelles)
                      const cancerMap = {}
                      zonePatients.forEach(d => {
                        if (d.cancer) cancerMap[d.cancer] = (cancerMap[d.cancer]||0) + d.cases
                      })
                      const sortedCancers = Object.entries(cancerMap)
                        .sort((a,b) => b[1]-a[1])
                        .map(([id, count]) => ({
                          id,
                          label: resolvedCancers.find(c=>c.id===id)?.label || id,
                          count,
                          pct: totalCases > 0 ? ((count/totalCases)*100).toFixed(1) : '0'
                        }))
                      
                      const dominantCancer = sortedCancers[0]

                      // Trouver markers industriels/eau/risque proches (< 0.15 degrés)
                      const nearbyIndustrie = FIXED_MARKERS.industrie.filter(m =>
                        Math.sqrt(Math.pow(centLat-m.lat,2)+Math.pow(centLng-m.lng,2)) < 0.15
                      )
                      const nearbyEau = FIXED_MARKERS.eau.filter(m =>
                        Math.sqrt(Math.pow(centLat-m.lat,2)+Math.pow(centLng-m.lng,2)) < 0.25
                      )
                      const nearbyRisque = FIXED_MARKERS.risque.filter(m =>
                        Math.sqrt(Math.pow(centLat-m.lat,2)+Math.pow(centLng-m.lng,2)) < 0.15
                      )

                      const explanations = generateExplanation(
                        dominantCancer, 
                        nearbyIndustrie, 
                        nearbyEau, 
                        nearbyRisque
                      )

                      const pollutionData = computeCompletePollutionData([], tempPoints)

                      const newZone = {
                        id: Date.now(),
                        name: newZoneName,
                        points: [...tempPoints],
                        centroid: [centLat, centLng],
                        location: closestLocation,
                        // Données réelles
                        realData: {
                          totalCases,
                          cancers: sortedCancers.slice(0, 5),
                          dominantCancer: dominantCancer || null,
                        },
                        // Facteurs environnementaux proches
                        environment: {
                          nearbyIndustrie,
                          nearbyEau,
                          nearbyRisque,
                          explanations
                        },
                        pollution: {
                          aqi: pollutionData.aqi,
                          pm25: pollutionData.pm25,
                          eau: pollutionData.eau,
                          risque: pollutionData.risque,
                          risk: getRiskLevel(pollutionData.aqi),
                          nearbyWilayas: pollutionData.nearbyWilayas,
                        },
                        createdAt: new Date().toLocaleDateString('fr-FR')
                      }

                      setEnvZones(prev => [...prev, newZone])
                      setSelectedEnvZone(newZone)
                      setShowEnvPanel(true)
                      setDrawingZone(false)
                      setTempPoints([])
                      setNewZoneName('')
                    }}
                    disabled={tempPoints.length<3}
                    style={{flex:1,padding:'6px',borderRadius:6,border:'none',
                      background:tempPoints.length>=3?'#059669':'#cbd5e1',
                      color:'white',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    ✓ Valider
                  </button>
                  <button
                    onClick={()=>{
                      setDrawingZone(false)
                      setTempPoints([])
                    }}
                    style={{padding:'6px 10px',borderRadius:6,
                      border:'1px solid #dc2626',background:'#fef2f2',
                      color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    ✕
                  </button>
                </div>
              </div>
            )}
            
            {/* Liste zones créées */}
            {envZones.map((zone,i)=>(
              <div key={zone.id} style={{
                marginTop:6,padding:'7px 9px',borderRadius:7,
                background:'#f0fdf4',border:'1px solid #bbf7d0',
                display:'flex',justifyContent:'space-between',
                alignItems:'center'
              }}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#065f46'}}>
                    {zone.name}
                  </div>
                  <div style={{fontSize:9,color:'#64748b'}}>
                    AQI {zone.pollution?.aqi||0} · {zone.points.length} pts
                  </div>
                </div>
                <button
                  onClick={()=>setEnvZones(prev=>prev.filter(z=>z.id!==zone.id))}
                  style={{background:'none',border:'none',
                    color:'#94a3b8',cursor:'pointer',fontSize:16}}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARTE (garder tout le code existant) ── */}
      <div style={{flex:1, minWidth:0, position:'relative'}}>

        {selectedWilaya && (
          <button onClick={flyBack} style={{
            position:'absolute',top:10,left:50,zIndex:1000,
            background:'white',border:'1.5px solid #bfdbfe',borderRadius:8,
            padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer',
            color:'#1d4ed8',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
            display:'flex',alignItems:'center',gap:5
          }}>← Retour wilayas</button>
        )}



        <MapContainer
          center={[34.8783,-1.3150]} zoom={9} minZoom={4} maxZoom={13}
          maxBounds={[[18.5,-9.0],[37.5,12.0]]} maxBoundsViscosity={1.0}
          style={{height:'480px',width:'100%',borderRadius:'12px',border:'1px solid #e2e8f0'}}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap'/>
          <MapController/>
          <ZoomWatcher/>

          <MapClickHandler 
            enabled={drawingZone} 
            onMapClick={(latlng) => {
              setTempPoints(prev => [...prev, [latlng.lat, latlng.lng]]);
            }}
          />

          {envZones.map((zone, i) => {
            const zoneColor = getZoneColor(zone.pollution?.risk || 'Low');
            return (
              <Polygon
                key={i}
                positions={zone.points}
                pathOptions={{
                  color: zoneColor,
                  fillColor: zoneColor,
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '5,5'
                }}
                eventHandlers={{
                  click: () => setSelectedEnvZone(zone)
                }}
              >
                <Popup>
                  <div style={{fontFamily:'sans-serif',minWidth:220,padding:8}}>
                    <b style={{fontSize:13}}>{zone.name}</b><br/>
                    <span style={{color:'#64748b',fontSize:11}}>
                      📍 {zone.location}
                    </span><br/><br/>
                    <span style={{fontSize:20,fontWeight:800,color:'#dc2626'}}>
                      {zone.realData?.totalCases || 0}
                    </span>
                    <span style={{fontSize:11,color:'#64748b'}}> patients réels</span><br/>
                    {zone.realData?.dominantCancer && (
                      <>
                        <span style={{fontSize:11,fontWeight:700,color:'#7c3aed'}}>
                          Dominant: {zone.realData.dominantCancer.label}
                        </span><br/>
                      </>
                    )}
                    <span style={{fontSize:11,color:'#059669'}}>
                      AQI: {zone.pollution?.aqi || 0}
                    </span>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {drawingZone && tempPoints.length > 0 && (
            <Polygon
              positions={tempPoints}
              pathOptions={{
                color: '#059669', fillColor:'#059669',
                fillOpacity: 0.1, weight: 2, dashArray:'4,4'
              }}
            />
          )}

          {drawingZone && tempPoints.map((pt, i) => (
            <CircleMarker
              key={`temp-${i}`}
              center={pt}
              radius={5}
              pathOptions={{fillColor:'#059669', color:'white', weight:2, fillOpacity:1}}
            />
          ))}

          {activeMarkerType === 'zone' && tempPoints.length > 1 && (
            <Polyline
              positions={tempPoints}
              pathOptions={{
                color: '#059669',
                weight: 2.5,
                dashArray: '6,4',
                opacity: 0.8
              }}
            />
          )}

          {activeMarkerType === 'zone' && tempPoints.length > 2 && (
            <Polyline
              positions={[tempPoints[tempPoints.length-1], tempPoints[0]]}
              pathOptions={{
                color: '#059669',
                weight: 1.5,
                dashArray: '3,6',
                opacity: 0.4
              }}
            />
          )}

          {activeMarkerType === 'zone' && tempPoints.map((pt, i) => (
            <CircleMarker
              key={`tp-${i}`}
              center={pt}
              radius={6}
              pathOptions={{
                fillColor: i===0 ? '#1d4ed8' : '#059669',
                color: 'white', weight: 2, fillOpacity: 1
              }}
            >
              <LeafletTooltip permanent direction="top" offset={[0,-8]}>
                <span style={{fontSize:10,fontWeight:700}}>{i+1}</span>
              </LeafletTooltip>
            </CircleMarker>
          ))}

          {activeMarkerType === 'zone' && tempPoints.length >= 3 && (
            <div style={{
              position:'absolute', bottom:16, left:'50%',
              transform:'translateX(-50%)', zIndex:1000,
              display:'flex', gap:8
            }}>
              <button
                onClick={() => {
                  if (tempPoints.length < 3) return;
                  setZonePolygonError('');

                  // ━━━ ANALYSE DONNÉES RÉELLES (deuxième button) ━━━
                  const centLat = tempPoints.reduce((s, p) => {
                    const lat = Array.isArray(p) ? p[0] : p.lat
                    return s + lat
                  }, 0) / tempPoints.length
                  const centLng = tempPoints.reduce((s, p) => {
                    const lng = Array.isArray(p) ? p[1] : p.lng
                    return s + lng
                  }, 0) / tempPoints.length

                  console.log('✅ Centroid exact:', centLat, centLng)

                  let closestLocation = null
                  let minDist = Infinity
                  let locationType = 'wilaya'

                  Object.entries(DAIRA_COORDINATES).forEach(([name, coords]) => {
                    const dist = Math.sqrt(
                      Math.pow(centLat - coords[0], 2) +
                      Math.pow(centLng - coords[1], 2)
                    )
                    if (dist < minDist && dist < 0.3) {
                      minDist = dist
                      closestLocation = name
                      locationType = 'daira'
                    }
                  })

                  if (!closestLocation) {
                    Object.entries(WILAYA_COORDINATES).forEach(([name, coords]) => {
                      const dist = Math.sqrt(
                        Math.pow(centLat - coords[0], 2) +
                        Math.pow(centLng - coords[1], 2)
                      )
                      if (dist < minDist) {
                        minDist = dist
                        closestLocation = name
                        locationType = 'wilaya'
                      }
                    })
                  }

                  console.log('📍 Location détectée:', closestLocation, '('+locationType+')', 'dist:', minDist)

                  const zonePatients = sourceData.filter(d => 
                    d.wilaya === closestLocation || 
                    d.daira === closestLocation ||
                    (closestLocation === 'Tlemcen' && d.wilaya === 'Tlemcen')
                  )

                  const totalCases = zonePatients.reduce((s,d) => s+d.cases, 0)
                  
                  const cancerMap = {}
                  zonePatients.forEach(d => {
                    if (d.cancer) cancerMap[d.cancer] = (cancerMap[d.cancer]||0) + d.cases
                  })
                  const sortedCancers = Object.entries(cancerMap)
                    .sort((a,b) => b[1]-a[1])
                    .map(([id, count]) => ({
                      id,
                      label: resolvedCancers.find(c=>c.id===id)?.label || id,
                      count,
                      pct: totalCases > 0 ? ((count/totalCases)*100).toFixed(1) : '0'
                    }))
                  
                  const dominantCancer = sortedCancers[0]

                  const nearbyIndustrie = FIXED_MARKERS.industrie.filter(m =>
                    Math.sqrt(Math.pow(centLat-m.lat,2)+Math.pow(centLng-m.lng,2)) < 0.15
                  )
                  const nearbyEau = FIXED_MARKERS.eau.filter(m =>
                    Math.sqrt(Math.pow(centLat-m.lat,2)+Math.pow(centLng-m.lng,2)) < 0.25
                  )
                  const nearbyRisque = FIXED_MARKERS.risque.filter(m =>
                    Math.sqrt(Math.pow(centLat-m.lat,2)+Math.pow(centLng-m.lng,2)) < 0.15
                  )

                  const explanations = generateExplanation(
                    dominantCancer, 
                    nearbyIndustrie, 
                    nearbyEau, 
                    nearbyRisque
                  )

                  const pollutionData = computeCompletePollutionData([], tempPoints)

                  const newZone = {
                    id: Date.now(),
                    name: newZoneName || 'Zone sans nom',
                    points: [...tempPoints],
                    centroid: [centLat, centLng],
                    location: closestLocation,
                    realData: {
                      totalCases,
                      cancers: sortedCancers.slice(0, 5),
                      dominantCancer: dominantCancer || null,
                    },
                    environment: {
                      nearbyIndustrie,
                      nearbyEau,
                      nearbyRisque,
                      explanations
                    },
                    pollution: {
                      aqi: pollutionData.aqi,
                      pm25: pollutionData.pm25,
                      eau: pollutionData.eau,
                      risque: pollutionData.risque,
                      risk: getRiskLevel(pollutionData.aqi),
                      nearbyWilayas: pollutionData.nearbyWilayas,
                    },
                    createdAt: new Date().toLocaleDateString('fr-FR')
                  };
                  setEnvZones(prev => [...prev, newZone]);
                  setSelectedEnvZone(newZone);
                  setShowEnvPanel(true);
                  setDrawingZone(false);
                  setTempPoints([]);
                  setNewZoneName('');
                }}
                style={{
                  padding:'10px 22px', borderRadius:9, border:'none',
                  background:'linear-gradient(135deg,#059669,#10b981)',
                  color:'white', fontFamily:'inherit', fontSize:13,
                  fontWeight:700, cursor:'pointer',
                  boxShadow:'0 4px 14px rgba(5,150,105,0.4)'
                }}>
                ✓ Valider zone ({tempPoints.length} points)
              </button>
              <button
                onClick={() => {
                  setTempPoints([])
                  setActiveMarkerType(null)
                }}
                style={{
                  padding:'10px 16px', borderRadius:9,
                  border:'1.5px solid #dc2626', background:'white',
                  color:'#dc2626', fontFamily:'inherit', fontSize:12,
                  fontWeight:700, cursor:'pointer'
                }}>
                ✕ Annuler
              </button>
            </div>
          )}

          {!selectedWilaya && Object.entries(WILAYA_COORDINATES).map(([name,coords]) => {
            const cases = casesByWilaya[name]||0;
            const r = cases>0 ? Math.max(9,Math.min(38,(cases/maxVal)*48)) : 7;
            return (
              <CircleMarker key={name} center={coords} radius={r}
                pathOptions={{
                  fillColor: getColor(cases),
                  color: '#fff',
                  weight: 1.2,
                  fillOpacity: 0.85
                }}
                eventHandlers={{
                  click: () => {
                    flyTo(name);
                  },
                  mouseover: e => {
                    e.target.setStyle({weight:2.5,fillOpacity:1});
                    e.target.bindTooltip(
                      `<b>${name}</b><br/><span style="color:#dc2626;font-weight:700">${cases.toLocaleString('fr-FR')}</span> cas<br/><span style="color:#64748b;font-size:11px">${getTier(cases)} · ${totalAll>0?((cases/totalAll)*100).toFixed(1):0}%</span><br/><i style="color:#3b82f6;font-size:10px">▶ Cliquer pour daïras</i>`,
                      {direction:'top',offset:[0,-r]}
                    ).openTooltip();
                  },
                  mouseout: e => e.target.setStyle({weight:1.2,fillOpacity:0.85})
                }}
              />
            );
          })}

          {selectedWilaya && dairas.map(d => {
            const r = d.cases>0 ? Math.max(8,Math.min(26,(d.cases/maxDaira)*30)) : 6;
            const mPct = d.cases>0 ? Math.round((d.male/d.cases)*100) : 0;
            return (
              <CircleMarker key={d.name} center={d.coords} radius={r}
                pathOptions={{
                  fillColor: getColor(d.cases),
                  color: '#475569',
                  weight: 1.5,
                  fillOpacity: 0.88
                }}
                eventHandlers={{
                  click: e => {
                    const fPct = 100 - mPct;
                    e.target.bindPopup(
                      `<div style="font-family:sans-serif;min-width:200px;padding:4px">
                        <div style="font-weight:800;font-size:14px;color:#0f172a;border-bottom:2px solid #2563eb;padding-bottom:6px;margin-bottom:8px">${d.name}</div>
                        <div style="font-size:20px;font-weight:800;color:#dc2626">${d.cases.toLocaleString('fr-FR')}</div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:8px">cas totaux</div>
                        <div style="margin-bottom:6px"><span style="font-size:11px;font-weight:700;color:#7c3aed">Cancer dominant:</span><br/><span style="font-size:12px;color:#0f172a;font-weight:600">${d.dominant}</span></div>
                        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px">RÉPARTITION SEXE</div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                          <span style="color:#2563eb;font-weight:600">♂ Hommes ${mPct}%</span>
                          <span style="color:#e05c4b;font-weight:600">♀ Femmes ${fPct}%</span>
                        </div>
                        <div style="height:6px;border-radius:3px;background:#f1f5f9;overflow:hidden;display:flex">
                          <div style="width:${mPct}%;background:#2563eb"></div>
                          <div style="flex:1;background:#e05c4b"></div>
                        </div>
                      </div>`,
                      { maxWidth: 240 }
                    ).openPopup();
                  },
                  mouseover: e => {
                    e.target.setStyle({weight:3,fillOpacity:1});
                    e.target.bindTooltip(
                      `<b style="font-size:13px">${d.name}</b><br/><span style="color:#dc2626;font-weight:700">${d.cases.toLocaleString('fr-FR')}</span> cas<br/>♂ ${mPct}% · ♀ ${100-mPct}%<br/><span style="color:#7c3aed;font-size:11px">${d.dominant}</span>`,
                      {direction:'top',offset:[0,-r]}
                    ).openTooltip();
                  },
                  mouseout: e => e.target.setStyle({weight:1.5,fillOpacity:0.88})
                }}
              />
            );
          })}

          {currentZoom >= 8 && currentZoom < 11 && (() => {
            const src = Array.isArray(apiData?.raw_data) ? apiData.raw_data : [];
            const communeMap = {};
            src.forEach(d => {
              if (!d.latitude || !d.longitude) return;
              const key = d.commune_name || d.daira || d.wilaya;
              if (!key) return;
              if (!communeMap[key]) {
                communeMap[key] = { name: key, lat: d.latitude, lng: d.longitude, cases: 0, cancers: {} };
              }
              communeMap[key].cases += 1;
              communeMap[key].cancers[d.cancer] = (communeMap[key].cancers[d.cancer] || 0) + 1;
            });

            const maxC = Math.max(...Object.values(communeMap).map(c => c.cases), 1);

            return Object.values(communeMap).map((commune, i) => {
              const r = Math.max(10, Math.min(35, (commune.cases / maxC) * 40));
              const dom = Object.entries(commune.cancers).sort((a,b) => b[1]-a[1])[0];
              const domColor = cancers.find(c => c.id === dom?.[0])?.color || '#2563eb';
              return (
                <CircleMarker
                  key={`commune-${i}`}
                  center={[commune.lat, commune.lng]}
                  radius={r}
                  pathOptions={{
                    fillColor: domColor,
                    color: 'white',
                    weight: 2,
                    fillOpacity: 0.8
                  }}
                  eventHandlers={{
                    mouseover: e => {
                      e.target.setStyle({ fillOpacity: 1, weight: 3 });
                      e.target.bindTooltip(
                        `<div style="font-family:sans-serif;min-width:160px;padding:4px">
                          <b style="font-size:13px">${commune.name}</b><br/>
                          <span style="color:${domColor};font-weight:700;font-size:18px">${commune.cases}</span>
                          <span style="color:#64748b;font-size:11px"> patients</span><br/>
                          <span style="color:#7c3aed;font-size:11px;font-weight:600">
                            ${cancers.find(c => c.id === dom?.[0])?.label || dom?.[0] || '—'}
                          </span> dominant
                        </div>`,
                        { direction: 'top', offset: [0, -r] }
                      ).openTooltip();
                    },
                    mouseout: e => e.target.setStyle({ fillOpacity: 0.8, weight: 2 }),
                  }}
                />
              );
            });
          })()}

          {currentZoom >= 11 && (() => {
  const src = Array.isArray(apiData?.raw_data) ? apiData.raw_data : [];
  const patientsWithCoords = src.filter(d => d.latitude && d.longitude);
  
  // Generate stable offsets based on index (not Math.random which re-runs on render)
  return patientsWithCoords.map((d, i) => {
    const cancerColor = cancers.find(c => c.id === d.cancer)?.color || '#2563eb';
    const cancerLabel = cancers.find(c => c.id === d.cancer)?.label || d.cancer;
    
    // Stable offset using index — creates a spiral pattern so dots don't overlap
    const angle = (i * 137.508) * (Math.PI / 180); // golden angle
    const radius = Math.sqrt(i) * 0.0003;
    const latOffset  = Math.sin(angle) * radius;
    const lngOffset  = Math.cos(angle) * radius;
    
    return (
      <CircleMarker
        key={`patient-${i}`}
        center={[d.latitude + latOffset, d.longitude + lngOffset]}
        radius={8}
        pathOptions={{
          fillColor: cancerColor,
          color: 'white',
          weight: 1.5,
          fillOpacity: 0.9
        }}
        eventHandlers={{
          mouseover: e => {
            e.target.setStyle({ radius: 12, fillOpacity: 1, weight: 2.5 });
            e.target.bindTooltip(
              `<div style="font-family:sans-serif;min-width:190px;padding:8px">
                <div style="font-weight:800;font-size:14px;color:#0f172a;
                  border-bottom:2px solid ${cancerColor};
                  padding-bottom:6px;margin-bottom:8px">
                  ${d.commune_name || d.daira || d.wilaya}
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                  <div style="width:10px;height:10px;border-radius:50%;
                    background:${cancerColor};flex-shrink:0"></div>
                  <span style="font-size:13px;font-weight:700;color:${cancerColor}">
                    ${cancerLabel}
                  </span>
                </div>
                <div style="font-size:11px;color:#475569;line-height:1.8">
                  ${d.sex === 'M' ? '♂ Homme' : '♀ Femme'}<br/>
                  Tranche: ${d.age}<br/>
                  Stade: <strong>${d.stade}</strong><br/>
                  Année: ${d.year}
                </div>
              </div>`,
              { direction: 'top', offset: [0, -12], permanent: false }
            ).openTooltip();
          },
          mouseout: e => {
            e.target.setStyle({ radius: 8, fillOpacity: 0.9, weight: 1.5 });
            e.target.closeTooltip();
          },
          click: e => {
            e.target.bindPopup(
              `<div style="font-family:sans-serif;min-width:200px;padding:4px">
                <div style="font-weight:800;font-size:15px;color:#0f172a;
                  border-bottom:2px solid ${cancerColor};
                  padding-bottom:6px;margin-bottom:10px">
                  ${d.commune_name || d.daira || d.wilaya}
                </div>
                <div style="margin-bottom:8px">
                  <span style="font-size:22px;font-weight:800;color:${cancerColor}">
                    ${cancerLabel}
                  </span>
                </div>
                <table style="font-size:12px;width:100%;border-collapse:collapse">
                  <tr>
                    <td style="color:#64748b;padding:3px 0">Sexe</td>
                    <td style="font-weight:600;color:#0f172a;text-align:right">
                      ${d.sex === 'M' ? '♂ Masculin' : '♀ Féminin'}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;padding:3px 0">Âge</td>
                    <td style="font-weight:600;color:#0f172a;text-align:right">${d.age}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;padding:3px 0">Stade</td>
                    <td style="font-weight:600;color:#0f172a;text-align:right">${d.stade}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;padding:3px 0">Wilaya</td>
                    <td style="font-weight:600;color:#0f172a;text-align:right">${d.wilaya}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;padding:3px 0">Commune</td>
                    <td style="font-weight:600;color:#0f172a;text-align:right">
                      ${d.commune_name || d.daira || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;padding:3px 0">Année diag.</td>
                    <td style="font-weight:600;color:#0f172a;text-align:right">${d.year}</td>
                  </tr>
                </table>
              </div>`,
              { maxWidth: 240 }
            ).openPopup();
          }
        }}
      />
    );
  });
})()}

          {/* Markers fixes industriels */}
          {visibleLayers.industrie && FIXED_MARKERS.industrie.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={industrieIcon}>
              <Popup>
                <div style={{fontFamily:'sans-serif',minWidth:180,padding:'4px'}}>
                  <b style={{color:'#dc2626',fontSize:13}}>🏭 {m.name}</b><br/>
                  <span style={{fontSize:11,color:'#475569'}}>
                    Polluants: {m.polluants}<br/>
                    Rayon impact: ~{m.rayon}km
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Markers fixes eau */}
          {visibleLayers.eau && FIXED_MARKERS.eau.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={eauIcon}>
              <Popup>
                <div style={{fontFamily:'sans-serif',minWidth:180,padding:'4px'}}>
                  <b style={{color:'#0891b2',fontSize:13}}>💧 {m.name}</b><br/>
                  <span style={{fontSize:11,color:'#475569'}}>
                    Qualité: {m.qualite}<br/>
                    Usage: {m.usage}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Markers fixes risques */}
          {visibleLayers.risque && FIXED_MARKERS.risque.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={risqueIcon}>
              <Popup>
                <div style={{fontFamily:'sans-serif',minWidth:180,padding:'4px'}}>
                  <b style={{color:'#d97706',fontSize:13}}>⚠️ {m.name}</b><br/>
                  <span style={{fontSize:11,color:'#475569'}}>
                    Impact: {m.impact}<br/>
                    Niveau: {m.niveau}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Markers manuels */}
          {customMarkers.map(m => (
            <CircleMarker key={m.id} center={[m.lat, m.lng]} radius={9}
              pathOptions={{
                fillColor: m.type==='industrie'?'#dc2626':
                           m.type==='eau'?'#0891b2':'#d97706',
                color:'white', weight:2, fillOpacity:0.9
              }}>
              <Popup><b>{m.name}</b></Popup>
            </CircleMarker>
          ))}

          {/* Gérer clic carte pour placer markers manuels */}
          <MapClickHandler
            enabled={activeMarkerType && activeMarkerType !== 'zone'}
            onMapClick={(latlng) => {
              if (!activeMarkerType || activeMarkerType === 'zone') return
              setModal({
                type: 'input',
                message: `Nom du point (${activeMarkerType}):`,
                onConfirm: (name) => {
                  if (!name?.trim()) return
                  setCustomMarkers(prev => [...prev, {
                    id: Date.now(),
                    type: activeMarkerType,
                    name: name.trim(),
                    lat: latlng.lat,
                    lng: latlng.lng
                  }])
                  setActiveMarkerType(null)
                }
              })
            }}
          />

          <div className="leaflet-bottom leaflet-right" style={{zIndex:1000}}>
            <div style={{background:'white',borderRadius:10,padding:'11px 13px',margin:'0 8px 8px 0',boxShadow:'0 3px 12px rgba(0,0,0,0.12)',border:'1px solid #e2e8f0'}}>
              <div style={{fontWeight:700,fontSize:11,color:'#0f172a',marginBottom:7,textTransform:'uppercase',letterSpacing:'0.05em'}}>Légende</div>
              {LEGEND.map(([c,l]) => (
                <div key={l} style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:c,border:'1px solid #cbd5e1',flexShrink:0}}/>
                  <span style={{fontSize:10.5,color:'#475569'}}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </MapContainer>

        {modal && (
          <div style={{
            position:'fixed', top:0, left:0, right:0, bottom:0,
            background:'rgba(0,0,0,0.5)', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <div style={{
              background:'white', borderRadius:14, padding:'24px 28px',
              minWidth:320, boxShadow:'0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <div style={{fontSize:14,fontWeight:700,color:'#0f172a',
                marginBottom:16}}>
                {modal.message}
              </div>
              {modal.type === 'input' && (
                <input
                  id="modal-input"
                  autoFocus
                  style={{
                    width:'100%', padding:'10px 14px', borderRadius:8,
                    border:'1.5px solid #2563eb', fontSize:13,
                    fontFamily:'inherit', outline:'none', marginBottom:16,
                    boxSizing:'border-box'
                  }}
                  onKeyDown={e => {
                    if(e.key==='Enter') {
                      modal.onConfirm(e.target.value)
                      setModal(null)
                    }
                    if(e.key==='Escape') {
                      modal.onCancel?.()
                      setModal(null)
                    }
                  }}
                />
              )}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button
                  onClick={() => { modal.onCancel?.(); setModal(null) }}
                  style={{padding:'8px 18px',borderRadius:7,border:'1.5px solid #e2e8f0',
                    background:'white',color:'#64748b',fontFamily:'inherit',
                    fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const val = modal.type==='input'
                      ? document.getElementById('modal-input')?.value
                      : true
                    modal.onConfirm(val)
                    setModal(null)
                  }}
                  style={{padding:'8px 18px',borderRadius:7,border:'none',
                    background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                    color:'white',fontFamily:'inherit',fontSize:12,
                    fontWeight:700,cursor:'pointer'}}>
                  {modal.type==='confirm' ? 'Confirmer' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedWilaya && stats && (
        <div style={{width:250,background:'white',borderRadius:12,border:'1.5px solid #e2e8f0',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',overflow:'hidden',flexShrink:0}}>
          {wilayaLoading && (
            <div style={{textAlign:'center', padding:'20px', color:'#94a3b8', fontSize:12}}>
              Chargement...
            </div>
          )}
          {!wilayaLoading && (
            <>
              <div style={{background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',padding:'14px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:800,fontSize:15,color:'white'}}>{selectedWilaya}</div>
                  <button onClick={flyBack} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:13}}>×</button>
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.75)',marginTop:2}}>{getTier(stats.cases)}</div>
              </div>
              <div style={{padding:'14px 16px'}}>
                <div style={{fontSize:26,fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em'}}>{stats.cases.toLocaleString('fr-FR')}</div>
                <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>cas · {stats.pct}% national</div>

            <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Cancer dominant</div>
            <div style={{fontSize:13,fontWeight:700,color:'#7c3aed',marginBottom:14,background:'#f5f3ff',padding:'6px 10px',borderRadius:7}}>{stats.dominant}</div>

            <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Répartition sexe</div>
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                <span style={{color:'#2563eb',fontWeight:600}}>♂ Hommes {stats.cases>0?Math.round((stats.male/stats.cases)*100):0}%</span>
                <span style={{color:'#e05c4b',fontWeight:600}}>♀ Femmes {stats.cases>0?Math.round((stats.female/stats.cases)*100):0}%</span>
              </div>
              <div style={{height:8,borderRadius:4,background:'#f1f5f9',overflow:'hidden',display:'flex'}}>
                <div style={{width:`${stats.cases>0?(stats.male/stats.cases)*100:50}%`,background:'#2563eb',transition:'width 0.5s'}}/>
                <div style={{flex:1,background:'#e05c4b'}}/>
              </div>
            </div>

            {dairas.length > 0 && <>
              <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Top daïras</div>
              {dairas.slice(0,6).map((d,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:i<5?'1px solid #f8fafc':'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{width:17,height:17,borderRadius:'50%',background:i<3?'#eff6ff':'#f8fafc',color:i<3?'#2563eb':'#64748b',border:i<3?'1px solid #bfdbfe':'1px solid #e2e8f0',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8.5,fontWeight:800,flexShrink:0}}>{i+1}</span>
                    <span style={{fontSize:11,color:'#334155'}}>{d.name}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{d.cases.toLocaleString('fr-FR')}</div>
                    <div style={{height:3,width:50,background:'#f1f5f9',borderRadius:2,marginTop:2}}>
                      <div style={{height:'100%',background:getColor(d.cases),borderRadius:2,width:`${(d.cases/maxDaira)*100}%`}}/>
                    </div>
                  </div>
                </div>
              ))}
            </>}

            <div style={{display:'flex',gap:5,marginBottom:12}}>
              {[
                {id:'bars',    icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>, label:'Barres'},
                {id:'hbars',   icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="2" y1="7" x2="14" y2="7"/><line x1="2" y1="12" x2="20" y2="12"/><line x1="2" y1="17" x2="11" y2="17"/><line x1="2" y1="2" x2="2" y2="22"/></svg>, label:'H.Barres'},
                {id:'donut',   icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>, label:'Donut'},
                {id:'line',    icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label:'Courbe'},
              ].map(t=>(
                <button key={t.id} onClick={()=>setPanelChartType(t.id)} style={{
                  flex:1, padding:'5px 4px', borderRadius:7, fontSize:9, fontWeight:700,
                  cursor:'pointer', border:'1.5px solid',
                  borderColor: panelChartType===t.id ? '#0f172a' : '#e2e8f0',
                  background: panelChartType===t.id ? '#0f172a' : 'white',
                  color: panelChartType===t.id ? 'white' : '#64748b',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                  transform: panelChartType===t.id ? 'translateY(-1px)' : 'translateY(0)',
                  transition:'all 0.15s ease'
                }}>
                  <span style={{color:'inherit'}}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {panelChart === 'cancers' && (() => {
              const cancerRows = (() => {
                const cm = {};
                const safeRawData = Array.isArray(rawData) ? rawData : [];
                safeRawData.filter(r => r.wilaya === selectedWilaya).forEach(r => { cm[r.cancer] = (cm[r.cancer]||0) + r.cases; });
                return Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,v]) => ({
                  label: cancers.find(c=>c.id===id)?.label||id,
                  value: v,
                  color: cancers.find(c=>c.id===id)?.color||'#2563eb',
                  id
                }));
              })();
              const maxC = Math.max(...cancerRows.map(r=>r.value),1);

              if(panelChartType === 'bars') {
                return cancerRows.map((c,i) => {
                  const isActive = activeCancer === c.id;
                  return (
                    <div key={i}
                      onClick={() => setActiveCancer(isActive ? null : c.id)}
                      style={{
                        marginBottom:7, padding:'6px 8px', borderRadius:7, cursor:'pointer',
                        background: isActive ? c.color+'18' : 'transparent',
                        border: isActive ? `1.5px solid ${c.color}44` : '1.5px solid transparent',
                        transition:'all 0.2s'
                      }}
                    >
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10.5,marginBottom:4}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:8,height:8,borderRadius:2,background:c.color,flexShrink:0}}/>
                          <span style={{color: isActive ? c.color : '#334155', fontWeight: isActive ? 700 : 500}}>{c.label}</span>
                        </div>
                        <span style={{fontWeight:800,color:'#0f172a'}}>{c.value.toLocaleString('fr-FR')}</span>
                      </div>
                      <div style={{height:5,borderRadius:3,background:'#f1f5f9',overflow:'hidden'}}>
                        <div style={{
                          height:'100%', borderRadius:3, background:c.color,
                          width: isActive ? `${(c.value/maxC)*100}%` : `${(c.value/maxC)*80}%`,
                          transition:'width 0.5s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
                          boxShadow: isActive ? `0 0 8px ${c.color}88` : 'none'
                        }}/>
                      </div>
                      {isActive && (
                        <div style={{marginTop:5,fontSize:10,color:c.color,fontWeight:600,display:'flex',gap:10}}>
                          <span>♂ {Array.isArray(rawData) ? rawData.filter(r=>r.wilaya===selectedWilaya&&r.cancer===c.id&&r.sex==='M').reduce((s,r)=>s+r.cases,0) : 0}</span>
                          <span>♀ {Array.isArray(rawData) ? rawData.filter(r=>r.wilaya===selectedWilaya&&r.cancer===c.id&&r.sex==='F').reduce((s,r)=>s+r.cases,0) : 0}</span>
                        </div>
                      )}
                    </div>
                  );
                });
              }

              if(panelChartType === 'hbars') {
                return cancerRows.map((c,i)=>(
                  <div key={i} style={{marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <div style={{width:7,height:7,borderRadius:2,background:c.color}}/>
                        <span style={{color:'#334155'}}>{c.label}</span>
                      </div>
                      <span style={{fontWeight:700,color:'#0f172a',fontSize:11}}>{c.value.toLocaleString('fr-FR')}</span>
                    </div>
                    <div style={{height:14,borderRadius:4,background:'#f1f5f9',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:4,background:`linear-gradient(90deg,${c.color}cc,${c.color})`,width:`${(c.value/maxC)*100}%`,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:4,transition:'width 0.5s'}}></div>
                    </div>
                  </div>
                ));
              }

              if(panelChartType === 'donut') {
                const donutTotal = cancerRows.reduce((s,c)=>s+c.value,0);
                const cx=110,cy=75,R=55,inner=32;
                let startAngle=-Math.PI/2;
                const slices = cancerRows.map(c=>{
                  const angle=(c.value/donutTotal)*2*Math.PI;
                  const ea=startAngle+angle;
                  const x1=cx+R*Math.cos(startAngle),y1=cy+R*Math.sin(startAngle);
                  const x2=cx+R*Math.cos(ea),y2=cy+R*Math.sin(ea);
                  const ix1=cx+inner*Math.cos(ea),iy1=cy+inner*Math.sin(ea);
                  const ix2=cx+inner*Math.cos(startAngle),iy2=cy+inner*Math.sin(startAngle);
                  const large=angle>Math.PI?1:0;
                  const mid=startAngle+angle/2;
                  const path=`M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix1},${iy1} A${inner},${inner},0,${large},0,${ix2},${iy2} Z`;
                  startAngle=ea;
                  return {...c,path,mid,pct:((c.value/donutTotal)*100).toFixed(0)};
                });
                return (
                  <div>
                    <svg width={220} height={150} style={{display:'block',margin:'0 auto'}}>
                      {slices.map((s,i)=>(
                        <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={1.5} opacity={0.9}/>
                      ))}
                      <text x={cx} y={cy-4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0f172a">{cancerRows[0]?.label}</text>
                      <text x={cx} y={cy+10} textAnchor="middle" fontSize={9} fill="#94a3b8">dominant</text>
                    </svg>
                    <div style={{marginTop:8}}>
                      {slices.map((s,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                          <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
                          <span style={{fontSize:10,color:'#334155',flex:1}}>{s.label}</span>
                          <span style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if(panelChartType === 'line') {
                const lineW=220,lineH=80;
                const maxLine=Math.max(...cancerRows.map(c=>c.value),1);
                const pts=cancerRows.map((c,i)=>({
                  x:20+(i/(cancerRows.length-1||1))*(lineW-40),
                  y:lineH-10-(c.value/maxLine)*(lineH-20),
                  ...c
                }));
                const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
                return (
                  <svg width={lineW} height={lineH+20} style={{display:'block',margin:'4px auto 0'}}>
                    {pts.map((p,i)=>i>0&&<line key={i} x1={pts[i-1].x} y1={pts[i-1].y} x2={p.x} y2={p.y} stroke="#2563eb" strokeWidth={2} strokeLinecap="round"/>)}
                    {pts.map((p,i)=>(
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={4} fill={p.color} stroke="white" strokeWidth={1.5}/>
                        <text x={p.x} y={lineH+16} textAnchor="middle" fontSize={8} fill="#94a3b8">{p.label.slice(0,4)}</text>
                      </g>
                    ))}
                  </svg>
                );
              }
            })()}

            {panelChart === 'sexe' && (() => {
              const mPct = stats.cases>0 ? (stats.male/stats.cases)*100 : 50;
              const fPct = 100 - mPct;
              const radius = 50;
              const cx = 60, cy = 60;
              const mAngle = (mPct / 100) * 2 * Math.PI;
              const fAngle = (fPct / 100) * 2 * Math.PI;
              const mPath = `M ${cx} ${cy} L ${cx + radius * Math.cos(-Math.PI/2)} ${cy + radius * Math.sin(-Math.PI/2)} A ${radius} ${radius} 0 ${mAngle > Math.PI ? 1 : 0} 1 ${cx + radius * Math.cos(-Math.PI/2 + mAngle)} ${cy + radius * Math.sin(-Math.PI/2 + mAngle)} Z`;
              const fPath = `M ${cx} ${cy} L ${cx + radius * Math.cos(-Math.PI/2 + mAngle)} ${cy + radius * Math.sin(-Math.PI/2 + mAngle)} A ${radius} ${radius} 0 ${fAngle > Math.PI ? 1 : 0} 1 ${cx + radius * Math.cos(-Math.PI/2 + mAngle + fAngle)} ${cy + radius * Math.sin(-Math.PI/2 + mAngle + fAngle)} Z`;
              return (
                <div style={{display:'flex',justifyContent:'center',marginTop:10}}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <path d={mPath} fill="#2563eb"/>
                    <path d={fPath} fill="#e05c4b"/>
                    <circle cx={cx} cy={cy} r="25" fill="white"/>
                    <text x={cx} y={cy-5} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0f172a">{stats.cases.toLocaleString('fr-FR')}</text>
                    <text x={cx} y={cy+8} textAnchor="middle" fontSize="9" fill="#64748b">cas</text>
                  </svg>
                </div>
              );
            })()}

            {panelChart === 'evolution' && (() => {
              const yearData = (() => {
                const ym = {};
                const safeRawData = Array.isArray(rawData) ? rawData : [];
                safeRawData.filter(r => r.wilaya === selectedWilaya).forEach(r => { ym[r.year]=(ym[r.year]||0)+r.cases; });
                return Object.entries(ym).sort((a,b)=>Number(a[0])-Number(b[0])).map(([y,v])=>({y,v}));
              })();
              const maxV = Math.max(...yearData.map(d=>d.v),1);
              const points = yearData.map((d,i) => `${20 + (i/(yearData.length-1))*200},${70 - (d.v/maxV)*50}`).join(' ');
              return (
                <div style={{marginTop:10}}>
                  <svg width="240" height="80" viewBox="0 0 240 80">
                    <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2"/>
                    {yearData.map((d,i) => (
                      <circle key={i} cx={20 + (i/(yearData.length-1))*200} cy={70 - (d.v/maxV)*50} r="3" fill="#2563eb"/>
                    ))}
                    {yearData.map((d,i) => (
                      <text key={`t${i}`} x={20 + (i/(yearData.length-1))*200} y={75} textAnchor="middle" fontSize="8" fill="#64748b">{d.y}</text>
                    ))}
                  </svg>
                </div>
              );
            })()}
          </div>
          </>
          )}
        </div>
      )}

      {/* ━━━ 3. AFFICHAGE ZONE — panneau existant ━━━ */}
      {showEnvPanel && selectedEnvZone && (
        <div style={{
          width:260, flexShrink:0,
          background:'white', borderRadius:12,
          border:'1.5px solid #e2e8f0',
          boxShadow:'0 4px 20px rgba(0,0,0,0.08)',
          maxHeight:500, overflowY:'auto', position:'sticky', top:10
        }}>
          <div style={{background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
            padding:'10px 12px',display:'flex',justifyContent:'space-between',
            alignItems:'center'}}>
            <div>
              <div style={{fontWeight:800,fontSize:12,color:'white'}}>
                📍 {selectedEnvZone.name}
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:2}}>
                {selectedEnvZone.location} · {selectedEnvZone.points?.length} points
              </div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.6)',marginTop:1}}>
                Créée le {selectedEnvZone.createdAt}
              </div>
            </div>
            <button onClick={()=>setSelectedEnvZone(null)} 
              style={{background:'none',border:'none',color:'white',
                fontSize:18,cursor:'pointer',fontWeight:700}}>×</button>
          </div>

          <div style={{padding:'10px 12px'}}>

            {/* ── PATIENTS RÉELS ── */}
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr',
              gap:8, marginBottom:12
            }}>
              <div style={{
                padding:'10px', borderRadius:8,
                background:'#fef2f2', border:'1px solid #fecaca'
              }}>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',
                  textTransform:'uppercase',marginBottom:4}}>
                  Patients réels
                </div>
                <div style={{fontSize:24,fontWeight:900,color:'#dc2626'}}>
                  {selectedEnvZone.realData?.totalCases || 0}
                </div>
                <div style={{fontSize:9,color:'#94a3b8'}}>cas enregistrés</div>
              </div>
              <div style={{
                padding:'10px', borderRadius:8,
                background:'#f0fdf4', border:'1px solid #bbf7d0'
              }}>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',
                  textTransform:'uppercase',marginBottom:4}}>
                  AQI Zone
                </div>
                <div style={{
                  fontSize:24,fontWeight:900,
                  color: selectedEnvZone.pollution?.aqi <= 50 ? '#16a34a' :
                         selectedEnvZone.pollution?.aqi <= 100 ? '#ca8a04' :
                         '#dc2626'
                }}>
                  {selectedEnvZone.pollution?.aqi || 0}
                </div>
                <div style={{fontSize:9,color:'#94a3b8'}}>
                  {selectedEnvZone.pollution?.aqi <= 50 ? 'Bon' :
                   selectedEnvZone.pollution?.aqi <= 100 ? 'Modéré' : 'Mauvais'}
                </div>
              </div>
            </div>

            {/* ── CANCER DOMINANT + POURQUOI ── */}
            {selectedEnvZone.realData?.dominantCancer && (
              <div style={{
                padding:'12px', borderRadius:10,
                background:'#fdf4ff', border:'1.5px solid #e9d5ff',
                marginBottom:12
              }}>
                <div style={{
                  display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:8
                }}>
                  <div style={{fontSize:12,fontWeight:800,color:'#7c3aed'}}>
                    🎯 Cancer dominant
                  </div>
                  <div style={{
                    fontSize:11, fontWeight:700,
                    color:'white', background:'#7c3aed',
                    padding:'2px 10px', borderRadius:20
                  }}>
                    {selectedEnvZone.realData.dominantCancer.pct}%
                  </div>
                </div>
                <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:4}}>
                  {selectedEnvZone.realData.dominantCancer.label}
                </div>
                <div style={{fontSize:11,color:'#64748b',marginBottom:10}}>
                  {selectedEnvZone.realData.dominantCancer.count} cas dans cette zone
                </div>

                {selectedEnvZone.environment?.explanations?.length > 0 && (
                  <>
                    <div style={{
                      fontSize:9,fontWeight:700,color:'#7c3aed',
                      textTransform:'uppercase',letterSpacing:'0.06em',
                      marginBottom:6
                    }}>
                      🔍 Pourquoi ce cancer ici?
                    </div>
                    {selectedEnvZone.environment.explanations.map((exp,i) => (
                      <div key={i} style={{
                        display:'flex', gap:8, alignItems:'flex-start',
                        padding:'7px 9px', borderRadius:7, marginBottom:5,
                        background: exp.level==='Élevé' ? '#fff7ed' :
                                   exp.level==='Moyen' ? '#fefce8' : '#f0fdf4',
                        border: `1px solid ${
                                   exp.level==='Élevé' ? '#fed7aa' :
                                   exp.level==='Moyen' ? '#fef08a' : '#bbf7d0'}`
                      }}>
                        <span style={{fontSize:16,flexShrink:0}}>{exp.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{
                            display:'flex',justifyContent:'space-between',
                            alignItems:'center',marginBottom:2
                          }}>
                            <span style={{
                              fontSize:10,fontWeight:700,
                              color:'#334155',
                              maxWidth:140,overflow:'hidden',
                              textOverflow:'ellipsis',whiteSpace:'nowrap'
                            }}>
                              {exp.source}
                            </span>
                            <span style={{
                              fontSize:9,fontWeight:700,padding:'1px 6px',
                              borderRadius:10,
                              background: exp.level==='Élevé'?'#fed7aa':
                                         exp.level==='Moyen'?'#fef08a':'#bbf7d0',
                              color: exp.level==='Élevé'?'#ea580c':
                                     exp.level==='Moyen'?'#ca8a04':'#16a34a',
                              flexShrink:0
                            }}>
                              {exp.level}
                            </span>
                          </div>
                          <div style={{fontSize:9,color:'#64748b',lineHeight:1.4}}>
                            {exp.text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── TOP CANCERS RÉELS ── */}
            {selectedEnvZone.realData?.cancers?.length > 1 && (
              <div style={{marginBottom:12}}>
                <div style={{
                  fontSize:9,fontWeight:700,color:'#94a3b8',
                  textTransform:'uppercase',letterSpacing:'0.06em',
                  marginBottom:8
                }}>
                  Distribution réelle des cancers
                </div>
                {selectedEnvZone.realData.cancers.map((c,i) => {
                  const color = resolvedCancers.find(rc=>rc.id===c.id)?.color 
                                || PALETTE[i%PALETTE.length]
                  return (
                    <div key={i} style={{marginBottom:6}}>
                      <div style={{
                        display:'flex',justifyContent:'space-between',
                        fontSize:10,marginBottom:3
                      }}>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <div style={{
                            width:7,height:7,borderRadius:2,
                            background:color,flexShrink:0
                          }}/>
                          <span style={{fontWeight:600,color:'#334155'}}>
                            {c.label}
                          </span>
                        </div>
                        <span style={{fontWeight:700,color:'#0f172a'}}>
                          {c.count} · {c.pct}%
                        </span>
                      </div>
                      <div style={{
                        height:6,borderRadius:3,
                        background:'#f1f5f9',overflow:'hidden'
                      }}>
                        <div style={{
                          height:'100%',borderRadius:3,
                          background:color,
                          width:`${c.pct}%`,
                          transition:'width 0.5s ease'
                        }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── ENVIRONNEMENT PROCHE ── */}
            <div style={{marginBottom:12}}>
              <div style={{
                fontSize:9,fontWeight:700,color:'#94a3b8',
                textTransform:'uppercase',letterSpacing:'0.06em',
                marginBottom:8
              }}>
                🏭 Facteurs environnementaux proches
              </div>

              {selectedEnvZone.environment?.nearbyIndustrie?.length > 0 && (
                selectedEnvZone.environment.nearbyIndustrie.map((m,i) => (
                  <div key={i} style={{
                    display:'flex',gap:6,padding:'6px 8px',
                    borderRadius:6,marginBottom:4,
                    background:'#fef2f2',border:'1px solid #fecaca'
                  }}>
                    <span>🏭</span>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:'#dc2626'}}>
                        {m.name}
                      </div>
                      <div style={{fontSize:9,color:'#64748b'}}>
                        {m.polluants} · rayon ~{m.rayon}km
                      </div>
                    </div>
                  </div>
                ))
              )}

              {selectedEnvZone.environment?.nearbyEau?.length > 0 && (
                selectedEnvZone.environment.nearbyEau.map((m,i) => (
                  <div key={i} style={{
                    display:'flex',gap:6,padding:'6px 8px',
                    borderRadius:6,marginBottom:4,
                    background:'#f0f9ff',border:'1px solid #bae6fd'
                  }}>
                    <span>💧</span>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:'#0891b2'}}>
                        {m.name}
                      </div>
                      <div style={{fontSize:9,color:'#64748b'}}>
                        Qualité: {m.qualite} · {m.usage}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {selectedEnvZone.environment?.nearbyRisque?.length > 0 && (
                selectedEnvZone.environment.nearbyRisque.map((m,i) => (
                  <div key={i} style={{
                    display:'flex',gap:6,padding:'6px 8px',
                    borderRadius:6,marginBottom:4,
                    background:'#fffbeb',border:'1px solid #fed7aa'
                  }}>
                    <span>⚠️</span>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:'#d97706'}}>
                        {m.name}
                      </div>
                      <div style={{fontSize:9,color:'#64748b'}}>
                        {m.impact} · niveau {m.niveau}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {!selectedEnvZone.environment?.nearbyIndustrie?.length &&
               !selectedEnvZone.environment?.nearbyEau?.length &&
               !selectedEnvZone.environment?.nearbyRisque?.length && (
                <div style={{
                  fontSize:11,color:'#94a3b8',
                  padding:'8px',textAlign:'center',
                  background:'#f8fafc',borderRadius:6
                }}>
                  Aucun site industriel ou source d'eau proche
                </div>
              )}
            </div>

            {/* ── POLLUANTS ── */}
            <div style={{
              padding:'10px 12px',borderRadius:8,
              background:'#f8fafc',border:'1px solid #e2e8f0'
            }}>
              <div style={{
                display:'flex',justifyContent:'space-between',
                fontSize:11,padding:'4px 0',
                borderBottom:'1px solid #f1f5f9'
              }}>
                <span style={{color:'#64748b'}}>PM2.5</span>
                <span style={{fontWeight:700,color:'#dc2626'}}>
                  {selectedEnvZone.pollution?.pm25||0} µg/m³
                </span>
              </div>
              <div style={{
                display:'flex',justifyContent:'space-between',
                fontSize:11,padding:'4px 0',
                borderBottom:'1px solid #f1f5f9'
              }}>
                <span style={{color:'#64748b'}}>Qualité eau</span>
                <span style={{fontWeight:700,color:'#0891b2'}}>
                  {selectedEnvZone.pollution?.eau||'—'}
                </span>
              </div>
              <div style={{
                display:'flex',justifyContent:'space-between',
                fontSize:11,padding:'4px 0'
              }}>
                <span style={{color:'#64748b'}}>Wilayas proches</span>
                <span style={{
                  fontWeight:600,color:'#64748b',fontSize:10,
                  textAlign:'right',maxWidth:130
                }}>
                  {selectedEnvZone.pollution?.nearbyWilayas?.join(' · ')||'—'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setEnvZones(prev => prev.filter(z => z.id !== selectedEnvZone.id))
                setSelectedEnvZone(null)
              }}
              style={{
                width:'100%',marginTop:10,padding:'8px',
                borderRadius:7,border:'1px solid #fecaca',
                background:'#fef2f2',color:'#dc2626',
                fontFamily:'inherit',fontSize:11,fontWeight:700,
                cursor:'pointer'
              }}>
              🗑 Supprimer cette zone
            </button>

          </div>
        </div>
      )}

      {/* ── PANNEAU DROITE: Mes Cartes Environnementales ── */}
      {!selectedWilaya && (
        <div style={{
          width:260, flexShrink:0,
          background:'white', borderRadius:12,
          border:'1.5px solid #e2e8f0',
          boxShadow:'0 4px 20px rgba(0,0,0,0.08)',
          maxHeight:500, overflowY:'auto'
        }}>
          <div style={{background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
            padding:'10px 12px'}}>
            <div style={{fontWeight:800,fontSize:12,color:'white'}}>
              🗺️ Mes Cartes Environnementales
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.75)',marginTop:2}}>
              {savedMaps.length} carte(s) sauvegardée(s)
            </div>
          </div>

          <div style={{padding:'12px 14px'}}>
            {/* Bouton sauvegarder */}
            <button
              onClick={() => {
                setModal({
                  type: 'input',
                  message: 'Nom de cette carte environnementale:',
                  onConfirm: (name) => {
                    if (!name?.trim()) return
                    const newMap = {
                      id: Date.now(),
                      name: name.trim(),
                      zones: envZones,
                      markers: customMarkers,
                      createdAt: new Date().toLocaleDateString('fr-FR')
                    }
                    const updated = [...savedMaps, newMap]
                    setSavedMaps(updated)
                    localStorage.setItem('envMaps', JSON.stringify(updated))
                  }
                })
              }}
              style={{
                width:'100%', padding:'9px', borderRadius:8,
                border:'none', background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                color:'white', fontFamily:'inherit', fontSize:12,
                fontWeight:700, cursor:'pointer', marginBottom:12
              }}>
              💾 Sauvegarder vue actuelle
            </button>

            {/* Liste des cartes */}
            {savedMaps.length === 0 ? (
              <div style={{textAlign:'center',padding:'30px 0',
                color:'#94a3b8',fontSize:12}}>
                Aucune carte sauvegardée
              </div>
            ) : savedMaps.map(map => {
              const isExpanded = expandedMapId === map.id
              const isEditing = editingMapId === map.id
              return (
                <div key={map.id} style={{
                  borderRadius:10, border:'1.5px solid #e2e8f0',
                  marginBottom:10, overflow:'hidden',
                  transition:'all 0.2s'
                }}>
                  {/* Card header */}
                  <div style={{padding:'10px 12px',
                    background: isExpanded ? '#eff6ff' : '#f8fafc'}}>
                    {isEditing ? (
                      <input
                        defaultValue={map.name}
                        onBlur={e => {
                          const updated = savedMaps.map(m =>
                            m.id===map.id ? {...m,name:e.target.value} : m
                          )
                          setSavedMaps(updated)
                          localStorage.setItem('envMaps',JSON.stringify(updated))
                          setEditingMapId(null)
                        }}
                        autoFocus
                        style={{width:'100%',padding:'4px 8px',borderRadius:5,
                          border:'1.5px solid #2563eb',fontFamily:'inherit',
                          fontSize:12,fontWeight:700}}
                      />
                    ) : (
                      <div style={{fontWeight:700,fontSize:12,color:'#0f172a'}}>
                        🗺️ {map.name}
                      </div>
                    )}
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>
                      {map.zones?.length||0} zone(s) · 
                      {map.markers?.length||0} point(s) · 
                      {map.createdAt}
                    </div>
                    {/* Actions */}
                    <div style={{display:'flex',gap:5,marginTop:8}}>
                      <button
                        onClick={() => setExpandedMapId(
                          isExpanded ? null : map.id
                        )}
                        style={{flex:1,padding:'4px',borderRadius:5,
                          border:'1px solid #bfdbfe',background:'#eff6ff',
                          color:'#2563eb',fontSize:10,fontWeight:600,
                          cursor:'pointer',fontFamily:'inherit'}}>
                        {isExpanded ? '▲ Fermer' : '👁 Voir'}
                      </button>
                      <button
                        onClick={() => setEditingMapId(
                          isEditing ? null : map.id
                        )}
                        style={{flex:1,padding:'4px',borderRadius:5,
                          border:'1px solid #d8b4fe',background:'#faf5ff',
                          color:'#7c3aed',fontSize:10,fontWeight:600,
                          cursor:'pointer',fontFamily:'inherit'}}>
                        ✏️ Modif
                      </button>
                      <button
                        onClick={() => {
                          setModal({
                            type: 'confirm',
                            message: `Supprimer "${map.name}" ?`,
                            onConfirm: () => {
                              const updated = savedMaps.filter(m => m.id !== map.id)
                              setSavedMaps(updated)
                              localStorage.setItem('envMaps', JSON.stringify(updated))
                              if (expandedMapId === map.id) setExpandedMapId(null)
                            }
                          })
                        }}
                        style={{padding:'4px 8px',borderRadius:5,
                          border:'1px solid #fecaca',background:'#fef2f2',
                          color:'#dc2626',fontSize:10,fontWeight:600,
                          cursor:'pointer',fontFamily:'inherit'}}>
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Stats expandables */}
                  {isExpanded && map.zones?.length > 0 && (
                    <div style={{padding:'10px 12px',
                      borderTop:'1px solid #e2e8f0',background:'white'}}>
                      {map.zones.map((zone,i) => {
                        const aqiInfo = AQI_LEVEL(zone.pollution?.aqi||0)
                        return (
                          <div key={i} style={{marginBottom:8,padding:'8px',
                            borderRadius:7,background:aqiInfo.bg,
                            border:`1px solid ${aqiInfo.border}`}}>
                            <div style={{fontWeight:700,fontSize:11,
                              color:'#0f172a',marginBottom:4}}>
                              📍 {zone.name}
                            </div>
                            <div style={{fontSize:10,color:aqiInfo.color,
                              fontWeight:700}}>
                              AQI {zone.pollution?.aqi||0} — {aqiInfo.label}
                            </div>
                            <div style={{fontSize:10,color:'#64748b',
                              marginTop:3}}>
                              PM2.5: {zone.pollution?.pm25||0} µg/m³ · 
                              Eau: {zone.pollution?.eau||'—'}
                            </div>
                            <div style={{fontSize:10,color:'#64748b'}}>
                              Wilayas: {zone.pollution?.nearbyWilayas
                                ?.join(', ')||'—'}
                            </div>
                            {zone.pollution?.correlations && zone.pollution.correlations.length > 0 && (
                              <div style={{marginTop:6,paddingTop:6,borderTop:'1px solid rgba(226,232,240,0.5)'}}>
                                {zone.pollution.correlations.map((c,idx) => (
                                  <div key={idx} style={{
                                    display:'flex', justifyContent:'space-between',
                                    padding:'5px 8px', borderRadius:5, marginBottom:4,
                                    background: c.risk==='Très élevé'?'#fef2f2':
                                                c.risk==='Élevé'?'#fff7ed':
                                                c.risk==='Moyen'?'#fefce8':'#f0fdf4',
                                    border: `1px solid ${
                                                c.risk==='Très élevé'?'#fecaca':
                                                c.risk==='Élevé'?'#fed7aa':
                                                c.risk==='Moyen'?'#fef08a':'#bbf7d0'}`
                                  }}>
                                    <span style={{fontSize:11,fontWeight:600,color:'#334155'}}>
                                      {c.cancer}
                                    </span>
                                    <div style={{textAlign:'right'}}>
                                      <div style={{fontSize:10,fontWeight:700,
                                        color: c.risk==='Très élevé'?'#dc2626':
                                               c.risk==='Élevé'?'#ea580c':
                                               c.risk==='Moyen'?'#ca8a04':'#16a34a'}}>
                                        {c.risk}
                                      </div>
                                      <div style={{fontSize:9,color:'#94a3b8'}}>{c.source}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function WilayaPanel({ daira, filters, onClose, rawData, cancers }) {
  const safeRawData = Array.isArray(rawData) ? rawData : [];
  // Filter data for this wilaya
  let dairaData = safeRawData.filter(d =>
    (!filters.sex || d.sex === filters.sex) &&
    (!filters.age || d.age === filters.age) &&
    (!filters.yearStart || (d.year >= parseInt(filters.yearStart))) &&
    (!filters.yearEnd || (d.year <= parseInt(filters.yearEnd))) &&
    d.wilaya === daira.id &&
    (filters.cancer.length === 0 || filters.cancer.includes(d.cancer)) &&
    (filters.stade.length === 0 || filters.stade.includes(d.stade))
  );

  const totalCases = dairaData.reduce((sum, d) => sum + d.cases, 0);
  
  // Dominant cancer
  const cancerData = aggBy(dairaData, "cancer", Object.fromEntries(cancers.map(c => [c.id, c.label])));
  const dominantCancer = cancerData[0]?.label || "N/A";
  
  // Gender distribution
  const genderData = aggBy(dairaData, "sex", { M: "Masculin", F: "Féminin" });
  
  // Most affected age group
  const ageData = aggBy(dairaData, "age");
  const mostAffectedAge = ageData[0]?.id || "N/A";
  
  // Evolution by year
  const yearData = aggBy(dairaData, "year").sort((a, b) => Number(a.id) - Number(b.id));
  
  // Risk factors (simplified - in real app, this would come from external data)
  const riskFactors = [
    { factor: "Pollution industrielle", level: "Élevé" },
    { factor: "Agriculture intensive", level: "Moyen" },
    { factor: "Tabagisme", level: "Élevé" },
    { factor: "Qualité de l'eau", level: "Moyen" },
    { factor: "Exposition solaire", level: "Variable" }
  ];

  return (
    <div style={{
      width: '400px',
      background: 'white',
      borderRadius: '11px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: '20px',
      position: 'relative'
    }}>
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          color: '#64748b'
        }}
      >
        ×
      </button>
      
      <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '18px' }}>
        {daira.label}
      </h3>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: daira.color }}>
          {totalCases.toLocaleString("fr-FR")}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>Cas totaux</div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
          Cancer dominant: {dominantCancer}
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
          Répartition par sexe
        </h4>
        <PieChart width={200} height={200}>
          <Pie
            data={genderData}
            cx={100}
            cy={100}
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {genderData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.id === 'M' ? '#2563eb' : '#e05c4b'} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
          Types de cancer
        </h4>
        <BarChart width={300} height={200} data={cancerData.slice(0, 5)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#2563eb" />
        </BarChart>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
          Évolution annuelle
        </h4>
        <LineChart width={300} height={150} data={yearData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="id" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} />
        </LineChart>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
          Facteurs de risque
        </h4>
        {riskFactors.map((risk, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '5px 0',
            borderBottom: index < riskFactors.length - 1 ? '1px solid #e5e7eb' : 'none'
          }}>
            <span style={{ fontSize: '12px' }}>{risk.factor}</span>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 'bold',
              color: risk.level === 'Élevé' ? '#dc2626' : risk.level === 'Moyen' ? '#d97706' : '#059669'
            }}>
              {risk.level}
            </span>
          </div>
        ))}
      </div>
      
      <div>
        <div style={{ fontSize: '14px', color: '#374151' }}>
          <strong>Tranche d'âge la plus touchée:</strong> {mostAffectedAge}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function StatBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selCat, setSelCat] = useState(null);
  const [selAn, setSelAn] = useState(null);
  const [selChart, setSelChart] = useState("bar");
  const [axisX, setAxisX] = useState('Année');
  const [axisY, setAxisY] = useState('Nombre de cas');
  const [axisError, setAxisError] = useState('');
  const [multiAxisX, setMultiAxisX] = useState(['year']);
  const [customAnalysisText, setCustomAnalysisText] = useState('');
  const [autoChart, setAutoChart] = useState(true);
  const [filters, setFilters] = useState({ sex:"", age:"", yearStart:"", yearEnd:"", wilaya:"", daira:"", cancer:"", stade:[], customAxe:"cancer", customTitle:"", customAxeXLabel:"", customAxeYLabel:"", customAxeY:"cases", compareWilaya1:"", compareWilaya2:"", period1Start:"", period1End:"", period2Start:"", period2End:"", validated: "" });
  const [apiData, setApiData] = useState(null);
  
  // Refs for global variables
  const axeXRef = useRef("");
  const currentChartDataRef = useRef([]);
  
  // ✅ FIX BUG 2: Extract wilayas that actually have data
  const WILAYAS_WITH_DATA = useMemo(() => {
    const source = Array.isArray(apiData?.raw_data) && apiData.raw_data.length > 0
      ? apiData.raw_data
      : FALLBACK_DATA;
    
    const wilayaSet = new Set(
      source
        .filter(d => d.wilaya && d.cases > 0)
        .map(d => d.wilaya)
    );
    
    return [...wilayaSet].sort();
  }, [apiData]);

  // ── STATE MANAGEMENT ─────────────────────────────────────────────────────
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [showWilayaPanel, setShowWilayaPanel] = useState(false);
  const [patients, setPatients] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [savedAnalyses, setSavedAnalyses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedAnalyses') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/auth');
      return;
    }
  }, [navigate]);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('comparaison');
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('analysisHistory') || '[]'); } catch { return []; }
  });
  const [pivotMode, setPivotMode] = useState('absolute'); // 'absolute' or 'percentage'

  // Compute resolved data to avoid shadowing
  const resolvedRawData = useMemo(() => 
    Array.isArray(apiData?.raw_data) && apiData.raw_data.length > 0
      ? apiData.raw_data.filter(d => d?.wilaya)
      : FALLBACK_DATA.filter(d => d?.wilaya),
    [apiData]
  );

  const cancers = useMemo(() => [...new Set(patients.map(p => p.cancer).filter(Boolean))], [patients]);

  const resolvedCancers = useMemo(() => {
    const CANCERS_FROM_API = Array.isArray(apiData?.cancer_types) && apiData.cancer_types.length > 0
      ? apiData.cancer_types
          .filter(ct => ct.cancer_type__name)
          .map((ct, idx) => {
            const name = ct.cancer_type__name;
            return {
              id: name,
              label: name,
              color: CANCER_COLORS[name] || PALETTE[idx % PALETTE.length]
            };
          })
      : [];
    return CANCERS_FROM_API.length > 0
      ? CANCERS_FROM_API
      : cancers.map((name, idx) => ({ id: name, label: name, color: CANCER_COLORS[name] || PALETTE[idx % PALETTE.length] }));
  }, [apiData, cancers]);

  // Debounced values for custom analysis
  const debouncedAxeXLabel = useDebounce(filters.customAxeXLabel, 300);
  const debouncedAxeYLabel = useDebounce(filters.customAxeYLabel, 300);

  // ── ANOMALY DETECTION ─────────────────────────────────────────────────────
  const detectAnomalies = (data) => {
    const newAlerts = [];
    if (!data || data.length === 0) return newAlerts;

    // Extract year-based data for trend analysis
    const yearData = {};
    filteredData.forEach(row => {
      if (row.year) {
        yearData[row.year] = (yearData[row.year] || 0) + row.cases;
      }
    });
    const sortedYears = Object.entries(yearData).sort((a, b) => Number(a[0]) - Number(b[0]));

    // SPIKE DETECTION: >20% increase year over year
    for (let i = 1; i < sortedYears.length; i++) {
      const prevCases = sortedYears[i - 1][1];
      const currCases = sortedYears[i][1];
      const percentChange = ((currCases - prevCases) / prevCases) * 100;
      if (percentChange > 20) {
        newAlerts.push({
          id: `spike-${i}`,
          severity: 'red',
          icon: '🔴',
          message: `Hausse de ${Math.round(percentChange)}% des cas en ${sortedYears[i][0]} vs ${sortedYears[i - 1][0]}`,
        });
      }
    }

    // RAPID GROWTH TREND: 3+ consecutive years increasing
    let growthStreak = 0;
    for (let i = 1; i < sortedYears.length; i++) {
      if (sortedYears[i][1] > sortedYears[i - 1][1]) {
        growthStreak++;
        if (growthStreak >= 3 && !newAlerts.some(a => a.id === 'growth-trend')) {
          newAlerts.push({
            id: 'growth-trend',
            severity: 'red',
            icon: '📈',
            message: `Tendance croissante continue sur ${growthStreak} années (${sortedYears[i - growthStreak + 1][0]} → ${sortedYears[i][0]})`,
          });
        }
      } else {
        growthStreak = 0;
      }
    }

    // GENDER IMBALANCE: One sex > 80% of cases
    const sexData = {};
    filteredData.forEach(row => {
      if (row.sex) {
        sexData[row.sex] = (sexData[row.sex] || 0) + row.cases;
      }
    });
    const totalCases = Object.values(sexData).reduce((a, b) => a + b, 0);
    if (totalCases > 0) {
      Object.entries(sexData).forEach(([sex, count]) => {
        const pct = (count / totalCases) * 100;
        if (pct > 80) {
          const sexLabel = sex === 'M' ? 'Hommes' : 'Femmes';
          newAlerts.push({
            id: `gender-${sex}`,
            severity: 'yellow',
            icon: '🟡',
            message: `${sexLabel} représentent ${Math.round(pct)}% des cas — déséquilibre important`,
          });
        }
      });
    }

    // DOMINANT CANCER: >40% of total
    const cancerData = {};
    filteredData.forEach(row => {
      if (row.cancer) {
        cancerData[row.cancer] = (cancerData[row.cancer] || 0) + row.cases;
      }
    });
    const totalCancerrCases = Object.values(cancerData).reduce((a, b) => a + b, 0);
    if (totalCancerrCases > 0) {
      Object.entries(cancerData).forEach(([cancerId, count]) => {
        const pct = (count / totalCancerrCases) * 100;
        if (pct > 40) {
          const cancer = resolvedCancers.find(c => c.id === cancerId);
          const label = cancer ? cancer.label : cancerId;
          newAlerts.push({
            id: `dominant-${cancerId}`,
            severity: 'yellow',
            icon: '🟡',
            message: `${label} représente ${Math.round(pct)}% des cas — dominance importante`,
          });
        }
      });
    }

    // MISSING DATA: Wilayas with 0 cases
    const wilayasWithData = new Set(filteredData.map(d => d.wilaya).filter(Boolean));
    const expectedWilayas = new Set(WILAYAS_WITH_DATA || []);
    const missingWilayas = [...expectedWilayas].filter(w => !wilayasWithData.has(w));
    if (missingWilayas.length > 0 && missingWilayas.length < 10) {
      newAlerts.push({
        id: 'missing-data',
        severity: 'yellow',
        icon: '⚠️',
        message: `Données manquantes pour ${missingWilayas.length} wilaya(s) — couverture incomplète`,
      });
    } else if (missingWilayas.length === 0 && expectedWilayas.size > 0) {
      newAlerts.push({
        id: 'complete-data',
        severity: 'green',
        icon: '✓',
        message: `Données complètes pour toutes les wilayas couvertes`,
      });
    }

    return newAlerts;
  };

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  // Update alerts when data changes
  useEffect(() => {
    if (chartData && chartData.length > 0) {
      const newAlerts = detectAnomalies(chartData);
      setAlerts(newAlerts);
    }
  }, [chartData, filteredData]);

  // ── SEARCH PARSING HELPERS ────────────────────────────────────────────────
  const parseSearchQuery = (query) => {
    const q = query.toLowerCase().trim();
    const detected = { cancers: [], sex: '', year: '', wilaya: '' };
    
    // Detect cancer type
    resolvedCancers.forEach(c => {
      if (q.includes(c.label.toLowerCase()) || q.includes(c.id)) {
        detected.cancers.push(c.id);
      }
    });
    
    // Detect sex
    if (q.includes('femme') || q.includes('féminin') || q.includes('female')) {
      detected.sex = 'F';
    } else if (q.includes('homme') || q.includes('masculin') || q.includes('male')) {
      detected.sex = 'M';
    }
    
    // Detect year (4 consecutive digits between 2000-2099)
    const yearMatch = q.match(/(20\d{2})/);
    if (yearMatch) {
      detected.year = yearMatch[1];
    }
    
    // Detect wilaya
    WILAYAS.forEach(w => {
      if (q.includes(w.toLowerCase())) {
        detected.wilaya = w;
      }
    });
    
    return detected;
  };
  
  const searchAnalyses = (query) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = [];
    
    CATEGORIES.forEach(cat => {
      cat.analyses.forEach(an => {
        const label = an.label.toLowerCase();
        const desc = an.desc.toLowerCase();
        
        // Scoring: how well does this analysis match?
        let score = 0;
        if (label.includes(q) || q.includes(label.substring(0, 3))) score += 10;
        if (desc.includes(q)) score += 5;
        if (label.includes('cancer') && q.includes('cancer')) score += 3;
        if (label.includes('genre') || label.includes('sexe')) {
          if (q.includes('femme') || q.includes('homme')) score += 8;
        }
        if (label.includes('année') && (q.includes('année') || /\d{4}/.test(q))) score += 8;
        if (label.includes('wilaya') && q.includes('wilaya')) score += 8;
        
        if (score > 0) {
          results.push({ ...an, catId: cat.id, catLabel: cat.label, catIcon: cat.icon, catColor: cat.color, score });
        }
      });
    });
    
    return results.sort((a, b) => b.score - a.score).slice(0, 6);
  };

  // ── DARK MODE COLOR HELPER ─────────────────────────────────────────────────
  const dk = {
    bg: darkMode ? '#0f172a' : '#f1f5f9',
    card: darkMode ? '#1e293b' : 'white',
    border: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textMuted: darkMode ? '#64748b' : '#94a3b8',
    input: darkMode ? '#0f172a' : 'white',
    inputText: darkMode ? '#f1f5f9' : '#1e293b',
    hover: darkMode ? '#334155' : '#f8fafc',
  };

  const CHART_GROUPS = {
    comparaison: { 
      label: 'Comparaison', 
      color: '#2563eb',
      charts: ['bar', 'horizontal', 'stacked', 'waterfall']
    },
    tendance: { 
      label: 'Tendance', 
      color: '#059669',
      charts: ['line', 'area', 'bubble']
    },
    proportion: { 
      label: 'Proportion', 
      color: '#7c3aed',
      charts: ['pie', 'donut', 'treemap', 'funnel']
    },
    indicateur: { 
      label: 'Indicateur', 
      color: '#d97706',
      charts: ['gauge', 'heatmap', 'radar', 'scatter']
    }
  };

  const getRecommendedChart = useCallback((analysisId = selAn) => {
    if (analysisId === 'custom_build') {
      const axisXVal = filters.customAxeXLabel?.toLowerCase() || '';
      if (axisXVal.includes('année') || axisXVal.includes('year') || axisXVal.includes('mois') || axisXVal.includes('month')) {
        return { group: 'tendance', chart: 'line', text: 'Courbe ou Aire' };
      } else if (axisXVal.includes('cancer') || axisXVal.includes('wilaya') || axisXVal.includes('daira')) {
        return { group: 'comparaison', chart: 'bar', text: 'Histogramme ou Treemap' };
      } else if (axisXVal.includes('sexe') || axisXVal.includes('sex')) {
        return { group: 'proportion', chart: 'pie', text: 'Pie ou Donut' };
      } else if (axisXVal.includes('stade') || axisXVal.includes('stage')) {
        return { group: 'proportion', chart: 'funnel', text: 'Entonnoir ou Jauge' };
      } else if (axisXVal.includes('age') || axisXVal.includes('âge')) {
        return { group: 'tendance', chart: 'area', text: 'Aire ou Histogramme' };
      }
      return null;
    }

    const recommendations = {
      by_year: { group: 'tendance', chart: 'line', text: 'Courbe d’évolution' },
      by_month: { group: 'tendance', chart: 'line', text: 'Courbe mensuelle' },
      by_quarter: { group: 'tendance', chart: 'line', text: 'Courbe par trimestre' },
      compare_periods: { group: 'tendance', chart: 'line', text: 'Courbe comparative' },
      by_sex: { group: 'proportion', chart: 'pie', text: 'Pie ou Donut' },
      by_cancer: { group: 'comparaison', chart: 'bar', text: 'Histogramme par cancer' },
      top5: { group: 'comparaison', chart: 'bar', text: 'Top 5 par barres' },
      by_age: { group: 'tendance', chart: 'area', text: 'Aire des tranches d’âge' },
      by_stade: { group: 'comparaison', chart: 'bar', text: 'Barres par stade' },
      by_mode_diag: { group: 'comparaison', chart: 'bar', text: 'Barres par mode de diagnostic' },
      by_traitement: { group: 'comparaison', chart: 'bar', text: 'Barres par traitement' },
      survie_stade: { group: 'proportion', chart: 'funnel', text: 'Entonnoir de survie' },
    };

    return recommendations[analysisId] || null;
  }, [filters.customAxeXLabel, selAn]);

  const cat = CATEGORIES.find(c => c.id === selCat);
  const analysis = cat?.analyses.find(a => a.id === selAn);

  // Get auth token from multiple sources
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('access') ||
           localStorage.getItem('access_token') ||
           localStorage.getItem('token') ||
           sessionStorage.getItem('access_token') ||
           document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  }, []);

  // Fetch real statistics data from API
  useEffect(() => {
    const token = localStorage.getItem('access_token') ||
                  localStorage.getItem('access') ||
                  localStorage.getItem('token') ||
                  (() => {
                    try {
                      const keys = Object.keys(localStorage);
                      for (const key of keys) {
                        const val = localStorage.getItem(key);
                        if (val && val.startsWith('eyJ')) return val;
                      }
                    } catch(e) {}
                    return null;
                  })();

    if (!token) {
      setApiLoading(false);
      return;
    }

    const urls = ['/api/statistic/stats/', `${API_BASE}/statistic/stats/`];
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const fetchStats = async () => {
      let firstResponseData = null;

      for (const url of urls) {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (firstResponseData === null) firstResponseData = data;

          const hasRawData = Array.isArray(data?.raw_data) && data.raw_data.length > 0;
          if (hasRawData || url === urls[urls.length - 1]) {
            setApiData(data);
            setApiLoading(false);
            return;
          }
          console.warn(`Statistics API returned empty raw_data at ${url}, trying fallback.`);
        } catch (err) {
          console.error(`❌ Statistics API failed for ${url}:`, err.message);
        }
      }

      if (firstResponseData !== null) {
        setApiData(firstResponseData);
      }
      setApiLoading(false);
    };

    fetchStats();
  }, [getAuthToken]);

  // Fetch patients from API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const apiBase = API_BASE;
        const token = getAuthToken();
        const response = await fetch(`${apiBase}/patients/`, {
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {}
        });
        if (response.ok) {
          const data = await response.json();
          // Handle both paginated and non-paginated responses
          const patientsList = Array.isArray(data) ? data : data.results || [];
          setPatients(patientsList);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };
    fetchPatients();
  }, [getAuthToken]);

  function reset() {
    setStep(1);
    setSelCat(null);
    setSelAn(null);
    setSelChart("bar");
    setAxisX('Année');
    setAxisY('Nombre de cas');
    setAxisError('');
    setMultiAxisX(['year']);
    setCustomAnalysisText('');
    setAutoChart(true);
    setFilters({ sex:"", age:"", yearStart:"", yearEnd:"", wilaya:"", daira:"", cancer:"", stade:[], customAxe:"cancer", customTitle:"", customAxeXLabel:"", customAxeYLabel:"", customAxeY:"cases", compareWilaya1:"", compareWilaya2:"", period1Start:"", period1End:"", period2Start:"", period2End:"" });
    setFilteredData([]);
    setChartData([]);
    currentChartDataRef.current = [];
    axeXRef.current = "";
  }

  // History functions
  function saveToHistory(result) {
    const analysis = CATEGORIES.find(cat => cat.id === selCat);
    const analysisItem = analysis?.analyses.find(an => an.id === selAn);
    
    if (!analysis || !analysisItem) return;
    
    let total = 0;
    let dominant = 'N/A';
    
    if (Array.isArray(result)) {
      total = result.reduce((sum, d) => sum + (d.value || 0), 0);
      dominant = result.length > 0
        ? result.reduce((prev, current) => (prev.value > current.value) ? prev : current).label
        : 'N/A';
    } else if (result.type === 'pivot') {
      // Calculate total for pivot table
      total = Object.values(result.data).flatMap(c => Object.values(c)).reduce((sum, v) => sum + v, 0);
      // Find dominant cancer
      const cancerTotals = Object.entries(result.data).map(([cancer, years]) => ({
        label: cancer,
        value: Object.values(years).reduce((sum, v) => sum + v, 0)
      }));
      dominant = cancerTotals.length > 0
        ? cancerTotals.reduce((prev, current) => (prev.value > current.value) ? prev : current).label
        : 'N/A';
    }
    
    const historyEntry = {
      id: Date.now(),
      category: analysis.label,
      analysis: analysisItem.label,
      filters: { ...filters },
      chartType: selChart,
      result: {
        total: total,
        dominant: dominant,
        chartDataLength: result.length
      },
      date: new Date().toLocaleString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
    
    const updatedHistory = [historyEntry, ...analysisHistory].slice(0, 20);
    setAnalysisHistory(updatedHistory);
    localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
  }

  function loadAnalysis(item) {
    setSelCat(CATEGORIES.find(cat => cat.label === item.category)?.id);
    setSelAn(CATEGORIES.find(cat => cat.label === item.category)?.analyses.find(an => an.label === item.analysis)?.id);
    setFilters(item.filters);
    setSelChart(item.chartType);
    setStep(4);
    setShowHistoryPanel(false);
  }

  function deleteAnalysis(id) {
    const updatedHistory = analysisHistory.filter(item => item.id !== id);
    setAnalysisHistory(updatedHistory);
    localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
  }

  function clearAllHistory() {
    setAnalysisHistory([]);
    localStorage.removeItem('analysisHistory');
  }

  function toggleArr(arr, val) { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]; }

  const WILAYAS_LIST = [
    "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra",
    "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret",
    "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda",
    "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem",
    "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi",
    "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt",
    "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla",
    "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane"
  ];
  const WILAYAS = WILAYAS_LIST;

  useEffect(() => {
    const data = resolvedRawData.filter(d =>
      (!filters.sex || d.sex === filters.sex) &&
      (!filters.age || d.age === filters.age) &&
      (!filters.wilaya || d.wilaya === filters.wilaya) &&
      (!filters.daira || d.daira === filters.daira) &&
      (!filters.yearStart || d.year >= Number(filters.yearStart)) &&
      (!filters.yearEnd || d.year <= Number(filters.yearEnd)) &&
      (!filters.cancer || filters.cancer === '' || d.cancer === filters.cancer) &&
      (!filters.stade || filters.stade.length === 0 || filters.stade.includes(d.stade))
    );
    setFilteredData(data);
  }, [filters]);

  useEffect(() => {
    if (!autoChart) return;

    const xKey = getAxisXKey(axisX);
    const yKey = getAxisYKey(axisY);

    if (!isValidXAxis(axisX)) {
      setAxisError('X Axis doit être une catégorie valide (Wilaya, Daira, Année, Sexe, Cancer, etc.).');
      return;
    }

    if (!isValidYAxis(axisY)) {
      setAxisError('Y Axis doit être une valeur numérique valide (Nombre de cas, Pourcentage, Age moyen).');
      return;
    }

    setAxisError('');

    if (yKey === 'percentage') {
      setSelChart('pie');
      return;
    }

    if (xKey === 'year') {
      setSelChart('line');
      return;
    }

    if (xKey === 'wilaya') {
      setSelChart('bar');
      return;
    }

    if (xKey === 'sex') {
      setSelChart('pie');
      return;
    }

    if (xKey === 'cancer') {
      setSelChart('bar');
      return;
    }

    if (xKey === 'age') {
      setSelChart('area');
      return;
    }

    setSelChart('bar');
  }, [axisX, axisY, multiAxisX, autoChart]);

  useEffect(() => {
    const xKey = getAxisXKey(axisX);
    if (xKey) {
      setMultiAxisX([xKey]);
    }
  }, [axisX]);

  const chartExportRef = useRef(null);

  const getHtml2Canvas = () => {
    if (typeof window === 'undefined') return null;
    if (window.html2canvas) return window.html2canvas;
    setAxisError('Librairie html2canvas non disponible. Ajoutez <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script> dans public/index.html.');
    return null;
  };

  const getJsPDF = () => {
    if (typeof window === 'undefined') return null;
    if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    setAxisError('Librairie jsPDF non disponible. Ajoutez <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script> dans public/index.html.');
    return null;
  };

  const handleExportPNG = async () => {
    if (!chartExportRef.current) {
      setAxisError('Aucun graphique à exporter.');
      return;
    }
    try {
      const canvas = await html2canvas(chartExportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `analyse-${(filters.customAxeXLabel || axisX || 'chart')}-${new Date().toISOString().slice(0,10)}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setAxisError('');
    } catch (e) {
      console.error(e);
      setAxisError('Erreur lors de l’export PNG.');
    }
  };

  const buildCustomChart = useCallback((goToResult = false) => {
    // ✅ FIX #1: Map user input text to actual dataset fields using intelligent matching
    // User types "annee" → maps to "year"
    // User types "wilaya" → maps to "wilaya"
    const xKey = findBestXKey(debouncedAxeXLabel) || filters.customAxe || 'cancer';
    const userYInput = debouncedAxeYLabel || '';
    
    // ✅ FIX #2: If user types a grouping field for Y (like "wilaya"), map it to "cases" instead
    // Check if user typed a grouping keyword for Y axis
    // NOTE: 'age' and 'âge' are REMOVED - they should map to avg_age measurement, not be treated as grouping fields
    const groupKeywords = ['wilaya', 'daira', 'cancer', 'sexe', 'genre', 'année', 'year', 'month', 'mois', 'stade', 'tranche', 'traitement'];
    const isGroupingField = groupKeywords.some(kw => normalizeLabel(userYInput).includes(kw));
    
    // If Y is a grouping field, convert to count instead
    let yKey = 'cases'; // ✅ DEFAULT TO COUNT (numeric)
    if (!isGroupingField) {
      yKey = findBestYKey(userYInput) || 'cases';
    }

    // ✅ FIX #3: Remove strict validation - just use defaults if nothing is valid
    if (!xKey) {
      // Don't block - just use cancer as default
      setAxisError('');
    } else {
      setAxisError('');
    }

    const grouped = {};
    let totalCases = 0;
    let totalAgeSum = 0;
    let totalRecords = 0;

    filteredData.forEach((row) => {
      let xValue = 'N/A';
      if (xKey === 'wilaya') xValue = row.wilaya || 'N/A';
      else if (xKey === 'daira') xValue = row.daira || 'N/A';
      else if (xKey === 'year') xValue = row.year;
      else if (xKey === 'month') xValue = row.month;
      else if (xKey === 'cancer') xValue = row.cancer;
      else if (xKey === 'sex') xValue = row.sex === 'M' ? 'Masculin' : row.sex === 'F' ? 'Féminin' : 'N/A';
      else if (xKey === 'age') xValue = row.age;
      else if (xKey === 'stade') xValue = row.stade;
      else if (xKey === 'mode') xValue = row.mode;
      else if (xKey === 'traitement') xValue = row.traitement;
      else xValue = row[xKey] || 'N/A';

      if (!grouped[xValue]) {
        grouped[xValue] = { id: xValue, label: xValue, cases: 0, records: 0, ageSum: 0, maleCount: 0, femaleCount: 0 };
      }

      grouped[xValue].cases += row.cases;
      grouped[xValue].records += 1;
      // Normalize age key (handle both regular hyphens and en-dashes)
      const ageKey = Object.keys(AGE_VALUE_MAP).find(k => 
        k.replace('–','-') === (row.age||'').replace('–','-')
      );
      const ageVal = ageKey ? AGE_VALUE_MAP[ageKey] : 0;
      grouped[xValue].ageSum += ageVal * row.cases;
      if (row.sex === 'M') grouped[xValue].maleCount += row.cases;
      if (row.sex === 'F') grouped[xValue].femaleCount += row.cases;

      totalCases += row.cases;
      const ageKeyTotal = Object.keys(AGE_VALUE_MAP).find(k => 
        k.replace('–','-') === (row.age||'').replace('–','-')
      );
      const ageValTotal = ageKeyTotal ? AGE_VALUE_MAP[ageKeyTotal] : 0;
      totalAgeSum += ageValTotal * row.cases;
      totalRecords += 1;
    });

    let result = Object.values(grouped).map((item) => {
      let value = 0;
      
      // ✅ FIX #2 continued: Always return numeric value for Y axis
      if (yKey === 'cases') {
        value = item.cases;
      } else if (yKey === 'percentage') {
        value = totalCases ? (item.cases / totalCases) * 100 : 0;
      } else if (yKey === 'avg_age') {
        value = Math.round(item.cases > 0 ? item.ageSum / item.cases : 0);
      } else if (yKey === 'sum_age') {
        value = item.ageSum;
      } else if (yKey === 'pct_female') {
        value = item.cases ? (item.femaleCount / item.cases) * 100 : 0;
      } else if (yKey === 'pct_male') {
        value = item.cases ? (item.maleCount / item.cases) * 100 : 0;
      } else if (yKey === 'pct_stade34') {
        value = 0;
      } else {
        // Default to cases count if Y mapping failed
        value = item.cases;
      }
      
      return { ...item, value: Number(value.toFixed(2)), label: item.label };
    });

    // ✅ FIX BUG 1: Filter out any undefined/null values and ensure all values are numbers
    result = result.filter(r => r.value !== undefined && r.value !== null);
    result = result.map(r => ({...r, value: Number(r.value) || 0}));
    
    // ✅ FIX BUG 1: Filter out any undefined/null values and ensure all values are numbers
    result = result.filter(r => r.value !== undefined && r.value !== null);
    result = result.map(r => ({...r, value: Number(r.value) || 0}));

    // Sort result appropriately based on X axis type
    const key = xKey;
    if (key === 'year') {
      result.sort((a, b) => Number(a.id) - Number(b.id));
    } else if (key === 'month') {
      result.sort((a, b) => MONTH_ORDER.indexOf(a.id) - MONTH_ORDER.indexOf(b.id));
    } else if (key === 'age') {
      const ageOrder = ["0–14", "15–29", "30–44", "45–59", "60+"];
      result.sort((a, b) => ageOrder.indexOf(a.id) - ageOrder.indexOf(b.id));
    } else if (key === 'sex') {
      const sexOrder = ["Masculin", "Féminin"];
      result.sort((a, b) => sexOrder.indexOf(a.id) - sexOrder.indexOf(b.id));
    } else {
      result.sort((a, b) => Number(b.value) - Number(a.value));
    }

    setChartData(result);
    currentChartDataRef.current = result;
    axeXRef.current = xKey;

    const wilayaSummary = {};
    filteredData.forEach((row) => { if (row.wilaya) wilayaSummary[row.wilaya] = (wilayaSummary[row.wilaya] || 0) + row.cases; });
    const dominantWilaya = Object.entries(wilayaSummary).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const max = result.length ? Math.max(...result.map(i => i.value)) : 0;
    const min = result.length ? Math.min(...result.map(i => i.value)) : 0;

    setStats({ totalCases, avgAge: totalCases ? totalAgeSum / totalCases : 0, max, min, dominantWilaya });
    
    if (goToResult) {
      setStep(4);
      saveToHistory(result);
    }
  }, [
    debouncedAxeXLabel,
    debouncedAxeYLabel,
    filters.customAxe,
    filteredData,
    apiData,
    resolvedCancers
  ]);

  function buildData() {
    setLoading(true);
    setTimeout(() => {
      const SOURCE = Array.isArray(apiData?.raw_data) && apiData.raw_data.length > 0
        ? apiData.raw_data
        : FALLBACK_DATA;
      let data = SOURCE.filter(d =>
        (!filters.sex||d.sex===filters.sex)&&(!filters.age||d.age===filters.age)&&
        (!filters.yearStart||d.year>=Number(filters.yearStart))&&(!filters.yearEnd||d.year<=Number(filters.yearEnd))&&
        (!filters.daira||(d.daira===filters.daira || d.wilaya===filters.daira))&&
        (filters.cancer.length===0||filters.cancer.includes(d.cancer))&&
        (filters.stade.length===0||filters.stade.includes(d.stade))&&
        (!filters.validated || d.validated === filters.validated || 
          (filters.validated === 'validated' && d.is_validated === true) ||
          (filters.validated === 'pending' && d.is_validated === false))
      );
      const cMap=Object.fromEntries(resolvedCancers.map(c=>[c.id,c.label]));
      const mOrd=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
      let result=[];
      if(selAn==="by_cancer"||selAn==="top5"){ result=aggBy(data,"cancer",cMap).map((d,i)=>({...d,color:resolvedCancers.find(c=>c.label===d.label)?.color||PALETTE[i]})); if(selAn==="top5")result=result.slice(0,5); }
      else if(selAn==="by_sex"){ result=aggBy(data,"sex",{M:"Masculin",F:"Féminin"}).map(d=>({...d,color:d.id==="M"?"#2563eb":"#e05c4b"})); }
      else if(selAn==="by_age"){ const ord=["0–14","15–29","30–44","45–59","60+"]; result=aggBy(data,"age").sort((a,b)=>ord.indexOf(a.id)-ord.indexOf(b.id)).map((d,i)=>({...d,color:PALETTE[i]})); }
      else if(selAn==="by_year"){
        const yearMap = {};
        data.forEach(d => {
          if(!yearMap[d.year]) yearMap[d.year] = { cases: 0, ageSum: 0 };
          yearMap[d.year].cases += d.cases;
          const ageKey = Object.keys(AGE_VALUE_MAP).find(k =>
            k.replace('–','-') === (d.age||'').replace('–','-')
          );
          yearMap[d.year].ageSum += (AGE_VALUE_MAP[ageKey] || 0) * d.cases;
        });

        result = Object.entries(yearMap)
          .sort((a,b) => Number(a[0]) - Number(b[0]))
          .map(([year, val]) => ({
            id: year,
            label: year,
            value: val.cases,
            avgAge: val.cases > 0 ? Math.round(val.ageSum / val.cases) : 0,
            cases: val.cases,
            color: "#2563eb"
          }));
      }
      else if(selAn==="by_month"){ result=aggBy(data,"month").sort((a,b)=>mOrd.indexOf(a.id)-mOrd.indexOf(b.id)).map(d=>({...d,color:"#059669"})); }
      else if(selAn==="by_quarter"){ const qMap={Jan:1,Fév:1,Mar:1,Avr:2,Mai:2,Jun:2,Jul:3,Aoû:3,Sep:3,Oct:4,Nov:4,Déc:4}; const qAgg={}; data.forEach(d=>{const q="T"+qMap[d.month];qAgg[q]=(qAgg[q]||0)+d.cases;}); result=["T1","T2","T3","T4"].map((q,i)=>({id:q,label:q,value:qAgg[q]||0,color:PALETTE[i]})); }
      else if(selAn==="compare_periods"){
        const p1Start = parseInt(filters.period1Start) || 2018;
        const p1End = parseInt(filters.period1End) || 2020;
        const p2Start = parseInt(filters.period2Start) || 2021;
        const p2End = parseInt(filters.period2End) || 2023;
        const months = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
        const aggByMonth = (d) => { const m = {}; d.forEach(r => { const k = r.month; m[k] = (m[k] || 0) + r.cases; }); return m; };
        const p1 = aggByMonth(data.filter(d => d.year >= p1Start && d.year <= p1End));
        const p2 = aggByMonth(data.filter(d => d.year >= p2Start && d.year <= p2End));
        result = months.map(m => ({
          label: m,
          value1: p1[m] || 0,
          value2: p2[m] || 0,
          color: '#2563eb'
        }));
      }
      else if(selAn==="pivot_cancer_year"){
        const pivot = {};
        data.forEach(d => {
          const cancer = d.cancer || 'Inconnu';
          const year = d.year;
          if (!pivot[cancer]) pivot[cancer] = {};
          pivot[cancer][year] = (pivot[cancer][year] || 0) + d.cases;
        });
        const cancers = Object.keys(pivot).sort();
        const years = [...new Set(data.map(d => d.year))].sort((a,b) => a - b);
        result = { type: 'pivot', cancers, years, data: pivot };
      }
      else if(selAn==="by_wilaya"){ 
        // Agréger par daira pour Tlemcen, par wilaya pour les autres
        const dairaData = aggBy(data.filter(d => d.daira), "daira").map((d,i)=>({...d,color:PALETTE[i%PALETTE.length], daira: d.id}));
        const wilayaData = aggBy(data.filter(d => !d.daira), "wilaya").map((d,i)=>({...d,color:PALETTE[(i + dairaData.length)%PALETTE.length], daira: null}));
        result = [...dairaData, ...wilayaData];
      }
      else if(selAn==="compare_wilayas"){
        // Comparison between 2 wilayas
        const w1 = filters.compareWilaya1;
        const w2 = filters.compareWilaya2;

        if(!w1 || !w2 || w1 === w2) {
          setChartData([]);
          setLoading(false);
          setStep(4);
          return;
        }
        const data1 = aggBy(data.filter(d=>d.wilaya===w1), 'cancer');
        const data2 = aggBy(data.filter(d=>d.wilaya===w2), 'cancer');
        // Merge cancer types from both wilayas
        const allCancers = new Set([...data1.map(d=>d.id), ...data2.map(d=>d.id)]);
        result = Array.from(allCancers).map(c=>{
          const d1 = data1.find(d=>d.id===c);
          const d2 = data2.find(d=>d.id===c);
          return {
            label: c,
            id: c,
            value1: d1?.value || 0,
            value2: d2?.value || 0,
            color: '#2563eb'
          };
        }).sort((a,b)=>(a.value1+a.value2)-(b.value1+b.value2));
      }
      else if(selAn==="by_stade"){
        const ord=["Stade I","Stade II","Stade III","Stade IV"];
        const totals = aggBy(data,"stade").sort((a,b)=>ord.indexOf(a.id)-ord.indexOf(b.id));
        const totalCases = totals.reduce((sum,d)=>sum+d.value,0);
        result = totals.map((d,i)=>({
          ...d,
          percentage: totalCases ? Math.round((d.value/totalCases)*100) : 0,
          color:["#059669","#d97706","#e05c4b","#7f1d1d"][i]
        }));
      }
      else if(selAn==="survie_stade"){
        const patientsByStage = (stage) => data.filter(d=>d.stade===stage).reduce((sum,d)=>sum+d.cases,0);
        result = [
          {id:"Stade I",label:"Stade I",value:95,color:"#059669",patients:patientsByStage("Stade I")},
          {id:"Stade II",label:"Stade II",value:78,color:"#d97706",patients:patientsByStage("Stade II")},
          {id:"Stade III",label:"Stade III",value:55,color:"#e05c4b",patients:patientsByStage("Stade III")},
          {id:"Stade IV",label:"Stade IV",value:25,color:"#7f1d1d",patients:patientsByStage("Stade IV")}
        ];
      }
      else if(selAn==="by_mode_diag"){
        const modeMap = {};
        data.forEach(d => {
          const mode = normalizeMode(d.mode || d.diagnostic_mode || d.mode_diagnostic || '');
          modeMap[mode] = (modeMap[mode] || 0) + d.cases;
        });
        const order = ["Dépistage","Symptômes","Urgence","Bilan de routine","Non renseigné"];
        result = order.filter(m => modeMap[m]).map((m,i)=>({
          id:m,
          label:m,
          value: modeMap[m],
          color: PALETTE[i%PALETTE.length]
        }));
      }
      else if(selAn==="by_traitement"){
        const traitementMap = {};
        data.forEach(d => {
          const traitement = normalizeTraitement(d.traitement || d.treatment_type || d.treatment || d.treatment_protocol || '');
          traitementMap[traitement] = (traitementMap[traitement] || 0) + d.cases;
        });
        const order = ["Chirurgie","Chimiothérapie","Radiothérapie","Thérapie ciblée","Immunothérapie","Non renseigné"];
        result = order.filter(m => traitementMap[m]).map((m,i)=>({
          id:m,
          label:m,
          value: traitementMap[m],
          color: PALETTE[i%PALETTE.length]
        }));
      }
      else if(selAn === "by_status") {
        const statusMap = {};
        const getStatus = (d) => {
          const raw = d.status || d.patient_status || d.etat || d.statut;
          return normalizeStatus(raw) || deducePatientStatus(d);
        };
        data.forEach(d => {
          const status = getStatus(d);
          if (!status) return;
          statusMap[status] = (statusMap[status] || 0) + d.cases;
        });
        const order = ['en_traitement','gueri','decede'];
        const labels = { en_traitement:'En traitement', gueri:'Guéri', decede:'Décédé' };
        result = order.filter(s => statusMap[s]).map((s,i)=>({
          id:s,
          label: labels[s],
          value: statusMap[s],
          color: s === 'gueri' ? '#059669' : s === 'decede' ? '#dc2626' : '#2563eb'
        }));
      }
      else if(selAn === "death_stats") {
        const getStatus = (d) => {
          const raw = d.status || d.patient_status || d.etat || d.statut;
          return normalizeStatus(raw) || deducePatientStatus(d);
        };
        result = aggBy(data.filter(d => getStatus(d) === 'decede'), "cancer", cMap)
          .map((d,i) => ({...d, color: resolvedCancers.find(c=>c.label===d.label)?.color||PALETTE[i]}));
      }
      else if(selAn === "taux_guerison") {
        const cancerGroups = {};
        const getStatus = (d) => {
          const raw = d.status || d.patient_status || d.etat || d.statut;
          return normalizeStatus(raw) || deducePatientStatus(d);
        };
        data.forEach(d => {
          const cancer = d.cancer || 'Inconnu';
          const status = getStatus(d);
          if(!cancerGroups[cancer]) cancerGroups[cancer] = { total:0, gueri:0 };
          cancerGroups[cancer].total += d.cases;
          if(status === 'gueri') cancerGroups[cancer].gueri += d.cases;
        });
        result = Object.entries(cancerGroups)
          .filter(([,g]) => g.total > 0)
          .map(([cancer, g]) => ({
            id: cancer,
            label: cMap[cancer] || cancer,
            value: Math.round((g.gueri / g.total) * 100),
            color: resolvedCancers.find(c=>c.id===cancer)?.color || '#2563eb'
          }))
          .sort((a,b) => b.value - a.value);
      }
      else if(selAn==="custom_build"){
        buildCustomChart(true);
        setLoading(false);
        return;
      }
      if (["by_stade","by_mode_diag","by_traitement","by_status","death_stats","taux_guerison","survie_stade"].includes(selAn) && result.length === 0) {
        result = [{
          id: 'no_data',
          label: 'Données non disponibles',
          value: 1,
          color: '#e2e8f0',
          isPlaceholder: true
        }];
      }
      setChartData(result);
      currentChartDataRef.current = result;
      // Map selAn to axeX representation
      const axeXMap = { by_wilaya: 'wilaya', compare_wilayas: 'wilaya', by_sex: 'sexe', by_age: 'age', by_year: 'annee', by_month: 'mois', by_quarter: 'trimestre', by_cancer: 'cancer', by_stade: 'stade', by_mode_diag: 'mode_diagnostic', by_traitement: 'traitement', survie_stade: 'survie', top5: 'top5', custom_build: 'personnalisee', by_status: 'statut_patient', death_stats: 'statistiques_deces', taux_guerison: 'taux_guerison' };
      axeXRef.current = axeXMap[selAn] || selAn;
      setLoading(false); 
      setStep(4);
      saveToHistory(result);
    }, 480);
  }

  useEffect(() => {
    if (selAn === 'custom_build') {
      buildCustomChart(false);
    }
  }, [selAn, filters.customAxe, filters.customAxeY, filteredData, buildCustomChart]);

  let total = 0;
  if (Array.isArray(chartData)) {
    total = chartData.reduce((a,d)=>a+(d.value??0),0);
  } else if (chartData.type === 'pivot') {
    total = Object.values(chartData.data).flatMap(c => Object.values(c)).reduce((a,v)=>a+v,0);
  }
  const isCirc = selChart==="pie"||selChart==="donut";

  const isKpi = selAn==="kpi_dashboard";
  const isCustom = selAn==="custom_build";

  function CustomRadarChart({ data, size={w:510,h:275} }) {
    const { w, h } = size;
    const cx = w/2, cy = h/2;
    const R = Math.min(w,h)*0.35;
    const n = data.length;
    const maxVal = Math.max(...data.map(d=>d.value), 1);
    
    if(n < 3) return <div style={{textAlign:'center',color:'#94a3b8',padding:36}}>
      Minimum 3 catégories pour le radar
    </div>;
    
    const angles = data.map((_,i) => (i/n)*2*Math.PI - Math.PI/2);
    const points = data.map((d,i) => ({
      x: cx + R*(d.value/maxVal)*Math.cos(angles[i]),
      y: cy + R*(d.value/maxVal)*Math.sin(angles[i]),
      lx: cx + (R+28)*Math.cos(angles[i]),
      ly: cy + (R+28)*Math.sin(angles[i]),
      ...d
    }));
    
    // Grid circles
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    
    const polyPath = points.map((p,i) => 
      `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
    ).join(' ') + ' Z';
    
    return (
      <svg width={w} height={h}>
        {/* Grid circles */}
        {gridLevels.map((level,i) => (
          <polygon key={i}
            points={angles.map(a => 
              `${cx+R*level*Math.cos(a)},${cy+R*level*Math.sin(a)}`
            ).join(' ')}
            fill="none" stroke="#e2e8f0" strokeWidth={1}
          />
        ))}
        
        {/* Axis lines */}
        {angles.map((a,i) => (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx+R*Math.cos(a)} y2={cy+R*Math.sin(a)}
            stroke="#e2e8f0" strokeWidth={1}
          />
        ))}
        
        {/* Data polygon */}
        <path d={polyPath} 
          fill="#2563eb" fillOpacity={0.2}
          stroke="#2563eb" strokeWidth={2.5}
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {points.map((p,i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} 
              fill="white" stroke="#2563eb" strokeWidth={2}/>
            <text x={p.lx} y={p.ly} 
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9.5} fill="#334155" fontWeight="600">
              {String(p.label).slice(0,8)}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  function renderChart() {
    // ✅ FIX BUG 1: Filter out any undefined/null values from chartData
    const safeChartData = Array.isArray(chartData) ? chartData.filter(d =>
      d && d.value !== undefined && d.value !== null
    ) : [];
    if (Array.isArray(chartData) && chartData[0]?.isPlaceholder) {
      return (
        <div style={{textAlign:'center', padding:40, color:'#94a3b8'}}>
          <div style={{fontSize:32, marginBottom:12}}>📊</div>
          <div style={{fontSize:14, fontWeight:600}}>
            Données non disponibles
          </div>
          <div style={{fontSize:12, marginTop:8}}>
            Ces informations seront disponibles après enrichissement de la base de données
          </div>
        </div>
      );
    }
    if(selAn === "kpi_dashboard") {
      return <KPIBoard filters={filters} apiData={apiData} rawData={resolvedRawData} cancers={resolvedCancers} />;
    }
    if(selAn === "by_wilaya") {
      return <ChoroplethMap data={chartData} apiData={apiData} rawData={resolvedRawData} cancers={resolvedCancers} patients={patients} />;
    }
    
    if(selAn === "compare_wilayas") {
      // Split view for comparing 2 wilayas
      const w1 = filters.compareWilaya1;
      const w2 = filters.compareWilaya2;
      if(!w1 || !w2) return <div style={{textAlign:"center",color:"#94a3b8",padding:36,fontSize:13}}>Sélectionnez 2 wilayas pour la comparaison</div>;
      
      return (
        <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          <h3 style={{margin:0,fontSize:14,fontWeight:700,color:dk.text}}>Comparaison: {w1} vs {w2}</h3>
          <div style={{display:"flex",gap:24,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:14,height:14,background:"#2563eb",borderRadius:3}}/>
              <span style={{fontSize:12,color:dk.text,fontWeight:600}}>{w1}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:14,height:14,background:"#e05c4b",borderRadius:3}}/>
              <span style={{fontSize:12,color:dk.text,fontWeight:600}}>{w2}</span>
            </div>
          </div>
          <BarChart width={520} height={280} data={chartData} margin={{top:10,right:20,bottom:50,left:50}}>
            <CartesianGrid strokeDasharray="3 3" stroke={dk.border}/>
            <XAxis dataKey="label" fontSize={9} angle={chartData.length>6?-45:0} textAnchor={chartData.length>6?"end":"middle"} height={chartData.length>6?80:40}/>
            <YAxis fontSize={9} stroke={dk.text}/>
            <Tooltip contentStyle={{background:dk.card,border:`1px solid ${dk.border}`,borderRadius:6,color:dk.text}}/>
            <Bar dataKey="value1" fill="#2563eb" name={w1} radius={[4,4,0,0]}/>
            <Bar dataKey="value2" fill="#e05c4b" name={w2} radius={[4,4,0,0]}/>
          </BarChart>
        </div>
      );
    }
    
    if(selAn === "compare_periods") {
      const p1Label = `${filters.period1Start || 2018}-${filters.period1End || 2020}`;
      const p2Label = `${filters.period2Start || 2021}-${filters.period2End || 2023}`;
      return (
        <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          <h3 style={{margin:0,fontSize:14,fontWeight:700,color:dk.text}}>Comparaison: {p1Label} vs {p2Label}</h3>
          <div style={{display:"flex",gap:24,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:14,height:14,background:"#2563eb",borderRadius:3}}/>
              <span style={{fontSize:12,color:dk.text,fontWeight:600}}>{p1Label}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:14,height:14,background:"#e05c4b",borderRadius:3}}/>
              <span style={{fontSize:12,color:dk.text,fontWeight:600}}>{p2Label}</span>
            </div>
          </div>
          <BarChart width={520} height={280} data={chartData} margin={{top:10,right:20,bottom:50,left:50}}>
            <CartesianGrid strokeDasharray="3 3" stroke={dk.border}/>
            <XAxis dataKey="label" fontSize={9} angle={-45} textAnchor="end" height={80}/>
            <YAxis fontSize={9} stroke={dk.text}/>
            <Tooltip contentStyle={{background:dk.card,border:`1px solid ${dk.border}`,borderRadius:6,color:dk.text}}/>
            <Bar dataKey="value1" fill="#2563eb" name={p1Label} radius={[4,4,0,0]}/>
            <Bar dataKey="value2" fill="#e05c4b" name={p2Label} radius={[4,4,0,0]}/>
          </BarChart>
        </div>
      );
    }
    
    if(selAn === "pivot_cancer_year") {
      const { cancers, years, data: pivotData } = chartData;
      const maxCases = Math.max(...cancers.flatMap(c => years.map(y => pivotData[c][y] || 0)));
      const rowTotals = cancers.map(c => years.reduce((sum, y) => sum + (pivotData[c][y] || 0), 0));
      const colTotals = years.map(y => cancers.reduce((sum, c) => sum + (pivotData[c][y] || 0), 0));
      const grandTotal = rowTotals.reduce((sum, t) => sum + t, 0);
      return (
        <div style={{width:"100%",overflowX:"auto",padding:20}}>
          <div style={{marginBottom:16, display:'flex', gap:8, alignItems:'center'}}>
            <button 
              onClick={() => setPivotMode('absolute')}
              style={{
                padding:'6px 12px', borderRadius:6, border:'1px solid #d1d5db', background: pivotMode === 'absolute' ? '#2563eb' : 'white', color: pivotMode === 'absolute' ? 'white' : '#374151', fontSize:11, fontWeight:600, cursor:'pointer'
              }}
            >
              Valeurs absolues
            </button>
            <button 
              onClick={() => setPivotMode('percentage')}
              style={{
                padding:'6px 12px', borderRadius:6, border:'1px solid #d1d5db', background: pivotMode === 'percentage' ? '#2563eb' : 'white', color: pivotMode === 'percentage' ? 'white' : '#374151', fontSize:11, fontWeight:600, cursor:'pointer'
              }}
            >
              Pourcentages
            </button>
          </div>
          <table style={{borderCollapse:"collapse",width:"100%",fontSize:12}}>
            <thead>
              <tr>
                <th style={{border:"1px solid #e5e7eb",padding:8,background:"#f9fafb",position:"sticky",left:0,zIndex:1}}>Cancer</th>
                {years.map(y => <th key={y} style={{border:"1px solid #e5e7eb",padding:8,background:"#f9fafb"}}>{y}</th>)}
                <th style={{border:"1px solid #e5e7eb",padding:8,background:"#f9fafb"}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {cancers.map(c => {
                const rowTotal = years.reduce((sum, y) => sum + (pivotData[c][y] || 0), 0);
                return (
                  <tr key={c}>
                    <td style={{border:"1px solid #e5e7eb",padding:8,fontWeight:600,position:"sticky",left:0,background:"white"}}>{c}</td>
                    {years.map(y => {
                      const cases = pivotData[c][y] || 0;
                      const intensity = maxCases > 0 ? (cases / maxCases) * 0.7 : 0;
                      const displayValue = pivotMode === 'percentage' ? (rowTotal > 0 ? ((cases / rowTotal) * 100).toFixed(1) + '%' : '0%') : cases;
                      return <td key={y} style={{border:"1px solid #e5e7eb",padding:8,textAlign:"center",background:`rgba(37, 99, 235, ${intensity})`,color: intensity > 0.5 ? 'white' : 'black'}}>{displayValue}</td>;
                    })}
                    <td style={{border:"1px solid #e5e7eb",padding:8,textAlign:"center",fontWeight:600}}>{rowTotal}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{border:"1px solid #e5e7eb",padding:8,fontWeight:600,position:"sticky",left:0,background:"#f9fafb"}}>Total</td>
                {years.map(y => {
                  const colTotal = cancers.reduce((sum, c) => sum + (pivotData[c][y] || 0), 0);
                  return <td key={y} style={{border:"1px solid #e5e7eb",padding:8,textAlign:"center",fontWeight:600,background:"#f9fafb"}}>{colTotal}</td>;
                })}
                <td style={{border:"1px solid #e5e7eb",padding:8,textAlign:"center",fontWeight:600,background:"#f9fafb"}}>{cancers.reduce((sum, c) => sum + years.reduce((s, y) => s + (pivotData[c][y] || 0), 0), 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
    
    if(selAn === "choropleth") {
      return <ChoroplethMap apiData={apiData} rawData={resolvedRawData} cancers={resolvedCancers} patients={patients} />;
    }
    
    if(!safeChartData.length) return <div style={{textAlign:"center",color:"#94a3b8",padding:36,fontSize:13}}>Aucune donnée pour ces filtres</div>;
    
    const sz={w:510,h:275};
    const yKey = selAn === 'custom_build' ? (findBestYKey(filters.customAxeYLabel) || 'cases') : 'cases';
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:22,flexWrap:"wrap"}}>
        {selChart==="pie"&&<CustomPieChart data={safeChartData} size={240}/>}
        {selChart==="donut"&&<CustomPieChart data={safeChartData} donut size={240}/>}
        {selChart==="bar"&&<CustomBarChart data={safeChartData} yKey={yKey} size={sz}/>}
        {selChart==="horizontal"&&<CustomBarChart data={safeChartData} yKey={yKey} horizontal size={{w:510,h:Math.max(260,safeChartData.length*40+60)}}/>}
        {selChart==="line"&&<CustomLineChart data={safeChartData} yKey={yKey} size={sz}/>}
        {selChart==="area"&&<CustomLineChart data={safeChartData} yKey={yKey} area size={sz}/>}
        {selChart==="waterfall"&&<CustomWaterfallChart data={safeChartData} size={sz}/>}
        {(selChart==="scatter" || selChart==="bubble") && <CustomBubbleChart data={safeChartData} size={sz}/>}
        {selChart==="treemap"&&<CustomTreemapChart data={safeChartData} size={{w:520,h:300}}/>}
        {selChart==="funnel"&&<CustomFunnelChart data={safeChartData} size={sz}/>}
        {selChart==="gauge"&&<CustomGaugeChart data={safeChartData} size={{w:280,h:280}}/>}
        {selChart==="heatmap"&&<CustomHeatmapChart data={safeChartData} size={{w:520,h:320}}/>}
        {selChart==="radar" && <CustomRadarChart data={safeChartData} size={sz}/>}
        {isCirc && selAn !== "by_wilaya" && <Legend data={safeChartData} total={total}/>}
      </div>
    );
  }

  // Configuration for which filters and chart options to show per analysis
  const ANALYSIS_CONFIG = {
    by_cancer         : { charts: true,  filters: ["sex","age","year","stade","validated"] },
    by_sex            : { charts: true,  filters: ["age","year","cancer","stade","validated"] },
    by_age            : { charts: true,  filters: ["sex","year","cancer","validated"] },
    top5              : { charts: true,  filters: ["sex","age","year","validated"] },
    pivot_cancer_year : { charts: false, filters: ["year","validated"] },
    by_year           : { charts: true,  filters: ["sex","age","cancer","stade","validated"] },
    by_month          : { charts: true,  filters: ["sex","age","year","cancer","validated"] },
    by_quarter        : { charts: true,  filters: ["sex","year","cancer","validated"] },
    compare_periods   : { charts: true,  filters: ["cancer","sex","validated","period1","period2"] },
    custom_period     : { charts: true,  filters: ["sex","age","year","cancer","stade","validated"] },
    by_wilaya         : { charts: false, filters: ["validated"] },
    compare_wilayas   : { charts: false, filters: ["wilaya_compare","validated"] },
    by_stade          : { charts: true,  filters: ["sex","age","year","cancer","validated"] },
    by_mode_diag      : { charts: true,  filters: ["sex","year","cancer","validated"] },
    by_traitement     : { charts: true,  filters: ["sex","cancer","stade","validated"] },
    survie_stade      : { charts: true,  filters: ["stade","validated"] },
    by_status         : { charts: true,  filters: ["sex","age","year","cancer","validated"] },
    death_stats       : { charts: true,  filters: ["sex","age","year","cancer","validated"] },
    taux_guerison     : { charts: true,  filters: ["sex","age","year","validated"] },
    kpi_dashboard     : { charts: false, filters: ["sex","age","year","validated"] },
    custom_build      : { charts: true,  filters: ["sex","age","year","daira","cancer","stade","validated"] },
  };
  const currentConfig = ANALYSIS_CONFIG[selAn] || { charts: true, filters: ['sex','age','year'] };

  useEffect(() => {
    if (!autoChart || !currentConfig.charts || selAn === 'custom_build') return;
    const recommendation = getRecommendedChart(selAn);
    if (recommendation) {
      setSelChart(recommendation.chart);
      setSelectedGroup(s => recommendation.group || s);
    }
  }, [selAn, currentConfig.charts, autoChart, getRecommendedChart]);

  const STEPS=[{n:1,label:"Catégorie"},{n:2,label:"Analyse"},{n:3,label:"Paramètres"},{n:4,label:"Résultat"}];

  // Dark mode color scheme
  const colors = {
    pageBg: darkMode ? '#0f172a' : '#f1f5f9',
    cardBg: darkMode ? '#1e293b' : 'white',
    textPrimary: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: '#94a3b8',
    border: darkMode ? '#334155' : '#e2e8f0',
    headerBg: darkMode ? '#1e293b' : 'white',
    inputBg: darkMode ? '#0f172a' : 'white',
    inputText: darkMode ? '#f1f5f9' : 'inherit',
  };

  const cardS={background:colors.cardBg,borderRadius:11,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",overflow:"hidden",transition:"all 0.3s"};
  const lblS={fontSize:11,fontWeight:600,color:"#64748b",display:"block",marginBottom:5};
  const selS={width:"100%",padding:"7px 10px",borderRadius:7,border:"1.5px solid "+colors.border,fontFamily:"inherit",fontSize:11.5,color:colors.textPrimary,background:colors.inputBg,outline:"none",transition:"all 0.2s"};

  // Get export filename based on statistic type
  const getExportFilename = () => {
    const filenameMap ={
      by_wilaya: 'analyse_wilaya',
      compare_wilayas: 'comparaison_wilayas',
      by_sex: 'analyse_sexe',
      by_age: 'analyse_age',
      by_year: 'analyse_annee',
      by_month: 'analyse_mois',
      by_quarter: 'analyse_trimestre',
      by_stade: 'analyse_stade',
      by_mode_diag: 'analyse_mode_diagnostic',
      by_traitement: 'analyse_traitement',
      survie_stade: 'analyse_survie',
      custom_build: 'analyse_personnalisee',
      top5: 'analyse_top5',
      kpi_dashboard: 'tableau_bord',
    };
    return filenameMap[selAn] || 'analyse';
  };

  // PDF Export
  const handleExportPDF = () => {
  const maxVal = Array.isArray(chartData) ? Math.max(...chartData.map(d=>d.value), 1) : 1;
  const totalPdf = Array.isArray(chartData) ? chartData.reduce((s,d)=>s+d.value,0) : 0;

  const chartHTML = isKpi ? '' : (Array.isArray(chartData) ? chartData.slice(0,15).map(d => {
    const pct = Math.round((d.value/maxVal)*100);
    const barColor = d.color || cat?.color || '#2563eb';
    const totalPct = totalPdf>0 ? ((d.value/totalPdf)*100).toFixed(1) : '0';
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
      <div style="width:130px;font-size:11px;color:#334155;text-align:right;flex-shrink:0;font-weight:500">${(d.label+'').length>15?(d.label+'').slice(0,14)+'…':d.label}</div>
      <div style="flex:1;background:#f1f5f9;border-radius:5px;height:20px;overflow:hidden;position:relative">
        <div style="width:${pct}%;background:${barColor};height:100%;border-radius:5px;min-width:2px"></div>
        <span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:10px;color:#475569;font-weight:600">${(d.value??0).toLocaleString('fr-FR')}</span>
      </div>
      <div style="width:38px;font-size:10px;color:#94a3b8;flex-shrink:0;text-align:right">${totalPct}%</div>
    </div>`;
  }).join('') : '');

  const kpiHTML = !isKpi ? '' : (() => {
    const src = Array.isArray(apiData?.raw_data) && apiData.raw_data.length>0 ? apiData.raw_data : FALLBACK_DATA;
    const t = src.reduce((s,d)=>s+d.cases,0);
    const m = src.filter(d=>d.sex==='M').reduce((s,d)=>s+d.cases,0);
    const f = src.filter(d=>d.sex==='F').reduce((s,d)=>s+d.cases,0);
    const years = [...new Set(src.map(d=>d.year).filter(Boolean))].sort();
    const maxY = years.length>0?Math.max(...years):2024;
    const y1 = src.filter(d=>d.year===maxY).reduce((s,d)=>s+d.cases,0);
    const y0 = src.filter(d=>d.year===maxY-1).reduce((s,d)=>s+d.cases,0);
    const g = y0>0?(((y1-y0)/y0)*100).toFixed(1):'—';
    const cm={}; src.forEach(d=>{if(d.cancer)cm[d.cancer]=(cm[d.cancer]||0)+d.cases;});
    const dom = Object.entries(cm).sort((a,b)=>b[1]-a[1])[0];
    const domLabel = dom ? (resolvedCancers.find(c=>c.id===dom[0]||c.label===dom[0])?.label||dom[0]) : '—';
    const sm={'Stade I':95,'Stade II':78,'Stade III':55,'Stade IV':25};
    const vr=src.filter(d=>sm[d.stade]); const vt=vr.reduce((s,d)=>s+d.cases,0);
    const surv=vt>0?Math.round(vr.reduce((s,d)=>s+sm[d.stade]*d.cases,0)/vt):73;
    const kpis=[
      {label:'Total cas',value:t.toLocaleString('fr-FR'),color:'#2563eb',bg:'#eff6ff'},
      {label:`Nouveaux cas (${maxY})`,value:y1.toLocaleString('fr-FR'),sub:g!=='—'?(parseFloat(g)>0?'+':'')+g+'% vs '+(maxY-1):'',color:'#059669',bg:'#f0fdf4'},
      {label:'Ratio H/F',value:f>0?(m/f).toFixed(2):'—',sub:`H:${m.toLocaleString('fr-FR')} F:${f.toLocaleString('fr-FR')}`,color:'#7c3aed',bg:'#f5f3ff'},
      {label:'Survie moy. 1an',value:surv+'%',color:'#d97706',bg:'#fffbeb'},
      {label:'Cancer dominant',value:domLabel,color:'#dc2626',bg:'#fef2f2'},
      {label:'Part féminine',value:Math.round((f/Math.max(t,1))*100)+'%',color:'#059669',bg:'#f0fdf4'},
    ];
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin:20px 0">
      ${kpis.map(k=>`<div style="background:${k.bg};border-radius:10px;padding:16px;border:1px solid ${k.color}22">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">${k.label}</div>
        <div style="font-size:24px;font-weight:800;color:${k.color}">${k.value}</div>
        ${k.sub?`<div style="font-size:10px;color:#94a3b8;margin-top:4px">${k.sub}</div>`:''}
      </div>`).join('')}
    </div>`;
  })();

  const printContent = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;background:#fff;color:#0f172a;padding:0}
    .cover{background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#1d4ed8 100%);padding:44px 48px 36px}
    .badge{display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:5px 14px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:18px}
    .cover h1{font-size:28px;font-weight:800;color:white;margin-bottom:6px;letter-spacing:-0.01em}
    .cover p{font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:24px}
    .kpi-mini{display:flex;gap:12px;margin-top:16px}
    .kpi-mini-item{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 16px;flex:1}
    .kpi-mini-val{font-size:18px;font-weight:800;color:white}
    .kpi-mini-lbl{font-size:9px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px}
    .body{padding:32px 48px}
    .section-title{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;display:flex;align-items:center;gap:8px}
    .section-title::after{content:'';flex:1;height:1px;background:#e2e8f0}
    table{width:100%;border-collapse:collapse;font-size:11px}
    thead tr{background:#f8fafc;border-bottom:2px solid #e2e8f0}
    th{padding:9px 12px;text-align:left;font-size:8.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em}
    th:nth-child(3),th:nth-child(4){text-align:right}
    td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
    tr:nth-child(even) td{background:#fafafa}
    .tier{padding:2px 8px;border-radius:20px;font-size:9.5px;font-weight:700;display:inline-block}
    .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:9.5px;color:#94a3b8}
  </style>
  </head><body>
  <div class="cover">
    <div class="badge">🏥 Registre National du Cancer — Algérie</div>
    <h1>${analysis?.label || 'Statistiques'}</h1>
    <p>${[filters.sex?(filters.sex==='M'?'Masculin':'Féminin'):'Tous sexes', filters.age||'Tous âges', (filters.yearStart&&filters.yearEnd)?filters.yearStart+'–'+filters.yearEnd:'Toutes années'].join(' · ')} · ${new Date().toLocaleDateString('fr-FR')}</p>
    ${!isKpi?`<div class="kpi-mini">
      <div class="kpi-mini-item"><div class="kpi-mini-val">${totalPdf.toLocaleString('fr-FR')}</div><div class="kpi-mini-lbl">Total cas</div></div>
      <div class="kpi-mini-item"><div class="kpi-mini-val">${chartData.length}</div><div class="kpi-mini-lbl">Catégories</div></div>
      <div class="kpi-mini-item"><div class="kpi-mini-val">${chartData[0]?.label||'—'}</div><div class="kpi-mini-lbl">Dominant</div></div>
    </div>`:''}
  </div>
  <div class="body">
    ${isKpi ? `<div class="section-title">Indicateurs clés de performance</div>${kpiHTML}` : `
    <div class="section-title">Distribution — ${analysis?.label||''}</div>
    <div style="margin-bottom:24px">${chartHTML}</div>
    <div class="section-title">Données détaillées</div>
    <table>
      <thead><tr><th>#</th><th>Catégorie</th><th>Cas</th><th>% Total</th><th>Niveau</th></tr></thead>
      <tbody>${Array.isArray(chartData) ? chartData.map((d,i)=>{
        const p=totalPdf>0?(((d.value??0)/totalPdf)*100).toFixed(1):'0';
        const t=parseFloat(p)>10?{l:'Critique',c:'#dc2626',bg:'#fef2f2'}:parseFloat(p)>3?{l:'Élevé',c:'#ea580c',bg:'#fff7ed'}:parseFloat(p)>1.5?{l:'Moyen',c:'#ca8a04',bg:'#fefce8'}:{l:'Faible',c:'#16a34a',bg:'#f0fdf4'};
        return `<tr><td style="font-weight:700;color:#94a3b8">${i+1}</td><td style="font-weight:600">${d.label}</td><td style="font-weight:800;color:#1d4ed8;text-align:right">${(d.value??0).toLocaleString('fr-FR')}</td><td style="color:#64748b;text-align:right">${p}%</td><td><span class="tier" style="background:${t.bg};color:${t.c}">${t.l}</span></td></tr>`;
      }).join('') : ''}</tbody>
    </table>`}
    <div class="footer">
      <span>MedDossier · Registre National du Cancer · CHU Tlemcen</span>
      <span>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
    </div>
  </div>
  </body></html>`;

  const w = window.open('','_blank','width=950,height=750');
  if(w){ w.document.write(printContent); w.document.close(); w.focus(); setTimeout(()=>w.print(),700); }
  };

  // CSV Export
  const handleExportCSV = () => {
  const BOM = '\uFEFF';
  
  const HEADERS_MAP = {
    by_cancer:    ['Rang', 'Type de Cancer', 'Nombre de Cas', '% Total'],
    top5:         ['Rang', 'Type de Cancer', 'Nombre de Cas', '% Total'],
    by_sex:       ['Rang', 'Sexe', 'Nombre de Cas', '% Total'],
    by_age:       ['Rang', "Tranche d'âge", 'Nombre de Cas', '% Total'],
    by_year:      ['Rang', 'Année', 'Âge moyen', '% Total'],
    by_month:     ['Rang', 'Mois', 'Nombre de Cas', '% Total'],
    by_quarter:   ['Rang', 'Trimestre', 'Nombre de Cas', '% Total'],
    by_wilaya:    ['Rang', 'Wilaya', 'Nombre de Cas', '% National', 'Niveau'],
    compare_wilayas: ['Type de Cancer', filters.compareWilaya1, filters.compareWilaya2, 'Différence'],
    by_stade:     ['Rang', 'Stade', 'Nombre de Cas', '% Total'],
    survie_stade: ['Rang', 'Stade', 'Survie estimée (%)'],
    by_mode_diag: ['Rang', 'Mode de Diagnostic', 'Nombre de Cas', '% Total'],
    by_traitement:['Rang', 'Traitement', 'Nombre de Cas', '% Total'],
    custom_build: ['Rang', filters.customAxeXLabel||'Catégorie', filters.customAxeYLabel||'Nombre de cas', '% Total'],
  };

  const headers = HEADERS_MAP[selAn] || ['Rang', 'Catégorie', 'Valeur', '% Total'];
  const totalPdf = Array.isArray(chartData) ? chartData.reduce((s,d)=>s+d.value,0) : 0;

  const rows = Array.isArray(chartData) ? chartData.map((d,i) => {
    const pct = totalPdf>0 ? ((d.value/totalPdf)*100).toFixed(1)+'%' : '0%';
    const label = String(d.label);
    
    if (selAn === 'by_wilaya') {
      const tier = parseFloat(pct)>10?'Critique':parseFloat(pct)>3?'Élevé':parseFloat(pct)>1.5?'Moyen':'Faible';
      return [i+1, label, d.value, pct, tier];
    }
    if (selAn === 'compare_wilayas') {
      const diff = d.value1 - d.value2;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      return [label, d.value1, d.value2, diffStr];
    }
    if (selAn === 'survie_stade') {
      return [i+1, label, d.value+'%'];
    }
    if (selAn === 'by_year') {
      return [i+1, label, d.avgAge || 0, pct];
    }
    return [i+1, label, d.value, pct];
  }) : [];

  const csvContent = BOM + [
    headers.join(';'),
    ...rows.map(row => row.map(cell => {
      const s = String(cell);
      return s.includes(';') || s.includes('"') ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = {
    by_cancer:'par_type_cancer', top5:'top5_cancers',
    by_sex:'par_sexe', by_age:'par_age',
    by_year:'evolution_annuelle', by_month:'par_mois', by_quarter:'par_trimestre',
    by_wilaya:'par_wilaya', by_stade:'par_stade', survie_stade:'taux_survie',
    by_mode_diag:'mode_diagnostic', by_traitement:'type_traitement',
    custom_build:'analyse_personnalisee',
  }[selAn] || 'statistiques';
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

  // Complete Report PDF Export (6-page professional report)
  const handleExportCompletePDF = () => {
    const src = Array.isArray(apiData?.raw_data) && apiData.raw_data.length>0 ? apiData.raw_data : FALLBACK_DATA;
    const totalCases = src.reduce((s,d)=>s+d.cases,0);
    const maleCases = src.filter(d=>d.sex==='M').reduce((s,d)=>s+d.cases,0);
    const femaleCases = src.filter(d=>d.sex==='F').reduce((s,d)=>s+d.cases,0);
    
    const years = [...new Set(src.map(d=>d.year).filter(Boolean))].sort();
    const maxYear = years.length>0?Math.max(...years):2024;
    const minYear = years.length>0?Math.min(...years):2018;
    
    const casesLastYear = src.filter(d=>d.year===maxYear).reduce((s,d)=>s+d.cases,0);
    const casesPrevYear = src.filter(d=>d.year===maxYear-1).reduce((s,d)=>s+d.cases,0);
    const growthRate = casesPrevYear>0?(((casesLastYear-casesPrevYear)/casesPrevYear)*100).toFixed(1):'—';
    
    const cancerMap={}; src.forEach(d=>{if(d.cancer)cancerMap[d.cancer]=(cancerMap[d.cancer]||0)+d.cases;});
    const dominantCancer = Object.entries(cancerMap).sort((a,b)=>b[1]-a[1])[0];
    const dominantLabel = dominantCancer ? (resolvedCancers.find(c=>c.id===dominantCancer[0]||c.label===dominantCancer[0])?.label||dominantCancer[0]) : '—';
    const dominantCount = dominantCancer ? dominantCancer[1].toLocaleString('fr-FR') : '—';
    
    const survivalMap={'Stade I':95,'Stade II':78,'Stade III':55,'Stade IV':25};
    const survivalRows=src.filter(d=>survivalMap[d.stade]); 
    const survivalTotal=survivalRows.reduce((s,d)=>s+d.cases,0);
    const avgSurvival=survivalTotal>0?Math.round(survivalRows.reduce((s,d)=>s+survivalMap[d.stade]*d.cases,0)/survivalTotal):73;
    
    const recommendations = (() => {
      const recs = [];
      if(maleCases/totalCases > 0.6) recs.push('Forte prévalence masculine détectée — recommandation: intensifier le dépistage chez les hommes');
      if(femaleCases/totalCases > 0.6) recs.push('Forte prévalence féminine détectée — recommandation: campagnes de sensibilisation ciblées');
      if(growthRate !== '—' && parseFloat(growthRate) > 10) recs.push('Augmentation > 10% détectée — recommandation: renforcer les ressources de diagnostic et traitement');
      if(dominantCancer && dominantCancer[1]/totalCases > 0.4) recs.push(`${dominantLabel} représente >40% — recommandation: créer un centre de spécialisation`);
      if(avgSurvival < 50) recs.push('Taux de survie moyen faible — recommandation: améliorer l\'accès au traitement et suivi post-diagnostic');
      return recs.length > 0 ? recs : ['Données de haute qualité — poursuivre le suivi régulier'];
    })();
    
    const tableHTML = Array.isArray(chartData) ? chartData.slice(0,12).map((d,i)=>{
      const pct = totalCases>0 ? ((d.value/totalCases)*100).toFixed(1) : '0';
      return `<tr><td>${i+1}</td><td>${d.label}</td><td style="text-align:right">${(d.value??0).toLocaleString('fr-FR')}</td><td style="text-align:right">${pct}%</td></tr>`;
    }).join('') : '';
    
    const reportHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport Complet</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1f2937}
.page{page-break-after:always;min-height:210mm;padding:20mm}
.cover{background:linear-gradient(135deg,#0f172a 0%,#1e40af 50%,#1d4ed8 100%);color:white;display:flex;flex-direction:column;justify-content:space-between;min-height:210mm;padding:40mm 30mm}
.badge{display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:25px;padding:6px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:20px;width:fit-content}
.cover h1{font-size:48px;font-weight:900;letter-spacing:-1px;margin:30px 0 10px;line-height:1.1}
.cover p{font-size:14px;opacity:0.8;margin-bottom:40px}
.cover-info{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:40px}
.cover-item{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:15px;backdrop-filter:blur(10px)}
.cover-item-label{font-size:11px;text-transform:uppercase;letter-spacing:0.07em;opacity:0.65;margin-bottom:5px}
.cover-item-value{font-size:22px;font-weight:800}
.body{padding:40mm 30mm}
.section-title{font-size:11px;font-weight:900;color:#1e40af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px;display:flex;align-items:center;gap:12px}
.section-title::before{content:'';width:4px;height:24px;background:#1e40af;border-radius:2px}
.kpi-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:30px}
.kpi-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px;text-align:center}
.kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;margin-bottom:6px}
.kpi-value{font-size:28px;font-weight:900;color:#1f2937;letter-spacing:-1px}
.kpi-sub{font-size:10px;color:#9ca3af;margin-top:4px}
table{width:100%;border-collapse:collapse;margin:20px 0}
thead tr{background:#f3f4f6;border-bottom:2px solid #d1d5db}
th{padding:12px 10px;text-align:left;font-size:9px;font-weight:900;color:#4b5563;text-transform:uppercase;letter-spacing:0.07em}
th:nth-child(3),th:nth-child(4){text-align:right}
td{padding:10px;border-bottom:1px solid #e5e7eb;font-size:11px}
tr:nth-child(even) td{background:#f9fafb}
.rec-box{background:#fef3c7;border-left:4px solid #d97706;padding:12px 16px;margin-bottom:10px;border-radius:4px;font-size:11px;line-height:1.6}
.footer{margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af}
</style></head><body>

<!-- PAGE 1: COVER -->
<div class="page cover">
  <div>
    <div class="badge">🏥 Registre National du Cancer</div>
    <h1>${analysis?.label || 'Rapport d\'Analyse'}</h1>
    <p>Principaux résultats et recommandations</p>
  </div>
  <div class="cover-info">
    <div class="cover-item">
      <div class="cover-item-label">Période</div>
      <div class="cover-item-value">${minYear}–${maxYear}</div>
    </div>
    <div class="cover-item">
      <div class="cover-item-label">Total cas</div>
      <div class="cover-item-value">${totalCases.toLocaleString('fr-FR')}</div>
    </div>
    <div class="cover-item">
      <div class="cover-item-label">Date du rapport</div>
      <div class="cover-item-value">${new Date().toLocaleDateString('fr-FR')}</div>
    </div>
    <div class="cover-item">
      <div class="cover-item-label">Zones</div>
      <div class="cover-item-value">${[...new Set(src.map(d=>d.wilaya).filter(Boolean))].length}</div>
    </div>
  </div>
</div>

<!-- PAGE 2: KPI DASHBOARD -->
<div class="page">
  <h2 class="section-title">Tableau de Bord</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total cas</div>
      <div class="kpi-value">${totalCases.toLocaleString('fr-FR')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ratio H/F</div>
      <div class="kpi-value">${femaleCases>0?(maleCases/femaleCases).toFixed(2):'—'}</div>
      <div class="kpi-sub">M:${maleCases.toLocaleString('fr-FR')} | F:${femaleCases.toLocaleString('fr-FR')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Croissance annuelle</div>
      <div class="kpi-value">${growthRate!=='—'?(parseFloat(growthRate)>0?'+':'')+growthRate+'%':growthRate}</div>
      <div class="kpi-sub">${maxYear-1} → ${maxYear}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Cancer dominant</div>
      <div class="kpi-value">${dominantLabel.substring(0,12)}</div>
      <div class="kpi-sub">${dominantCount} cas</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Survie moy. 1an</div>
      <div class="kpi-value">${avgSurvival}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Part féminine</div>
      <div class="kpi-value">${Math.round((femaleCases/Math.max(totalCases,1))*100)}%</div>
    </div>
  </div>
  <div class="footer">
    <div>Source: Registre du Cancer — CHU Tlemcen</div>
    <div>Page 2 | Tableau de Bord</div>
  </div>
</div>

<!-- PAGE 3: CURRENT ANALYSIS -->
<div class="page">
  <h2 class="section-title">Analyse Principale</h2>
  <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0">
    <p style="font-size:12px;color:#6b7280;margin-bottom:6px"><strong>Type d'analyse:</strong> ${analysis?.label}</p>
    <p style="font-size:12px;color:#6b7280;margin-bottom:6px"><strong>Filtre appliqué:</strong> ${[filters.sex?'Sexe: '+(filters.sex==='M'?'Masculin':'Féminin'):'',filters.age?'Âge: '+filters.age:'',filters.yearStart?'Période: '+filters.yearStart+'-'+filters.yearEnd:''].filter(Boolean).join(', ') || 'Aucun filtre appliqué'}</p>
    <p style="font-size:12px;color:#6b7280">Les données sont présentées graphiquement dans la version numérique interactive de ce rapport.</p>
  </div>
  <div class="footer">
    <div>Source: Registre du Cancer — CHU Tlemcen</div>
    <div>Page 3 | Analyse Principale</div>
  </div>
</div>

<!-- PAGE 4: DETAILED DATA -->
<div class="page">
  <h2 class="section-title">Données Détaillées</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${filters.customAxeXLabel||'Catégorie'}</th>
        <th>Nombre de cas</th>
        <th>% Total</th>
      </tr>
    </thead>
    <tbody>${tableHTML}</tbody>
  </table>
  <p style="font-size:10px;color:#9ca3af;margin-top:15px">* Table limitée aux 12 premiers résultats. Voir la version Excel pour les données complètes.</p>
  <div class="footer">
    <div>Source: Registre du Cancer — CHU Tlemcen</div>
    <div>Page 4 | Données Détaillées</div>
  </div>
</div>

<!-- PAGE 5: GEOGRAPHIC CONTEXT -->
<div class="page">
  <h2 class="section-title">Distribution Géographique</h2>
  <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:30px;text-align:center;margin-top:40px;min-height:150px;display:flex;flex-direction:column;justify-content:center">
    <p style="font-size:13px;color:#1f2937;line-height:1.8;margin-bottom:15px">
      <strong>Wilayas couvertes (${[...new Set(src.map(d=>d.wilaya).filter(Boolean))].length} zones):</strong>
    </p>
    <p style="font-size:11px;color:#6b7280;line-height:1.8">
      ${[...new Set(src.map(d=>d.wilaya).filter(Boolean))].slice(0,8).join(', ')}<br/>
      ${[...new Set(src.map(d=>d.wilaya).filter(Boolean))].length > 8 ? '... et '+(Math.max(0,[...new Set(src.map(d=>d.wilaya).filter(Boolean))].length-8))+' autres zones' : ''}
    </p>
  </div>
  <div class="footer">
    <div>Source: Registre du Cancer — CHU Tlemcen</div>
    <div>Page 5 | Distribution Géographique</div>
  </div>
</div>

<!-- PAGE 6: RECOMMENDATIONS -->
<div class="page">
  <h2 class="section-title">Recommandations & Prochaines Étapes</h2>
  <div style="margin-top:20px">
    <p style="font-size:11px;color:#374151;margin-bottom:15px;line-height:1.8">Sur la base de cette analyse, les recommandations suivantes sont proposées:</p>
    ${recommendations.map((rec,i)=>`<div class="rec-box">✓ ${rec}</div>`).join('')}
  </div>
  <div style="background:#f0f4ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-top:30px">
    <p style="font-size:11px;color:#1e40af;font-weight:700;margin-bottom:10px">Plan d'action suggéré:</p>
    <ol style="font-size:10px;color:#1e40af;line-height:1.8;padding-left:20px">
      <li>Valider ces résultats avec l'équipe clinique</li>
      <li>Planifier les interventions prioritaires</li>
      <li>Allouer les ressources nécessaires</li>
      <li>Mettre en œuvre et suivre l'impact</li>
      <li>Réviser ce rapport tous les 6 mois</li>
    </ol>
  </div>
  <div class="footer">
    <div>Source: Registre du Cancer — CHU Tlemcen</div>
    <div>Page 6 | Recommandations</div>
  </div>
</div>

</body></html>`;

    const printWindow = window.open('', '_blank');
    if(printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 300);
    }
  };

  return (
    <div style={{fontFamily:"'Outfit','Segoe UI',sans-serif",background:colors.pageBg,minHeight:"100vh",color:colors.textPrimary,transition:"all 0.3s"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:${darkMode?'#0f172a':'#f1f5f9'}}::-webkit-scrollbar-thumb{background:${darkMode?'#475569':'#cbd5e1'};border-radius:3px}@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.26s ease forwards}@keyframes sp{to{transform:rotate(360deg)}}.sp{animation:sp 0.75s linear infinite}@keyframes barIn { from { width: 0% } to { width: var(--bar-w) } }.bar-animated { animation: barIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }`}</style>

      <div style={{
        padding: '10px 24px',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            border: '1.5px solid #e2e8f0',
            background: 'white',
            color: '#64748b',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ← Retour
        </button>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>
          Registre Cancer · Statistiques {apiData ? '(Données réelles)' : '(Données de test)'}
        </span>
      </div>

      {/* HEADER — style identique à la photo */}
      <div style={{background:colors.headerBg,borderBottom:"1.5px solid "+colors.border,padding:"0 24px",display:"flex",alignItems:"center",gap:12,height:56,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",transition:"all 0.3s"}}>
        <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#1d4ed8,#60a5fa)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:colors.textPrimary,letterSpacing:"-0.01em",transition:"color 0.3s"}}>Générateur de Statistiques</div>
          <div style={{fontSize:10,color:"#94a3b8"}}>Registre Cancer · Algérie · 2018–2024</div>
        </div>
        <div style={{flex:1}}/>
        {/* Stepper */}
        <div style={{display:"flex",alignItems:"center",gap:0}}>
          {STEPS.map((st,i)=>(
            <div key={st.n} style={{display:"flex",alignItems:"center"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:step>=st.n?1:0.35}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:step>st.n?"#059669":step===st.n?"#2563eb":"#e2e8f0",color:step>=st.n?"white":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:800,transition:"background 0.3s"}}>
                  {step>st.n?<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>:st.n}
                </div>
                <div style={{fontSize:8.5,color:step===st.n?"#2563eb":"#94a3b8",fontWeight:step===st.n?700:400}}>{st.label}</div>
              </div>
              {i<STEPS.length-1&&<div style={{width:26,height:2,background:step>st.n?"#059669":"#e2e8f0",margin:"0 3px",marginBottom:16,transition:"background 0.3s"}}/>}
            </div>
          ))}
        </div>
        {/* Dark mode toggle */}
        <button onClick={() => setDarkMode(!darkMode)} style={{marginLeft:12,display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:7,border:"1.5px solid #e2e8f0",background:darkMode?"#1e293b":"white",color:darkMode?"#f1f5f9":"#64748b",fontFamily:"inherit",fontSize:16,cursor:"pointer",transition:"all 0.3s"}} title="Activer le mode sombre">{darkMode?"☀️":"🌙"}</button>
        {/* History panel toggle */}
        <button onClick={() => setShowHistoryPanel(!showHistoryPanel)} style={{marginLeft:8,display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:7,border:"1.5px solid #e2e8f0",background:darkMode?"#1e293b":"white",color:darkMode?"#f1f5f9":"#64748b",fontFamily:"inherit",fontSize:16,cursor:"pointer",transition:"all 0.3s"}} title="Historique des analyses">🕐</button>
        {step>1&&<button onClick={reset} style={{marginLeft:14,display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,border:"1.5px solid "+(darkMode?"#334155":"#e2e8f0"),background:darkMode?"#1e293b":"white",color:darkMode?"#cbd5e1":"#64748b",fontFamily:"inherit",fontSize:11,fontWeight:600,cursor:"pointer"}}>{Icon.reset} Réinitialiser</button>}
      </div>

      {/* BODY */}
      <div style={{maxWidth:'100%',width:'100%',margin:"0 auto",padding:"16px 14px",overflowX:'auto'}}>

        {apiLoading && (
          <div style={{textAlign:'center',padding:'20px',fontSize:13,color:'#94a3b8',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <div style={{width:14,height:14,border:'2px solid #e2e8f0',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
            Chargement des données réelles...
          </div>
        )}

        {/* STEP 1 */}
        {step===1&&(
          <div className="fu">
            <div style={{textAlign:"center",marginBottom:26}}>
              <div style={{fontSize:21,fontWeight:800,color:colors.textPrimary,letterSpacing:"-0.02em"}}>Sélectionnez une catégorie d'analyse</div>
              <div style={{fontSize:12.5,color:"#94a3b8",marginTop:5}}>Choisissez le type de statistique que vous souhaitez générer</div>
            </div>
            
            {/* SEARCH BAR */}
            <div style={{marginBottom:22}}>
              <input
                type="text"
                placeholder="Rechercher une analyse... (ex: 'cancer sein femmes 2022')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width:"100%",
                  padding:"11px 15px",
                  fontSize:13.5,
                  border:`1.5px solid ${dk.border}`,
                  borderRadius:9,
                  background:dk.input,
                  color:dk.text,
                  fontFamily:"inherit",
                  transition:"all 0.2s",
                  boxSizing:"border-box"
                }}
                onFocus={(e) => {e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";}} 
                onBlur={(e) => {e.target.style.borderColor = dk.border; e.target.style.boxShadow = "none";}}
              />
            </div>
            
            {/* SEARCH RESULTS */}
            {searchQuery.trim() && (
              <div style={{marginBottom:24}}>
                {searchAnalyses(searchQuery).length > 0 ? (
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:dk.textMuted,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.5px"}}>Résultats rapides</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
                      {searchAnalyses(searchQuery).map(res => {
                        const detected = parseSearchQuery(searchQuery);
                        return (
                          <button
                            key={res.id}
                            onClick={() => {
                              const newFilters = {...filters};
                              if (detected.cancers.length === 1) newFilters.cancer = detected.cancers[0];
                              if (detected.sex) newFilters.sex = detected.sex;
                              if (detected.year) {
                                newFilters.yearStart = detected.year;
                                newFilters.yearEnd = detected.year;
                              }
                              if (detected.wilaya) newFilters.wilaya = detected.wilaya;
                              setFilters(newFilters);
                              
                              if (res.id === 'by_wilaya') {
                                const wilayaAgg = {};
                                resolvedRawData.forEach(d => { if(d.wilaya) wilayaAgg[d.wilaya]=(wilayaAgg[d.wilaya]||0)+d.cases; });
                                const result = Object.entries(wilayaAgg).map(([label,value])=>({id:label,label,value})).sort((a,b)=>b.value-a.value);
                                setChartData(result);
                                currentChartDataRef.current = result;
                                axeXRef.current = 'wilaya';
                                setSelCat('geographic');
                                setSelAn('by_wilaya');
                                setSearchQuery('');
                                setStep(4);
                              } else if (res.id === 'kpi_dashboard') {
                                setSelCat('kpi');
                                setSelAn('kpi_dashboard');
                                setChartData([]);
                                currentChartDataRef.current = [];
                                axeXRef.current = 'kpi';
                                setSearchQuery('');
                                setStep(4);
                              } else {
                                setSelCat(res.catId);
                                setSelAn(res.id);
                                setSearchQuery('');
                                setStep(3);
                              }
                            }}
                            style={{
                              background:dk.card,
                              border:`1.5px solid ${res.catColor}44`,
                              borderRadius:9,
                              padding:"12px 13px",
                              cursor:"pointer",
                              textAlign:"left",
                              fontFamily:"inherit",
                              transition:"all 0.18s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = res.catColor;
                              e.currentTarget.style.boxShadow = `0 4px 14px ${res.catColor}22`;
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = `${res.catColor}44`;
                              e.currentTarget.style.boxShadow = "none";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                              <div style={{color:res.catColor,fontSize:13}}>{res.icon}</div>
                              <div style={{fontSize:12,fontWeight:700,color:dk.text}}>{res.label}</div>
                            </div>
                            <div style={{fontSize:11,color:dk.textMuted,lineHeight:1.4}}>{res.desc}</div>
                            <div style={{marginTop:6,fontSize:10,color:res.catColor,fontWeight:600}}>{res.catLabel}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{padding:"16px",background:dk.card,border:`1px solid ${dk.border}`,borderRadius:8,textAlign:"center",color:dk.textMuted,fontSize:13}}>Aucune analyse ne correspond à votre recherche</div>
                )}
              </div>
            )}
            
            <div style={{fontSize:12,fontWeight:700,color:dk.textMuted,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.5px"}}>Toutes les catégories</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:9}}>
              {CATEGORIES.map(c=>(
                <button key={c.id} onClick={()=>{setSelCat(c.id);setStep(2);}} style={{background:colors.cardBg,border:`1.5px solid ${c.border}`,borderRadius:11,padding:"14px 12px",cursor:"pointer",textAlign:"left",boxShadow:"0 1px 5px rgba(0,0,0,0.05)",fontFamily:"inherit",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color;e.currentTarget.style.boxShadow=`0 4px 14px ${c.color}22`;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=c.border;e.currentTarget.style.boxShadow="0 1px 5px rgba(0,0,0,0.05)";e.currentTarget.style.transform="translateY(0)";}}>
                  <div style={{width:36,height:36,borderRadius:9,background:c.bg,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:c.color,marginBottom:13}}>{c.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:colors.textPrimary,marginBottom:5}}>{c.label}</div>
                  <div style={{fontSize:11,color:"#64748b",lineHeight:1.55}}>{c.desc}</div>
                  <div style={{marginTop:12,fontSize:10.5,fontWeight:700,color:c.color,display:"inline-flex",alignItems:"center",gap:4,background:c.bg,padding:"3px 9px",borderRadius:20}}>{c.analyses.length} analyses {Icon.chevron}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&cat&&(
          <div className="fu">
            <button onClick={()=>setStep(1)} style={{background:"none",border:"none",color:"#2563eb",fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,marginBottom:14,padding:"4px 0"}}>{Icon.back} Retour aux catégories</button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <div style={{width:34,height:34,borderRadius:9,background:cat.bg,border:`1.5px solid ${cat.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:cat.color}}>{cat.icon}</div>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:colors.textPrimary}}>{cat.label}</div>
                <div style={{fontSize:11,color:"#94a3b8"}}>Sélectionnez le type d'analyse</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:9}}>
              {cat.analyses.map(an=>(
                <button key={an.id} onClick={() => {
                  if (an.id === "by_wilaya") {
                    const wilayaAgg = {};
                    resolvedRawData.forEach(d => { if(d.wilaya) wilayaAgg[d.wilaya]=(wilayaAgg[d.wilaya]||0)+d.cases; });
                    const result = Object.entries(wilayaAgg).map(([label,value])=>({id:label,label,value})).sort((a,b)=>b.value-a.value);
                    setChartData(result);
                    currentChartDataRef.current = result;
                    axeXRef.current = 'wilaya';
                    setSelCat("geographic");
                    setSelAn("by_wilaya");
                    setStep(4);
                  } else if (an.id === "kpi_dashboard") {
                    setSelCat("kpi");
                    setSelAn("kpi_dashboard");
                    setChartData([]);
                    currentChartDataRef.current = [];
                    axeXRef.current = 'kpi';
                    setStep(4);
                  } else {
                    setSelAn(an.id);
                    setStep(3);
                  }
                }} style={{background:colors.cardBg,border:`1.5px solid ${cat.border}`,borderRadius:10,padding:"12px 13px",cursor:"pointer",textAlign:"left",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",fontFamily:"inherit",transition:"all 0.18s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=cat.border;e.currentTarget.style.transform="translateY(0)";}}>
                  <div style={{color:cat.color,marginBottom:9}}>{an.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:colors.textPrimary,marginBottom:5}}>{an.label}</div>
                  <div style={{fontSize:10,color:"#64748b",lineHeight:1.55}}>{an.desc}</div>
                  <div style={{marginTop:11,fontSize:11,color:cat.color,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}>Sélectionner {Icon.chevron}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&analysis&&(
          <div className="fu">
            <button onClick={()=>setStep(2)} style={{background:"none",border:"none",color:"#2563eb",fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,marginBottom:14,padding:"4px 0"}}>{Icon.back} Retour aux analyses</button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
              <div style={{width:32,height:32,borderRadius:8,background:cat.bg,border:`1.5px solid ${cat.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:cat.color}}>{analysis.icon}</div>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:colors.textPrimary}}>{analysis.label}</div>
                <div style={{fontSize:11,color:"#94a3b8"}}>Configurez les paramètres</div>
              </div>
            </div>
            {selAn !== "custom_build" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16}}>
                {/* Filtres */}
                <div style={{...cardS, background: dk.card, border: `1px solid ${dk.border}`}}>
                  <div style={{padding:"13px 16px",borderBottom:`1px solid ${dk.border}`,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:dk.textMuted}}>{Icon.filter}</span>
                    <div style={{fontSize:10,fontWeight:700,color:dk.textMuted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Filtres (optionnels)</div>
                  </div>



                <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
                  {currentConfig.filters.includes('sex') && (
                    <div>
                      <label style={{...lblS, color: dk.textMuted}}>Sexe</label>
                      <div style={{display:"flex",gap:5}}>
                        {[["","Tous"],["M","Masculin"],["F","Féminin"]].map(([v,l])=>(
                          <button key={v} onClick={()=>setFilters(f=>({...f,sex:v}))} style={{flex:1,padding:"6px 3px",borderRadius:6,border:`1.5px solid ${filters.sex===v?"#2563eb":dk.border}`,background:filters.sex===v?"#eff6ff":dk.input,color:filters.sex===v?"#2563eb":dk.textMuted,fontFamily:"inherit",fontSize:10,fontWeight:600,cursor:"pointer",transition:"all 0.14s"}}>{l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentConfig.filters.includes('age') && (
                    <div>
                      <label style={{...lblS, color: dk.textMuted}}>
                        Tranche d'âge
                        <span style={{fontWeight:400, marginLeft:4}}>(vide = toutes)</span>
                      </label>
                      <div style={{display:"flex", gap:5, flexWrap:"wrap"}}>
                        {AGE_GROUPS.map(ag => {
                          const selected = filters.age === ag;
                          return (
                            <button
                              key={ag}
                              onClick={() => setFilters(f => ({...f, age: selected ? "" : ag}))}
                              style={{
                                padding:"5px 11px",
                                borderRadius:20,
                                border:`1.5px solid ${selected ? "#7c3aed" : dk.border}`,
                                background: selected ? "#f5f3ff" : dk.input,
                                color: selected ? "#7c3aed" : dk.textMuted,
                                fontFamily:"inherit",
                                fontSize:11,
                                fontWeight: selected ? 700 : 500,
                                cursor:"pointer",
                                transition:"all 0.14s",
                                display:"flex",
                                alignItems:"center",
                                gap:4
                              }}
                            >
                              {selected && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                                  stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                              {ag} ans
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {currentConfig.filters.includes('year') && (
                    <div style={{gridColumn: "1 / -1"}}>
                      <label style={lblS}>Période</label>
                      {/* Filtres rapides */}
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                        {getQuickPeriodFilters(YEARS).map((filter, i) => (
                          <button
                            key={i}
                            onClick={() => setFilters(f => ({...f, yearStart: filter.start.toString(), yearEnd: filter.end.toString()}))}
                            style={{
                              padding:"4px 10px",
                              borderRadius:6,
                              border:`1.5px solid ${filters.yearStart === filter.start.toString() && filters.yearEnd === filter.end.toString() ? "#2563eb" : dk.border}`,
                              background: filters.yearStart === filter.start.toString() && filters.yearEnd === filter.end.toString() ? "#eff6ff" : dk.input,
                              color: filters.yearStart === filter.start.toString() && filters.yearEnd === filter.end.toString() ? "#2563eb" : dk.textMuted,
                              fontFamily:"inherit",
                              fontSize:10.5,
                              fontWeight:600,
                              cursor:"pointer",
                              transition:"all 0.14s"
                            }}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                      {/* Sélecteurs d'années */}
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <select 
                          value={filters.yearStart} 
                          onChange={e=>setFilters(f=>({...f,yearStart:e.target.value}))} 
                          style={{...selS, background: dk.input, color: dk.inputText, borderColor: dk.border, flex:1}}
                        >
                          <option value="">{YEARS.length > 0 ? `Année début (${YEARS[0]})` : 'Année début'}</option>
                          {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                        <span style={{color:dk.textMuted,fontSize:12}}>à</span>
                        <select 
                          value={filters.yearEnd} 
                          onChange={e=>{
                            const endYear = e.target.value;
                            if (!filters.yearStart || endYear >= filters.yearStart) {
                              setFilters(f=>({...f,yearEnd:endYear}));
                            }
                          }} 
                          style={{...selS, background: dk.input, color: dk.inputText, borderColor: dk.border, flex:1}}
                          disabled={!filters.yearStart}
                        >
                          <option value="">{YEARS.length > 0 ? `Année fin (${YEARS[YEARS.length-1]})` : 'Année fin'}</option>
                          {YEARS.filter(y=>!filters.yearStart||y>=parseInt(filters.yearStart)).map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      {filters.yearStart && filters.yearEnd && parseInt(filters.yearEnd) < parseInt(filters.yearStart) && (
                        <div style={{color:"#dc2626",fontSize:10,marginTop:3}}>L'année de fin doit être supérieure ou égale à l'année de début</div>
                      )}
                    </div>
                  )}
                  {selAn === 'compare_periods' && (
                    <div style={{gridColumn:"1 / -1"}}>
                      <label style={{...lblS, color: dk.textMuted}}>Période 1</label>
                      <div style={{display:"flex", gap:6, marginBottom:10}}>
                        <select
                          value={filters.period1Start || ''}
                          onChange={e => setFilters(f => ({...f, period1Start: e.target.value}))}
                          style={{...selS, flex:1, background: dk.input, color: dk.inputText}}
                        >
                          <option value="">Début</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <span style={{color:dk.textMuted, alignSelf:"center"}}>→</span>
                        <select
                          value={filters.period1End || ''}
                          onChange={e => setFilters(f => ({...f, period1End: e.target.value}))}
                          style={{...selS, flex:1, background: dk.input, color: dk.inputText}}
                        >
                          <option value="">Fin</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>

                      <label style={{...lblS, color: dk.textMuted}}>Période 2</label>
                      <div style={{display:"flex", gap:6}}>
                        <select
                          value={filters.period2Start || ''}
                          onChange={e => setFilters(f => ({...f, period2Start: e.target.value}))}
                          style={{...selS, flex:1, background: dk.input, color: dk.inputText}}
                        >
                          <option value="">Début</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <span style={{color:dk.textMuted, alignSelf:"center"}}>→</span>
                        <select
                          value={filters.period2End || ''}
                          onChange={e => setFilters(f => ({...f, period2End: e.target.value}))}
                          style={{...selS, flex:1, background: dk.input, color: dk.inputText}}
                        >
                          <option value="">Fin</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>

                      {filters.period1Start && filters.period1End &&
                       filters.period2Start && filters.period2End && (
                        <div style={{
                          marginTop:10, padding:'8px 12px', borderRadius:7,
                          background:'#f0fdf4', border:'1px solid #bbf7d0',
                          fontSize:11, color:'#065f46', fontWeight:600
                        }}>
                          ✓ {filters.period1Start}–{filters.period1End}
                          vs {filters.period2Start}–{filters.period2End}
                        </div>
                      )}
                    </div>
                  )}
                  {currentConfig.filters.includes('daira') && (
                    <div>
                      <label style={{...lblS, color: dk.textMuted}}>Daïra</label>
                      <select value={filters.daira} onChange={e=>setFilters(f=>({...f,daira:e.target.value}))} style={{...selS, background: dk.input, color: dk.inputText, borderColor: dk.border}}><option value="">Toutes les daïras</option>{DAIRAS.map(d=><option key={d} value={d}>{d}</option>)}</select>
                    </div>
                  )}
                  {selAn === 'compare_wilayas' && (
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                      <div>
                        <label style={{...lblS, color: dk.textMuted}}>Wilaya 1</label>
                        <select 
                          value={filters.compareWilaya1 || ''} 
                          onChange={e => setFilters(f=>({...f, compareWilaya1: e.target.value}))} 
                          style={{...selS, background: dk.input, color: dk.inputText, borderColor: dk.border}}
                        >
                          <option value="">Sélectionner wilaya 1</option>
                          {WILAYAS_WITH_DATA.map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{...lblS, color: dk.textMuted}}>Wilaya 2</label>
                        <select 
                          value={filters.compareWilaya2 || ''} 
                          onChange={e => setFilters(f=>({...f, compareWilaya2: e.target.value}))} 
                          style={{...selS, background: dk.input, color: dk.inputText, borderColor: dk.border}}
                        >
                          <option value="">Sélectionner wilaya 2</option>
                          {WILAYAS_WITH_DATA
                            .filter(w => w !== filters.compareWilaya1)
                            .map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Validation */}
                  {selAn === 'compare_periods' && filters.period1Start && filters.period1End && filters.period2Start && filters.period2End && (
                    <div style={{
                      marginTop:12, padding:'10px 14px',
                      background:'#f0fdf4', borderRadius:8,
                      border:'1px solid #bbf7d0', fontSize:11,
                      color:'#065f46', fontWeight:600
                    }}>
                      ✓ Comparaison: <strong>{filters.period1Start}-{filters.period1End}</strong> 
                      vs <strong>{filters.period2Start}-{filters.period2End}</strong>
                    </div>
                  )}

                  {selAn === 'compare_wilayas' && filters.compareWilaya1 && 
                   filters.compareWilaya2 && 
                   filters.compareWilaya1 !== filters.compareWilaya2 && (
                    <div style={{
                      marginTop:12, padding:'10px 14px',
                      background:'#f0fdf4', borderRadius:8,
                      border:'1px solid #bbf7d0', fontSize:11,
                      color:'#065f46', fontWeight:600
                    }}>
                      ✓ Comparaison: <strong>{filters.compareWilaya1}</strong> 
                      vs <strong>{filters.compareWilaya2}</strong>
                    </div>
                  )}

                  {selAn === 'compare_wilayas' && filters.compareWilaya1 && 
                   filters.compareWilaya2 && 
                   filters.compareWilaya1 === filters.compareWilaya2 && (
                    <div style={{
                      marginTop:12, padding:'10px 14px',
                      background:'#fef3c7', borderRadius:8,
                      border:'1px solid #fde68a', fontSize:11,
                      color:'#92400e'
                    }}>
                      ⚠️ Sélectionnez 2 wilayas différentes
                    </div>
                  )}
                </div>
                {currentConfig.filters.includes('cancer') && (
                  <div style={{padding:"0 16px 12px"}}>
                    <label style={{...lblS, color: dk.textMuted}}>Types de cancer <span style={{fontWeight:400,color:dk.textMuted}}>(vide = tous)</span></label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {resolvedCancers.map(c=>{const sel=filters.cancer.includes(c.id); return <button key={c.id} onClick={()=>setFilters(f=>({...f,cancer:toggleArr(f.cancer,c.id)}))} style={{padding:"3px 9px",borderRadius:20,border:`1.5px solid ${sel?c.color:dk.border}`,background:sel?c.color+"18":dk.input,color:sel?c.color:dk.textMuted,fontFamily:"inherit",fontSize:10.5,fontWeight:600,cursor:"pointer",transition:"all 0.13s",display:"flex",alignItems:"center",gap:4}}>{sel&&<span style={{color:c.color}}>{Icon.check}</span>}{c.label}</button>;})}
                    </div>
                  </div>
                )}
                {currentConfig.filters.includes('stade') && (
                  <div style={{padding:"0 16px 14px"}}>
                    <label style={{...lblS, color: dk.textMuted}}>Stade <span style={{fontWeight:400,color:dk.textMuted}}>(vide = tous)</span></label>
                    <div style={{display:"flex",gap:6}}>
                      {STADES.map((st,i)=>{const sel=filters.stade.includes(st); const cols=["#059669","#d97706","#e05c4b","#7f1d1d"]; return <button key={st} onClick={()=>setFilters(f=>({...f,stade:toggleArr(f.stade,st)}))} style={{flex:1,padding:"5px 3px",borderRadius:7,border:`1.5px solid ${sel?cols[i]:dk.border}`,background:sel?cols[i]+"15":dk.input,color:sel?cols[i]:dk.textMuted,fontFamily:"inherit",fontSize:10,fontWeight:600,cursor:"pointer",transition:"all 0.13s"}}>{st}</button>;})}
                    </div>
                  </div>
                )}
                {currentConfig.filters.includes('validated') && (
                  <div style={{padding:"0 16px 14px"}}>
                    <label style={{...lblS, color: dk.textMuted}}>
                      Qualité des données
                    </label>
                    <div style={{display:"flex", gap:6}}>
                      {[
                        ["", "Toutes"],
                        ["validated", "Validées uniquement"],
                        ["pending", "En attente validation"]
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => setFilters(f => ({...f, validated: v}))}
                          style={{
                            flex:1, padding:"5px 6px", borderRadius:6, fontFamily:"inherit",
                            fontSize:10, fontWeight:600, cursor:"pointer",
                            border:`1.5px solid ${filters.validated === v ? "#2563eb" : dk.border}`,
                            background: filters.validated === v ? "#eff6ff" : dk.input,
                            color: filters.validated === v ? "#2563eb" : dk.textMuted,
                            transition:"all 0.14s"
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
            {selAn !== "custom_build" && currentConfig.charts && (
              <div style={{...cardS, background: dk.card, border: `1px solid ${dk.border}`, padding:16, marginTop:12}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <span style={{fontSize:16}}>{Icon.chart}</span>
                  <div style={{fontSize:12,fontWeight:700,color:dk.text}}>Type de graphique</div>
                </div>

                <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
                  {Object.entries(CHART_GROUPS).map(([groupId, group]) => (
                    <button
                      key={groupId}
                      onClick={() => {setSelectedGroup(groupId); setSelChart(group.charts[0]); setAutoChart(false);}}
                      style={{
                        padding:'8px 14px',
                        borderRadius:20,
                        border:'1.5px solid ' + (selectedGroup === groupId ? group.color : dk.border),
                        background:selectedGroup === groupId ? group.color + '15' : dk.input,
                        color:selectedGroup === groupId ? group.color : dk.textMuted,
                        fontFamily:'inherit',
                        fontSize:12,
                        fontWeight:selectedGroup === groupId ? 600 : 500,
                        cursor:'pointer',
                        transition:'all 0.25s ease'
                      }}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>

                <div style={{marginTop:14,display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:10}}>
                  {CHART_GROUPS[selectedGroup].charts.map((chartId) => {
                    const chartObj = CHART_TYPES.find(c => c.id === chartId);
                    const groupColor = CHART_GROUPS[selectedGroup].color;
                    return (
                      <button
                        key={chartId}
                        onClick={() => { setAutoChart(false); setSelChart(chartId); }}
                        style={{
                          width:'100%',
                          height:80,
                          border:'1.5px solid ' + (selChart === chartId ? groupColor : (darkMode ? '#334155' : '#e2e8f0')),
                          borderRadius:10,
                          background:selChart === chartId ? groupColor + '10' : (darkMode ? '#1e293b' : 'white'),
                          display:'flex',
                          flexDirection:'column',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:6,
                          cursor:'pointer',
                          transition:'all 0.25s ease'
                        }}
                        onMouseEnter={(e) => {e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)';}}
                        onMouseLeave={(e) => {e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)';}}
                      >
                        <div style={{fontSize:24}}>{chartObj?.icon || '📊'}</div>
                        <div style={{fontSize:11,fontWeight:selChart === chartId ? 600 : 500,color:darkMode?'#f1f5f9':'#0f172a'}}>{chartObj?.label || chartId}</div>
                        <div style={{fontSize:8,color:darkMode?'#94a3b8':'#64748b'}}>{chartObj?.desc || ''}</div>
                      </button>
                    );
                  })}
                </div>

                {getRecommendedChart(selAn) && (
                  <div style={{marginTop:12,padding:'10px 12px',background:darkMode?'#1e293b':'#f0fdf4',borderRadius:8,border:'1.5px solid ' + (darkMode?'#334155':'#dcfce7'),display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontSize:14}}>💡</span>
                    <div style={{fontSize:10.5,color:darkMode?'#94a3b8':'#166534'}}>
                      Recommandé pour <strong>{analysis?.label || 'cette analyse'}</strong>: {getRecommendedChart(selAn).text}
                    </div>
                  </div>
                )}
              </div>
            )}
            {selAn !== "custom_build" && (
              <div style={{textAlign:"center",marginTop:20}}>
                <button onClick={() => { if (selAn === "custom_build") { buildCustomChart(true); } else { buildData(); } }} disabled={loading || (selAn === "custom_build" && !filters.customAxe) || (selAn === "compare_wilayas" && (!filters.compareWilaya1 || !filters.compareWilaya2 || filters.compareWilaya1 === filters.compareWilaya2))} style={{background:loading || (selAn === "custom_build" && !filters.customAxe) || (selAn === "compare_wilayas" && (!filters.compareWilaya1 || !filters.compareWilaya2 || filters.compareWilaya1 === filters.compareWilaya2))?"#94a3b8":`linear-gradient(135deg,#1d4ed8,#3b82f6)`,color:"white",border:"none",padding:"11px 30px",borderRadius:9,fontFamily:"inherit",fontSize:13.5,fontWeight:700,cursor:loading || (selAn === "custom_build" && !filters.customAxe) || (selAn === "compare_wilayas" && (!filters.compareWilaya1 || !filters.compareWilaya2 || filters.compareWilaya1 === filters.compareWilaya2))?"not-allowed":"pointer",boxShadow:loading || (selAn === "custom_build" && !filters.customAxe) || (selAn === "compare_wilayas" && (!filters.compareWilaya1 || !filters.compareWilaya2 || filters.compareWilaya1 === filters.compareWilaya2))?"none":"0 4px 14px rgba(37,99,235,0.3)",transition:"all 0.2s",display:"inline-flex",alignItems:"center",gap:8}}>
                  {loading?<><div className="sp" style={{width:15,height:15,border:"2px solid white",borderTopColor:"transparent",borderRadius:"50%"}}/> Génération…</>:<>{Icon.stats} Générer — {analysis.label}</>}
                </button>
              </div>
            )}
            {selAn === "custom_build" && (
              <div style={{marginTop:24,display:"grid",gridTemplateColumns:"1fr",gap:14}}>
                <div style={{...cardS, background: dk.card, border: `1px solid ${dk.border}`, padding:16}}>
                  <h3 style={{margin:0,fontSize:14,fontWeight:700,color:dk.text}}>Analyse personnalisée</h3>

                  <div style={{marginTop:12}}>
                    <label style={{...lblS, color: dk.textMuted}}>Titre</label>
                    <input type="text" value={filters.customTitle || ''} onChange={e=>setFilters(f=>({...f,customTitle:e.target.value}))} style={{...selS, background: dk.input, color: dk.inputText, borderColor: dk.border}} placeholder="Titre de l'analyse" />
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:10}}>
                        Axe X — Ce qu'on analyse
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Année, Type de cancer, Wilaya, Sexe..."
                        value={filters.customAxeXLabel||''}
                        onChange={e=>{
                          const val = e.target.value;
                          const v = val.toLowerCase();
                          const axe = v.includes('ann') ? 'year'
                            : v.includes('cancer') || v.includes('type') ? 'cancer'
                            : v.includes('wilaya') ? 'wilaya'
                            : v.includes('sex') || v.includes('genre') ? 'sex'
                            : v.includes('ge') || v.includes('tranche') ? 'age'
                            : v.includes('stade') ? 'stade'
                            : v.includes('mois') ? 'month'
                            : v.includes('da') ? 'daira'
                            : v.includes('trait') ? 'traitement'
                            : 'cancer';
                          setFilters(f=>({...f, customAxeXLabel:val, customAxe:axe}));
                        }}
                        style={{
                          width:'100%', padding:'14px 16px',
                          borderRadius:10, border:`1.5px solid ${dk.border}`,
                          fontSize:13, fontFamily:'inherit', outline:'none',
                          color:dk.inputText, background:dk.input,
                          transition:'border-color 0.2s, background 0.2s'
                        }}
                        onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.background=dk.card}}
                        onBlur={e=>{e.target.style.borderColor=dk.border;e.target.style.background=dk.input}}
                      />
                      {filters.customAxe && filters.customAxeXLabel && (
                        <div style={{marginTop:6,fontSize:10,color:'#2563eb',fontWeight:600}}>
                          ✓ Axe détecté: {
                            filters.customAxe==='year'?'Année':
                            filters.customAxe==='cancer'?'Type de cancer':
                            filters.customAxe==='wilaya'?'Wilaya':
                            filters.customAxe==='sex'?'Sexe':
                            filters.customAxe==='age'?'Tranche d\'âge':
                            filters.customAxe==='stade'?'Stade':
                            filters.customAxe==='month'?'Mois':
                            filters.customAxe==='daira'?'Daïra':
                            filters.customAxe==='traitement'?'Traitement':'—'
                          }
                        </div>
                      )}
                      {filters.customAxeXLabel && !filters.customAxe && (
                        <div style={{marginTop:6,padding:'8px 10px',borderRadius:6,background:'#ecfdf5',border:'1px solid #a7f3d0',fontSize:9.5,color:'#065f46',fontWeight:600}}>
                          💡 Nous n'avons pas reconnu ce champ. Essayez:<br/>
                          <div style={{marginTop:4,display:'flex',gap:4,flexWrap:'wrap'}}>
                            {['année', 'wilaya', 'daira', 'cancer', 'sexe', 'âge', 'stade'].map(field => (
                              <button key={field} onClick={()=>setFilters(f=>({...f, customAxeXLabel: field, customAxe: field === 'année' ? 'year' : field === 'daira' ? 'daira' : field === 'cancer' ? 'cancer' : field === 'sexe' ? 'sex' : field === 'âge' ? 'age' : field === 'stade' ? 'stade' : 'wilaya'}))} 
                                style={{padding:'2px 6px',background:'#059669',color:'white',border:'none',borderRadius:3,fontSize:8.5,fontWeight:700,cursor:'pointer'}}>
                                {field}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:10}}>
                        Axe Y — Ce qu'on mesure
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Nombre de cas, Âge moyen, Pourcentage..."
                        value={filters.customAxeYLabel||''}
                        onChange={e=>{
                          const val = e.target.value;
                          const v = val.toLowerCase();
                          
                          // Intelligent mapping logic
                          const yMappings = {
                            'age': 'avg_age', 'âge': 'avg_age', 'age moyen': 'avg_age',
                            'âge moyen': 'avg_age', 'moyenne age': 'avg_age', 'moy age': 'avg_age',
                            'cas': 'cases', 'nombre': 'cases', 'nombre de cas': 'cases', 'count': 'cases', 'nb': 'cases',
                            'pourcentage': 'percentage', '%': 'percentage', 'pct': 'percentage', 'pour cent': 'percentage',
                            'femme': 'pct_female', 'féminin': 'pct_female', 'female': 'pct_female', '% femme': 'pct_female',
                            'homme': 'pct_male', 'masculin': 'pct_male', 'male': 'pct_male', '% homme': 'pct_male',
                          };
                          
                          let detectedKey = 'cases'; // Default
                          for (const [keyword, key] of Object.entries(yMappings)) {
                            if (v.includes(keyword)) {
                              detectedKey = key;
                              break;
                            }
                          }
                          
                          setFilters(f=>({...f, customAxeYLabel:val, customAxeY:detectedKey}));
                        }}
                        style={{
                          width:'100%', padding:'14px 16px',
                          borderRadius:10, border:`1.5px solid ${dk.border}`,
                          fontSize:13, fontFamily:'inherit', outline:'none',
                          color:dk.inputText, background:dk.input,
                          transition:'border-color 0.2s, background 0.2s'
                        }}
                        onFocus={e=>{e.target.style.borderColor='#2563eb';e.target.style.background=dk.card}}
                        onBlur={e=>{e.target.style.borderColor=dk.border;e.target.style.background=dk.input}}
                      />
                      {filters.customAxeYLabel && (
                        <div style={{marginTop:6,fontSize:10,color:'#2563eb',fontWeight:600}}>
                          ✓ Mesure: {filters.customAxeYLabel}
                        </div>
                      )}
                      <div style={{marginTop:4,fontSize:10,color:'#94a3b8',fontStyle:'italic'}}>
                        L'axe Y est toujours une valeur numérique (nombre, %, moyenne)
                      </div>
                    </div>
                  </div>

                  {/* Validation Panel */}
                  {(filters.customAxeXLabel || filters.customAxeYLabel) && (
                    <div style={{marginBottom:20,padding:'14px 16px',borderRadius:10,border:`1.5px solid ${dk.border}`,background:darkMode?'#1e293b':'#f8fafc'}}>
                      <div style={{fontSize:11,fontWeight:700,color:dk.textMuted,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Validation</div>
                      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          {filters.customAxeXLabel ? 
                            <span style={{color:'#059669',fontSize:16}}>✓</span> : 
                            <span style={{color:'#e05c4b',fontSize:16}}>×</span>
                          }
                          <span style={{fontSize:11,color:filters.customAxeXLabel ? '#059669' : '#e05c4b',fontWeight:600}}>
                            {filters.customAxeXLabel ? 'Axe X valide' : 'Axe X requis'}
                          </span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          {filters.customAxeYLabel ? 
                            <span style={{color:'#059669',fontSize:16}}>✓</span> : 
                            <span style={{color:'#e05c4b',fontSize:16}}>×</span>
                          }
                          <span style={{fontSize:11,color:filters.customAxeYLabel ? '#059669' : '#e05c4b',fontWeight:600}}>
                            {filters.customAxeYLabel ? 'Axe Y valide' : 'Axe Y requis'}
                          </span>
                        </div>
                      </div>
                      {filters.customAxeXLabel && filters.customAxeYLabel && (
                        <div style={{marginTop:10,fontSize:10.5,color:darkMode?'#dcfce7':'#064e3b',background:darkMode?'#1e3a1f':'#ecfdf5',padding:'8px 12px',borderRadius:6,border:darkMode?'1px solid #22863a':'1px solid #a7f3d0'}}>
                          <strong>✓ Configuration valide:</strong> Données groupées par <strong>{
                            filters.customAxe==='year'?'Année':
                            filters.customAxe==='cancer'?'Type de cancer':
                            filters.customAxe==='wilaya'?'Wilaya':
                            filters.customAxe==='sex'?'Sexe':
                            filters.customAxe==='age'?'Tranche d\'âge':
                            filters.customAxe==='stade'?'Stade':
                            filters.customAxe==='month'?'Mois':
                            filters.customAxe==='daira'?'Daïra':
                            filters.customAxe==='traitement'?'Traitement':'—'
                          }</strong> et mesurées par <strong>{
                            filters.customAxeY==='cases'?'nombre de cas':
                            filters.customAxeY==='percentage'?'pourcentage':
                            filters.customAxeY==='pct_female'?'% femmes':
                            filters.customAxeY==='pct_male'?'% hommes':
                            filters.customAxeY==='avg_age'?'âge moyen':
                            filters.customAxeY==='sum_age'?'somme des âges':
                            filters.customAxeY==='pct_stade34'?'% stade III-IV':
                            'valeur'
                          }</strong>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:6}}>
                    {/* Group buttons */}
                    {Object.entries(CHART_GROUPS).map(([groupId, group]) => (
                      <button
                        key={groupId}
                        onClick={() => {setSelectedGroup(groupId); setSelChart(group.charts[0]);}}
                        style={{
                          padding:'8px 14px',
                          borderRadius:20,
                          border:'1.5px solid ' + (selectedGroup === groupId ? group.color : '#e2e8f0'),
                          background:selectedGroup === groupId ? group.color + '15' : (darkMode ? '#1e293b' : 'white'),
                          color:selectedGroup === groupId ? group.color : (darkMode ? '#f1f5f9' : '#1e293b'),
                          fontFamily:'inherit',
                          fontSize:12,
                          fontWeight:selectedGroup === groupId ? 600 : 500,
                          cursor:'pointer',
                          transition:'all 0.25s ease'
                        }}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>

                  {/* Chart cards grid */}
                  <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:10}}>
                    {CHART_GROUPS[selectedGroup].charts.map((chartId) => {
                      const chartObj = CHART_TYPES.find(c => c.id === chartId);
                      const groupColor = CHART_GROUPS[selectedGroup].color;
                      return (
                        <button
                          key={chartId}
                          onClick={() => {
                            setAutoChart(false);
                            setSelChart(chartId);
                          }}
                          style={{
                            width:'100%',
                            height:80,
                            border:'1.5px solid ' + (selChart === chartId ? groupColor : (darkMode ? '#334155' : '#e2e8f0')),
                            borderRadius:10,
                            background:selChart === chartId ? groupColor + '10' : (darkMode ? '#1e293b' : 'white'),
                            display:'flex',
                            flexDirection:'column',
                            alignItems:'center',
                            justifyContent:'center',
                            gap:6,
                            cursor:'pointer',
                            transition:'all 0.25s ease'
                          }}
                          onMouseEnter={(e) => {e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)';}}
                          onMouseLeave={(e) => {e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)';}}
                        >
                          <div style={{fontSize:24}}>{chartObj?.icon || '📊'}</div>
                          <div style={{fontSize:11,fontWeight:selChart === chartId ? 600 : 500,color:darkMode?'#f1f5f9':'#0f172a'}}>{chartObj?.label || chartId}</div>
                          <div style={{fontSize:8,color:darkMode?'#94a3b8':'#64748b'}}>{chartObj?.desc || ''}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Smart recommendation */}
                  {getRecommendedChart() && (
                    <div style={{marginTop:12,padding:'10px 12px',background:darkMode?'#1e293b':'#f0fdf4',borderRadius:8,border:'1.5px solid ' + (darkMode?'#334155':'#dcfce7'),display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{fontSize:14}}>💡</span>
                      <div style={{fontSize:10.5,color:darkMode?'#94a3b8':'#166534'}}>
                        Recommandé pour <strong>{filters.customAxeXLabel}</strong>: {getRecommendedChart().text}
                      </div>
                    </div>
                  )}



                  {axisError && (
                    <div style={{marginTop:16,padding:'12px 16px',background:'#fef2f2',borderRadius:10,border:'1.5px solid #fecaca',display:'flex',gap:10,alignItems:'flex-start'}}>
                      <span style={{color:'#dc2626',fontSize:18,lineHeight:1}}>!</span>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'#991b1b'}}>Erreur de configuration</div>
                        <div style={{fontSize:10.5,color:'#7f1d1d',marginTop:4}}>{axisError}</div>
                      </div>
                    </div>
                  )}

                  <div style={{marginTop:28,padding:'16px 20px',background:'linear-gradient(135deg, #f0f7ff 0%, #e0f2ff 100%)',borderRadius:14,border:'1.5px solid #bfdbfe',boxShadow:'0 2px 8px rgba(37,99,235,0.08)'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#1e40af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Actions d'analyse</div>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
                      {/* Générer */}
                      <button 
                        onClick={()=>buildCustomChart(true)} 
                        disabled={loading || !filters.customAxe} 
                        title="Générer le graphique avec les paramètres sélectionnés"
                        style={{
                          padding:'12px 18px',
                          borderRadius:10,
                          border:'none',
                          background:(loading || !filters.customAxe)?'#cbd5e1':'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                          color:'white',
                          fontFamily:'inherit',
                          fontSize:13,
                          fontWeight:600,
                          cursor:(loading || !filters.customAxe)?'not-allowed':'pointer',
                          display:'inline-flex',
                          alignItems:'center',
                          gap:8,
                          transition:'all 0.25s ease',
                          boxShadow:(loading || !filters.customAxe)?'none':'0 4px 12px rgba(29, 78, 216, 0.3)',
                          opacity:(loading || !filters.customAxe)?0.6:1,
                        }}
                        onMouseEnter={e => {if(!(loading || !filters.customAxe)) {e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 6px 16px rgba(29, 78, 216, 0.4)';}}}
                        onMouseLeave={e => {e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 4px 12px rgba(29, 78, 216, 0.3)';}}
                      >
                        {loading?<><div className="sp" style={{width:13,height:13,border:'2.5px solid white',borderTopColor:'transparent',borderRadius:'50%'}}/> Création…</>:<>{Icon.stats} Générer</>}
                      </button>

                      {/* Sauvegarder */}
                      <button 
                        onClick={()=>{
                          const computedTitle = (filters.customTitle || '').trim();
                          const xLabel = (filters.customAxeXLabel || '').trim();
                          const yLabel = (filters.customAxeYLabel || '').trim();
                          const defaultTitle = xLabel || yLabel ? `${xLabel || 'Axe X'} vs ${yLabel || 'Axe Y'}` : 'Analyse personnalisée';
                          const analysisTitle = computedTitle || defaultTitle;

                          const analysis = {
                            title: analysisTitle,
                            filters: {
                              customTitle: filters.customTitle || '',
                              customAxe: filters.customAxe,
                              customAxeXLabel: filters.customAxeXLabel || '',
                              customAxeY: filters.customAxeY || 'cases',
                              customAxeYLabel: filters.customAxeYLabel || '',
                              sex: filters.sex,
                              yearStart: filters.yearStart,
                              yearEnd: filters.yearEnd,
                            },
                            chartType: selChart,
                            date: new Date().toLocaleDateString('fr-FR'),
                          };

                          const updated = [...savedAnalyses, analysis];
                          setSavedAnalyses(updated);
                          localStorage.setItem('savedAnalyses', JSON.stringify(updated));
                          setAxisError('');
                          alert(`Analyse sauvegardée: ${analysis.title}`);
                        }} 
                        disabled={!filters.customAxe || !filters.customAxeXLabel || !filters.customAxeYLabel}
                        title={!filters.customAxeXLabel || !filters.customAxeYLabel ? "Renseignez Axe X et Axe Y pour sauvegarder" : "Sauvegarder la configuration de l'analyse"}
                        style={{
                          padding:'12px 18px',
                          borderRadius:10,
                          border:'none',
                          background:(!filters.customAxe)?'#cbd5e1':'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                          color:'white',
                          fontFamily:'inherit',
                          fontSize:13,
                          fontWeight:600,
                          cursor:(!filters.customAxe)?'not-allowed':'pointer',
                          display:'inline-flex',
                          alignItems:'center',
                          gap:8,
                          transition:'all 0.25s ease',
                          boxShadow:(!filters.customAxe)?'none':'0 4px 12px rgba(13, 148, 136, 0.3)',
                          opacity:(!filters.customAxe)?0.6:1,
                        }}
                        onMouseEnter={e => {if(!(!filters.customAxe)) {e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 6px 16px rgba(13, 148, 136, 0.4)';}}}
                        onMouseLeave={e => {e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 4px 12px rgba(13, 148, 136, 0.3)';}}
                      >
                        {Icon.save} Sauvegarder
                      </button>

                      {/* Réinitialiser */}
                      <button 
                        onClick={()=>{
                          setFilters(f=>({...f,customTitle:'',customAxe:'',customAxeXLabel:'',customAxeY:'cases',customAxeYLabel:'',sex:'',yearStart:'',yearEnd:''}));
                          setSelChart('bar');
                          setChartData([]);
                          currentChartDataRef.current = [];
                          axeXRef.current = "";
                          setAxisError('');
                        }}
                        title="Réinitialiser tous les paramètres"
                        style={{
                          padding:'12px 18px',
                          borderRadius:10,
                          border:'2px solid #9ca3af',
                          background:'white',
                          color:'#6b7280',
                          fontFamily:'inherit',
                          fontSize:13,
                          fontWeight:600,
                          cursor:'pointer', 
                          display:'inline-flex',
                          alignItems:'center',
                          gap:8,
                          transition:'all 0.25s ease',
                          boxShadow:'0 2px 8px rgba(107, 114, 128, 0.15)',
                        }}
                        onMouseEnter={e => {e.target.style.background='#f9fafb'; e.target.style.boxShadow='0 4px 12px rgba(107, 114, 128, 0.25)'}}
                        onMouseLeave={e => {e.target.style.background='white'; e.target.style.boxShadow='0 2px 8px rgba(107, 114, 128, 0.15)'}}
                      >
                        {Icon.reset} Réinitialiser
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* STEP 4 */}
        {step===4&&(
          <div className="fu">
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:16,fontSize:11.5,color:dk.textMuted}}>
              <span style={{cursor:"pointer",color:"#2563eb",fontWeight:600}} onClick={reset}>Accueil</span>
              <span>{Icon.chevron}</span>
              <span style={{cursor:"pointer",color:"#2563eb",fontWeight:600}} onClick={()=>setStep(2)}>{cat?.label}</span>
              <span>{Icon.chevron}</span>
              <span style={{fontWeight:700,color:dk.text}}>{analysis?.label}</span>
            </div>
            <div id="analysis-export" style={{display: 'contents'}}>
            <div id="chart-container" style={{...cardS, background: dk.card, border: `1px solid ${dk.border}`}}>
              <div style={{padding:"14px 20px",borderBottom:`1.5px solid ${dk.border}`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",background:darkMode?`linear-gradient(to right, ${cat?.color}08, transparent)`:` linear-gradient(to right, ${cat?.color}06, transparent)`}}>
                <div style={{width:36,height:36,borderRadius:9,background:cat?.bg,border:`1.5px solid ${cat?.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:cat?.color}}>{analysis?.icon}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:14.5,color:dk.text}}>{analysis?.label}</div>
                </div>
                <div style={{flex:1}}/>
                {!isKpi&&chartData.length>0&&(
                  <div style={{display:"flex",gap:16}}>
                    {[
                      {label:"Total",val:apiData?.total_cancers || total,color:cat?.color},
                      {label:"Catégories",val:apiData?.wilayas?.length || chartData.length,color:dk.text},
                      {label:"Dominant",val:apiData?.dominant_wilaya || chartData[0]?.label || "—",color:dk.text}
                    ].map((kp,i)=>(
                      <div key={i} style={{textAlign:"center"}}>
                        <div style={{fontSize:15,fontWeight:800,color:kp.color,letterSpacing:"-0.01em"}}>{kp.val}</div>
                        <div style={{fontSize:8.5,color:dk.textMuted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>{kp.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:"flex",gap:6}}>
                  {!isKpi&&chartData.length>0&&<>
                    <button onClick={handleExportCSV} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,border:"1.5px solid #059669",background:"#f0fdf4",color:"#059669",fontFamily:"inherit",fontSize:11,fontWeight:600,cursor:"pointer"}}>{Icon.download} CSV</button>
                    <button onClick={handleExportPDF} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,border:"1.5px solid #2563eb",background:"#f0f9ff",color:"#2563eb",fontFamily:"inherit",fontSize:11,fontWeight:600,cursor:"pointer"}}>{Icon.filePdf} PDF</button>
                    <button onClick={handleExportCompletePDF} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,border:"1.5px solid #7c3aed",background:"#f5f3ff",color:"#7c3aed",fontFamily:"inherit",fontSize:11,fontWeight:600,cursor:"pointer"}} title="Générer un rapport complet de 6 pages en PDF">📑 Rapport Complet</button>
                  </>}
                </div>
              </div>
              
              {/* ALERTS PANEL */}
              {(selAn === "by_year" || selAn === "by_month") && alerts.length > 0 && (
                <div style={{padding:"12px 20px",borderBottom:`1px solid ${dk.border}`,display:"flex",flexDirection:"column",gap:8}}>
                  {alerts.map(alert => (
                    <div 
                      key={alert.id}
                      style={{
                        display:"flex",
                        alignItems:"center",
                        gap:12,
                        padding:"10px 14px",
                        borderRadius:7,
                        background: alert.severity === 'red' ? (darkMode ? '#1e2a2a' : '#fef2f2') :
                                   alert.severity === 'yellow' ? (darkMode ? '#1f2817' : '#fffbeb') :
                                   (darkMode ? '#17251d' : '#f0fdf4'),
                        border: `1px solid ${
                          alert.severity === 'red' ? (darkMode ? '#5f1f1f' : '#fee2e2') :
                          alert.severity === 'yellow' ? (darkMode ? '#3f3f1f' : '#fef3c7') :
                          (darkMode ? '#2d5039' : '#dcfce7')
                        }`,
                        fontSize:13,
                        color: alert.severity === 'red' ? (darkMode ? '#fca5a5' : '#dc2626') :
                               alert.severity === 'yellow' ? (darkMode ? '#fcd34d' : '#d97706') :
                               (darkMode ? '#86efac' : '#059669'),
                      }}
                    >
                      <span style={{fontSize:16}}>{alert.icon}</span>
                      <span style={{flex:1}}>{alert.message}</span>
                      <button 
                        onClick={() => dismissAlert(alert.id)}
                        style={{
                          background:"none",
                          border:"none",
                          cursor:"pointer",
                          fontSize:16,
                          opacity:0.6,
                          padding:0,
                          display:"flex",
                          alignItems:"center",
                          justifyContent:"center"
                        }}
                        title="Fermer cette alerte"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div key={`chart-${selChart}`} style={{padding:"24px 20px",minHeight:300}}>
                {renderChart()}
              </div>

              {selAn==='custom_build' && Array.isArray(chartData) && chartData.length>0 && (() => {
                const tableYKey = findBestYKey(filters.customAxeYLabel) || 'cases';
                return (
                <div style={{marginTop:16,overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead>
                      <tr style={{background:darkMode?'#334155':'#f8fafc',borderBottom:`2px solid ${dk.border}`}}>
                        <th style={{padding:'8px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:dk.textMuted,textTransform:'uppercase'}}>#</th>
                        <th style={{padding:'8px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:dk.textMuted,textTransform:'uppercase'}}>{filters.customAxeXLabel||'Catégorie'}</th>
                        <th style={{padding:'8px 12px',textAlign:'right',fontWeight:700,fontSize:10,color:dk.textMuted,textTransform:'uppercase'}}>{filters.customAxeYLabel||'Valeur'}</th>
                        <th style={{padding:'8px 12px',textAlign:'right',fontWeight:700,fontSize:10,color:dk.textMuted,textTransform:'uppercase'}}>% Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((d,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${dk.border}`}}
                          onMouseEnter={e=>e.currentTarget.style.background=dk.hover}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'7px 12px',color:dk.textMuted,fontWeight:700}}>{i+1}</td>
                          <td style={{padding:'7px 12px',fontWeight:600,color:dk.text}}>{d.label}</td>
                          <td style={{padding:'7px 12px',textAlign:'right',fontWeight:800,color:dk.text}}>{typeof d.value==='number'?tableYKey==='avg_age'?`${d.value} ans`:(d.value ?? 0).toLocaleString('fr-FR'):(d.value ?? 0)}</td>
                          <td style={{padding:'7px 12px',textAlign:'right',color:dk.textMuted}}>{(total > 0 && d.value != null) ? ((d.value/total)*100).toFixed(1)+'%' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              })()}
            </div>

            {/* TABLE */}
            {!isKpi&&Array.isArray(chartData)&&chartData.length>0&&(
              <div style={{...cardS, background: dk.card, border: `1px solid ${dk.border}`, marginTop:13}}>
                <div style={{background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",padding:"16px 20px",borderRadius:"8px 8px 0 0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:"white"}}>{Icon.chart}</span>
                    <span style={{color:"white",fontSize:16,fontWeight:800}}>Données détaillées</span>
                  </div>
                  <div style={{color:"rgba(255,255,255,0.8)",fontSize:11,fontWeight:500,marginTop:2}}>{chartData.length} catégories analysées · {Math.round(total).toLocaleString("fr-FR")} cas enregistrés</div>
                </div>
                <div style={{padding:"20px"}}>
                  {chartData.map((d,i)=>{
                    const isTop3 = i<3;
                    const bgColor = isTop3 ? (darkMode ? "#254117" : "#fef3c7") : dk.input;
                    const borderColor = isTop3 ? (darkMode ? "#059669" : ["#f59e0b","#9ca3af","#92400e"][i]) : dk.border;
                    return (
                      <div key={i} style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"12px 16px", marginBottom:8, borderRadius:8,
                        border:`1px solid ${borderColor}`, background:bgColor, transition:"all 0.2s ease"
                      }}>
                        {/* Rank + Label */}
                        <div style={{display:"flex", alignItems:"center", gap:12, flex:1}}>
                          <div style={{
                            width:28, height:28, borderRadius:"50%", flexShrink:0,
                            background: i===0?"linear-gradient(135deg,#f59e0b,#b45309)"
                                      : i===1?"linear-gradient(135deg,#9ca3af,#4b5563)"
                                      : i===2?"linear-gradient(135deg,#d97706,#78350f)":"#f1f5f9",
                            color:i<3?"white":dk.textMuted,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:11, fontWeight:800,
                            boxShadow:i<3?"0 2px 8px rgba(0,0,0,0.2)":"none"
                          }}>{i+1}</div>
                          <div style={{fontWeight:700, color:dk.text, fontSize:13}}>{d.label}</div>
                        </div>

                        {/* Average Age badge — only show if avgAge exists */}
                        {d.avgAge ? (
                          <div style={{
                            fontSize:12, fontWeight:700, color:"#7c3aed",
                            background:"#f5f3ff", border:"1px solid #ddd6fe",
                            padding:"3px 12px", borderRadius:20, marginRight:16, flexShrink:0
                          }}>
                            {d.avgAge} ans
                          </div>
                        ) : null}

                        {/* Cases + percentage bar */}
                        <div style={{textAlign:"right", flexShrink:0}}>
                          <div style={{fontWeight:700, color:dk.textMuted, fontSize:12, marginBottom:4}}>
                            {(d.cases ?? d.value ?? 0).toLocaleString("fr-FR")} cas
                          </div>
                          <div style={{fontWeight:800, color:"#1d4ed8", fontSize:14}}>
                            {total>0 ? (((d.cases ?? d.value ?? 0)/total)*100).toFixed(1)+"%" : "—"}
                          </div>
                          <div style={{width:80, height:4, background:dk.border, borderRadius:2, overflow:"hidden", marginTop:4}}>
                            <div style={{
                              height:"100%", borderRadius:2,
                              background:"linear-gradient(90deg,#3b82f6,#1d4ed8)",
                              width:`${chartData[0]?.value>0 ? ((d.cases??d.value??0)/chartData[0].value)*100 : 0}%`,
                              transition:"width 0.5s ease"
                            }}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{padding:"12px 20px",borderTop:`1px solid ${dk.border}`,background:darkMode?'#1e293b':'#f9fafb',borderRadius:"0 0 8px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{color:dk.textMuted,fontSize:10,fontWeight:500}}>Source: Registre du Cancer — CHU Tlemcen</span>
                  <span style={{color:dk.text,fontSize:10,fontWeight:600}}>Mis à jour: {new Date().toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            )}
            </div>

            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,marginTop:18}}>
              <button onClick={reset} style={{background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",color:"white",border:"none",padding:"9px 22px",borderRadius:8,fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 12px rgba(37,99,235,0.3)",display:"inline-flex",alignItems:"center",gap:7}}>
                {Icon.plus} Nouvelle statistique
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HISTORY PANEL */}
      {showHistoryPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 320,
          height: '100vh',
          background: colors.pageBg,
          borderLeft: `1px solid ${colors.border}`,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transform: showHistoryPanel ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.border}`,
            background: colors.headerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{margin: 0, fontSize: 14, fontWeight: 700, color: colors.textPrimary}}>
              Historique des analyses
            </h3>
            <button 
              onClick={() => setShowHistoryPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                color: colors.textMuted,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Fermer"
            >
              ✕
            </button>
          </div>

          <div style={{flex: 1, overflowY: 'auto', padding: '16px 20px'}}>
            {analysisHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: colors.textMuted,
                fontSize: 13
              }}>
                Aucune analyse sauvegardée
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                {analysisHistory.map((item, index) => (
                  <div key={item.id} style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.card,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: item.category === 'Statistiques Descriptives' ? '#2563eb' : '#059669'
                      }}/>
                      <span style={{fontSize: 12, fontWeight: 600, color: colors.textPrimary}}>
                        {item.analysis}
                      </span>
                      <span style={{fontSize: 10, color: colors.textMuted, marginLeft: 'auto'}}>
                        {item.date}
                      </span>
                    </div>
                    
                    <div style={{fontSize: 11, color: colors.textMuted}}>
                      {item.result.total} cas • {item.result.dominant}
                    </div>
                    
                    <div style={{display: 'flex', gap: 6}}>
                      <button 
                        onClick={() => loadAnalysis(item)}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid #2563eb',
                          background: '#f0f9ff',
                          color: '#2563eb',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Recharger
                      </button>
                      <button 
                        onClick={() => deleteAnalysis(item.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid #dc2626',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {analysisHistory.length > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${colors.border}`,
              background: colors.headerBg
            }}>
              <button 
                onClick={clearAllHistory}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #dc2626',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}


