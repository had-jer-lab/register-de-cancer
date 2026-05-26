import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import Layout from '../components/Layout';
import { PageHeader, BtnRow } from '../components/FormFields';
import CustomFieldsRenderer from '../components/CustomFieldsRenderer';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const TYPES = [
  { id:'chimio',   label:'Chimiothérapie',  color:'#4A6CF7', icon:'💊' },
  { id:'radio',    label:'Radiothérapie',   color:'#e74c3c', icon:'☢' },
  { id:'chirurgie',label:'Chirurgie',       color:'#27ae60', icon:'🔬' },
  { id:'hormono',  label:'Hormonothérapie', color:'#9b59b6', icon:'🧬' },
  { id:'immuno',   label:'Immunothérapie',  color:'#e67e22', icon:'🛡' },
  { id:'targeted', label:'Thérapie ciblée', color:'#16a085', icon:'🎯' },
];

const INTENTIONS = [
  {val:'curatif',       label:'Curatif'},
  {val:'adjuvant',      label:'Adjuvant'},
  {val:'neo_adjuvant',  label:'Néo-adjuvant'},
  {val:'palliatif',     label:'Palliatif'},
  {val:'prophylactique',label:'Prophylactique'},
];

const STATUTS = [
  {val:'planifie', label:'Planifié',  color:'#7A8BAD'},
  {val:'en_cours', label:'En cours',  color:'#4A6CF7'},
  {val:'termine',  label:'Terminé',   color:'#27ae60'},
  {val:'pause',    label:'Pause',     color:'#f39c12'},
  {val:'suspendu', label:'Suspendu',  color:'#e67e22'},
  {val:'abandonne',label:'Abandonné', color:'#e74c3c'},
];

const LIGNES = ['1ère ligne','2ème ligne','3ème ligne','4ème ligne et +','Néoadjuvant','Adjuvant'];
const VOIES  = ['IV (intraveineux)','PO (oral)','SC (sous-cutané)','IM (intramusculaire)','Topique','Intra-thécale','Intra-artérielle','Autre'];
const JOURS  = ['J1','J2','J3','J5','J7','J8','J14','J15','J21','J28'];
const REPONS = [
  {val:'RC',label:'RC — Rémission complète'},
  {val:'RP',label:'RP — Rémission partielle'},
  {val:'SD',label:'SD — Stabilisation'},
  {val:'PD',label:'PD — Progression'},
  {val:'NE',label:'NE — Non évaluable'},
];
const TOXICITES = ['Grade 0','Grade 1 — Léger','Grade 2 — Modéré','Grade 3 — Sévère','Grade 4 — Vital','Grade 5 — Décès'];

const emptyT = (type) => ({
  _id: Date.now() + Math.random(),
  type_traitement: type,
  intention: '', statut: 'planifie', ligne: '1ère ligne',
  protocole: '', medicaments: '', voie_administration: '',
  jours_administration: [], cycles_prevus: '', cycles_realises: '',
  date_debut: '', date_fin: '',
  reponse_tumorale: '', date_evaluation: '',
  grade_toxicite: '', description_toxicite: '',
});

/* ─── StatusBadge ────────────────────────────────────────────────────────── */

function StatusBadge({ val }) {
  const s = STATUTS.find(x => x.val === val);
  if (!s) return null;
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:800,
      background: s.color+'18', color: s.color, border:`1.5px solid ${s.color}30`,
    }}>{s.label}</span>
  );
}

/* ─── Treatment Card ─────────────────────────────────────────────────────── */

