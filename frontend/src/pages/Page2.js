import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import Layout from '../components/Layout';
import { PageHeader, BtnRow } from '../components/FormFields';
import { MicButton } from '../components/MicButton';
import CustomFieldsRenderer from '../components/CustomFieldsRenderer';

/* ─── Données ─────────────────────────────────────────────────────────────── */

const ORGANES = [
  'Sein','Poumon','Côlon / Rectum','Prostate','Col de l\'utérus','Thyroïde',
  'Foie / Voies biliaires','Estomac','Pancréas','Ovaire','Rein','Vessie',
  'Os / Tissu mou','Lymphome','Leucémie','Mélanome cutané','Cerveau / SNC','ORL','Autre',
];

const SOUS_TYPES = {
  'Sein':                   ['Canalaire invasif','Lobulaire invasif','Inflammatoire','Tubulaire','Mucineux','Médullaire','Papillaire','Triple négatif','Autre'],
  'Poumon':                 ['Adénocarcinome','Carcinome épidermoïde','Carcinome à petites cellules','Carcinome à grandes cellules','Carcinome neuroendocrine','Autre'],
  'Côlon / Rectum':         ['Adénocarcinome','Tumeur neuroendocrine','Lymphome colorectal','Tumeur stromale','Autre'],
  'Prostate':               ['Adénocarcinome acinaire','Adénocarcinome canalaire','Carcinome neuroendocrine','Carcinome à petites cellules','Autre'],
  "Col de l'utérus":        ['Carcinome épidermoïde','Adénocarcinome','Adénosquameux','Neuroendocrine','Autre'],
  'Thyroïde':               ['Papillaire','Folliculaire','Médullaire','Anaplasique','Autre'],
  'Foie / Voies biliaires': ['Carcinome hépatocellulaire','Cholangiocarcinome','Angiosarcome','Hépatoblastome','Autre'],
  'Estomac':                ['Adénocarcinome intestinal','Adénocarcinome diffus','Lymphome MALT','Tumeur stromale (GIST)','Autre'],
  'Pancréas':               ['Adénocarcinome canalaire','Tumeur neuroendocrine','Cystadénocarcinome','Tumeur pseudopapillaire','Autre'],
  'Ovaire':                 ['Séreux','Mucineux','Endométrioïde','أ€ cellules claires','Tumeur germinale','Autre'],
  'Rein':                   ['Carcinome à cellules claires','Carcinome papillaire','Carcinome chromophobe','Tumeur de Wilms','Autre'],
  'Vessie':                 ['Carcinome urothélial','Carcinome épidermoïde','Adénocarcinome','Carcinome à petites cellules','Autre'],
  'Os / Tissu mou':         ['Ostéosarcome','Sarcome d\'Ewing','Chondrosarcome','Liposarcome','Fibrosarcome','Autre'],
  'Lymphome':               ['Hodgkin classique','Hodgkin nodulaire','B diffus grandes cellules','Folliculaire','MALT','Burkitt','T périphérique','Autre'],
  'Leucémie':               ['Myéloïde aiguë (LAM)','Lymphoïde aiguë (LAL)','Myéloïde chronique (LMC)','Lymphoïde chronique (LLC)','Autre'],
  'Mélanome cutané':        ['Superficiel extensif','Nodulaire','Lentigo malin','Acral lentigineux','Autre'],
  'Cerveau / SNC':          ['Glioblastome','Astrocytome','Oligodendrogliome','Épendymome','Médulloblastome','Méningiome','Autre'],
  'ORL':                    ['Carcinome épidermoïde cavité buccale','Carcinome nasopharynx','Carcinome larynx','Adénocarcinome glandes salivaires','Autre'],
  'Autre':                  ['Non spécifié'],
};

const TNM_T = ['Tx','T0','Tis','T1','T1a','T1b','T2','T2a','T2b','T3','T4','T4a','T4b'];
const TNM_N = ['Nx','N0','N1','N1a','N1b','N2','N2a','N2b','N2c','N3'];
const TNM_M = ['Mx','M0','M1','M1a','M1b','M1c'];
const STADES = ['I','II','III','IV'];

