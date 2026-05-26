import React, { useState, useEffect, useCallback } from 'react';

import API_BASE from '../utils/apiConfig';

const API = API_BASE;

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) { localStorage.clear(); window.location.href = '/auth'; return null; }
  if (!res.ok) throw await res.json().catch(() => ({}));
  if (res.status === 204) return null;
  return res.json();
}

// ─── Catalogues d'examens ─────────────────────────────────────────────────────

const EXAMENS_BIOLOGIE = {
  'Marqueurs tumoraux': [
    'CEA', 'CA 19-9', 'CA 125', 'CA 15-3', 'AFP', 'PSA', 'PSA libre',
    'HCG', 'LDH', 'NSE', 'Chromogranine A', 'CYFRA 21-1',
  ],
  'Hémogramme': [
    'NFS (Numération Formule Sanguine)', 'Hémoglobine', 'Plaquettes',
    'Leucocytes', 'Neutrophiles', 'Lymphocytes',
  ],
  'Bilan hépatique': [
    'ALAT (SGPT)', 'ASAT (SGOT)', 'GGT', 'Phosphatases alcalines',
    'Bilirubine totale', 'Bilirubine directe', 'Albumine', 'TP / INR',
  ],
  'Bilan rénal': [
    'Créatinine', 'Urée', 'Acide urique', 'Ionogramme sanguin',
    'DFG (MDRD)', 'Protéinurie 24h',
  ],
  'Bilan métabolique': [
    'Glycémie à jeun', 'HbA1c', 'Cholestérol total', 'HDL', 'LDL',
    'Triglycérides', 'Calcémie', 'Phosphorémie', 'Magnésémie',
  ],
  'Coagulation': [
    'TP', 'TCA', 'Fibrinogène', 'D-dimères', 'Anti-Xa',
  ],
  'Biologie moléculaire': [
    'BRCA1 / BRCA2', 'HER2 (FISH)', 'EGFR mutation', 'KRAS / NRAS',
    'BRAF V600E', 'ALK réarrangement', 'PD-L1', 'MSI / MMR',
    'BCR-ABL (PCR)', 'JAK2 V617F',
  ],
  'Sérologies & Infections': [
    'HIV', 'Hépatite B (AgHBs, Ac anti-HBs, Ac anti-HBc)',
    'Hépatite C (Ac anti-VHC)', 'TPHA / VDRL', 'CMV (IgG/IgM)',
    'EBV (IgG/IgM)',
  ],
};

