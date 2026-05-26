import API_BASE, { API_ROOT } from '../utils/apiConfig';
import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import DuplicateDetectionModal from '../components/DuplicateDetectionModal';

// ── API helper ────────────────────────────────────────────────────────────────
const API = API_BASE;

// Get valid token — refresh if expired using stored credentials
async function getValidToken() {
  const access = localStorage.getItem('access_token');

  // Decode JWT exp to check if still valid
  let isExpired = true;
  try {
    const b64 = access.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const pad = b64 + '==='.slice((b64.length + 3) % 4);
    const payload = JSON.parse(atob(pad));
    isExpired = Date.now() >= (payload.exp * 1000) - 60000; // refresh 60s before expiry
  } catch(_) { isExpired = true; }

  if (!isExpired) return access;

  // Try refresh token first
  const refresh = localStorage.getItem('refresh_token');
  if (refresh) {
    // Find refresh URL by trying login endpoint variations
    const BASE = API_ROOT;
    const REFRESH_URLS = [
      `${BASE}/api/token/refresh/`,
      `${BASE}/api/auth/token/refresh/`,
      `${BASE}/api/accounts/token/refresh/`,
      `${BASE}/auth/token/refresh/`,
      `${BASE}/token/refresh/`,
    ];
    for (const url of REFRESH_URLS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.access) {
            localStorage.setItem('access_token', data.access);
            if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
            return data.access;
          }
        }
      } catch(_) {}
    }
  }

  // Fallback: re-login with stored credentials
  const username = localStorage.getItem('username') || localStorage.getItem('user_email');
  const password = localStorage.getItem('user_password');
  if (username && password) {
    const BASE = API_ROOT;
    const LOGIN_URLS = [
      `${BASE}/api/token/`,
      `${BASE}/api/auth/token/`,
      `${BASE}/api/login/`,
      `${BASE}/api/accounts/login/`,
    ];
    for (const url of LOGIN_URLS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.access) {
            localStorage.setItem('access_token', data.access);
            if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
            return data.access;
          }
        }
      } catch(_) {}
    }
  }

  return access; // last resort — expired token (will get 401)
}