const HISTO_TYPES = [
  'Adénocarcinome','Carcinome épidermoïde','Carcinome canalaire infiltrant',
  'Carcinome lobulaire infiltrant','Carcinome in situ',
  'Lymphome B diffus à grandes cellules','Lymphome de Hodgkin','Lymphome T périphérique',
  'Leucémie myéloïde aiguë','Leucémie lymphoïde chronique',
  'Sarcome des parties molles','Mélanome','Glioblastome','Carcinome hépatocellulaire','Autre',
];
const GRADE_HISTO = [
  'Grade 1 — Bien différencié','Grade 2 — Modérément différencié',
  'Grade 3 — Peu différencié','Grade 4 — Indifférencié','Grade X — Non déterminable',
];
const BASE_DIAG = [
  'Histologie','Cytologie','Imagerie seule','Clinique seule','Marqueurs biologiques',
  'Laparoscopie / Chirurgie exploratrice','Autopsie','Autre',
];
const SITES_META = ['Poumon','Foie','Os','Cerveau','Ganglions','Péritoine','Peau','Surrénale','Rein','Plèvre','Autre'];
const CIM10_LIST = [
  {code:'C50', label:'C50 — Sein',                  canreg:'C50.9', sym:'BR'},
  {code:'C34', label:'C34 — Bronches et poumon',     canreg:'C34.9', sym:'LU'},
  {code:'C18', label:'C18 — Côlon',                  canreg:'C18.9', sym:'CO'},
  {code:'C61', label:'C61 — Prostate',               canreg:'C61.9', sym:'PR'},
  {code:'C53', label:"C53 — Col de l'utérus",        canreg:'C53.9', sym:'CX'},
  {code:'C73', label:'C73 — Thyroïde',               canreg:'C73.9', sym:'TH'},
  {code:'C22', label:'C22 — Foie',                   canreg:'C22.0', sym:'LI'},
  {code:'C16', label:'C16 — Estomac',                canreg:'C16.9', sym:'ST'},
  {code:'C25', label:'C25 — Pancréas',               canreg:'C25.9', sym:'PA'},
  {code:'C56', label:'C56 — Ovaire',                 canreg:'C56.9', sym:'OV'},
  {code:'C64', label:'C64 — Rein',                   canreg:'C64.9', sym:'KI'},
  {code:'C67', label:'C67 — Vessie',                 canreg:'C67.9', sym:'BL'},
  {code:'C81', label:'C81 — Hodgkin',                canreg:'C81.9', sym:'HD'},
  {code:'C91', label:'C91 — Leucémie lymphoïde',     canreg:'C91.1', sym:'LL'},
  {code:'C43', label:'C43 — Mélanome',               canreg:'C43.9', sym:'ME'},
  {code:'C71', label:'C71 — Cerveau',                canreg:'C71.9', sym:'CN'},
];

const CIM10_TO_ORGANE = {
  C50: 'Sein', C34: 'Poumon', C18: 'Côlon / Rectum', C61: 'Prostate',
  C53: "Col de l'utérus", C73: 'Thyroïde', C22: 'Foie / Voies biliaires', C16: 'Estomac',
  C25: 'Pancréas', C56: 'Ovaire', C64: 'Rein', C67: 'Vessie',
  C81: 'Lymphome', C91: 'Leucémie', C43: 'Mélanome cutané', C71: 'Cerveau / SNC',
};
const ORGANE_TO_CIM10 = Object.fromEntries(Object.entries(CIM10_TO_ORGANE).map(([code, organe]) => [organe, code]));
/* ─── Composants UI ──────────────────────────────────────────────────────── */

function SectionBlock({ label, color = '#4A6CF7', children }) {
  return (
    <div style={s.block}>
      <div style={{ ...s.blockHeader, borderLeftColor: color }}>
        <span style={{ ...s.blockLabel, color }}>{label}</span>
      </div>
      <div style={s.blockBody}>{children}</div>
    </div>
  );
}

