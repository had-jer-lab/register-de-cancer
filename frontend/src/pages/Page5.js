import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import Layout from '../components/Layout';
import { SC, PageHeader, BtnRow, InfoItem } from '../components/FormFields';
import DuplicateDetectionModal from '../components/DuplicateDetectionModal';
import API_BASE from '../utils/apiConfig';
import {
  fetchActiveCustomFields,
  buildCustomFieldsPayload,
  validateRequiredCustomFields,
} from '../utils/customFields';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    if (!isNaN(d)) {
      return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
    }
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) return parts[2]+'/'+parts[1]+'/'+parts[0];
  } catch(_) {}
  return str;
}

const TYPE_TUMEUR_MAP = {
  'Solide':   'solide',
  'Liquide':  'liquide',
  'Hémato.':  'hematologique',
};

function normalizeTypeTumeur(value) {
  if (!value) return '';
  return TYPE_TUMEUR_MAP[value] || value.toLowerCase();
}

function score(arr, total) {
  const filled = arr.filter(v => {
    if (v === null || v === undefined) return false;
    return v.toString().trim() !== '';
  }).length;
  if (!total) return 0;
  return Math.round((filled / total) * 100);
}

function normalizePatient(p) {
  const rawCancers = Array.isArray(p.cancers) ? p.cancers : [];
  const cleanDash  = (v) => (!v || v === '—' || v === '-') ? '' : v;

  const cancers = rawCancers.length > 0
    ? rawCancers.map(c => {
        if (typeof c === 'string') return c;
        const name  = cleanDash(c.cancer_type_name)
          || (typeof c.cancer_type === 'string' ? cleanDash(c.cancer_type) : '')
          || cleanDash(c.organe) || cleanDash(c.name) || '';
        const stade = cleanDash(c.stade_clinique || c.stade_pathologique || c.stade || '');
        if (!name && !stade) return null;
        return name
          ? (stade ? `${name} (Stade ${stade})` : name)
          : (stade ? `Cancer Stade ${stade}` : null);
      }).filter(Boolean)
    : (() => {
        const dc = p.dernier_cancer;
        if (dc) {
          const name  = cleanDash(dc.organe || dc.cancer_type_name || dc.name || '');
          const stade = cleanDash(dc.stade  || dc.stade_clinique || '');
          const label = name
            ? (stade ? `${name} (Stade ${stade})` : name)
            : (stade ? `Cancer Stade ${stade}` : '');
          if (label.trim()) return [label];
        }
        const organe = cleanDash(p.organe || '');
        const stade  = cleanDash(p.stade  || '');
        if (organe) return [stade ? `${organe} (Stade ${stade})` : organe];
        return [];
      })();

  const nestedTrt = rawCancers.flatMap(c =>
    typeof c === 'object' && Array.isArray(c.treatments) ? c.treatments : []
  );
  const rawTrt  = Array.isArray(p.traitements) ? p.traitements : [];
  const formTrt = [p.trtAnt, p.trtActuel].filter(Boolean);
  const traitements = [...rawTrt, ...nestedTrt, ...formTrt].map(t => {
    if (typeof t === 'string') return cleanDash(t);
    return cleanDash(t.type_traitement || t.protocole || t.name || '');
  }).filter(Boolean);

  const wilaya = cleanDash(
    p.wilaya_name
    || (p.commune && typeof p.commune === 'object' && p.commune.wilaya
        ? (p.commune.wilaya.name || '') : '')
    || (typeof p.wilaya === 'string' ? p.wilaya : '')
    || ''
  );
  const commune = cleanDash(
    p.commune_name
    || (p.commune && typeof p.commune === 'object' ? (p.commune.name || '') : '')
    || (typeof p.commune === 'string' ? p.commune : '')
    || ''
  );

  return {
    id:            p.id,
    nin:           p.national_id || p.nin || '',
    nom:           p.last_name
      ? `${p.first_name || ''} ${p.last_name}`.trim()
      : p.nom || `${p.first_name || ''} ${p.prenom || ''}`.trim(),
    dateNaissance: p.date_naissance || p.dateNaissance || p.dob || '',
    telephone:     p.phone || p.telephone || p.tel || '',
    wilaya,
    commune,
    medecin:       p.medecin_nom || p.medecin || '',
    cancers,
    traitements,
    age:           p.age  || '',
    cree:          fmtDate((p.created_at || p.cree || '').replace('—','')),
  };
}

// ─── Similarité / Doublons ───────────────────────────────────────────────────
function normStr(s = '') {
  return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}