const EXAMENS_IMAGERIE = {
  'Scanner (TDM)': [
    'TDM thoracique', 'TDM abdomino-pelvien', 'TDM thoraco-abdomino-pelvien (TAP)',
    'TDM cérébral', 'TDM cervical', 'TDM rachis', 'Angio-TDM pulmonaire',
  ],
  'IRM': [
    'IRM cérébrale', 'IRM rachis cervical', 'IRM rachis lombaire',
    'IRM hépatique', 'IRM prostatique', 'IRM sein', 'IRM pelvienne',
    'IRM corps entier', 'IRM cardiaque',
  ],
  'Échographie': [
    'Échographie abdominale', 'Échographie pelvienne', 'Échographie thyroïdienne',
    'Échographie des parties molles', 'Échographie ganglionnaire',
    'Échographie mammaire', 'Doppler veineux membres inférieurs',
    'Écho-endoscopie', 'Échographie trans-rectale',
  ],
  'Médecine nucléaire': [
    'TEP-TDM au 18F-FDG', 'TEP-TDM PSMA', 'Scintigraphie osseuse',
    'Scintigraphie thyroïdienne', 'MIBG', 'Octréoscan',
  ],
  'Radiologie conventionnelle': [
    'Radiographie thoracique (face + profil)', 'Radiographie osseuse',
    'Radiographie du rachis', 'Mammographie bilatérale',
    'Transit إ“so-gastro-duodénal', 'Lavement opaque',
  ],
  'Interventionnel': [
    'Biopsie scanno-guidée', 'Biopsie écho-guidée',
    'Drainage scanno-guidé', 'Embolisation artérielle',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const URGENCE_CONFIG = {
  normal:      { label: 'Normal',      color: '#059669', bg: '#d1fae5' },
  urgent:      { label: 'Urgent',      color: '#d97706', bg: '#fef3c7' },
  tres_urgent: { label: 'Très urgent', color: '#dc2626', bg: '#fee2e2' },
};

const STATUT_CONFIG = {
  en_attente:          { label: 'En attente',           color: '#7A8BAD', bg: '#F5F8FF' },
  en_cours:            { label: 'En cours',             color: '#d97706', bg: '#fef3c7' },
  resultat_disponible: { label: 'Résultat disponible',  color: '#059669', bg: '#d1fae5' },
  annule:              { label: 'Annulé',               color: '#dc2626', bg: '#fee2e2' },
};

function UrgenceBadge({ urgence }) {
  const c = URGENCE_CONFIG[urgence] || URGENCE_CONFIG.normal;
  return (
    <span style={{ ...sty.badge, color: c.color, background: c.bg }}>
      {urgence === 'tres_urgent' ? '🔴 ' : urgence === 'urgent' ? '🟡 ' : '🟢 '}
      {c.label}
    </span>
  );
}

function StatutBadge({ statut }) {
  const c = STATUT_CONFIG[statut] || STATUT_CONFIG.en_attente;
  return (
    <span style={{ ...sty.badge, color: c.color, background: c.bg }}>{c.label}</span>
  );
}

function TypeBadge({ type }) {
  const isBio = type === 'biologie';
  return (
    <span style={{
      ...sty.badge,
      color:      isBio ? '#1d4ed8' : '#7c3aed',
      background: isBio ? '#dbeafe' : '#ede9fe',
    }}>
      {isBio ? '🧪 Biologie' : '🏥 Imagerie'}
    </span>
  );
}

// ─── Catalogue (sélecteur d'examens) ─────────────────────────────────────────

function ExamenCatalogue({ typeDemande, selected, onToggle, search, setSearch }) {
  const catalogue = typeDemande === 'biologie' ? EXAMENS_BIOLOGIE : EXAMENS_IMAGERIE;

  return (
    <div style={sty.catalogue}>
      <div style={sty.catalogueSearch}>
        <span style={sty.catalogueSearchIcon}>🔍</span>
        <input
          style={sty.catalogueSearchInput}
          placeholder="Rechercher un examen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button style={sty.catalogueClear} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {selected.length > 0 && (
        <div style={sty.selectedBubbles}>
          {selected.map(ex => (
            <span key={ex} style={sty.selectedBubble}>
              {ex}
              <button style={sty.bubbleRemove} onClick={() => onToggle(ex)}>✕</button>
            </span>
          ))}
        </div>
      )}

      <div style={sty.catalogueScroll}>
        {Object.entries(catalogue).map(([groupe, examens]) => {
          const filtered = search
            ? examens.filter(e => e.toLowerCase().includes(search.toLowerCase()))
            : examens;
          if (filtered.length === 0) return null;
          return (
            <div key={groupe} style={sty.catalogueGroupe}>
              <div style={sty.catalogueGroupeTitle}>{groupe}</div>
              <div style={sty.catalogueGroupeItems}>
                {filtered.map(ex => {
                  const isSel = selected.includes(ex);
                  return (
                    <button
                      key={ex}
                      type="button"
                      style={{ ...sty.examenChip, ...(isSel ? sty.examenChipSel : {}) }}
                      onClick={() => onToggle(ex)}
                    >
                      {isSel && <span style={sty.chipCheck}>✓</span>}
                      {ex}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modal de création ────────────────────────────────────────────────────────

export function ModalDemandeExamen({ patientId, cancers = [], onClose, onSaved }) {
  const [step, setStep]     = useState(1); // 1=type+urgence, 2=examens, 3=contexte
  const [form, setForm]     = useState({
    type_demande:     'biologie',
    urgence:          'normal',
    cancer:           cancers[0]?.id || '',
    examens_demandes: [],
    motif_clinique:   '',
    observations:     '',
    date_souhaitee:   '',
  });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleExamen = (ex) => {
    setForm(f => ({
      ...f,
      examens_demandes: f.examens_demandes.includes(ex)
        ? f.examens_demandes.filter(e => e !== ex)
        : [...f.examens_demandes, ex],
    }));
  };

  const getApiErrorMessage = (err) => {
    const data = err?.response?.data || err;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      return Object.values(data).flat().join(' ') || 'Veuillez vérifier les champs';
    }
    return 'Veuillez vérifier les champs';
  };

  const handleSubmit = async () => {
    const typeDemande = (form.type_demande || '').trim() || 'biologie';
    const urgence = (form.urgence || '').trim() || 'normal';
    if (form.examens_demandes.length === 0) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        patient: Number(patientId),
        type_demande: typeDemande,
        urgence,
        examens_demandes: form.examens_demandes,
      };
      const motif = form.motif_clinique?.trim();
      const obs = form.observations?.trim();
      if (motif) payload.motif_clinique = motif;
      if (obs) payload.observations = obs;
      if (form.cancer) payload.cancer = Number(form.cancer);
      if (form.date_souhaitee) payload.date_souhaitee = form.date_souhaitee;
      await apiFetch(`/patients/${patientId}/demandes/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    { n: 1, label: 'Type & Urgence' },
    { n: 2, label: 'Examens'        },
    { n: 3, label: 'Contexte'       },
  ];

  return (
    <div style={sty.modalBackdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={sty.modal}>

        {/* Header */}
        <div style={sty.modalHeader}>
          <div style={sty.modalHeaderLeft}>
            <div style={sty.modalHeaderIcon}>
              {form.type_demande === 'biologie' ? '🧪' : '🏥'}
            </div>
            <div>
              <div style={sty.modalTitle}>Nouvelle demande d'examen</div>
              <div style={sty.modalSub}>Patient #{patientId}</div>
            </div>
          </div>
          <button style={sty.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Steps indicator */}
        <div style={sty.stepsBar}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ ...sty.stepItem, ...(step >= s.n ? sty.stepActive : {}) }}
                onClick={() => step > s.n && setStep(s.n)}>
                <div style={{ ...sty.stepNum, ...(step >= s.n ? sty.stepNumActive : {}) }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span style={sty.stepLabel}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ ...sty.stepLine, ...(step > s.n ? sty.stepLineActive : {}) }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div style={sty.modalBody}>
          {error && <div style={sty.errorBanner}>⚠ {error}</div>}

          {/* ── ÉTAPE 1 : Type & Urgence ── */}
          {step === 1 && (
            <div>
              <div style={sty.fieldGroup}>
                <label style={sty.fieldLabel}>Type de demande</label>
                <div style={sty.typeCards}>
                  {[
                    { val: 'biologie',  icon: '🧪', title: 'Bilan biologique',       sub: 'NFS, marqueurs tumoraux, biochimie, biologie moléculaire…' },
                    { val: 'imagerie',  icon: '🏥', title: 'Imagerie radiologique',  sub: 'Scanner, IRM, échographie, médecine nucléaire…' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      style={{ ...sty.typeCard, ...(form.type_demande === opt.val ? sty.typeCardSel : {}) }}
                      onClick={() => { up('type_demande', opt.val); up('examens_demandes', []); setSearch(''); }}
                    >
                      <span style={sty.typeCardIcon}>{opt.icon}</span>
                      <span style={sty.typeCardTitle}>{opt.title}</span>
                      <span style={sty.typeCardSub}>{opt.sub}</span>
                      {form.type_demande === opt.val && <span style={sty.typeCardCheck}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div style={sty.fieldGroup}>
                <label style={sty.fieldLabel}>Degré d'urgence</label>
                <div style={sty.urgenceCards}>
                  {Object.entries(URGENCE_CONFIG).map(([val, cfg]) => (
                    <button
                      key={val}
                      type="button"
                      style={{ ...sty.urgenceBtn, ...(form.urgence === val ? { ...sty.urgenceBtnSel, color: cfg.color, background: cfg.bg, borderColor: cfg.color } : {}) }}
                      onClick={() => up('urgence', val)}
                    >
                      {val === 'tres_urgent' ? '🔴' : val === 'urgent' ? '🟡' : '🟢'} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {cancers.length > 0 && (
                <div style={sty.fieldGroup}>
                  <label style={sty.fieldLabel}>Cancer associé (optionnel)</label>
                  <select style={sty.select}
                    value={form.cancer}
                    onChange={e => up('cancer', e.target.value)}>
                    <option value="">— Non associé à un cancer spécifique</option>
                    {cancers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.cancer_type_name || 'Type inconnu'} — {c.date_diagnostic || 'Date inconnue'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── ÉTAPE 2 : Sélection des examens ── */}
          {step === 2 && (
            <div>
              <div style={sty.examCountBar}>
                <span style={sty.examCountText}>
                  {form.examens_demandes.length} examen{form.examens_demandes.length !== 1 ? 's' : ''} sélectionné{form.examens_demandes.length !== 1 ? 's' : ''}
                </span>
                {form.examens_demandes.length > 0 && (
                  <button style={sty.clearAllBtn}
                    onClick={() => up('examens_demandes', [])}>
                    Tout effacer
                  </button>
                )}
              </div>
              <ExamenCatalogue
                typeDemande={form.type_demande}
                selected={form.examens_demandes}
                onToggle={toggleExamen}
                search={search}
                setSearch={setSearch}
              />
            </div>
          )}

          {/* ── ÉTAPE 3 : Contexte clinique ── */}
          {step === 3 && (
            <div>
              <div style={sty.fieldGroup}>
                <label style={sty.fieldLabel}>Motif clinique *</label>
                <textarea
                  style={{ ...sty.input, minHeight: 90, resize: 'vertical' }}
                  placeholder="Contexte clinique justifiant la demande (ex : bilan pré-chimiothérapie, surveillance sous traitement, suspicion de rechute…)"
                  value={form.motif_clinique}
                  onChange={e => up('motif_clinique', e.target.value)}
                />
              </div>

              <div style={sty.fieldGroup}>
                <label style={sty.fieldLabel}>Date souhaitée</label>
                <input type="date" style={sty.input}
                  value={form.date_souhaitee}
                  onChange={e => up('date_souhaitee', e.target.value)} />
              </div>

              <div style={sty.fieldGroup}>
                <label style={sty.fieldLabel}>Observations / instructions particulières</label>
                <textarea
                  style={{ ...sty.input, minHeight: 70, resize: 'vertical' }}
                  placeholder="Ex: patient sous anticoagulants, jeûn obligatoire, contre-indication au produit de contraste…"
                  value={form.observations}
                  onChange={e => up('observations', e.target.value)}
                />
              </div>

              {/* Récapitulatif */}
              <div style={sty.recap}>
                <div style={sty.recapTitle}>📋 Récapitulatif de la demande</div>
                <div style={sty.recapRow}>
                  <TypeBadge type={form.type_demande} />
                  <UrgenceBadge urgence={form.urgence} />
                </div>
                <div style={sty.recapExamens}>
                  {form.examens_demandes.length === 0 ? (
                    <span style={{ color: '#dc2626', fontSize: 12 }}>⚠ Aucun examen sélectionné</span>
                  ) : (
                    form.examens_demandes.map(ex => (
                      <span key={ex} style={sty.recapExamen}>{ex}</span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={sty.modalFooter}>
          <button style={sty.btnGhost} onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'Annuler' : '← Précédent'}
          </button>
          {step < 3 ? (
            <button style={sty.btnPrimary} onClick={() => {
              if (step === 2 && form.examens_demandes.length === 0) {
                setError('Veuillez sélectionner au moins un examen.');
                return;
              }
              setError('');
              setStep(s => s + 1);
            }}>
              Suivant →
            </button>
          ) : (
            <button
              style={{ ...sty.btnSuccess, opacity: saving ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? '⏳ Envoi…' : '✓ Envoyer la demande'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Carte d'une demande ──────────────────────────────────────────────────────

function DemandeCard({ demande, onUpdateStatut, canEdit }) {
  const [open, setOpen] = useState(false);
  const [editStatut, setEditStatut] = useState(false);
  const [newStatut, setNewStatut]   = useState(demande.statut);
  const [resultat,  setResultat]    = useState(demande.resultat_texte || '');
  const [dateRes,   setDateRes]     = useState(demande.date_resultat  || '');
  const [saving,    setSaving]      = useState(false);

  const handleSaveStatut = async () => {
    setSaving(true);
    try {
      await onUpdateStatut(demande.id, { statut: newStatut, resultat_texte: resultat, date_resultat: dateRes || null });
      setEditStatut(false);
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (str) => {
    if (!str) return '—';
    try { const [y, m, d] = str.includes('T') ? str.split('T')[0].split('-') : str.split('-'); return `${d}/${m}/${y}`; }
    catch { return str; }
  };

  return (
    <div style={{ ...sty.demandeCard, ...(demande.urgence === 'tres_urgent' ? sty.demandeCardUrgent : {}) }}>
      {/* Header de la carte */}
      <button style={sty.demandeCardToggle} onClick={() => setOpen(o => !o)}>
        <div style={sty.demandeCardLeft}>
          <span style={sty.demandeTypeIcon}>{demande.type_demande === 'biologie' ? '🧪' : '🏥'}</span>
          <div>
            <div style={sty.demandeCardTitle}>
              {demande.type_demande === 'biologie' ? 'Bilan biologique' : 'Imagerie radiologique'}
              <span style={sty.demandeExamCount}>{demande.examens_demandes?.length || 0} examen(s)</span>
            </div>
            <div style={sty.demandeCardMeta}>
              {fmtDate(demande.date_demande)} · {demande.medecin_nom}
            </div>
          </div>
        </div>
        <div style={sty.demandeCardRight}>
          <UrgenceBadge urgence={demande.urgence} />
          <StatutBadge statut={demande.statut} />
          <span style={sty.chevron}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Corps déplié */}
      {open && (
        <div style={sty.demandeCardBody}>
          {/* Liste des examens */}
          <div style={sty.demandeSection}>
            <div style={sty.demandeSectionTitle}>Examens demandés</div>
            <div style={sty.demandeExamensList}>
              {(demande.examens_demandes || []).map((ex, i) => (
                <span key={i} style={sty.demandeExamen}>{ex}</span>
              ))}
            </div>
          </div>

          {/* Motif */}
          {demande.motif_clinique && (
            <div style={sty.demandeSection}>
              <div style={sty.demandeSectionTitle}>Motif clinique</div>
              <div style={sty.demandeSectionText}>{demande.motif_clinique}</div>
            </div>
          )}

          {/* Observations */}
          {demande.observations && (
            <div style={sty.demandeSection}>
              <div style={sty.demandeSectionTitle}>Instructions particulières</div>
              <div style={sty.demandeSectionText}>{demande.observations}</div>
            </div>
          )}

          {/* Date souhaitée */}
          {demande.date_souhaitee && (
            <div style={sty.demandeSection}>
              <div style={sty.demandeSectionTitle}>Date souhaitée</div>
              <div style={sty.demandeSectionText}>{fmtDate(demande.date_souhaitee)}</div>
            </div>
          )}

          {/* Résultat disponible */}
          {demande.statut === 'resultat_disponible' && demande.resultat_texte && (
            <div style={sty.resultatBox}>
              <div style={sty.resultatTitle}>✅ Résultat</div>
              <div style={sty.resultatText}>{demande.resultat_texte}</div>
              {demande.date_resultat && (
                <div style={sty.resultatDate}>Rendu le {fmtDate(demande.date_resultat)}</div>
              )}
            </div>
          )}

          {/* Mise à jour du statut (médecin ou biologiste) */}
          {canEdit && (
            <div style={sty.demandeActions}>
              {!editStatut ? (
                <button style={sty.btnEditStatut} onClick={() => setEditStatut(true)}>
                  ✏ Mettre à jour le statut
                </button>
              ) : (
                <div style={sty.editStatutForm}>
                  <div style={sty.editStatutRow}>
                    <select style={sty.select} value={newStatut} onChange={e => setNewStatut(e.target.value)}>
                      {Object.entries(STATUT_CONFIG).map(([val, cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  {newStatut === 'resultat_disponible' && (
                    <>
                      <textarea
                        style={{ ...sty.input, minHeight: 80, resize: 'vertical', marginTop: 8 }}
                        placeholder="Saisir le résultat ou conclusions…"
                        value={resultat}
                        onChange={e => setResultat(e.target.value)}
                      />
                      <input type="date" style={{ ...sty.input, marginTop: 8 }}
                        value={dateRes} onChange={e => setDateRes(e.target.value)} />
                    </>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={sty.btnGhost} onClick={() => setEditStatut(false)}>Annuler</button>
                    <button style={{ ...sty.btnPrimary, opacity: saving ? 0.7 : 1 }}
                      onClick={handleSaveStatut} disabled={saving}>
                      {saving ? 'Enregistrement…' : '✓ Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Onglet principal (à intégrer dans PatientDossier) ────────────────────────

export function OngletDemandes({ patientId, cancers = [] }) {
  const [demandes,    setDemandes]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [filterType,  setFilterType]  = useState('all');
  const [filterStat,  setFilterStat]  = useState('all');
  const [toast,       setToast]       = useState('');

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/patients/${patientId}/demandes/`);
      if (data) setDemandes(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleUpdateStatut = async (demandeId, payload) => {
    await apiFetch(`/patients/${patientId}/demandes/${demandeId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await load();
    showToast('✓ Statut mis à jour');
  };

  const filtered = demandes.filter(d => {
    if (filterType !== 'all' && d.type_demande !== filterType) return false;
    if (filterStat !== 'all' && d.statut !== filterStat) return false;
    return true;
  });

  // Compteurs
  const countBio   = demandes.filter(d => d.type_demande === 'biologie').length;
  const countImg   = demandes.filter(d => d.type_demande === 'imagerie').length;
  const countWait  = demandes.filter(d => d.statut === 'en_attente').length;
  const countReady = demandes.filter(d => d.statut === 'resultat_disponible').length;

  return (
    <div>
      {toast && <div style={sty.toast}>{toast}</div>}
      {showModal && (
        <ModalDemandeExamen
          patientId={patientId}
          cancers={cancers}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); showToast('✓ Demande envoyée'); }}
        />
      )}

      {/* Barre du haut */}
      <div style={sty.demandesTopBar}>
        <div style={sty.demandesStats}>
          {[
            { label: 'Biologiques',           value: countBio,   color: '#1d4ed8', bg: '#dbeafe' },
            { label: 'Imagerie',              value: countImg,   color: '#7c3aed', bg: '#ede9fe' },
            { label: 'En attente',            value: countWait,  color: '#d97706', bg: '#fef3c7' },
            { label: 'Résultats disponibles', value: countReady, color: '#059669', bg: '#d1fae5' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={sty.demandeMiniStat}>
              <span style={{ ...sty.demandeMiniValue, color }}>{value}</span>
              <span style={sty.demandeMiniLabel}>{label}</span>
            </div>
          ))}
        </div>
        <button style={sty.btnPrimary} onClick={() => setShowModal(true)}>
          ➕ Nouvelle demande
        </button>
      </div>

      {/* Filtres */}
      <div style={sty.filtersRow}>
        <div style={sty.filterGroup}>
          {[
            { val: 'all',      label: 'Tous' },
            { val: 'biologie', label: '🧪 Biologie' },
            { val: 'imagerie', label: '🏥 Imagerie' },
          ].map(f => (
            <button key={f.val}
              style={{ ...sty.filterBtn, ...(filterType === f.val ? sty.filterBtnActive : {}) }}
              onClick={() => setFilterType(f.val)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={sty.filterGroup}>
          {[
            { val: 'all',                  label: 'Tous statuts' },
            { val: 'en_attente',           label: 'En attente' },
            { val: 'en_cours',             label: 'En cours' },
            { val: 'resultat_disponible',  label: 'Résultats' },
          ].map(f => (
            <button key={f.val}
              style={{ ...sty.filterBtn, ...(filterStat === f.val ? sty.filterBtnActive : {}) }}
              onClick={() => setFilterStat(f.val)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={sty.loadingBox}>
          <div style={sty.loadingSpinner} />
          <span>Chargement des demandes…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={sty.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div>
          <div style={{ fontWeight: 700, color: '#1A2B4A', marginBottom: 6 }}>Aucune demande</div>
          <div style={{ fontSize: 13, color: '#7A8BAD' }}>
            Cliquez sur « Nouvelle demande » pour envoyer un bilan biologique ou une demande d'imagerie.
          </div>
        </div>
      ) : (
        <div>
          {filtered.map(d => (
            <DemandeCard
              key={d.id}
              demande={d}
              onUpdateStatut={handleUpdateStatut}
              canEdit={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const sty = {
  // Toast
  toast: {
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
    background: '#1A2B4A', color: '#fff', padding: '13px 24px',
    borderRadius: 14, fontSize: 14, fontWeight: 700,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },

  // Modal
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(10,20,50,0.5)',
    backdropFilter: 'blur(6px)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 28px 70px rgba(0,0,0,0.2)',
    fontFamily: "'Nunito', sans-serif",
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 24px', borderBottom: '1px solid #F0F4FF',
    flexShrink: 0,
  },
  modalHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  modalHeaderIcon: {
    width: 42, height: 42, borderRadius: 12,
    background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20,
  },
  modalTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 16, color: '#1A2B4A' },
  modalSub:   { fontSize: 12, color: '#7A8BAD', fontWeight: 600, marginTop: 2 },
  modalClose: {
    width: 32, height: 32, borderRadius: 8, border: '1px solid #DDE4F3',
    background: '#F5F8FF', cursor: 'pointer', fontSize: 14, color: '#7A8BAD',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Steps
  stepsBar: {
    display: 'flex', alignItems: 'center', padding: '14px 24px',
    borderBottom: '1px solid #F0F4FF', flexShrink: 0,
  },
  stepItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    cursor: 'pointer', opacity: 0.4, transition: '0.2s',
  },
  stepActive: { opacity: 1 },
  stepNum: {
    width: 26, height: 26, borderRadius: '50%',
    background: '#DDE4F3', color: '#7A8BAD',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800,
  },
  stepNumActive: { background: '#4A6CF7', color: '#fff' },
  stepLabel: { fontSize: 12, fontWeight: 700, color: '#1A2B4A', whiteSpace: 'nowrap' },
  stepLine: { flex: 1, height: 2, background: '#DDE4F3', margin: '0 10px' },
  stepLineActive: { background: '#4A6CF7' },

  modalBody: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  modalFooter: {
    display: 'flex', gap: 10, padding: '16px 24px',
    borderTop: '1px solid #F0F4FF', justifyContent: 'flex-end', flexShrink: 0,
  },

  // Error banner
  errorBanner: {
    background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 14,
  },

  // Form fields
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 11.5, fontWeight: 800, color: '#7A8BAD', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    width: '100%', background: '#F5F8FF', border: '1.5px solid #DDE4F3',
    borderRadius: 10, padding: '10px 14px', fontSize: 13,
    fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none', boxSizing: 'border-box',
  },
  select: {
    width: '100%', background: '#F5F8FF', border: '1.5px solid #DDE4F3',
    borderRadius: 10, padding: '10px 14px', fontSize: 13,
    fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none',
    cursor: 'pointer', boxSizing: 'border-box',
  },

  // Type cards
  typeCards: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  typeCard: {
    padding: '16px', borderRadius: 12, border: '2px solid #DDE4F3',
    background: '#F5F8FF', cursor: 'pointer', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: 4, position: 'relative',
    fontFamily: "'Nunito', sans-serif", transition: '0.15s',
  },
  typeCardSel: { border: '2px solid #4A6CF7', background: 'rgba(74,108,247,0.05)' },
  typeCardIcon: { fontSize: 28, marginBottom: 4 },
  typeCardTitle: { fontSize: 14, fontWeight: 800, color: '#1A2B4A' },
  typeCardSub:   { fontSize: 11, color: '#7A8BAD', lineHeight: 1.5 },
  typeCardCheck: {
    position: 'absolute', top: 10, right: 10, width: 20, height: 20,
    borderRadius: '50%', background: '#4A6CF7', color: '#fff',
    fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Urgence
  urgenceCards: { display: 'flex', gap: 10 },
  urgenceBtn: {
    flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #DDE4F3',
    background: '#F5F8FF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif", transition: '0.15s',
    color: '#7A8BAD',
  },
  urgenceBtnSel: { border: '1.5px solid' },

  // Catalogue
  catalogue: { display: 'flex', flexDirection: 'column', gap: 10 },
  catalogueSearch: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  catalogueSearchIcon: { position: 'absolute', left: 12, fontSize: 14, color: '#7A8BAD' },
  catalogueSearchInput: {
    width: '100%', background: '#F5F8FF', border: '1.5px solid #DDE4F3',
    borderRadius: 10, padding: '10px 36px', fontSize: 13,
    fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none',
    boxSizing: 'border-box',
  },
  catalogueClear: {
    position: 'absolute', right: 12, background: 'none', border: 'none',
    cursor: 'pointer', color: '#7A8BAD', fontSize: 14,
  },

  examCountBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  examCountText: { fontSize: 13, fontWeight: 700, color: '#4A6CF7' },
  clearAllBtn: {
    fontSize: 12, fontWeight: 700, color: '#dc2626',
    background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
  },

  selectedBubbles: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  selectedBubble: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
    background: '#EEF2FF', color: '#4A6CF7', border: '1px solid rgba(74,108,247,0.2)',
  },
  bubbleRemove: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#4A6CF7', fontSize: 11, padding: 0, lineHeight: 1,
  },

  catalogueScroll: { maxHeight: 320, overflowY: 'auto', paddingRight: 4 },
  catalogueGroupe: { marginBottom: 14 },
  catalogueGroupeTitle: {
    fontSize: 10.5, fontWeight: 800, color: '#7A8BAD',
    textTransform: 'uppercase', letterSpacing: '0.8px',
    marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #F0F4FF',
  },
  catalogueGroupeItems: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  examenChip: {
    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
    border: '1.5px solid #DDE4F3', background: '#fff', cursor: 'pointer',
    color: '#1A2B4A', fontFamily: "'Nunito', sans-serif", transition: '0.12s',
    display: 'flex', alignItems: 'center', gap: 5,
  },
  examenChipSel: {
    background: '#EEF2FF', borderColor: '#4A6CF7', color: '#4A6CF7',
  },
  chipCheck: { fontSize: 10, fontWeight: 900 },

  // Récap
  recap: {
    marginTop: 16, padding: '14px 16px', borderRadius: 12,
    background: '#F5F8FF', border: '1.5px solid #DDE4F3',
  },
  recapTitle: { fontSize: 12, fontWeight: 800, color: '#1A2B4A', marginBottom: 10 },
  recapRow: { display: 'flex', gap: 8, marginBottom: 10 },
  recapExamens: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  recapExamen: {
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: '#EEF2FF', color: '#4A6CF7',
  },

  // Buttons
  btnPrimary: {
    padding: '10px 20px', borderRadius: 30, border: 'none',
    background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)',
    color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
    boxShadow: '0 4px 14px rgba(74,108,247,0.3)',
  },
  btnSuccess: {
    padding: '10px 20px', borderRadius: 30, border: 'none',
    background: 'linear-gradient(135deg,#059669,#10b981)',
    color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
    boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
  },
  btnGhost: {
    padding: '10px 18px', borderRadius: 30,
    border: '1.5px solid #DDE4F3', background: '#F5F8FF',
    color: '#7A8BAD', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
  },

  // Demande card
  demandeCard: {
    background: '#fff', borderRadius: 12, border: '1px solid #E8EDF5',
    marginBottom: 12, overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  demandeCardUrgent: { borderLeft: '4px solid #dc2626' },
  demandeCardToggle: {
    width: '100%', padding: '14px 18px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    border: 'none', background: '#FAFBFF', cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
  },
  demandeCardLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  demandeTypeIcon: { fontSize: 22, flexShrink: 0 },
  demandeCardTitle: { fontWeight: 800, fontSize: 14, color: '#1A2B4A', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' },
  demandeExamCount: {
    fontSize: 11, fontWeight: 700, color: '#7A8BAD',
    background: '#EEF2FF', padding: '2px 8px', borderRadius: 20,
  },
  demandeCardMeta: { fontSize: 12, color: '#7A8BAD', fontWeight: 600, marginTop: 2, textAlign: 'left' },
  demandeCardRight: { display: 'flex', alignItems: 'center', gap: 8 },
  chevron: { color: '#7A8BAD', fontSize: 10 },
  demandeCardBody: { padding: '14px 18px', borderTop: '1px solid #F0F4FF' },

  demandeSection: { marginBottom: 12 },
  demandeSectionTitle: {
    fontSize: 10.5, fontWeight: 800, color: '#7A8BAD',
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6,
  },
  demandeSectionText: { fontSize: 13, color: '#1A2B4A', lineHeight: 1.6 },
  demandeExamensList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  demandeExamen: {
    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
    background: '#F5F8FF', color: '#1A2B4A', border: '1px solid #DDE4F3',
  },

  resultatBox: {
    margin: '12px 0', padding: '14px',
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
  },
  resultatTitle: { fontSize: 13, fontWeight: 800, color: '#059669', marginBottom: 6 },
  resultatText: { fontSize: 13, color: '#1A2B4A', lineHeight: 1.7 },
  resultatDate: { fontSize: 11, color: '#7A8BAD', marginTop: 6, fontWeight: 600 },

  demandeActions: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F4FF' },
  btnEditStatut: {
    padding: '8px 16px', borderRadius: 8, border: '1.5px solid #DDE4F3',
    background: '#F5F8FF', color: '#4A6CF7', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
  },
  editStatutForm: {},
  editStatutRow: {},

  // Barre du haut
  demandesTopBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  demandesStats: { display: 'flex', gap: 20 },
  demandeMiniStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  demandeMiniValue: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 20 },
  demandeMiniLabel: { fontSize: 11, color: '#7A8BAD', fontWeight: 600 },

  // Filtres
  filtersRow: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  filterGroup: { display: 'flex', gap: 4 },
  filterBtn: {
    padding: '6px 14px', borderRadius: 20, border: '1.5px solid #DDE4F3',
    background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    color: '#7A8BAD', fontFamily: "'Nunito', sans-serif",
  },
  filterBtnActive: { background: '#EEF2FF', borderColor: '#4A6CF7', color: '#4A6CF7' },

  // Loading
  loadingBox: {
    display: 'flex', alignItems: 'center', gap: 12, padding: 40,
    color: '#7A8BAD', fontSize: 13, fontWeight: 600, justifyContent: 'center',
  },
  loadingSpinner: {
    width: 24, height: 24, borderRadius: '50%',
    border: '2px solid #DDE4F3', borderTopColor: '#4A6CF7',
    animation: 'spin 0.8s linear infinite',
  },

  // Empty
  emptyState: {
    textAlign: 'center', padding: '48px 20px', color: '#7A8BAD',
  },

  // Badges
  badge: {
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
    display: 'inline-flex', alignItems: 'center', gap: 4,
  },
};