function Row({ cols = 2, gap = 12, children, mt = 0 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap, marginTop:mt }}>
      {children}
    </div>
  );
}

function F({ label, required, children, mt = 0 }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:mt }}>
      {label && (
        <label style={s.label}>
          {label}
          {required && <span style={{ color:'#FF6B6B', marginLeft:3 }}>*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, unit }) {
  return (
    <div style={{ position:'relative' }}>
      <input
        type={type} value={value || ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ ...s.input, paddingRight: unit ? 44 : 12 }}
      />
      {unit && <span style={s.unit}>{unit}</span>}
    </div>
  );
}

/* Elegant select with chevron icon */
function Sel({ value, onChange, options, placeholder, icon }) {
  return (
    <div style={{ position:'relative' }}>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={s.select}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o =>
          typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.code} value={o.code}>{o.label}</option>
        )}
      </select>
      <span style={s.selIcon}>{icon || '▾'}</span>
    </div>
  );
}

function MultiCheck({ options, value = [], onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter(x=>x!==o) : [...value,o]);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {options.map(o => (
        <label key={o} style={s.checkRow}>
          <div style={{ ...s.checkbox, ...(value.includes(o)?s.checkboxOn:{}) }}>
            {value.includes(o) && <span style={s.checkMark}>✓</span>}
          </div>
          <span style={s.checkLabel}>{o}</span>
          <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} style={{ display:'none' }} />
        </label>
      ))}
    </div>
  );
}