function strSim(a, b) {
  if (!a || !b) return 0;
  const na = normStr(a), nb = normStr(b);
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(na, nb) / maxLen) * 100);
}
function dateSim(d1, d2) {
  if (!d1 || !d2) return 0;
  try {
    const t1 = new Date(d1), t2 = new Date(d2);
    if (isNaN(t1) || isNaN(t2)) return normStr(d1) === normStr(d2) ? 100 : 0;
    const diffDays = Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
    if (diffDays === 0)   return 100;
    if (diffDays <= 7)    return 80;
    if (diffDays <= 365)  return 30;
    return 0;
  } catch { return 0; }
}
function computeSimilarity(a, b) {
  const fields = [
    { name: 'nin',           weight: 3, fn: (v1, v2) => normStr(v1) === normStr(v2) ? 100 : 0 },
    { name: 'nom',           weight: 2, fn: strSim },
    { name: 'dateNaissance', weight: 2, fn: dateSim },
    { name: 'telephone',     weight: 2, fn: (v1, v2) => {
      const t1 = (v1||'').replace(/\D/g,'');
      const t2 = (v2||'').replace(/\D/g,'');
      if (!t1 || !t2) return 0;
      return t1 === t2 ? 100 : strSim(t1, t2);
    }},
    { name: 'wilaya', weight: 1, fn: strSim },
  ];
  let totalWeight = 0, scoreVal = 0;
  fields.forEach(f => {
    totalWeight += f.weight;
    const va = a[f.name], vb = b[f.name];
    if (va && vb) scoreVal += f.fn(va, vb) * f.weight;
  });
  return totalWeight === 0 ? 0 : Math.round(scoreVal / totalWeight);
}