async function apiFetch(path, opts = {}) {
  const token = await getValidToken();
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CanReg5 field mapping
// ─────────────────────────────────────────────────────────────────────────────
// Patient record fields (from CanReg5 export)
const CANREG5_PATIENT_FIELDS = [
  { key: 'surname',        label: 'Nom (Surname)',         type: 'text' },
  { key: 'first_names',    label: 'Prénom (First names)',  type: 'text' },
  { key: 'maiden_name',    label: 'Nom de jeune fille',    type: 'text' },
  { key: 'sex',            label: 'Sexe (Sex)',            type: 'select', options: ['1 (Male)', '2 (Female)'] },
  { key: 'birth_date',     label: 'Date de naissance',     type: 'text', hint: 'YYYYMMDD' },
  { key: 'tribe',          label: 'Tribu / Ethnie',        type: 'text' },
  { key: 'occupation',     label: 'Profession',            type: 'text' },
  { key: 'middle_name',    label: 'Deuxième prénom',       type: 'text' },
  { key: 'date_last_contact', label: 'Dernière date contact', type: 'text' },
  { key: 'status',         label: 'Statut (Status)',       type: 'text' },
  { key: 'age',            label: 'أ‚ge',                   type: 'text' },
  { key: 'address',        label: 'Adresse',               type: 'text' },
];

// Tumour record fields
const CANREG5_TUMOUR_FIELDS = [
  { key: 'topography',     label: 'Topographie (ICD-O)',   type: 'text', hint: 'Ex: C50.9' },
  { key: 'morphology',     label: 'Morphologie',           type: 'text', hint: 'Ex: 8000/3' },
  { key: 'behaviour',      label: 'Comportement',          type: 'select', options: ['0 (Benign)', '1 (Uncertain)', '2 (Carcinoma in situ)', '3 (Malignant)'] },
  { key: 'incidence_date', label: "Date d'incidence",      type: 'text', hint: 'YYYYMMDD' },
  { key: 'basis_diagnosis',label: 'Base du diagnostic',    type: 'text' },
  { key: 'icd10',          label: 'Code ICD-10',           type: 'text' },
  { key: 'iccc_code',      label: 'Code ICCC',             type: 'text' },
  { key: 'hospital',       label: 'Hôpital',               type: 'text' },
  { key: 'path_lab_no',    label: 'N° Labo Patho',         type: 'text' },
  { key: 'unit',           label: 'Unité',                 type: 'text' },
  { key: 'case_no',        label: 'N° de cas',             type: 'text' },
];

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

// ── Strip accents ─────────────────────────────────────────────────────────────
function normKey(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function normStr(s = '') {
  return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

// ── Parse CanReg5 date YYYYMMDD → YYYY-MM-DD ─────────────────────────────────
function parseCanRegDate(raw) {
  if (!raw) return '';
  const s = raw.toString().replace(/\D/g, '');
  if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  return raw;
}

// ── Wilaya code → name (Algeria standard codes from CanReg5 ADDR field) ────────
const WILAYA_CODES = {
  '001':'Adrar','002':'Chlef','003':'Laghouat','004':'Oum El Bouaghi','005':'Batna',
  '006':'Béjaïa','007':'Biskra','008':'Béchar','009':'Blida','010':'Bouira',
  '011':'Tamanrasset','012':'Tébessa','013':'Tlemcen','014':'Tiaret','015':'Tizi Ouzou',
  '016':'Alger','017':'Djelfa','018':'Jijel','019':'Sétif','020':'Saïda',
  '021':'Skikda','022':'Sidi Bel Abbès','023':'Annaba','024':'Guelma','025':'Constantine',
  '026':'Médéa','027':'Mostaganem','028':'MSila','029':'Mascara','030':'Ouargla',
  '031':'Oran','032':'El Bayadh','033':'Illizi','034':'Bordj Bou Arréridj','035':'Boumerdès',
  '036':'El Tarf','037':'Tindouf','038':'Tissemsilt','039':'El Oued','040':'Khenchela',
  '041':'Souk Ahras','042':'Tipaza','043':'Mila','044':'Aïn Defla','045':'Naâma',
  '046':'Aïn Témouchent','047':'Ghardaïa','048':'Relizane',
  // 3-digit without leading zero
  '31':'Oran','16':'Alger','25':'Constantine','13':'Tlemcen','19':'Sétif',
  '23':'Annaba','06':'Béjaïa','05':'Batna','09':'Blida','15':'Tizi Ouzou',
};
function resolveWilaya(code) {
  if (!code) return '';
  const c = code.toString().trim();
  return WILAYA_CODES[c] || WILAYA_CODES[c.padStart(3,'0')] || c;
}

// ── Map CanReg5 row → patient (exact shortNames from real CanReg5 export) ─────
function canRegRowToPatient(row) {
  const normRow = {};
  Object.entries(row).forEach(([k, v]) => { normRow[normKey(k)] = (v || '').toString().trim(); });
  const g = (...keys) => {
    for (const k of keys) { const v = normRow[normKey(k)]; if (v && v !== '0') return v; }
    return '';
  };

  // ── PATIENT fields ────────────────────────────────────────────────────────
  // CanReg5 real export shortNames (from patient_list.csv):
  //   FAMN = Nom de famille (surname)
  //   FIRSTN = Prénom (first name)
  //   MAIDN = Nom de jeune fille
  //   MIDN = Deuxième prénom
  //   SEX = Sexe (1=M, 2=F)
  //   BIRTHD = Date naissance YYYYMMDD
  //   ADDR = Code wilaya (021 = Skikda, etc.)
  //   TRIB = Tribu/Ethnie
  //   OCCU = Profession
  //   DLC = Date dernière contact YYYYMMDD
  //   STAT = Statut vital (1=vivant, 2=décédé)
  //   REGNO = N° registre (PatientID unique)
  //   PERS = N° personnel (interne)
  //   AGE = أ‚ge au diagnostic

  const surname   = g('famn', 'surname', 'sname', 'nom', 'last_name', 'family_name');
  const firstName = g('firstn', 'firstname', 'first_name', 'prenom', 'given_name');
  // nom = "Prénom NOM" pour affichage, mais on garde surname/firstName séparés pour API
  const nom       = [firstName, surname].filter(Boolean).join(' ').trim()
                 || g('patientname', 'fullname', 'full_name');

  const sexRaw = g('sex', 'sexe', 'gender');
  const sex = sexRaw === '2' ? 'F' : sexRaw === '1' ? 'M'
            : sexRaw.toLowerCase().startsWith('f') ? 'F'
            : sexRaw.toLowerCase().startsWith('m') ? 'M' : '';

  // NIN = REGNO (registre number) — unique patient identifier in CanReg5
  const nin    = g('regno', 'patientid', 'patientidtumourtable', 'national_id', 'nin', 'caseno');
  const caseNo = g('tumourid', 'regno', 'caseno');

  // ADDR can be: numeric code "031" OR full address "14 Rue Khemisti, Oran"
  const addrRaw  = g('addr', 'address', 'adresse');
  // If ADDR is a short numeric code → resolve to wilaya name
  // If ADDR is a full address string → extract city (last part after comma) OR use as-is
  let wilaya = '';
  if (/^\d{2,3}$/.test(addrRaw.trim())) {
    wilaya = resolveWilaya(addrRaw);
  } else if (addrRaw.includes(',')) {
    // "14 Rue Khemisti, Oran" → "Oran"
    wilaya = addrRaw.split(',').pop().trim();
  } else {
    wilaya = g('wilaya', 'region') || addrRaw;
  }
  const addrCode = addrRaw;

  // ── TUMOUR fields ─────────────────────────────────────────────────────────
  // CanReg5 real export shortNames:
  //   INCID = Date incidence YYYYMMDD
  //   TOP = Topographie ICD-O (ex: 031 = C31)
  //   MOR = Morphologie (ex: 8000)
  //   BEH = Comportement (0=bénin,1=incertain,2=in situ,3=malin)
  //   BAS = Base diagnostic (0-7)
  //   I10 = Code ICD-10
  //   ICCC = Code ICCC
  //   RECS = N° enregistrement
  //   CHEC = Statut vérification
  //   MPCODE = Code primaires multiples
  //   AGE = أ‚ge au diagnostic

  return {
    nin,
    caseNo,
    nom,
    surname,
    firstName,
    maidenName:      g('maidn', 'maiden_name'),
    middleName:      g('midn', 'middle_name'),
    sex,
    dateNaissance:   parseCanRegDate(g('birthd', 'birthdate', 'birth_date', 'dob')),
    age:             g('age'),
    wilaya,
    addrCode,
    tribe:           g('trib', 'tribe'),
    occupation:      g('occu', 'occupation'),
    dateLastContact: parseCanRegDate(g('dlc', 'datelastcontact', 'date_last_contact')),
    status:          g('stat', 'status', 'statut'),
    // Tumour
    topography:      g('top', 'topography', 'topo'),
    morphology:      g('mor', 'morphology', 'morph'),
    behaviour:       g('beh', 'behaviour', 'behavior'),
    incidenceDate:   parseCanRegDate(g('incid', 'incidencedate', 'incidence_date')),
    basisDiagnosis:  g('bas', 'basisdiagnosis', 'basis_diagnosis'),
    icd10:           g('i10', 'icd10', 'icd_10'),
    icccCode:        g('iccc', 'iccc_code'),
    mpCode:          g('mpcode'),
    mpSeq:           g('mpseq'),
    mpTot:           g('mptot'),
    tumourId:        g('tumourid'),
    patientRecordId: g('patientrecordid', 'patientrecordidtumourtable'),
    _raw:            row,
  };
}

// ── Fuzzy similarity ──────────────────────────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}
function strSim(a, b) {
  if (!a || !b) return 0;
  const na = normStr(a), nb = normStr(b);
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 100 : Math.round((1 - levenshtein(na, nb) / maxLen) * 100);
}

// ── Normalize API patient → modal format ─────────────────────────────────────
function normalizeApiPatient(p) {
  const cd = v => (!v || v === '—' || v === '-') ? '' : v;
  const rawCancers = Array.isArray(p.cancers) ? p.cancers : [];
  const cancers = rawCancers.length > 0
    ? rawCancers.map(c => {
        if (typeof c === 'string') return c;
               

        const name  = cd(c.cancer_type_name || c.organe || c.sous_type || c.name || '');
        const stade = cd(c.stade_clinique || c.stade_pathologique || '');
        return name ? (stade ? `${name} (Stade ${stade})` : name) : (stade ? `Cancer Stade ${stade}` : null);
      }).filter(Boolean)
    : (() => {
        const dc = p.dernier_cancer;
        if (!dc) return [];
        const name = cd(dc.organe || '');
        const stade = cd(dc.stade || '');
        return name || stade ? [name ? (stade ? `${name} (Stade ${stade})` : name) : `Cancer Stade ${stade}`] : [];
      })();
  const traitements = rawCancers.flatMap(c =>
    typeof c === 'object' ? (c.treatments || []).map(t => cd(t.type_traitement || t.protocole || '')) : []
  ).filter(Boolean);
  return {
    id: p.id,
    nin: p.national_id || '',
    nom: p.last_name ? `${p.first_name || ''} ${p.last_name}`.trim() : (p.full_name || ''),
    dateNaissance: p.date_naissance || '',
    telephone: p.phone || '',
    wilaya: cd(p.wilaya_name || ''),
    commune: cd(p.commune_name || ''),
    medecin: p.medecin_nom || '',
    cancers,
    traitements,
    age: p.age || '',
    cree: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '',
  };
}

function rowToModalCandidate(row) {
  const cancers = [];
  if (row.topography) {
    const label = row.behaviour ? `${row.topography} (${row.behaviour})` : row.topography;
    cancers.push(label);
  }
  return {
    nin: row.nin || row.caseNo,
    nom: row.nom,
    dateNaissance: row.dateNaissance,
    telephone: row.telephone,
    wilaya: row.wilaya,
    commune: '',
    medecin: '',
    cancers,
    traitements: [],
    age: row.age || '',
    cree: '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
// ── Store credentials when component loads (for token re-login) ───────────────
// Call this from your Login component after successful login:
// localStorage.setItem('username', username);
// localStorage.setItem('user_password', password);

export default function ImportData() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [tab,            setTab]            = useState('file');     // 'file' | 'manual'
  const [phase,          setPhase]          = useState('idle');
  const [progress,       setProgress]       = useState(0);
  const [parsedRows,     setParsedRows]      = useState([]);
  const [importStats,    setImportStats]     = useState(null);
  const [duplicates,     setDuplicates]      = useState([]);
  const [modalData,      setModalData]       = useState(null);
  const [errorMsg,       setErrorMsg]        = useState('');

  // Manual entry state
  const [manualPatient,  setManualPatient]   = useState({});
  const [manualTumour,   setManualTumour]    = useState({});
  const [manualLoading,  setManualLoading]   = useState(false);
  const [manualResult,   setManualResult]    = useState(null); // {type: 'success'|'duplicate'|'error', msg, dup}
  const [importing,      setImporting]       = useState(false);
  const [importResult,   setImportResult]    = useState(null); // {ok, errors}

  const allResolved = duplicates.length === 0 || duplicates.every(d => d.resolved);

  // ── File processing ──────────────────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx'].includes(ext)) { setErrorMsg('Format non supporté. Utilisez .csv ou .xlsx'); return; }
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('Fichier trop grand (max 10MB)'); return; }

    setPhase('uploading'); setProgress(0); setErrorMsg(''); setDuplicates([]); setImportStats(null);

    try {
      let rows = [];
      if (ext === 'csv') {
        const text = await file.text();
        rows = parseCSV(text).map(canRegRowToPatient);
      } else {
        const buf = await file.arrayBuffer();
        const wb  = XLSX.read(buf, { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];

        // Read all rows raw to find the real header row
        const rawAll = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Real CanReg5 export shortNames + common aliases
        const KNOWN_KEYS = [
          // Real CanReg5 shortNames (from actual export)
          'famn','firstn','maidn','midn','sex','birthd','addr','trib','occu','dlc','stat',
          'regno','pers','age','recs','chec','incid','top','mor','beh','bas','i10','iccc',
          'mpcode','mpseq','mptot','tumourid','patientidtumourtable','patientrecordid',
          'tumourupdatedby','obsoleteflagtumourtable','obsoleteflagpatienttable',
          // Common aliases
          'surname','sname','firstname','first_name','patientid','patient_id',
          'birthdate','birth_date','sexe','topography','morphology','incidencedate',
          'icd10','hospital','nin','national_id','nom','prenom','phone','telephone',
        ];

        // Find which row is the real header row (contains >=2 known keys)
        let headerRowIdx = -1;
        for (let ri = 0; ri < Math.min(5, rawAll.length); ri++) {
          const rowVals = rawAll[ri].map(v => String(v).toLowerCase().trim());
          const matches = rowVals.filter(v => KNOWN_KEYS.includes(v)).length;
          if (matches >= 2) { headerRowIdx = ri; break; }
        }

        let arr;
        if (headerRowIdx >= 0) {
          // Use that row as headers, data starts after
          const hdrs = rawAll[headerRowIdx].map(v => String(v).trim());
          arr = rawAll
            .slice(headerRowIdx + 1)
            .filter(rowArr => rowArr.some(v => v !== '' && v !== null && v !== 0))
            .map(rowArr => Object.fromEntries(hdrs.map((h, i) => [h, String(rowArr[i] || '')])));
        } else {
          // No headers — positional mapping (CanReg5 standard column order)
          const POSITIONAL_KEYS = [
            'surname','firstname','sex','birthdate','address','phone',
            'patientid','tumourid','incidencedate','topography','morphology',
            'behaviour','icd10','basisdiagnosis','stage','hospital','casenumber'
          ];
          arr = rawAll
            .filter(rowArr => rowArr.some(v => v !== '' && v !== null && v !== 0))
            .map(rowArr => Object.fromEntries(
              rowArr.map((val, i) => [POSITIONAL_KEYS[i] || ('col' + i), String(val)])
            ));
        }

        rows = arr.map(r => canRegRowToPatient(
          Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase().trim(), String(v)]))
        ));
      }

      if (rows.length === 0) {
        setPhase('done'); setImportStats({ total: 0, imported: 0, duplicatesFound: 0, errors: 0 });
        setParsedRows([]); setProgress(100); return;
      }
      setParsedRows(rows);

      const token = localStorage.getItem('access_token');
      const foundDuplicates = [];
      let errors = 0;
      const seenNINs  = new Map();
      const seenNames = new Map();

      for (let i = 0; i < rows.length; i++) {
        setProgress(Math.round(((i + 1) / rows.length) * 85));
        const row = rows[i];
        if (!row.nom && !row.nin && !row.caseNo) continue;

        try {
          const rowNomNorm = normStr(row.nom || '');
          const rowNin = row.nin || row.caseNo || '';

          // Skip rows that look like header/description rows (not real patients)
          const HEADER_VALUES = ['surname','patientid','firstname','birthdate','sex','topography',
            'nom de famille','id patient','prenom','sexe','famn','firstn','regno','incid',
            'recs','chec','tumourid','patientrecordid','nom complet','prénom','date naissance'];
          const looksLikeHeader = [row.nom, row.nin, row.caseNo, row.surname, row.firstName].some(v =>
            v && HEADER_VALUES.includes((v||'').toLowerCase().trim())
          );
          if (looksLikeHeader) continue;

          // Skip rows with no useful patient data
          if (!row.nom && !row.nin && !row.caseNo && !row.surname) continue;

          // Intra-file dedup
          if (rowNin && seenNINs.has(rowNin)) {
            foundDuplicates.push({ id: `dup-intra-${i}`, rowIndex: i, row, existing: rowToModalCandidate(rows[seenNINs.get(rowNin)]), score: 100, reason: `Doublon interne (ligne ${seenNINs.get(rowNin) + 2})`, isIntra: true });
            continue;
          }
          if (rowNomNorm && seenNames.has(rowNomNorm)) {
            foundDuplicates.push({ id: `dup-intra-${i}`, rowIndex: i, row, existing: rowToModalCandidate(rows[seenNames.get(rowNomNorm)]), score: 98, reason: `Doublon interne — nom identique (ligne ${seenNames.get(rowNomNorm) + 2})`, isIntra: true });
            continue;
          }
          if (rowNin) seenNINs.set(rowNin, i);
          if (rowNomNorm) seenNames.set(rowNomNorm, i);

          // NIN search — only flag if NIN matches exactly
          if (rowNin) {
            const res = await apiFetch(`/patients/?national_id=${encodeURIComponent(rowNin)}`);
            if (res.ok) {
              const data = await res.json();
              const list = data.results || (Array.isArray(data) ? data : []);
              // Verify NIN matches exactly (API might return partial matches)
              const existing = list.find(p =>
                p.national_id && p.national_id.toLowerCase().trim() === rowNin.toLowerCase().trim()
              );
              if (existing) {
                let full = existing;
                try { const d = await apiFetch(`/patients/${existing.id}/`); if (d.ok) full = await d.json(); } catch(_) {}
                foundDuplicates.push({ id: `dup-${i}`, rowIndex: i, row, existing: normalizeApiPatient(full), score: 100, reason: 'NIN / N° de cas identique' });
                continue;
              }
            }
          }

          // Name fuzzy search
          if (row.nom) {
            const res = await apiFetch(`/patients/?search=${encodeURIComponent(row.nom)}`);
            if (res.ok) {
              const data = await res.json();
              const list = data.results || data || [];
              let bestScore = 0, bestRaw = null;
              list.forEach(p => {
                const pNom = p.last_name ? `${p.first_name || ''} ${p.last_name}`.trim() : '';
                const score = strSim(row.nom, pNom);
                if (score > bestScore) { bestScore = score; bestRaw = p; }
              });
              if (bestScore >= 70 && bestRaw) {
                let full = bestRaw;
                try { const d = await apiFetch(`/patients/${bestRaw.id}/`); if (d.ok) full = await d.json(); } catch(_) {}
                foundDuplicates.push({ id: `dup-${i}`, rowIndex: i, row, existing: normalizeApiPatient(full), score: bestScore, reason: `Similarité nom ${bestScore}%` });
                continue;
              }
            }
          }
        } catch(e) { errors++; }
      }

      setProgress(100);
      setDuplicates(foundDuplicates);
      const validRows = rows.filter(r => r.nom || r.nin || r.caseNo).length;
      setImportStats({ total: rows.length, imported: Math.max(0, validRows - foundDuplicates.length - errors), duplicatesFound: foundDuplicates.length, errors });
      setPhase('done');
    } catch(e) {
      setErrorMsg('Erreur lors du parsing: ' + e.message);
      setPhase('error');
    }
  }, []);

  const handleFileChange = e => { if (e.target.files[0]) processFile(e.target.files[0]); };
  const handleDrop = e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };

  // ── Validate and import all non-duplicate rows ────────────────────────────────
  const handleValidateImport = async () => {
    if (!allResolved) return;
    setImporting(true);
    setImportResult(null);
    const token = await getValidToken();
    // Skip resolved duplicates (merged or ignored) — their rowIndexes excluded
    const resolvedRowIndexes = new Set(duplicates.map(d => d.rowIndex));
    const rowsToImport = parsedRows.filter((_, i) =>
      !resolvedRowIndexes.has(i) && (parsedRows[i].nom || parsedRows[i].nin)
    );

    // Group rows by REGNO — same patient can have multiple tumour rows in CanReg5
    const patientGroups = new Map();
    for (const row of rowsToImport) {
      const key = row.nin || row.nom || Math.random().toString();
      if (!patientGroups.has(key)) patientGroups.set(key, []);
      patientGroups.get(key).push(row);
    }

    let ok = 0, skipped = 0, errors = [];

    for (const [key, rows] of patientGroups) {
      const mainRow = rows[0];
      try {
        const nameParts = (mainRow.nom || '').trim().split(' ');
        const first_name = nameParts[0] || '';
        const last_name  = nameParts.slice(1).join(' ') || '';

        // Validate required fields before POST — backend requires these
        if (!first_name && !last_name) { errors.push(`${mainRow.nin || '?'}: nom manquant`); continue; }

        // date_naissance required — estimate from AGE if BIRTHD missing
        let dateNaissance = mainRow.dateNaissance || null;
        if (!dateNaissance && mainRow.age) {
          const estimatedYear = new Date().getFullYear() - parseInt(mainRow.age);
          dateNaissance = `${estimatedYear}-01-01`;
        }
        if (!dateNaissance) { errors.push(`${mainRow.nom || mainRow.nin}: date naissance manquante`); continue; }

        // sexe must be 'M' or 'F' exactly
        const sexe = mainRow.sex === 'F' ? 'F' : mainRow.sex === 'M' ? 'M' : 'M'; // default M

        const patientPayload = {
          first_name:     first_name || last_name,   // fallback si prénom vide
          last_name:      last_name  || first_name,  // fallback si nom vide
          date_naissance: dateNaissance,
          sexe,
          national_id:    mainRow.nin || mainRow.caseNo || null,
          phone:          mainRow.telephone || '',
          data_source:    'import',
        };

        const freshToken = await getValidToken();
        const patRes = await fetch(`${API}/patients/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
          body: JSON.stringify(patientPayload),
        });

        if (!patRes.ok) {
          const contentType = patRes.headers.get('content-type') || '';
          let errMsg = '';
          if (contentType.includes('json')) {
            const err = await patRes.json().catch(() => ({}));
            const errStr = JSON.stringify(err).toLowerCase();
            // NIN already exists → skip silently
            if (errStr.includes('national_id') || errStr.includes('existe') || errStr.includes('exist') || errStr.includes('unique')) {
              skipped++; continue;
            }
            // Token expired → flag for reconnect (no point continuing)
            if (patRes.status === 401 || errStr.includes('token') || errStr.includes('expired') || errStr.includes('jeton')) {
              const retryToken = await getValidToken();
              const retryRes = await fetch(`${API}/patients/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${retryToken}` },
                body: JSON.stringify(patientPayload),
              });
              if (retryRes.ok) {
                const retryPatient = await retryRes.json();
                for (const row of rows) {
                  if (!row.topography && !row.icd10 && !row.incidenceDate) continue;
                  await fetch(`${API}/patients/${retryPatient.id}/cancers/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${retryToken}` },
                    body: JSON.stringify({ stade_clinique: row.stage||'', date_diagnostic: row.incidenceDate||null, icd10_code: row.icd10||'' }),
                  }).catch(()=>{});
                }
                ok++; continue;
              }
              const retryErr = await retryRes.json().catch(()=>({}));
              errMsg = JSON.stringify(retryErr);
            } else {
              errMsg = JSON.stringify(err);
            }
          } else {
            errMsg = `HTTP ${patRes.status}`;
          }
          errors.push(`${mainRow.nom || mainRow.nin}: ${errMsg}`);
          continue;
        }

        const patient = await patRes.json();

        // Create one cancer per tumour row
        for (const row of rows) {
          if (!row.topography && !row.icd10 && !row.incidenceDate) continue;
          await fetch(`${API}/patients/${patient.id}/cancers/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
            body: JSON.stringify({
              stade_clinique:  row.stage || '',
              date_diagnostic: row.incidenceDate || null,
              icd10_code:      row.icd10 || '',
            }),
          }).catch(() => {});
        }

        ok++;
      } catch(e) {
        errors.push(`${mainRow.nom || mainRow.nin}: ${e.message}`);
      }
    }

    // Add skipped count to result
    if (skipped > 0) ok += skipped;

    const tokenExpired = errors.length > 0 && errors.some(e =>
      e.toLowerCase().includes('token') || e.toLowerCase().includes('expired') || e.toLowerCase().includes('jeton')
    );
    setImportResult({ ok, errors: tokenExpired ? [] : errors, skipped, tokenExpired });
    setImporting(false);
  };

  // ── Manual CanReg5 entry check ───────────────────────────────────────────────
  const handleManualCheck = async () => {
    setManualLoading(true); setManualResult(null);
    const row = canRegRowToPatient({ ...manualPatient, ...manualTumour });
    const nin = row.nin || row.caseNo || '';
    const token = localStorage.getItem('access_token');

    try {
      // NIN check
      if (nin) {
        const res = await apiFetch(`/patients/?national_id=${encodeURIComponent(nin)}`);
        if (res.ok) {
          const data = await res.json();
          const existing = (data.results || data)?.[0];
          if (existing) {
            let full = existing;
            try { const d = await apiFetch(`/patients/${existing.id}/`); if (d.ok) full = await d.json(); } catch(_) {}
            setManualResult({ type: 'duplicate', reason: 'NIN / N° de cas identique (100%)', existing: normalizeApiPatient(full), candidate: rowToModalCandidate(row) });
            setManualLoading(false); return;
          }
        }
      }
      // Fuzzy name check
      if (row.nom) {
        const res = await apiFetch(`/patients/?search=${encodeURIComponent(row.nom)}`);
        if (res.ok) {
          const data = await res.json();
          const list = data.results || data || [];
          let bestScore = 0, bestRaw = null;
          list.forEach(p => {
            const pNom = p.last_name ? `${p.first_name || ''} ${p.last_name}`.trim() : '';
            const score = strSim(row.nom, pNom);
            if (score > bestScore) { bestScore = score; bestRaw = p; }
          });
          if (bestScore >= 70 && bestRaw) {
            let full = bestRaw;
            try { const d = await apiFetch(`/patients/${bestRaw.id}/`); if (d.ok) full = await d.json(); } catch(_) {}
            setManualResult({ type: 'duplicate', reason: `Similarité nom ${bestScore}%`, existing: normalizeApiPatient(full), candidate: rowToModalCandidate(row) });
            setManualLoading(false); return;
          }
        }
      }
      setManualResult({ type: 'ok', msg: 'Aucun doublon détecté — patient peut être créé' });
    } catch(e) {
      setManualResult({ type: 'error', msg: 'Erreur: ' + e.message });
    }
    setManualLoading(false);
  };

  const openModal = d => setModalData(d);
  const closeModal = () => setModalData(null);
  const handleModalConfirm = async (fusionData, note, existingId, action) => {
    const savedModal = modalData;
    closeModal();

    if (action === 'garder') {
      setDuplicates(prev => prev.map(d => d.id === savedModal?.id ? { ...d, resolved: 'garder' } : d));
      return;
    }

    // ── FUSION: PATCH existing patient + add cancers from import row ──────────
    if (existingId) {
      try {
        const token = localStorage.getItem('access_token');

        // Convert date DD/MM/YYYY → YYYY-MM-DD if needed
        const toISO = (s) => {
          if (!s) return null;
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
          const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : s;
        };

        const nameParts = (fusionData.nom || '').trim().split(' ');
        const patchPayload = {
          first_name:     nameParts[0] || '',
          last_name:      nameParts.slice(1).join(' ') || '',
          date_naissance: toISO(fusionData.dateNaissance),
          phone:          fusionData.telephone || '',
        };

        // PATCH the existing patient
        const patchRes = await fetch(`${API}/patients/${existingId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(patchPayload),
        });

        if (patchRes.ok) {
          // Add cancer from import row if exists
          const importRow = parsedRows[savedModal?.rowIndex];
          if (importRow?.topography) {
            await fetch(`${API}/patients/${existingId}/cancers/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                stade_clinique:  importRow.stage || '',
                date_diagnostic: importRow.incidenceDate || null,
                icd10_code:      importRow.icd10 || '',
              }),
            }).catch(() => {});
          }
          setDuplicates(prev => prev.map(d => d.id === savedModal?.id ? { ...d, resolved: 'merged' } : d));
        } else {
          const err = await patchRes.json().catch(() => ({}));
          console.error('[IMPORT FUSION] PATCH failed:', err);
          setDuplicates(prev => prev.map(d => d.id === savedModal?.id ? { ...d, resolved: 'error' } : d));
        }
      } catch(e) {
        console.error('[IMPORT FUSION] error:', e);
        setDuplicates(prev => prev.map(d => d.id === savedModal?.id ? { ...d, resolved: 'error' } : d));
      }
    } else {
      setDuplicates(prev => prev.map(d => d.id === savedModal?.id ? { ...d, resolved: 'merged' } : d));
    }
  };


  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logoSection}>
          <div style={s.logo}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
          <span style={s.logoText}>MedDossier</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={s.backBtn}>← Tableau de bord</button>
      </div>

      <div style={s.container}>
        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#2d3748', margin: 0 }}>Import CanReg5</h1>
          <p style={{ color: '#718096', marginTop: 6, fontSize: 14 }}>Importez des données depuis CanReg5 — détection automatique de doublons</p>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={{ ...s.tabBtn, ...(tab === 'file' ? s.tabActive : {}) }} onClick={() => setTab('file')}>
            📁 Fichier CSV / Excel
          </button>
          <button style={{ ...s.tabBtn, ...(tab === 'manual' ? s.tabActive : {}) }} onClick={() => setTab('manual')}>
            ✏️ Saisie manuelle
          </button>
        </div>

        {/* ── TAB: FILE IMPORT ── */}
        {tab === 'file' && (
          <>
            <div style={s.uploadCard}>
              <div
                style={s.uploadArea}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div style={s.uploadIconWrap}>
                  <svg style={s.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                  </svg>
                </div>
                <div style={s.uploadTitle}>Glisser fichier CanReg5</div>
                <div style={s.uploadSubtitle}>CSV / Excel exporté depuis CanReg5</div>
                <div style={s.uploadInfo}>Formats acceptés : .csv, .xlsx — Max 10MB</div>
                <button style={s.browseBtn} onClick={() => fileInputRef.current?.click()}>
                  Parcourir › <input ref={fileInputRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={handleFileChange} />
                </button>
                {errorMsg && <div style={s.errorMsg}>⚠ {errorMsg}</div>}
              </div>

              {/* Field reference */}
              <div style={s.fieldRefWrap}>
                <div style={s.fieldRefTitle}>📋 Champs CanReg5 reconnus</div>
                <div style={s.fieldRefGrid}>
                  <div>
                    <div style={s.fieldRefSection}>Patient</div>
                    {CANREG5_PATIENT_FIELDS.map(f => (
                      <div key={f.key} style={s.fieldRefRow}>
                        <code style={s.fieldCode}>{f.key}</code>
                        <span style={s.fieldLabel}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={s.fieldRefSection}>Tumeur</div>
                    {CANREG5_TUMOUR_FIELDS.map(f => (
                      <div key={f.key} style={s.fieldRefRow}>
                        <code style={s.fieldCode}>{f.key}</code>
                        <span style={s.fieldLabel}>{f.label}{f.hint && <span style={{ color: '#a0aec0' }}> ({f.hint})</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            {phase === 'uploading' && (
              <div style={s.duplicatesCard}>
                <div style={{ fontWeight: 600, color: '#4a5568', marginBottom: 10 }}>Analyse en cours…</div>
                <div style={s.progressTrack}><div style={{ ...s.progressBar, width: `${progress}%` }} /></div>
                <div style={{ fontSize: 13, color: '#718096', marginTop: 8 }}>{progress}% — vérification des doublons</div>
              </div>
            )}

            {/* Stats */}
            {phase === 'done' && importStats && (
              <div style={{ ...s.duplicatesCard, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={s.statChip('#48bb78')}>{importStats.total} lignes lues</span>
                <span style={s.statChip('#4A90E2')}>{importStats.imported} sans doublon</span>
                <span style={s.statChip(importStats.duplicatesFound > 0 ? '#E53E3E' : '#48bb78')}>{importStats.duplicatesFound} doublon(s)</span>
                {importStats.errors > 0 && <span style={s.statChip('#f59e0b')}>{importStats.errors} erreur(s)</span>}
              </div>
            )}

            {/* Duplicates table */}
            {phase === 'done' && duplicates.length > 0 && (
              <div style={s.duplicatesCard}>
                <div style={s.duplicatesHeader}>
                  <div style={s.warningIcon}>!</div>
                  <div style={s.duplicatesTitle}>Doublons détectés <span style={{ color: '#718096' }}>({duplicates.length})</span></div>
                </div>
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Patient (fichier)</th>
                      <th style={s.th}>Correspondance DB</th>
                      <th style={s.th}>Similarité</th>
                      <th style={s.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.map(d => {
                      const initials = (d.row.nom || '??').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                      const resolved = d.resolved;
                      return (
                        <tr key={d.id} style={{ opacity: resolved ? 0.55 : 1 }}>
                          <td style={s.td}>
                            <div style={s.patientCell}>
                              <div style={{ ...s.patientAvatar, background: resolved ? '#a0aec0' : 'linear-gradient(135deg,#4A90E2,#5CA0F2)' }}>{initials}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#2d3748' }}>{d.row.nom || '—'}</div>
                                {(d.row.nin || d.row.caseNo) && <div style={{ fontSize: 11, color: '#718096' }}>N°: {d.row.nin || d.row.caseNo}</div>}
                                {d.row.topography && <div style={{ fontSize: 11, color: '#a0aec0' }}>Topo: {d.row.topography}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={s.td}>
                            <div style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>{d.existing.nom}</div>
                            <div style={{ fontSize: 11, color: '#a0aec0' }}>Base #{d.existing.id}</div>
                          </td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ width: `${d.score}%`, height: '100%', background: d.score >= 90 ? '#48bb78' : d.score >= 70 ? '#f59e0b' : '#ef4444', borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: d.score >= 90 ? '#48bb78' : '#f59e0b', minWidth: 34 }}>{d.score}%</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 3 }}>{d.reason}</div>
                          </td>
                          <td style={s.td}>
                            {resolved ? (
                              <span style={{ fontSize: 12, color: '#48bb78', fontWeight: 700 }}>{resolved === 'merged' ? '✓ Fusionné' : '✓ Gardé'}</span>
                            ) : (
                              <div style={s.actionBtns}>
                                <button style={{ ...s.btn, ...s.btnMerge }} onClick={() => openModal(d)}>⇐ Fusionner</button>
                                <button style={{ ...s.btn, ...s.btnIgnore }} onClick={() => setDuplicates(prev => prev.map(dd => dd.id === d.id ? { ...dd, resolved: 'garder' } : dd))}>Ignorer</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {phase === 'done' && duplicates.length === 0 && importStats && (
              <div style={{ ...s.duplicatesCard, textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#2d3748' }}>Aucun doublon détecté</div>
                <div style={{ fontSize: 14, color: '#718096', marginTop: 6 }}>{importStats.total} patient(s) prêts à être importés</div>
              </div>
            )}

            {importResult && (
              <div style={{ ...s.duplicatesCard, background: importResult.errors.length === 0 ? '#F0FFF4' : '#FFFAF0', border: `1px solid ${importResult.errors.length === 0 ? '#68d391' : '#f6ad55'}` }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: importResult.errors.length === 0 ? '#276749' : '#c05621', marginBottom: 8 }}>
                  {importResult.errors.length === 0
                    ? `✅ Import terminé — ${importResult.ok} patient(s) traité(s) avec succès`
                    : importResult.tokenExpired
                      ? `🔐 Session expirée — reconnectez-vous puis relancez l'import`
                      : `⚠ Import partiel — ${importResult.ok} ok, ${importResult.errors.length} erreur(s) réelle(s)`}
                </div>
                {importResult.tokenExpired ? (
                  <button style={{ ...s.btnValidate, marginTop: 12, padding: '8px 20px', fontSize: 13, background: 'linear-gradient(135deg,#E53E3E,#C53030)' }}
                    onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); window.location.href = '/'; }}>
                    🔐 Se reconnecter
                  </button>
                ) : importResult.errors.length > 0 && (
                  <ul style={{ fontSize: 12, color: '#744210', marginTop: 6, paddingLeft: 18 }}>
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                {importResult.ok > 0 && (
                  <button style={{ ...s.btnValidate, marginTop: 12, padding: '8px 20px', fontSize: 13 }}
                    onClick={() => window.location.href = '/dashboard'}>
                    → Voir mes patients
                  </button>
                )}
              </div>
            )}

            {phase === 'done' && (
              <div style={{ ...s.duplicatesCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, background: '#C6F6D5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#48bb78', fontWeight: 'bold' }}>✓</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#2d3748' }}>Prêt à valider</div>
                    {!allResolved && <div style={{ fontSize: 12, color: '#f59e0b' }}>Résolvez d'abord tous les doublons</div>}
                  </div>
                </div>
                <button
                  style={{ ...s.btnValidate, opacity: (allResolved && !importing) ? 1 : 0.5, cursor: (allResolved && !importing) ? 'pointer' : 'not-allowed' }}
                  onClick={handleValidateImport}
                  disabled={!allResolved || importing}
                >
                  {importing ? '⏳ Import en cours…' : '✓ Valider Import'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── TAB: MANUAL ENTRY ── */}
        {tab === 'manual' && (
          <div style={s.duplicatesCard}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#2d3748', marginBottom: 20 }}>
              Saisie manuelle — Fiche CanReg5
            </div>

            {/* Patient section */}
            <div style={s.formSection}>
              <div style={s.formSectionTitle}>👤 Patient</div>
              <div style={s.formGrid}>
                {CANREG5_PATIENT_FIELDS.map(f => (
                  <div key={f.key} style={s.formField}>
                    <label style={s.formLabel}>{f.label}</label>
                    {f.type === 'select' ? (
                      <select style={s.formInput} value={manualPatient[f.key] || ''} onChange={e => setManualPatient(p => ({ ...p, [f.key]: e.target.value }))}>
                        <option value="">—</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input style={s.formInput} type="text" placeholder={f.hint || ''} value={manualPatient[f.key] || ''} onChange={e => setManualPatient(p => ({ ...p, [f.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tumour section */}
            <div style={{ ...s.formSection, marginTop: 24 }}>
              <div style={s.formSectionTitle}>🔬 Tumeur</div>
              <div style={s.formGrid}>
                {CANREG5_TUMOUR_FIELDS.map(f => (
                  <div key={f.key} style={s.formField}>
                    <label style={s.formLabel}>{f.label}</label>
                    {f.type === 'select' ? (
                      <select style={s.formInput} value={manualTumour[f.key] || ''} onChange={e => setManualTumour(p => ({ ...p, [f.key]: e.target.value }))}>
                        <option value="">—</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input style={s.formInput} type="text" placeholder={f.hint || ''} value={manualTumour[f.key] || ''} onChange={e => setManualTumour(p => ({ ...p, [f.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Check button */}
            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
              <button style={{ ...s.btnValidate, background: 'linear-gradient(135deg,#9F7AEA,#7C3AED)' }} onClick={handleManualCheck} disabled={manualLoading}>
                {manualLoading ? 'Vérification…' : '🔍 Vérifier les doublons'}
              </button>
            </div>

            {/* Result */}
            {manualResult && (
              <div style={{ marginTop: 20, padding: 20, borderRadius: 14, background: manualResult.type === 'ok' ? '#F0FFF4' : manualResult.type === 'duplicate' ? '#FFF5F5' : '#FFFAF0', border: `1px solid ${manualResult.type === 'ok' ? '#68d391' : manualResult.type === 'duplicate' ? '#fc8181' : '#f6ad55'}` }}>
                {manualResult.type === 'ok' && (
                  <div style={{ color: '#276749', fontWeight: 700, fontSize: 16 }}>✅ {manualResult.msg}</div>
                )}
                {manualResult.type === 'duplicate' && (
                  <>
                    <div style={{ color: '#c53030', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>⚠ Doublon détecté — {manualResult.reason}</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#718096', marginBottom: 6 }}>DANS LA BASE</div>
                        <div style={{ fontWeight: 600 }}>{manualResult.existing.nom}</div>
                        <div style={{ fontSize: 13, color: '#718096' }}>NIN: {manualResult.existing.nin || '—'}</div>
                        <div style={{ fontSize: 13, color: '#718096' }}>Né(e): {manualResult.existing.dateNaissance || '—'}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#718096', marginBottom: 6 }}>SAISI</div>
                        <div style={{ fontWeight: 600 }}>{manualResult.candidate.nom}</div>
                        <div style={{ fontSize: 13, color: '#718096' }}>NIN: {manualResult.candidate.nin || '—'}</div>
                        <div style={{ fontSize: 13, color: '#718096' }}>Né(e): {manualResult.candidate.dateNaissance || '—'}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                      <button style={{ ...s.btn, ...s.btnMerge }} onClick={() => setModalData({ id: 'manual', row: canRegRowToPatient({ ...manualPatient, ...manualTumour }), existing: manualResult.existing, candidate: manualResult.candidate, score: 100, reason: manualResult.reason })}>
                        ⇐ Fusionner
                      </button>
                      <button style={{ ...s.btn, ...s.btnIgnore }} onClick={() => setManualResult({ type: 'ok', msg: 'Doublon ignoré — vous pouvez continuer' })}>
                        Ignorer
                      </button>
                    </div>
                  </>
                )}
                {manualResult.type === 'error' && (
                  <div style={{ color: '#c05621', fontWeight: 700 }}>❌ {manualResult.msg}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalData && (
        <DuplicateDetectionModal
          patientExistant={modalData.existing}
          patientNouveau={modalData.candidate || rowToModalCandidate(modalData.row)}
          onConfirm={handleModalConfirm}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:          { minHeight: '100vh', background: 'linear-gradient(135deg,#e3e8f7 0%,#f0e7f7 100%)', padding: 20, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: 'white', borderRadius: 15, marginBottom: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  logoSection:   { display: 'flex', alignItems: 'center', gap: 12 },
  logo:          { width: 44, height: 44, background: 'linear-gradient(135deg,#4A90E2,#5CA0F2)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText:      { fontSize: 20, color: '#4a5568', fontWeight: 600 },
  backBtn:       { background: 'white', border: '1px solid #e2e8f0', color: '#4a5568', padding: '8px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  container:     { maxWidth: 980, margin: '0 auto' },
  tabs:          { display: 'flex', gap: 8, marginBottom: 20 },
  tabBtn:        { padding: '10px 24px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#718096', cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: '0.15s' },
  tabActive:     { background: 'linear-gradient(135deg,#4A90E2,#5CA0F2)', color: 'white', border: '1px solid transparent', fontWeight: 700 },
  uploadCard:    { background: 'rgba(255,255,255,0.7)', borderRadius: 24, padding: 32, marginBottom: 20, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(0,0,0,0.07)' },
  uploadArea:    { borderRadius: 18, padding: '48px 32px', textAlign: 'center', border: '2px dashed #c3d1f0', background: 'rgba(248,250,255,0.8)', marginBottom: 28 },
  uploadIconWrap:{ width: 100, height: 100, margin: '0 auto 20px', background: 'linear-gradient(135deg,rgba(255,255,255,0.9),rgba(240,245,255,0.9))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 24px rgba(74,144,226,0.15)' },
  uploadIcon:    { width: 52, height: 52, color: '#4A90E2' },
  uploadTitle:   { fontSize: 22, color: '#2d3748', marginBottom: 6, fontWeight: 700 },
  uploadSubtitle:{ fontSize: 15, color: '#718096', marginBottom: 8 },
  uploadInfo:    { color: '#a0aec0', fontSize: 13, marginBottom: 20 },
  browseBtn:     { background: 'white', color: '#4a5568', border: '1px solid #e2e8f0', padding: '10px 26px', borderRadius: 10, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  errorMsg:      { color: '#c53030', marginTop: 14, fontSize: 14, fontWeight: 600 },
  fieldRefWrap:  { background: '#f7fafc', borderRadius: 14, padding: 20 },
  fieldRefTitle: { fontWeight: 700, color: '#4a5568', marginBottom: 14, fontSize: 15 },
  fieldRefGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  fieldRefSection:{ fontWeight: 700, color: '#9F7AEA', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e2e8f0' },
  fieldRefRow:   { display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 5 },
  fieldCode:     { background: '#edf2ff', color: '#4A90E2', padding: '1px 7px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace', flexShrink: 0 },
  fieldLabel:    { fontSize: 12, color: '#4a5568' },
  progressTrack: { width: '100%', height: 8, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden' },
  progressBar:   { height: '100%', background: 'linear-gradient(90deg,#4A90E2,#9F7AEA)', borderRadius: 10, transition: 'width 0.3s ease' },
  statChip:      (color) => ({ background: color + '18', color, border: `1px solid ${color}44`, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }),
  duplicatesCard:{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' },
  duplicatesHeader:{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 },
  warningIcon:   { width: 28, height: 28, background: '#FED7D7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E53E3E', fontWeight: 'bold', fontSize: 14, flexShrink: 0 },
  duplicatesTitle:{ fontSize: 18, color: '#2d3748', fontWeight: 700 },
  table:         { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' },
  thead:         { textAlign: 'left' },
  th:            { padding: '10px 14px', color: '#718096', fontWeight: 600, fontSize: 13 },
  td:            { padding: 14, background: '#f7fafc', verticalAlign: 'top' },
  patientCell:   { display: 'flex', alignItems: 'flex-start', gap: 10 },
  patientAvatar: { width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  actionBtns:    { display: 'flex', gap: 6, flexWrap: 'wrap' },
  btn:           { padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 },
  btnMerge:      { background: 'linear-gradient(135deg,#5CA0F2,#4A90E2)', color: 'white', boxShadow: '0 2px 8px rgba(74,144,226,0.25)' },
  btnIgnore:     { background: 'white', color: '#718096', border: '1px solid #e2e8f0' },
  btnValidate:   { padding: '12px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#5CA0F2,#4A90E2)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(74,144,226,0.3)' },
  formSection:   { background: '#f7fafc', borderRadius: 14, padding: 20 },
  formSectionTitle:{ fontWeight: 700, color: '#4a5568', marginBottom: 16, fontSize: 15 },
  formGrid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 },
  formField:     { display: 'flex', flexDirection: 'column', gap: 5 },
  formLabel:     { fontSize: 12, fontWeight: 600, color: '#718096' },
  formInput:     { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white', outline: 'none' },
};