function MultiTags({ options, value = [], onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter(x=>x!==o) : [...value,o]);
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {options.map(o => (
        <button key={o} type="button"
          style={{ ...s.tag, ...s.tagSmall, ...(value.includes(o)?s.tagSelPurple:{}) }}
          onClick={() => toggle(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={s.toggleRow}>
      <div style={{ ...s.toggleTrack, ...(checked?s.toggleOn:{}) }} onClick={() => onChange(!checked)}>
        <div style={{ ...s.toggleThumb, ...(checked?s.toggleThumbOn:{}) }} />
      </div>
      <span style={s.toggleLabel}>{label}</span>
    </label>
  );
}

function RecepteurRow({ label, value, onChange, options, colors }) {
  return (
    <div style={s.recRow}>
      <span style={s.recLabel}>{label}</span>
      <div style={{ display:'flex', gap:6 }}>
        {options.map((opt, i) => {
          const active = value === opt;
          return (
            <button key={opt} type="button"
              style={{
                ...s.recBtn,
                ...(active ? { background:colors[i]+'18', borderColor:colors[i], color:colors[i], fontWeight:900 } : {}),
              }}
              onClick={() => onChange(active ? '' : opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────────────────────── */

export default function Page2() {
  const navigate = useNavigate();
  const { data, update } = usePatient();
  const up  = (k) => (v) => update({ [k]: v });
  const upE = (k) => (e) => update({ [k]: e.target.value });

  const updateField = (key, value) => {
    if (key === 'organe') {
      update({
        organe: value,
        sous_type: '',
        cim10_code: ORGANE_TO_CIM10[value] || '',
        cim10_manual: ORGANE_TO_CIM10[value] ? '' : data.cim10_manual,
      });
      return;
    }
    if (key === 'cim10_code') {
      if (value === '__manual__') {
        update({ cim10_code: value });
        return;
      }
      update({
        cim10_code: value,
        cim10_manual: '',
        organe: CIM10_TO_ORGANE[value] || data.organe,
      });
      return;
    }
    if (key === 'cim10_manual') {
      update({ cim10_manual: value, cim10_code: '__manual__' });
      return;
    }
    if (['localise','metastatique','recidive'].includes(key)) {
      update({
        localise: key === 'localise' ? value : false,
        metastatique: key === 'metastatique' ? value : false,
        recidive: key === 'recidive' ? value : false,
      });
      return;
    }
    update({ [key]: value });
  };

  const sousTypes   = data.organe ? (SOUS_TYPES[data.organe] || ['Autre']) : [];
  const isTripleNeg = data.recepteur_er==='negatif' && data.recepteur_pr==='negatif' && data.her2==='negatif';

  return (
    <Layout currentStep={2} progress={40}>
      <PageHeader icon="🎗" iconBg="linear-gradient(135deg,#e74c3c,#c0392b)" title="Diagnostic & Cancer" step={2} />

      <div style={s.twoCol}>

        {/* ════ COLONNE GAUCHE ════ */}
        <div style={s.col}>

          {/* A — Localisation */}
          <SectionBlock label="A — Localisation anatomique" color="#e74c3c">

            <F label="Organe principal" required>
              <Sel
                options={ORGANES}
                placeholder="Sélectionner l'organe…"
                value={data.organe}
                onChange={v => updateField('organe', v)}
              />
            </F>

            {data.organe && (
              <F label={`Sous-type — ${data.organe}`} mt={12}>
                <Sel
                  options={sousTypes}
                  placeholder="Sélectionner le sous-type…"
                  value={data.sous_type}
                  onChange={up('sous_type')}
                />
              </F>
            )}

            <Row cols={2} mt={12}>
              <F label="Type de tumeur">
                <Sel
                  options={['Solide','Liquide','Hémato.']}
                  placeholder="—"
                  value={data.type_tumeur || data.typeT}
                  onChange={v => update({ type_tumeur: v, typeT: v })}
                />
              </F>
              <F label="Latéralité">
                <Sel
                  options={['Droit','Gauche','Bilatéral','N/A']}
                  placeholder="—"
                  value={data.lateralite || data.lat}
                  onChange={v => update({ lateralite: v, lat: v })}
                />
              </F>
            </Row>

            <F label="Code CIM-10 (optionnel)" mt={12}>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <select
                    style={s.select}
                    value={data.cim10_code || ''}
                    onChange={e => updateField('cim10_code', e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {CIM10_LIST.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    <option value="__manual__">Autre (saisir)</option>
                  </select>
                  <span style={s.selIcon}>▾</span>
                </div>
                {data.cim10_code === '__manual__' && (
                  <input style={{ ...s.input, width:110 }} placeholder="ex: C79.1"
                    value={data.cim10_manual||''} onChange={e => updateField('cim10_manual', e.target.value)} />
                )}
              </div>
            </F>
          </SectionBlock>

          {/* B — Histologie */}
          <SectionBlock label="B — Histologie" color="#9b59b6">
            <F label="Type histologique">
              <Sel
                options={HISTO_TYPES}
                placeholder="Sélectionner…"
                value={data.type_histologique || data.histo}
                onChange={v => update({ type_histologique: v, histo: v })}
              />
            </F>
            <F label="Grade histologique" mt={10}>
              <Sel
                options={GRADE_HISTO}
                placeholder="—"
                value={data.grade_histologique || data.grade}
                onChange={v => update({ grade_histologique: v, grade: v })}
              />
            </F>
            <F label="Taille tumorale" mt={10}>
              <Input value={data.taille_tumorale || data.taille} onChange={v => update({ taille_tumorale:v, taille:v })}
                type="number" placeholder="ex: 3.5" unit="cm" />
            </F>
            <F label="N° bloc anatomopathologique" mt={10}>
              <Input value={data.bloc_anapath} onChange={up('bloc_anapath')} placeholder="ex: AP-2026-04521" />
            </F>
          </SectionBlock>

          {/* C — Base de diagnostic */}
          <SectionBlock label="C — Base de diagnostic" color="#2980b9">
            <MultiCheck options={BASE_DIAG} value={data.base_diagnostic||[]} onChange={up('base_diagnostic')} />
          </SectionBlock>

        </div>

        {/* ════ COLONNE DROITE ════ */}
        <div style={s.col}>

          {/* D — TNM & Stade */}
          <SectionBlock label="D — Classification TNM & Stade" color="#27ae60">
            <F label="Stade clinique">
              <div style={{ display:'flex', gap:8 }}>
                {STADES.map(st => (
                  <button key={st} type="button"
                    style={{ ...s.stadeBtn, ...(data.stade_clinique===st||data.stade===st ? s.stadeBtnSel:{}) }}
                    onClick={() => update({ stade_clinique: data.stade_clinique===st?'':st, stade: data.stade===st?'':st })}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </F>

            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              {[
                { key:'tnmT', label:'T — Tumeur',   opts:TNM_T },
                { key:'tnmN', label:'N — Ganglion',  opts:TNM_N },
                { key:'tnmM', label:'M — Métastase', opts:TNM_M },
              ].map(({ key, label, opts }) => (
                <div key={key} style={{ flex:1, minWidth:0 }}>
                  <div style={s.tnmLabel}>{label}</div>
                  <div style={{ position:'relative' }}>
                    <select style={s.select} value={data[key]||''} onChange={upE(key)}>
                      <option value="">—</option>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <span style={s.selIcon}>▾</span>
                  </div>
                </div>
              ))}
            </div>

            <Row cols={2} mt={12}>
              <F label="Ganglions envahis">
                <Input value={data.ganglions_envahis} onChange={up('ganglions_envahis')} type="number" placeholder="ex: 2" unit="N+" />
              </F>
              <F label="Niveau topographique">
                <Sel
                  options={['1','2','3','4']}
                  placeholder="—"
                  value={data.topo}
                  onChange={v => update({ topo: v })}
                />
              </F>
            </Row>

            <F label="Statut" mt={12}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <Toggle label="Localisé"     checked={!!data.localise}     onChange={v => updateField('localise', v)} />
                <Toggle label="Métastatique" checked={!!data.metastatique} onChange={v => updateField('metastatique', v)} />
                <Toggle label="Récidive"     checked={!!data.recidive}     onChange={v => updateField('recidive', v)} />
              </div>
            </F>

            {data.metastatique && (
              <F label="Sites métastatiques" mt={12}>
                <MultiTags options={SITES_META} value={data.sites_metastatiques||[]} onChange={up('sites_metastatiques')} />
              </F>
            )}
          </SectionBlock>

          {/* E — Récepteurs */}
          <SectionBlock label="E — Récepteurs hormonaux & HER2" color="#e67e22">
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <RecepteurRow label="ER (إ’strogène)"    value={data.recepteur_er} onChange={up('recepteur_er')} options={['positif','negatif','inconnu']} colors={['#00C9A7','#FF6B6B','#7A8BAD']} />
              <RecepteurRow label="PR (Progestérone)" value={data.recepteur_pr} onChange={up('recepteur_pr')} options={['positif','negatif','inconnu']} colors={['#00C9A7','#FF6B6B','#7A8BAD']} />
              <RecepteurRow label="HER2"              value={data.her2}         onChange={up('her2')}         options={['positif','equivoque','negatif','inconnu']} colors={['#00C9A7','#FFA26B','#FF6B6B','#7A8BAD']} />
            </div>
            {isTripleNeg && (
              <div style={s.tripleNeg}>⚠ Triple négatif détecté — ER⁻ PR⁻ HER2⁻</div>
            )}
            <F label="Statut rapide (optionnel)" mt={10}>
              <MultiTags
                options={['RH+','RH−','HER2+','HER2−','Triple négatif']}
                value={data.recepteurs ? [data.recepteurs] : []}
                onChange={arr => update({ recepteurs: arr[arr.length-1] || '' })}
              />
            </F>
          </SectionBlock>

          {/* F — Dates */}
          <SectionBlock label="F — Dates clés" color="#16a085">
            <Row cols={2}>
              <F label="Premiers symptômes">
                <input style={s.input} type="date" value={data.date_symptomes||''} onChange={upE('date_symptomes')} />
              </F>
              <F label="Date de diagnostic" required>
                <input style={s.input} type="date"
                  value={data.date_diagnostic||data.diagDate||''}
                  onChange={e => update({ date_diagnostic:e.target.value, diagDate:e.target.value })} />
              </F>
            </Row>
            <Row cols={2} mt={10}>
              <F label="1ère consultation">
                <input style={s.input} type="date" value={data.consultDate||''} onChange={upE('consultDate')} />
              </F>
              <F label="Dernier RDV">
                <div style={{ position:'relative' }}>
                  <input style={s.input} type="date" value={data.dernier_rdv||''} onChange={upE('dernier_rdv')} />
                  {data.dernier_rdv && <span style={s.rdvBadge}>{getRdvLabel(data.dernier_rdv)}</span>}
                </div>
              </F>
            </Row>
          </SectionBlock>

          {/* G — Établissement & Médecin */}
          <SectionBlock label="G — Établissement & Médecin" color="#7f8c8d">
            <Row cols={2}>
              <F label="Établissement">
                <Input value={data.etablissement_diag} onChange={up('etablissement_diag')} placeholder="ex: CHU Tlemcen" />
              </F>
              <F label="Service">
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input style={{ ...s.input, flex:1 }} type="text" placeholder="ex: Oncologie"
                    value={data.service_diag||data.service||''}
                    onChange={e => update({ service_diag:e.target.value, service:e.target.value })} />
                  <MicButton onResult={t => update({ service_diag:t, service:t })} />
                </div>
              </F>
            </Row>
            <F label="Médecin diagnostiqueur / référent" mt={10}>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <input style={{ ...s.input, flex:1 }} type="text" placeholder="Dr. Nom Prénom"
                  value={data.medecin_diag||data.medecin||''}
                  onChange={e => update({ medecin_diag:e.target.value, medecin:e.target.value })} />
                <MicButton onResult={t => update({ medecin_diag:t, medecin:t })} />
              </div>
            </F>
          </SectionBlock>

        </div>
      </div>

      <CustomFieldsRenderer
        section="diagnostic"
        values={data.customFields || {}}
        onChange={(name, val) => update({
          customFields: { ...(data.customFields || {}), [name]: val },
        })}
      />

      {/* ── Boutons navigation — inchangés ── */}
      <BtnRow onBack={() => navigate('/page1')} onNext={() => navigate('/page6')} nextLabel="Suivant" />
    </Layout>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getRdvLabel(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  if (diff === 0)  return '🟢 Aujourd\'hui';
  if (diff <= 7)   return `🟢 ${diff}j`;
  if (diff <= 30)  return `🟡 ${diff}j`;
  if (diff <= 365) return `🟠 ${Math.floor(diff/30)} mois`;
  return `🔴 ${Math.floor(diff/365)} an(s)`;
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  twoCol: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:4 },
  col:    { display:'flex', flexDirection:'column', gap:14 },

  block: { background:'#fff', border:'1.5px solid #E8ECF5', borderRadius:14, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' },
  blockHeader: { padding:'12px 16px 10px', borderBottom:'1px solid #F0F3FA', borderLeft:'4px solid #4A6CF7', background:'#FAFBFF' },
  blockLabel: { fontSize:10.5, fontWeight:900, textTransform:'uppercase', letterSpacing:'1.2px', color:'#4A6CF7' },
  blockBody: { padding:'16px' },

  label: { fontSize:11.5, fontWeight:700, color:'#64748B', letterSpacing:'0.2px' },

  /* input classique (dates, number, text) */
  input: {
    width:'100%', padding:'9px 12px', boxSizing:'border-box',
    background:'#F8FAFF', border:'1.5px solid #E2E8F5',
    borderRadius:9, fontSize:13, color:'#1E293B',
    fontFamily:"'Nunito', sans-serif", outline:'none', transition:'border-color 0.15s',
  },

  /* select élégant — même look que input avec chevron */
  select: {
    width:'100%', padding:'9px 34px 9px 12px', boxSizing:'border-box',
    background:'#F8FAFF', border:'1.5px solid #E2E8F5',
    borderRadius:9, fontSize:13, color:'#1E293B',
    fontFamily:"'Nunito', sans-serif", outline:'none',
    appearance:'none', WebkitAppearance:'none', MozAppearance:'none',
    cursor:'pointer', transition:'border-color 0.15s',
  },
  selIcon: {
    position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
    fontSize:12, color:'#94A3B8', pointerEvents:'none', userSelect:'none',
  },

  unit: { position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:11, fontWeight:800, color:'#94A3B8', pointerEvents:'none' },

  tag: { padding:'6px 14px', borderRadius:30, fontSize:12.5, fontWeight:700, border:'1.5px solid #E2E8F5', background:'#fff', color:'#64748B', cursor:'pointer', transition:'0.12s', fontFamily:"'Nunito', sans-serif" },
  tagSmall: { padding:'5px 11px', fontSize:12 },
  tagSelPurple: { background:'#9b59b6', borderColor:'#9b59b6', color:'#fff', boxShadow:'0 3px 10px rgba(155,89,182,0.3)' },

  stadeBtn: { flex:1, padding:'9px 0', borderRadius:10, textAlign:'center', border:'2px solid #E2E8F5', background:'#F8FAFF', fontSize:14, fontWeight:900, cursor:'pointer', color:'#94A3B8', fontFamily:"'Poppins', sans-serif", transition:'0.15s' },
  stadeBtnSel: { background:'#27ae60', borderColor:'#27ae60', color:'#fff', boxShadow:'0 4px 14px rgba(39,174,96,0.35)' },

  tnmLabel: { fontSize:10.5, fontWeight:900, textAlign:'center', color:'#4A6CF7', letterSpacing:'0.8px', marginBottom:5, textTransform:'uppercase' },

  checkRow: { display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, border:'1.5px solid #E8ECF5', background:'#FAFBFF', cursor:'pointer' },
  checkbox: { width:18, height:18, borderRadius:5, flexShrink:0, border:'2px solid #CBD5E1', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', transition:'0.15s' },
  checkboxOn: { background:'#4A6CF7', borderColor:'#4A6CF7' },
  checkMark: { fontSize:11, color:'#fff', fontWeight:900 },
  checkLabel: { fontSize:12.5, fontWeight:600, color:'#334155' },

  toggleRow: { display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 12px', borderRadius:8, border:'1.5px solid #E8ECF5', background:'#FAFBFF' },
  toggleTrack: { width:40, height:21, borderRadius:30, background:'#CBD5E1', cursor:'pointer', position:'relative', transition:'0.2s', flexShrink:0 },
  toggleOn: { background:'#4A6CF7' },
  toggleThumb: { position:'absolute', top:2.5, left:2.5, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.15)' },
  toggleThumbOn: { left:21.5 },
  toggleLabel: { fontSize:13, fontWeight:700, color:'#334155' },

  recRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:9, border:'1.5px solid #E8ECF5', background:'#FAFBFF' },
  recLabel: { fontSize:13, fontWeight:700, color:'#334155', minWidth:145 },
  recBtn: { padding:'5px 11px', borderRadius:20, fontSize:12, fontWeight:700, border:'1.5px solid #E2E8F5', background:'#fff', cursor:'pointer', color:'#94A3B8', transition:'0.12s', fontFamily:"'Nunito', sans-serif" },

  tripleNeg: { marginTop:10, padding:'10px 14px', borderRadius:9, background:'rgba(255,107,107,0.07)', border:'1.5px solid rgba(255,107,107,0.25)', fontSize:12.5, fontWeight:800, color:'#e74c3c' },

  rdvBadge: { position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:10.5, fontWeight:800, whiteSpace:'nowrap', pointerEvents:'none', background:'rgba(74,108,247,0.08)', color:'#4A6CF7', padding:'2px 8px', borderRadius:20 },
};