async function findPossibleDuplicate(candidate, token) {
  try {
    const q   = encodeURIComponent(candidate.nom || '');
    const res = await fetch(`${API_BASE}/patients/?search=${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const list = data.results || data;

    let bestRaw = null, bestScore = 0;
    list.forEach(raw => {
      const s = computeSimilarity(normalizePatient(raw), candidate);
      if (s > bestScore) { bestScore = s; bestRaw = raw; }
    });
    if (bestScore <= 50 || !bestRaw) return null;

    try {
      const detailRes = await fetch(`${API_BASE}/patients/${bestRaw.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (detailRes.ok) {
        return { existing: normalizePatient(await detailRes.json()), score: bestScore };
      }
    } catch (_) {}

    return { existing: normalizePatient(bestRaw), score: bestScore };
  } catch (e) {
    console.warn('duplicate lookup failed', e);
    return null;
  }
}

// ─── UI Components ───────────────────────────────────────────────────────────
function CompletionBar({ label, pct }) {
  return (
    <div className="cbar-item">
      <div className="cbar-label">{label}</div>
      <div className="cbar-track"><div className="cbar-fill" style={{ width: `${pct}%` }} /></div>
      <div className="cbar-pct">{pct}%</div>
    </div>
  );
}

function Donut({ pct }) {
  const r = 23, circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div className="donut-wrap">
        <svg width="58" height="58" viewBox="0 0 58 58">
          <circle cx="29" cy="29" r={r} fill="none" stroke="#DDE4F3" strokeWidth="5.5" />
          <circle cx="29" cy="29" r={r} fill="none" stroke="#4A6CF7" strokeWidth="5.5"
            strokeDasharray={circ.toFixed(2)}
            strokeDashoffset={offset.toFixed(2)}
            strokeLinecap="round" />
        </svg>
        <div className="donut-label">{pct}%</div>
      </div>
      <div style={{ fontSize:10, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px' }}>
        Complétude
      </div>
    </div>
  );
}

// ─── Page5 ───────────────────────────────────────────────────────────────────
export default function Page5() {
  const navigate = useNavigate();
  const { data, update } = usePatient();

  const [checks, setChecks]           = useState({ c1:false, c2:false, c3:false });
  const [unc, setUnc]                 = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [merged, setMerged]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [createdDossier, setCreatedDossier] = useState('');
  const [duplicateModal, setDuplicateModal] = useState(null);

  const API = API_BASE;

  const s1 = score([data.first_name, data.last_name, data.date_naissance, data.phone, data.sexe, data.wilaya, data.couverture_sociale], 7);
  const s2 = score([data.type_tumeur, data.organe, data.type_histologique, data.stade_clinique, data.taille_tumorale, data.date_diagnostic], 6);
  const s3 = score([data.cea, data.ca199, data.nfs, data.biopsy, data.como], 5);
  const s4 = score([data.tabac, data.alcool, data.sport, data.poids, data.antFam, data.trtAnt], 6);
  const global = Math.round((s1 + s2 + s3 + s4) / 4);

  const fullName = `${data.first_name || data.prenom || '—'} ${data.last_name || data.nom || '—'}`;
  const toggleCheck = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const covLabels = { cnas:'CNAS', casnos:'CASNOS', pmsr:'PMSR', aucune:'Aucune', autre:'Autre' };
  const famLabels = { celibataire:'Célibataire', marie:'Marié(e)', veuf:'Veuf(ve)', divorce:'Divorcé(e)' };

  function buildCandidate() {
    return normalizePatient({
      ...data,
      first_name: data.first_name || data.prenom || '',
      last_name:  data.last_name  || data.nom    || '',
    });
  }

  // ✅ ظ…ظ† ط§ظ„ظ…ظ„ف 1 — ظٹط­ظ„ commune ط­طھظ‰ ظƒظˆظ† ظ…ا ط¹ظ†ط¯ظˆش ID
  function normName(value = '') {
    return value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  }

  async function resolveCommuneId(token) {
    if (data.commune_id) return data.commune_id;
    if (!data.commune)   return null;

    const headers = { Authorization: `Bearer ${token}` };
    let wilayaId  = null;

    if (data.wilaya) {
      const wilayasRes = await fetch(`${API}/patients/wilayas/`, { headers });
      if (wilayasRes.ok) {
        const wilayas = await wilayasRes.json();
        wilayaId = wilayas.find(w => normName(w.name) === normName(data.wilaya))?.id || null;
      }
    }

    const communesUrl = wilayaId
      ? `${API}/patients/communes/?wilaya_id=${encodeURIComponent(wilayaId)}`
      : `${API}/patients/communes/`;
    const communesRes = await fetch(communesUrl, { headers });
    if (!communesRes.ok) return null;

    const communes = await communesRes.json();
    return communes.find(c => normName(c.name) === normName(data.commune))?.id || null;
  }

  // ✅ ظ…ظ† ط§ظ„ظ…ظ„ف 1 — dossier_manual ظ…ظ†ط¸ظ…
  function buildDossierManualPayload() {
    const antList = (data.antecedents || []).filter(a => a && String(a).trim()).join('; ');
    const payload = {
      email:            data.email            || '',
      situation_familiale: data.situation_familiale || '',
      couverture_sociale:  data.couverture_sociale  || '',
      adresse:          data.adresse          || '',
      profession:       data.profession       || '',
      wilaya:           data.wilaya           || '',
      commune:          data.commune          || '',
      poids:            data.poids            || '',
      taille:           data.taille_patient   || '',
      imc:              data.imc              || '',
      allergies:        data.allergies        || '',
      autres_allergies: data.autresAllergies  || '',
      antecedents:      data.antFam || antList || '',
      observations:     data.observations     || '',
      sport:            data.sport            || '',
      alim:             data.alim             || '',
      tabac:            data.tabac            || '',
      alcool:           data.alcool           || '',
    };
    return Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== '' && v != null)
    );
  }

  // ─── createFullDossier ────────────────────────────────────────────────────
  async function createFullDossier(token, overrideNin = undefined) {
    // 1. Patient
    const sexeVal   = data.sexe === 'M' || data.sexe === 'Masculin' ? 'M' : 'F';
    const communeId = await resolveCommuneId(token); // ✅ ظٹط­ظ„ ط¯ط§ظٹظ…ا

    const patientPayload = {
      first_name:   data.first_name    || data.prenom || '',
      last_name:    data.last_name     || data.nom    || '',
      date_naissance: data.date_naissance || data.dob || '',
      sexe:         sexeVal,
      phone:        data.phone         || data.tel    || '',
      national_id:  overrideNin !== undefined ? overrideNin : (data.national_id || data.nin || null),
      commune:      communeId,
      hospital:     data.hospital_id   || null,
      data_source:  'manual',
    };

    // ✅ ظƒظˆظ† commune ظ…ا طھط­ظ„ش ط¨ظ€ IDطŒ ظ†زيد ط§ظ„ظ†ص ظƒظ€ fallback
    if (!communeId && data.commune) {
      patientPayload.commune_text = data.commune;
      if (data.wilaya) patientPayload.wilaya_text = data.wilaya;
    }

    // ✅ dossier_manual ظ…ظ†ط¸ظ… ظ…ظ† ط§ظ„ظ…ظ„ف 1
    const dossierManual = buildDossierManualPayload();
    if (Object.keys(dossierManual).length > 0) {
      patientPayload.dossier_manual = dossierManual;
    }

    const patRes = await fetch(`${API}/patients/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(patientPayload),
    });

    if (!patRes.ok) {
      const err    = await patRes.json();
      const errMsg = JSON.stringify(err).toLowerCase();
      const isNINDuplicate = (
        errMsg.includes('national_id') ||
        errMsg.includes('existe') ||
        errMsg.includes('exist') ||
        errMsg.includes('unique')
      ) && patientPayload.national_id;

      if (isNINDuplicate) {
        try {
          const searchRes = await fetch(
            `${API}/patients/?national_id=${encodeURIComponent(patientPayload.national_id)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (searchRes.ok) {
            const searchData  = await searchRes.json();
            const existingRaw = searchData.results?.[0] || searchData[0];
            if (existingRaw) {
              let fullExisting = existingRaw;
              try {
                const detailRes = await fetch(`${API}/patients/${existingRaw.id}/`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (detailRes.ok) fullExisting = await detailRes.json();
              } catch (_) {}
              setDuplicateModal({
                existing:  normalizePatient(fullExisting),
                candidate: normalizePatient({
                  ...data,
                  first_name: data.first_name || data.prenom || '',
                  last_name:  data.last_name  || data.nom    || '',
                }),
              });
              return null;
            }
          }
        } catch (_) {}
        setSaveError('Un patient avec ce NIN existe déjà.');
        return null;
      }

      const msg = err.date_naissance?.[0] || err.detail || Object.values(err).flat()[0] || JSON.stringify(err);
      setSaveError('Erreur patient : ' + msg);
      return null;
    }

    const patient = await patRes.json();
    setCreatedDossier(patient.numero_dossier || '');

    // 2. Cancer
    const tnm = [data.tnmT, data.tnmN, data.tnmM].filter(Boolean).join('');
    const cancerPayload = {
      patient:            patient.id,
      organe:             data.organe         || '',
      cancer_type:        data.cancer_type_id || null,
      type_tumeur:        normalizeTypeTumeur(data.type_tumeur || data.typeT || ''),
      sous_type:          data.sous_type       || '',
      lateralite:         data.lateralite || data.lat || '',
      cim10_code:         data.cim10_code === '__manual__' ? (data.cim10_manual || '') : (data.cim10_code || ''),
      type_histologique:  data.type_histologique  || data.histo  || '',
      grade_histologique: data.grade_histologique || data.grade  || '',
      bloc_anapath:       data.bloc_anapath        || '',
      stade_clinique:     data.stade_clinique  || data.stade || '',
      stade_pathologique: data.stade_pathologique  || '',
      tnm,
      taille_tumorale:    data.taille_tumorale || data.taille
                            ? parseFloat(data.taille_tumorale || data.taille) || null : null,
      ganglions_envahis:  data.ganglions_envahis ? parseInt(data.ganglions_envahis) || null : null,
      localise:           data.localise    !== undefined ? data.localise    : true,
      metastatique:       data.metastatique !== undefined ? data.metastatique : false,
      recidive:           data.recidive    !== undefined ? data.recidive    : false,
      sites_metastatiques: data.sites_metastatiques || [],
      recepteur_er:       data.recepteur_er || '',
      recepteur_pr:       data.recepteur_pr || '',
      her2:               data.her2         || '',
      date_symptomes:     data.date_symptomes  || null,
      date_diagnostic:    data.date_diagnostic || data.diagDate || null,
      etablissement_diag: data.etablissement_diag || '',
      service_diag:       data.service_diag || data.service || '',
      medecin_diag:       data.medecin_diag || data.medecin || '',
      base_diagnostic:    data.base_diagnostic || [],
      custom_fields:      buildCustomFieldsPayload(data.customFields),
      data_source:        'manual',
    };

    const cancerRes = await fetch(`${API}/patients/${patient.id}/cancers/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(cancerPayload),
    });

    let cancer = null;
    if (cancerRes.ok) {
      cancer = await cancerRes.json();
    } else {
      console.warn('Cancer creation warning:', await cancerRes.json().catch(() => ({})));
    }

    // 3. Traitements
    if (cancer && Array.isArray(data.traitements) && data.traitements.length > 0) {
      for (const t of data.traitements) {
        await fetch(`${API}/patients/${patient.id}/cancers/${cancer.id}/treatments/`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type_traitement:      t.type_traitement      || 'chimio',
            intention:            t.intention            || '',
            statut:               t.statut               || 'planifie',
            ligne:                t.ligne                || '',
            protocole:            t.protocole            || '',
            medicaments:          t.medicaments          || '',
            voie_administration:  t.voie_administration  || '',
            jours_administration: Array.isArray(t.jours_administration) ? t.jours_administration : [],
            cycles_prevus:        t.cycles_prevus   ? parseInt(t.cycles_prevus)   || null : null,
            cycles_realises:      t.cycles_realises ? parseInt(t.cycles_realises) || null : null,
            date_debut:           t.date_debut      || null,
            date_fin:             t.date_fin        || null,
            reponse_tumorale:     t.reponse_tumorale     || '',
            date_evaluation:      t.date_evaluation      || null,
            grade_toxicite:       t.grade_toxicite       || '',
            description_toxicite: t.description_toxicite || '',
          }),
        }).catch(e => console.warn('Treatment save warning:', e));
      }
    }

    // 4. Examens biologiques
    if (cancer) {
      const MARQUEURS = [
        { key:'cea',   label:'CEA'        },
        { key:'ca199', label:'CA 19-9'    },
        { key:'ca125', label:'CA 125'     },
        { key:'afp',   label:'AFP'        },
        { key:'psa',   label:'PSA'        },
        { key:'ca153', label:'CA 15-3'    },
        { key:'nfs',   label:'NFS'        },
        { key:'creat', label:'Créatinine' },
        { key:'ggt',   label:'GGT'        },
        { key:'ldh',   label:'LDH'        },
        { key:'hb',    label:'Hémoglobine'},
        { key:'tp',    label:'TP'         },
      ];
      for (const m of MARQUEURS) {
        const val = data[m.key];
        if (val !== undefined && val !== null && val !== '') {
          await fetch(`${API}/patients/${patient.id}/cancers/${cancer.id}/biological-exams/`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              type_analyse: m.label,
              valeur:       isNaN(parseFloat(val)) ? null : parseFloat(val),
              resultat:     isNaN(parseFloat(val)) ? String(val) : '',
              date_analyse: null,
            }),
          }).catch(e => console.warn('Bio exam warning:', e));
        }
      }

      // 5. Imagerie
      if (Array.isArray(data.imagerie) && data.imagerie.length > 0) {
        for (const img of data.imagerie) {
          await fetch(`${API}/patients/${patient.id}/cancers/${cancer.id}/imaging-exams/`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type_examen: img, conclusion: '', date_examen: null }),
          }).catch(e => console.warn('Imaging exam warning:', e));
        }
      }

      // 6. Métastases
      if (Array.isArray(data.sites_metastatiques) && data.sites_metastatiques.length > 0) {
        for (const site of data.sites_metastatiques) {
          await fetch(`${API}/patients/${patient.id}/cancers/${cancer.id}/metastases/`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ organe: site, date_detection: null }),
          }).catch(e => console.warn('Metastasis warning:', e));
        }
      }
    }

    // 7. Habitudes de vie
    for (const [nom, val] of Object.entries({ tabac: data.tabac, alcool: data.alcool, sport: data.sport })) {
      if (val) {
        await fetch(`${API}/patients/${patient.id}/habits/`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ habit_name: nom, valeur: val, frequency: val }),
        }).catch(() => {});
      }
    }

    // 8. Consultation initiale
    if (data.consultDate) {
      await fetch(`${API}/patients/${patient.id}/consultations/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          consultation_date: toISODate(data.consultDate),
          motif:             'Consultation initiale',
          compte_rendu:      data.observations || '',
          next_visit_date:   toISODate(data.dernier_rdv) || null,
        }),
      }).catch(e => console.warn('Consultation warning:', e));
    }

    return patient;
  }

  // ─── Helpers dates / fusion ───────────────────────────────────────────────
  function toISODate(str) {
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return str;
  }

  // ✅ ظ…ظ† ط§ظ„ظ…ظ„ف 1 — يزيد dossier_manual في ط§ظ„ظ€ merge
  async function mergePatientAndCancer(existingId, fusionData, token) {
    const nameParts = (fusionData.nom || '').trim().split(' ');
    const payload   = {
      first_name:     nameParts[0] || '',
      last_name:      nameParts.slice(1).join(' ') || '',
      date_naissance: fusionData.dateNaissance || '',
      phone:          fusionData.telephone     || '',
    };
    const dossierManual = buildDossierManualPayload();
    if (Object.keys(dossierManual).length > 0) payload.dossier_manual = dossierManual;

    const res = await fetch(`${API}/patients/${existingId}/`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(JSON.stringify(err)); }
    return await res.json();
  }

  // ─── SAVE ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const missing = Object.entries(checks).filter(([,v]) => !v).map(([k]) => k);
    if (missing.length) { setUnc(missing); setTimeout(() => setUnc([]), 2000); return; }

    setSaving(true); setSaveError('');
    const token = localStorage.getItem('access_token');
    if (!token) { setSaveError('Session expirée.'); setSaving(false); return; }

    try {
      const frontErrs = [];
      if (!(data.first_name || data.prenom)?.trim()) frontErrs.push('Prénom manquant');
      if (!(data.last_name  || data.nom)?.trim())    frontErrs.push('Nom manquant');
      if (!data.date_naissance && !data.dob)          frontErrs.push('Date de naissance manquante');
      if (!data.sexe)                                  frontErrs.push('Sexe manquant');
      if (frontErrs.length) {
        setSaveError('Données incomplètes : ' + frontErrs.join(', ') + '. Vérifiez la page 1.');
        setSaving(false); return;
      }

      const activeCustomFields = await fetchActiveCustomFields();
      const missingCustom = validateRequiredCustomFields(activeCustomFields, data.customFields);
      if (missingCustom.length) {
        setSaveError(
          'Champs personnalisés obligatoires manquants : ' + missingCustom.join(', ') +
          '. Retournez aux pages Diagnostic, Biologie, Traitement ou Autres.'
        );
        setSaving(false);
        return;
      }

      const candidate = buildCandidate();
      const dup       = await findPossibleDuplicate(candidate, token);
      if (dup) { setDuplicateModal({ existing: dup.existing, candidate }); setSaving(false); return; }

      const created = await createFullDossier(token);
      if (created) setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setSaveError('Erreur réseau. Vérifiez que le serveur Django est lancé.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Modal doublon ────────────────────────────────────────────────────────
  const handleModalConfirm = async (fusionData, note, existingId, action = 'fusionner') => {
    setDuplicateModal(null);

    if (action === 'garder_separe') {
      setSaving(true); setSaveError('');
      try {
        const token = localStorage.getItem('access_token');
        if (!token) { setSaveError('Session expirée.'); setSaving(false); return; }
        const created = await createFullDossier(token, null);
        if (created) { setMerged(false); setShowSuccess(true); }
      } catch(e) { setSaveError('Erreur réseau.'); }
      finally { setSaving(false); }
      return;
    }

    setSaving(true); setSaveError('');
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { setSaveError('Session expirée.'); setSaving(false); return; }
      const updated = await mergePatientAndCancer(
        existingId,
        { ...fusionData, dateNaissance: toISODate(fusionData.dateNaissance) },
        token
      );
      if (updated) {
        setMerged(true);
        setCreatedDossier(updated.numero_dossier || updated.id || '');
        setShowSuccess(true);
      }
    } catch(e) {
      setSaveError('Erreur lors de la fusion : ' + e.message);
    } finally { setSaving(false); }
  };

  // ─── Réinitialisation ────────────────────────────────────────────────────
  const resetForm = () => {
    update({
      first_name:'', last_name:'', date_naissance:'', dob:'', age:'',
      national_id:'', nin:'', phone:'', tel:'', email:'',
      sexe:'', situation_familiale:'', couverture_sociale:'',
      wilaya:'', commune:'', commune_id:null, hospital_id:null,
      profession:'', adresse:'', poids:'', taille_patient:'',
      organe:'', cancer_type_id:null, sous_type:'', type_tumeur:'',
      lateralite:'', cim10_code:'', stade_clinique:'', stade:'',
      tnmT:'T0', tnmN:'N0', tnmM:'M0',
      localise:true, metastatique:false, recidive:false,
      sites_metastatiques:[], recepteur_er:'', recepteur_pr:'', her2:'',
      date_symptomes:'', date_diagnostic:'', diagDate:'',
      type_histologique:'', grade_histologique:'', bloc_anapath:'',
      etablissement_diag:'', service_diag:'', medecin_diag:'',
      base_diagnostic:[],
      traitements:[], imagerie:[], customFields:{},
      tabac:'', alcool:'', sport:'', antFam:'',
      antecedents:[''], allergies:'', observations:'',
    });
    navigate('/page1');
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <Layout currentStep={6} progress={100}>

      {/* SUCCESS OVERLAY */}
      {showSuccess && (
        <div className="overlay">
          <div className="success-box">
            <div className="suc-icon">✔</div>
            <div className="suc-title">Patient {merged ? 'mis à jour' : 'enregistré'} !</div>
            <div className="suc-sub">
              Le dossier de <strong>{fullName}</strong> a été {merged ? 'fusionné/mis à jour' : 'créé'} avec succès.
            </div>
            {createdDossier && <div className="suc-num">{createdDossier}</div>}
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-ghost" onClick={resetForm}>➕ Nouveau patient</button>
              <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>📋 Voir mes patients</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="pg-header">
        <div className="pg-title">
          <div className="pg-icon" style={{ background:'linear-gradient(135deg,#9B59B6,#c39bd3)' }}>📋</div>
          Résumé &amp; Validation
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Donut pct={global} />
          <div className="pg-badge">Étape <b>5</b> / 5</div>
        </div>
      </div>

      {/* Patient Card */}
      <div className="sum-card">
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div className="sum-name">{fullName}</div>
            <div className="sum-meta-grid">
              <div className="sum-meta-item">Naissance : <b>{fmtDate(data.date_naissance || data.dob)}</b></div>
              <div className="sum-meta-item">NIN : <b>{data.national_id || data.nin || '—'}</b></div>
              <div className="sum-meta-item">Tél : <b>{data.phone || data.tel || '—'}</b></div>
              <div className="sum-meta-item">Couverture : <b>{covLabels[data.couverture_sociale] || '—'}</b></div>
              <div className="sum-meta-item">Situation : <b>{famLabels[data.situation_familiale] || '—'}</b></div>
              <div className="sum-meta-item">Wilaya : <b>{data.wilaya || '—'}</b></div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
            <span className="badge badge-green">🩺 Nouveau dossier</span>
            {data.sexe && <span className="badge badge-blue">{data.sexe}</span>}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="col-stack">

          {/* Diagnostic */}
          <div className="section-block">
            <div className="section-block-header">
              <div className="section-block-title"><span>🔬</span> Diagnostic &amp; Cancer</div>
              <button className="d-link" onClick={() => navigate('/page2')}>Modifier ↗</button>
            </div>
            <div className="section-block-body">
              <div className="info-grid">
                <InfoItem label="Type de tumeur"   value={data.type_tumeur || data.typeT} />
                <InfoItem label="Organe"            value={data.organe} />
                <InfoItem label="Sous-type"         value={data.sous_type} />
                <InfoItem label="Histologie"        value={data.type_histologique || data.histo} />
                <InfoItem label="Stade"             value={data.stade_clinique || data.stade ? 'Stade ' + (data.stade_clinique || data.stade) : ''} />
                <InfoItem label="TNM"               value={[data.tnmT, data.tnmN, data.tnmM].filter(Boolean).join(' — ')} />
                <InfoItem label="Taille tumorale"   value={data.taille_tumorale || data.taille} unit=" cm" />
                <InfoItem label="Récepteurs ER/PR"  value={data.recepteur_er ? `ER:${data.recepteur_er} PR:${data.recepteur_pr}` : ''} />
                <InfoItem label="HER2"              value={data.her2} />
                <InfoItem label="Date diagnostic"   value={data.date_diagnostic || data.diagDate ? fmtDate(data.date_diagnostic || data.diagDate) : ''} />
                <InfoItem label="Établissement"     value={data.etablissement_diag} />
                <InfoItem label="Médecin diag."     value={data.medecin_diag || data.medecin} />
              </div>
            </div>
          </div>

          {/* Traitements */}
          {(data.traitements || []).length > 0 && (
            <div className="section-block">
              <div className="section-block-header">
                <div className="section-block-title"><span>💊</span> Traitements ({data.traitements.length})</div>
                <button className="d-link" onClick={() => navigate('/page6')}>Modifier ↗</button>
              </div>
              <div className="section-block-body">
                {data.traitements.map((t, i) => (
                  <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid #F0F4FF', fontSize:13 }}>
                    <strong>{t.type_traitement}</strong>
                    {t.protocole && ` — ${t.protocole}`}
                    {t.statut && <span style={{ marginLeft:8, color:'#7A8BAD' }}>({t.statut})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biologique */}
          <div className="section-block">
            <div className="section-block-header">
              <div className="section-block-title"><span>🔭</span> Données biologiques</div>
              <button className="d-link" onClick={() => navigate('/page3')}>Modifier ↗</button>
            </div>
            <div className="section-block-body">
              <div className="info-grid">
                <InfoItem label="CEA"          value={data.cea}   unit=" ng/mL" />
                <InfoItem label="CA 19-9"      value={data.ca199} unit=" U/mL"  />
                <InfoItem label="PSA"          value={data.psa}   unit=" ng/mL" />
                <InfoItem label="Biopsie"      value={data.biopsy} />
                <InfoItem label="Comorbidités" value={data.como} />
                <InfoItem label="Imagerie"     value={(data.imagerie || []).join(', ')} />
              </div>
            </div>
          </div>

          {/* Complétude */}
          <SC label="Complétude par section">
            <CompletionBar label="Infos personnelles"  pct={s1} />
            <CompletionBar label="Diagnostic & Cancer" pct={s2} />
            <CompletionBar label="Données biologiques" pct={s3} />
            <CompletionBar label="Habitudes de vie"    pct={s4} />
          </SC>
        </div>

        {/* RIGHT */}
        <div className="col-stack">

          {/* Habitudes */}
          <div className="section-block">
            <div className="section-block-header">
              <div className="section-block-title"><span>🌿</span> Habitudes de vie</div>
              <button className="d-link" onClick={() => navigate('/page4')}>Modifier ↗</button>
            </div>
            <div className="section-block-body">
              <div className="info-grid">
                <InfoItem label="Tabagisme"         value={data.tabac} />
                <InfoItem label="Alcool"             value={data.alcool} />
                <InfoItem label="Activité physique"  value={data.sport} />
                <InfoItem label="IMC"                value={data.imc ? parseFloat(data.imc).toFixed(1) : ''} />
                <InfoItem label="Poids"              value={data.poids} unit=" kg" />
                <InfoItem label="Alimentation"       value={data.alim} />
              </div>
              <div style={{ marginTop:12 }}>
                <div className="info-key" style={{ marginBottom:6 }}>Antécédents familiaux</div>
                <div className={`info-val ${!data.antFam ? 'empty' : ''}`}>{data.antFam || 'Non renseigné'}</div>
              </div>
              <div style={{ marginTop:12 }}>
                <div className="info-key" style={{ marginBottom:6 }}>Allergies</div>
                <div className={`info-val ${!data.allergies ? 'empty' : ''}`}>{data.allergies || 'Non renseigné'}</div>
              </div>
            </div>
          </div>

          {/* Observations */}
          <SC label="Observations du médecin">
            <div style={{ fontSize:13, fontWeight:600, lineHeight:1.6,
              color: data.observations ? 'var(--text)' : 'var(--text-muted)',
              fontStyle: data.observations ? 'normal' : 'italic' }}>
              {data.observations || 'Aucune observation saisie.'}
            </div>
          </SC>

          {/* Erreur */}
          {saveError && (
            <div style={{ background:'rgba(255,107,107,0.1)', border:'1.5px solid rgba(255,107,107,0.3)',
              borderRadius:12, padding:'14px 18px', fontSize:13, color:'#FF6B6B', fontWeight:700 }}>
              ⚠ {saveError}
            </div>
          )}

          {/* Confirmation */}
          <SC label="Confirmation avant enregistrement" style={{ borderColor:'rgba(74,108,247,0.3)' }}>
            {[
              { key:'c1', text:'Je certifie que les informations saisies sont exactes et correspondent au dossier médical du patient.' },
              { key:'c2', text:"Le patient ou son représentant légal a donné son consentement à l'enregistrement de ces données." },
              { key:'c3', text:'Ces données seront traitées conformément à la réglementation en vigueur sur la confidentialité médicale.' },
            ].map(({ key, text }) => (
              <div key={key} className={`confirm-check ${unc.includes(key) ? 'unchecked' : ''}`}>
                <input type="checkbox" checked={checks[key]} onChange={() => toggleCheck(key)} />
                <span>{text}</span>
              </div>
            ))}
          </SC>
        </div>
      </div>

      <BtnRow
        onBack={() => navigate('/page4')}
        onNext={handleSave}
        nextLabel={saving ? '⏳ Enregistrement…' : '✔ Enregistrer le patient'}
        nextClass="btn-success"
      />

      {duplicateModal && (
        <DuplicateDetectionModal
          patientExistant={duplicateModal.existing}
          patientNouveau={duplicateModal.candidate}
          onClose={() => setDuplicateModal(null)}
          onConfirm={(fusionData, note, existingId, action) =>
            handleModalConfirm(fusionData, note, existingId, action)
          }
        />
      )}
    </Layout>
  );
}