function TCard({ t, open, onToggle, onUpdate, onDelete }) {
  const type = TYPES.find(x => x.id === t.type_traitement) || {};
  const up = (k, v) => onUpdate(t._id, k, v);
  const upE = (k) => (e) => up(k, e.target.value);

  const progPct = t.cycles_prevus && t.cycles_realises
    ? Math.min(100, Math.round((parseInt(t.cycles_realises) / parseInt(t.cycles_prevus)) * 100))
    : 0;

  return (
    <div style={{
      ...cs.card,
      outline: open ? `2px solid ${type.color}40` : 'none',
      boxShadow: open ? `0 6px 28px ${type.color}14` : '0 2px 8px rgba(0,0,0,0.04)',
    }}>

      {/* Header */}
      <div style={cs.cardHead} onClick={onToggle}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ ...cs.typeIcon, background: type.color+'18', color: type.color }}>
            {type.icon}
          </div>
          <div>
            <div style={cs.cardTitle}>{type.label}</div>
            <div style={cs.cardSub}>
              {t.protocole || 'Protocole non défini'}
              {t.statut && <span style={{ marginLeft:8 }}><StatusBadge val={t.statut} /></span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {t.cycles_prevus && t.cycles_realises && (
            <div style={{ ...cs.cyclesPill, color: type.color, background: type.color+'12', border:`1.5px solid ${type.color}25` }}>
              {t.cycles_realises}/{t.cycles_prevus} cycles
            </div>
          )}
          <button style={cs.delBtn} onClick={e => { e.stopPropagation(); onDelete(t._id); }}>✕</button>
          <span style={{ color:'#94A3B8', fontSize:12, transition:'transform 0.2s', display:'inline-block', transform: open ? 'rotate(180deg)':'rotate(0deg)' }}>▼</span>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={cs.cardBody}>

          {/* Ligne 1 */}
          <div style={cs.r3}>
            <div style={cs.fg}>
              <label style={cs.fl}>Intention thérapeutique</label>
              <select style={cs.fi} value={t.intention} onChange={upE('intention')}>
                <option value="">—</option>
                {INTENTIONS.map(i => <option key={i.val} value={i.val}>{i.label}</option>)}
              </select>
            </div>
            <div style={cs.fg}>
              <label style={cs.fl}>Statut</label>
              <select style={cs.fi} value={t.statut} onChange={upE('statut')}>
                {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
              </select>
            </div>
            <div style={cs.fg}>
              <label style={cs.fl}>Ligne de traitement</label>
              <select style={cs.fi} value={t.ligne} onChange={upE('ligne')}>
                {LIGNES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Ligne 2 */}
          <div style={{ ...cs.r2, marginTop:12 }}>
            <div style={cs.fg}>
              <label style={cs.fl}>Protocole</label>
              <input style={cs.fi} type="text" placeholder="ex: FOLFOX, AC-T, CHOP…"
                value={t.protocole} onChange={upE('protocole')} />
            </div>
            <div style={cs.fg}>
              <label style={cs.fl}>Médicaments</label>
              <input style={cs.fi} type="text" placeholder="ex: Doxorubicine, Cyclophosphamide…"
                value={t.medicaments} onChange={upE('medicaments')} />
            </div>
          </div>

          {/* Cycles + Voie */}
          <div style={{ ...cs.r3, marginTop:12 }}>
            <div style={cs.fg}>
              <label style={cs.fl}>Cycles prévus</label>
              <input style={cs.fi} type="number" min="0" placeholder="ex: 6"
                value={t.cycles_prevus} onChange={upE('cycles_prevus')} />
            </div>
            <div style={cs.fg}>
              <label style={cs.fl}>Cycles réalisés</label>
              <input style={cs.fi} type="number" min="0" placeholder="ex: 4"
                value={t.cycles_realises} onChange={upE('cycles_realises')} />
            </div>
            <div style={cs.fg}>
              <label style={cs.fl}>Voie d'administration</label>
              <select style={cs.fi} value={t.voie_administration} onChange={upE('voie_administration')}>
                <option value="">—</option>
                {VOIES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Barre cycles */}
          {t.cycles_prevus > 0 && (
            <div style={{ ...cs.progBar, marginTop:10 }}>
              <div style={{ ...cs.progFill, width:`${progPct}%`, background: type.color }} />
            </div>
          )}

          {/* Jours */}
          <div style={{ marginTop:12 }}>
            <label style={cs.fl}>Jours d'administration</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
              {JOURS.map(j => {
                const sel = (t.jours_administration||[]).includes(j);
                return (
                  <button key={j} type="button"
                    style={{ ...cs.jBtn, ...(sel ? { background: type.color, borderColor: type.color, color:'#fff' } : {}) }}
                    onClick={() => {
                      const arr = t.jours_administration || [];
                      up('jours_administration', sel ? arr.filter(x=>x!==j) : [...arr,j]);
                    }}
                  >{j}</button>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div style={{ ...cs.r2, marginTop:12 }}>
            <div style={cs.fg}>
              <label style={cs.fl}>Date de début</label>
              <input style={cs.fi} type="date" value={t.date_debut} onChange={upE('date_debut')} />
            </div>
            <div style={cs.fg}>
              <label style={cs.fl}>Date de fin (prévue)</label>
              <input style={cs.fi} type="date" value={t.date_fin} onChange={upE('date_fin')} />
            </div>
          </div>

          {/* Divider évaluation */}
          <div style={cs.evalDiv}>
            <div style={cs.evalLine} />
            <span style={cs.evalLabel}>Évaluation & Toxicité</span>
            <div style={cs.evalLine} />
          </div>

          <div style={cs.r3}>
            <div style={cs.fg}>
              <label style={cs.fl}>Réponse tumorale</label>
              <select style={cs.fi} value={t.reponse_tumorale} onChange={upE('reponse_tumorale')}>
                <option value="">—</option>
                {REPONS.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </div>
            <div style={cs.fg}>
              <label style={cs.fl}>Date d'évaluation</label>
              <input style={cs.fi} type="date" value={t.date_evaluation} onChange={upE('date_evaluation')} />
            </div>
            <div style={cs.fg}>
              <label style={cs.fl}>Grade de toxicité</label>
              <select style={cs.fi} value={t.grade_toxicite} onChange={upE('grade_toxicite')}>
                <option value="">—</option>
                {TOXICITES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop:12 }}>
            <label style={cs.fl}>Description de la toxicité</label>
            <textarea style={{ ...cs.fi, minHeight:68, resize:'vertical', marginTop:5 }}
              placeholder="Décrire les effets indésirables observés…"
              value={t.description_toxicite}
              onChange={upE('description_toxicite')}
            />
          </div>

        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */

export default function Page6() {
  const navigate = useNavigate();
  const { data, update } = usePatient();
  const [openId, setOpenId] = useState(null);

  const traitements = data.traitements || [];

  const add = (type) => {
    const t = emptyT(type);
    update({ traitements: [...traitements, t] });
    setOpenId(t._id);
  };

  const upT = (id, k, v) => {
    update({ traitements: traitements.map(t => t._id === id ? { ...t, [k]: v } : t) });
  };

  const del = (id) => {
    update({ traitements: traitements.filter(t => t._id !== id) });
    if (openId === id) setOpenId(null);
  };

  return (
    <Layout currentStep={3} progress={50}>
      <PageHeader icon="💊" iconBg="linear-gradient(135deg,#4A6CF7,#9b59b6)" title="Traitements oncologiques" step={3} />

      {/* Type selector */}
      <div style={cs.selector}>
        <div style={cs.selectorTitle}>Ajouter un traitement</div>
        <div style={cs.selectorGrid}>
          {TYPES.map(t => (
            <button key={t.id} style={cs.sBtn} onClick={() => add(t.id)}>
              <span style={{ ...cs.sBtnIcon, background: t.color+'14', color: t.color }}>{t.icon}</span>
              <span style={cs.sBtnLabel}>+ {t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty */}
      {traitements.length === 0 && (
        <div style={cs.empty}>
          <div style={{ fontSize:36, marginBottom:8 }}>💊</div>
          <div style={cs.emptyTitle}>Aucun traitement ajouté</div>
          <div style={cs.emptySub}>Cliquez sur un type de traitement pour commencer</div>
        </div>
      )}

      {/* Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop: traitements.length ? 16 : 0 }}>
        {traitements.map(t => (
          <TCard
            key={t._id}
            t={t}
            open={openId === t._id}
            onToggle={() => setOpenId(openId === t._id ? null : t._id)}
            onUpdate={upT}
            onDelete={del}
          />
        ))}
      </div>

      {/* Summary */}
      {traitements.length > 1 && (
        <div style={cs.summary}>
          <div style={cs.summaryTitle}>Résumé — {traitements.length} traitement(s)</div>
          <div style={cs.summaryGrid}>
            {traitements.map(t => {
              const type = TYPES.find(x => x.id === t.type_traitement) || {};
              const int  = INTENTIONS.find(i => i.val === t.intention);
              return (
                <div key={t._id} style={cs.sumChip} onClick={() => setOpenId(t._id)}>
                  <span style={{ color: type.color, fontSize:18 }}>{type.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'#1E293B' }}>{type.label}</div>
                    {t.protocole && <div style={{ fontSize:11, color:'#64748B' }}>{t.protocole}</div>}
                    {int && <div style={{ fontSize:11, color: type.color, fontWeight:700 }}>{int.label}</div>}
                  </div>
                  <StatusBadge val={t.statut} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CustomFieldsRenderer
        section="traitement"
        values={data.customFields || {}}
        onChange={(name, val) => update({
          customFields: { ...(data.customFields || {}), [name]: val },
        })}
      />

      <BtnRow
        onBack={() => navigate('/page2')}
        onNext={() => navigate('/page3')}
        nextLabel="Suivant "
      />
    </Layout>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const cs = {
  selector: {
    background: '#F8FAFF', border: '1.5px solid #E2E8F5',
    borderRadius: 14, padding: '16px 18px',
  },
  selectorTitle: { fontSize: 11, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 12 },
  selectorGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 },
  sBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #E2E8F5', background: '#fff',
    cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: "'Nunito', sans-serif",
  },
  sBtnIcon: { width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 },
  sBtnLabel: { fontSize: 12, fontWeight: 800, color: '#334155' },

  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '50px 20px', marginTop: 16,
    border: '2px dashed #E2E8F5', borderRadius: 14,
    background: '#FAFBFF',
  },
  emptyTitle: { fontSize: 14, fontWeight: 800, color: '#334155' },
  emptySub:   { fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: 600 },

  card: {
    background: '#fff', border: '1.5px solid #E2E8F5',
    borderRadius: 14, overflow: 'hidden',
    transition: 'box-shadow 0.2s, outline 0.2s',
  },
  cardHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', cursor: 'pointer',
    background: '#FAFBFF', borderBottom: '1px solid #F0F3FA',
  },
  typeIcon: { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  cardTitle: { fontSize: 14, fontWeight: 800, color: '#1E293B' },
  cardSub:   { fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  cyclesPill: { fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 },
  delBtn: {
    width: 26, height: 26, borderRadius: 7,
    border: '1.5px solid rgba(231,76,60,0.2)', background: 'rgba(231,76,60,0.05)',
    cursor: 'pointer', fontSize: 11, color: '#e74c3c',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: '18px 18px 16px' },

  r2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  r3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  fg: { display: 'flex', flexDirection: 'column', gap: 5 },
  fl: { fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.2px' },
  fi: {
    background: '#F8FAFF', border: '1.5px solid #E2E8F5',
    borderRadius: 9, padding: '8px 12px',
    fontSize: 12.5, fontFamily: "'Nunito', sans-serif",
    color: '#1E293B', outline: 'none', width: '100%', boxSizing: 'border-box',
  },

  progBar: { height: 6, background: '#E2E8F5', borderRadius: 10, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 10, transition: 'width 0.4s ease' },

  jBtn: {
    padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 800,
    border: '1.5px solid #E2E8F5', background: '#F8FAFF',
    cursor: 'pointer', color: '#64748B', transition: '0.12s',
    fontFamily: "'Nunito', sans-serif",
  },

  evalDiv: { display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' },
  evalLine: { flex: 1, height: 1, background: '#E8ECF5' },
  evalLabel: { fontSize: 10.5, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' },

  summary: {
    marginTop: 16, padding: '16px 18px',
    background: 'linear-gradient(135deg, rgba(74,108,247,0.04), rgba(155,89,182,0.03))',
    border: '1.5px solid rgba(74,108,247,0.14)', borderRadius: 14,
  },
  summaryTitle: { fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 10 },
  summaryGrid:  { display: 'flex', flexDirection: 'column', gap: 8 },
  sumChip: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', background: '#fff',
    border: '1.5px solid #E2E8F5', borderRadius: 10,
    cursor: 'pointer',
  },
};