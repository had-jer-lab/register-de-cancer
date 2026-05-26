import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  if (res.status === 401) { localStorage.clear(); window.location.href = '/auth'; return; }
  if (!res.ok) throw await res.json().catch(() => ({}));
  if (res.status === 204) return null;
  return res.json();
}

// ─── Données statiques ────────────────────────────────────────────────────────

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
  'Col de l\'utérus':       ['Carcinome épidermoïde','Adénocarcinome','Adénosquameux','Neuroendocrine','Autre'],
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

const TNM_T = ['Tx','T0','Tis','T1','T2','T3','T4'];
const TNM_N = ['Nx','N0','N1','N2','N3'];
const TNM_M = ['Mx','M0','M1'];
const STADES = ['I','II','III','IV'];
const HISTO_TYPES = ['Adénocarcinome','Carcinome épidermoïde','Carcinome canalaire infiltrant','Carcinome lobulaire infiltrant','Carcinome in situ','Lymphome B diffus à grandes cellules','Lymphome de Hodgkin','Lymphome T périphérique','Leucémie myéloïde aiguë','Leucémie lymphoïde chronique','Sarcome des parties molles','Mélanome','Glioblastome','Carcinome hépatocellulaire','Autre'];

// ─── Composants UI locaux ─────────────────────────────────────────────────────

function SectionCard({ title, icon, children }) {
  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <span style={s.cardIcon}>{icon}</span>
        <span style={s.cardTitle}>{title}</span>
      </div>
      <div style={s.cardBody}>{children}</div>
    </div>
  );
}

function Field({ label, children, half }) {
  return (
    <div style={{ ...s.field, ...(half ? s.fieldHalf : {}) }}>
      {label && <label style={s.label}>{label}</label>}
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={s.input}
    />
  );
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} style={s.input}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Tags({ options, value, onChange }) {
  return (
    <div style={s.tagGroup}>
      {options.map(opt => (
        <button
          key={opt} type="button"
          style={{ ...s.tag, ...(value === opt ? s.tagSel : {}) }}
          onClick={() => onChange(value === opt ? '' : opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div style={s.toggleRow}>
      <div style={{ ...s.toggleTrack, ...(checked ? s.toggleOn : {}) }} onClick={() => onChange(!checked)}>
        <div style={{ ...s.toggleThumb, ...(checked ? s.toggleThumbOn : {}) }} />
      </div>
      <span style={s.toggleLabel}>{label}</span>
    </div>
  );
}

function RdvBadge({ date }) {
  if (!date) return null;
  const diff = Math.floor((new Date() - new Date(date)) / 86400000);
  let text, color;
  if (diff === 0)    { text = 'Aujourd\'hui'; color = '#00C9A7'; }
  else if (diff <= 7)  { text = `${diff} j`;       color = '#00C9A7'; }
  else if (diff <= 30) { text = `${diff} j`;       color = '#FFA26B'; }
  else if (diff <= 365){ text = `${Math.floor(diff/30)} mois`; color = '#FF8C4A'; }
  else                 { text = `${Math.floor(diff/365)} an(s)`; color = '#FF6B6B'; }
  return (
    <span style={{ ...s.rdvBadge, color, borderColor: color + '40', background: color + '12' }}>
      ● {text}
    </span>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function EditPatient() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const [success, setSuccess]   = useState(false);
  const [activeTab, setActiveTab] = useState('patient');

  // ── Données patient ──
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_naissance: '', sexe: 'M',
    phone: '', email: '', national_id: '',
    situation_familiale: '', profession: '', adresse: '',
    wilaya: '', commune: '',
    poids: '', taille: '', imc: '',
    allergies: '', autres_allergies: '',
    antecedents_familiaux: [], antecedents_fam_yn: '',
    observations: '',
  });

  // ── Données cancer (premier cancer) ──
  const [cancer, setCancer] = useState(null);
  const [cancerForm, setCancerForm] = useState({
    organe: '', sous_type: '', stade_clinique: '', tnmT: 'T0', tnmN: 'N0', tnmM: 'M0',
    grade: '', date_diagnostic: '', dernier_rdv: '',
    type_histologique: '', localise: true, metastatique: false, recidive: false,
  });

  const upForm   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const upCancer = (k, v) => setCancerForm(f => ({ ...f, [k]: v }));

  // ── Chargement ───────────────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch(`/patients/${id}/`)
      .then(data => {
        if (!data) return;
        setForm({
          first_name:           data.first_name     || '',
          last_name:            data.last_name      || '',
          date_naissance:       data.date_naissance || '',
          sexe:                 data.sexe           || 'M',
          phone:                data.phone          || '',
          email:                data.email          || '',
          national_id:          data.national_id    || '',
          situation_familiale:  data.situation_familiale || '',
          profession:           data.profession     || '',
          adresse:              data.adresse        || '',
          wilaya:              data.wilaya_name    || '',
          commune:             data.commune_name   || '',
          poids:                data.poids?.toString() || '',
          taille:               data.taille?.toString() || '',
          imc:                  data.imc?.toString() || '',
          allergies:            data.allergies      || '',
          autres_allergies:     data.autres_allergies || '',
          antecedents_familiaux: Array.isArray(data.antecedents_familiaux) ? data.antecedents_familiaux : [],
          antecedents_fam_yn:   data.antecedents_fam_yn || '',
          observations:         data.observations   || '',
        });

        // Prendre le premier cancer
        const c = data.cancers?.[0];
        if (c) {
          setCancer(c);
          const tnm = c.tnm || '';
          const tMatch = tnm.match(/T[x0-4is]+/i);
          const nMatch = tnm.match(/N[x0-3]+/i);
          const mMatch = tnm.match(/M[x01]+/i);
          console.log('[DEBUG EditPatient] Cancer loaded:', { date_diagnostic: c.date_diagnostic, tnm: c.tnm });
          setCancerForm({
            organe:           c.cancer_type?.name    || '',
            sous_type:        c.sous_type            || '',
            stade_clinique:   c.stade_clinique       || '',
            tnmT:             tMatch?.[0]?.toUpperCase() || 'T0',
            tnmN:             nMatch?.[0]?.toUpperCase() || 'N0',
            tnmM:             mMatch?.[0]?.toUpperCase() || 'M0',
            grade:            c.grade                || '',
            type_tumeur:      c.type_tumeur          || '',
            date_diagnostic:  c.date_diagnostic      || '',
            dernier_rdv:      data.dernier_rdv        || '',
            type_histologique: c.histology?.type_histologique || '',
            localise:         c.localise !== false,
            metastatique:     (c.metastases?.length || 0) > 0 || c.metastatique === true,
            recidive:         c.recidive === true,
          });
        }
      })
      .catch(() => setError('Impossible de charger ce dossier.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // PATCH patient
      await apiFetch(`/patients/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          date_naissance: form.date_naissance,
          sexe: form.sexe,
          phone: form.phone,
          national_id: form.national_id || null,
          wilaya_text: form.wilaya,
          commune_text: form.commune,
        }),
      });

      // PATCH ou POST cancer
      if (cancerForm.organe) {
        const cancerPayload = {
          patient:         parseInt(id),
          organe:          cancerForm.organe || '',
          stade_clinique:  cancerForm.stade_clinique || '',
          tnm:             [cancerForm.tnmT, cancerForm.tnmN, cancerForm.tnmM].filter(Boolean).join(''),
          grade:           String(cancerForm.grade || '').slice(0, 20),
          date_diagnostic: cancerForm.date_diagnostic ? cancerForm.date_diagnostic : null,
          type_histologique: cancerForm.type_histologique || '',
          type_tumeur: cancerForm.type_tumeur || '',
          sous_type: cancerForm.sous_type || '',
          localise: cancerForm.localise,
          metastatique: cancerForm.metastatique,
          recidive: cancerForm.recidive,
        };

        if (cancer?.id) {
          await apiFetch(`/patients/${id}/cancers/${cancer.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(cancerPayload),
          });
        } else {
          await apiFetch(`/patients/${id}/cancers/`, {
            method: 'POST',
            body: JSON.stringify(cancerPayload),
          });
        }
      }

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      const msg = err.detail || err.date_naissance?.[0] || JSON.stringify(err);
      setError('Erreur : ' + msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.root}>
      <div style={s.loadingBox}>
        <div style={s.loadingSpinner}>⏳</div>
        <div style={{ fontSize: 14, color: '#7A8BAD', fontWeight: 600 }}>Chargement du dossier…</div>
      </div>
    </div>
  );

  const sousTypesDispos = cancerForm.organe ? (SOUS_TYPES[cancerForm.organe] || ['Autre']) : [];

  return (
    <div style={s.root}>

      {/* ── SUCCESS TOAST ── */}
      {success && (
        <div style={s.successToast}>
          ✓ Dossier mis à jour avec succès — redirection…
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => navigate('/dashboard')}>
            ← Retour
          </button>
          <div>
            <div style={s.headerTitle}>
              ✏ Modifier le dossier
            </div>
            <div style={s.headerSub}>
              {form.first_name} {form.last_name} — N° dossier #{id}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnGhost} onClick={() => navigate('/dashboard')}>Annuler</button>
          <button
            style={{ ...s.btnSave, opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⏳ Sauvegarde…' : '✓ Enregistrer les modifications'}
          </button>
        </div>
      </div>

      {/* ── ERREUR ── */}
      {error && (
        <div style={s.errorBanner}>⚠ {error}</div>
      )}

      {/* ── TABS ── */}
      <div style={s.tabs}>
        {[
          { id: 'patient', label: '👤 Infos personnelles' },
          { id: 'cancer',  label: '🎗 Diagnostic & Cancer' },
        ].map(tab => (
          <button
            key={tab.id}
            style={{ ...s.tab, ...(activeTab === tab.id ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENU ── */}
      <div style={s.body}>

        {/* ════ TAB 1 : PATIENT ════ */}
        {activeTab === 'patient' && (
          <div style={s.grid2}>

            <SectionCard title="Données personnelles" icon="🪪">
              <div style={s.row2}>
                <Field label="Prénom *">
                  <Input value={form.first_name} onChange={v => upForm('first_name', v)} placeholder="Prénom" />
                </Field>
                <Field label="Nom *">
                  <Input value={form.last_name} onChange={v => upForm('last_name', v)} placeholder="Nom de famille" />
                </Field>
              </div>
              <Field label="Date de naissance *" style={{ marginTop: 12 }}>
                <Input type="date" value={form.date_naissance} onChange={v => upForm('date_naissance', v)} />
              </Field>
              <Field label="Sexe" style={{ marginTop: 12 }}>
                <Tags
                  options={['M', 'F']}
                  value={form.sexe}
                  onChange={v => upForm('sexe', v)}
                />
              </Field>
            </SectionCard>

            <SectionCard title="Contact & Identifiants" icon="📋">
              <Field label="Téléphone">
                <Input value={form.phone} onChange={v => upForm('phone', v)} placeholder="0770 123 456" />
              </Field>
              <Field label="Email" style={{ marginTop: 12 }}>
                <Input type="email" value={form.email} onChange={v => upForm('email', v)} placeholder="email@example.com" />
              </Field>
              <Field label="NIN — Numéro d'identification nationale" style={{ marginTop: 12 }}>
                <Input value={form.national_id} onChange={v => upForm('national_id', v)} placeholder="ex: 1D00925D42889" />
              </Field>
            </SectionCard>

            <SectionCard title="Adresse" icon="📍">
              <Field label="Wilaya">
                <Input value={form.wilaya} onChange={v => upForm('wilaya', v)} placeholder="Nom de la wilaya" />
              </Field>
              <Field label="Commune" style={{ marginTop: 12 }}>
                <Input value={form.commune} onChange={v => upForm('commune', v)} placeholder="Nom de la commune" />
              </Field>
            </SectionCard>

            <SectionCard title="Situation sociale" icon="👥">
              <Field label="Situation familiale">
                <SelectField
                  value={form.situation_familiale}
                  onChange={v => upForm('situation_familiale', v)}
                  options={['Célibataire','Marié(e)','Divorcé(e)','Veuf / Veuve']}
                  placeholder="—"
                />
              </Field>
              <Field label="Profession" style={{ marginTop: 12 }}>
                <Input value={form.profession} onChange={v => upForm('profession', v)} placeholder="Profession" />
              </Field>
              <Field label="Adresse" style={{ marginTop: 12 }}>
                <Input value={form.adresse} onChange={v => upForm('adresse', v)} placeholder="Adresse complète" />
              </Field>
            </SectionCard>

            <SectionCard title="Données de santé" icon="🩺">
              <div style={s.row2}>
                <Field label="Poids (kg)" half>
                  <Input type="number" value={form.poids} onChange={v => upForm('poids', v)} placeholder="70" />
                </Field>
                <Field label="Taille (cm)" half>
                  <Input type="number" value={form.taille} onChange={v => upForm('taille', v)} placeholder="175" />
                </Field>
              </div>
              <Field label="IMC" style={{ marginTop: 12 }}>
                <Input type="number" value={form.imc} onChange={v => upForm('imc', v)} placeholder="IMC (calculé)" />
              </Field>
            </SectionCard>

            <SectionCard title="Allergies & Antécédents" icon="⚠️">
              <Field label="Allergies">
                <Input value={form.allergies} onChange={v => upForm('allergies', v)} placeholder="Allergie aux pénicillines..." />
              </Field>
              <Field label="Autres allergies" style={{ marginTop: 12 }}>
                <Input value={form.autres_allergies} onChange={v => upForm('autres_allergies', v)} placeholder="" />
              </Field>
              <Field label="Antécédents familiaux (oui/non)" style={{ marginTop: 12 }}>
                <Tags
                  options={['Oui','Non']}
                  value={form.antecedents_fam_yn}
                  onChange={v => upForm('antecedents_fam_yn', v)}
                />
              </Field>
              <Field label="Observations" style={{ marginTop: 12 }}>
                <Input value={form.observations} onChange={v => upForm('observations', v)} placeholder="Remarques supplémentaires..." />
              </Field>
            </SectionCard>

          </div>
        )}

        {/* ════ TAB 2 : CANCER ════ */}
        {activeTab === 'cancer' && (
          <div style={s.grid2}>

            {/* Colonne gauche */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <SectionCard title="Organe & Sous-type" icon="🎗">
                <Field label="Organe principal">
                  <SelectField
                    value={cancerForm.organe}
                    onChange={v => upCancer('organe', v) || upCancer('sous_type', '')}
                    options={ORGANES}
                    placeholder="Sélectionner…"
                  />
                </Field>

                {/* Sous-type */}
                {cancerForm.organe && (
                  <Field label={`Sous-type — ${cancerForm.organe}`} style={{ marginTop: 14 }}>
                    <div style={s.tagGroup}>
                      {sousTypesDispos.map(st => (
                        <button
                          key={st} type="button"
                          style={{ ...s.tag, ...(cancerForm.sous_type === st ? s.tagSel : {}) }}
                          onClick={() => upCancer('sous_type', cancerForm.sous_type === st ? '' : st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
                {!cancerForm.organe && (
                  <div style={s.subTypePlaceholder}>
                    ☁️ Sélectionnez d'abord l'organe principal
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Stade & TNM" icon="📊">
                <Field label="Stade clinique">
                  <Tags options={STADES} value={cancerForm.stade_clinique} onChange={v => upCancer('stade_clinique', v)} />
                </Field>

                {/* TNM — 3 colonnes égales */}
                <div style={s.tnmRow}>
                  <div style={s.tnmCol}>
                    <div style={s.tnmLabel}>T — Tumeur</div>
                    <SelectField value={cancerForm.tnmT} onChange={v => upCancer('tnmT', v)} options={TNM_T} />
                  </div>
                  <div style={s.tnmCol}>
                    <div style={s.tnmLabel}>N — Ganglion</div>
                    <SelectField value={cancerForm.tnmN} onChange={v => upCancer('tnmN', v)} options={TNM_N} />
                  </div>
                  <div style={s.tnmCol}>
                    <div style={s.tnmLabel}>M — Métastase</div>
                    <SelectField value={cancerForm.tnmM} onChange={v => upCancer('tnmM', v)} options={TNM_M} />
                  </div>
                </div>

                <Field label="Grade SBR / OMS" style={{ marginTop: 14 }}>
                  <SelectField
                    value={cancerForm.grade}
                    onChange={v => upCancer('grade', v)}
                    options={['Grade 1','Grade 2','Grade 3']}
                    placeholder="—"
                  />
                </Field>
              </SectionCard>

              <SectionCard title="Statut de localisation" icon="📍">
                <Toggle label="Localisé"     checked={cancerForm.localise}     onChange={v => upCancer('localise', v)} />
                <Toggle label="Métastatique" checked={cancerForm.metastatique} onChange={v => upCancer('metastatique', v)} />
                <Toggle label="Récidive"     checked={cancerForm.recidive}     onChange={v => upCancer('recidive', v)} />
              </SectionCard>

            </div>

            {/* Colonne droite */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <SectionCard title="Dates" icon="📅">
                <Field label="Date de diagnostic">
                  <Input type="date" value={cancerForm.date_diagnostic} onChange={v => upCancer('date_diagnostic', v)} />
                </Field>
                <Field label="Date du dernier RDV" style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="date"
                      value={cancerForm.dernier_rdv || ''}
                      onChange={e => upCancer('dernier_rdv', e.target.value)}
                      style={{ ...s.input, flex: 1 }}
                    />
                    <RdvBadge date={cancerForm.dernier_rdv} />
                  </div>
                </Field>
              </SectionCard>

              <SectionCard title="Histologie" icon="🔬">
                <Field label="Type histologique">
                  <SelectField
                    value={cancerForm.type_histologique}
                    onChange={v => upCancer('type_histologique', v)}
                    options={HISTO_TYPES}
                    placeholder="Sélectionner…"
                  />
                </Field>
              </SectionCard>

            </div>
          </div>
        )}

      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div style={s.footer}>
        <button style={s.btnGhost} onClick={() => navigate('/dashboard')}>Annuler</button>
        <button
          style={{ ...s.btnSave, opacity: saving ? 0.7 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '⏳ Sauvegarde…' : '✓ Enregistrer les modifications'}
        </button>
      </div>

    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: '100vh',
    background: '#EEF2FF',
    fontFamily: "'Nunito', sans-serif",
    paddingBottom: 80,
  },

  /* loading */
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 },
  loadingSpinner: { fontSize: 40 },

  /* header */
  header: {
    background: '#fff',
    borderBottom: '1.5px solid #DDE4F3',
    padding: '18px 40px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 4px 20px rgba(74,108,247,0.08)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backBtn: {
    padding: '8px 16px', borderRadius: 30,
    border: '1.5px solid #DDE4F3', background: '#F5F8FF',
    color: '#7A8BAD', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
  },
  headerTitle: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 800, fontSize: 18, color: '#1A2B4A',
  },
  headerSub: { fontSize: 13, color: '#7A8BAD', fontWeight: 600, marginTop: 2 },

  /* error */
  errorBanner: {
    margin: '16px 40px 0',
    background: 'rgba(255,107,107,0.08)',
    border: '1.5px solid rgba(255,107,107,0.25)',
    borderRadius: 12, padding: '13px 18px',
    fontSize: 13, color: '#FF6B6B', fontWeight: 700,
  },

  /* success toast */
  successToast: {
    position: 'fixed', bottom: 28, right: 28,
    background: 'linear-gradient(135deg,#00C9A7,#00a98b)',
    color: '#fff', padding: '14px 26px', borderRadius: 16,
    fontSize: 14, fontWeight: 800,
    boxShadow: '0 10px 30px rgba(0,201,167,0.4)',
    zIndex: 9999,
  },

  /* tabs */
  tabs: {
    display: 'flex', gap: 4,
    padding: '16px 40px 0',
    borderBottom: '1.5px solid #DDE4F3',
    background: '#fff',
  },
  tab: {
    padding: '11px 22px', borderRadius: '10px 10px 0 0',
    border: '1.5px solid transparent',
    background: 'transparent',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    color: '#7A8BAD', fontFamily: "'Nunito', sans-serif",
    transition: '0.2s',
  },
  tabActive: {
    background: '#EEF2FF',
    border: '1.5px solid #DDE4F3',
    borderBottom: '1.5px solid #EEF2FF',
    color: '#4A6CF7', fontWeight: 800,
    marginBottom: -1.5,
  },

  /* body */
  body: { padding: '28px 40px', maxWidth: 1060, margin: '0 auto' },

  /* grid */
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  row2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },

  /* card */
  card: {
    background: '#fff',
    border: '1.5px solid #DDE4F3',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(74,108,247,0.06)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 20px',
    borderBottom: '1.5px solid #EEF2FF',
    background: '#F5F8FF',
  },
  cardIcon: { fontSize: 18 },
  cardTitle: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700, fontSize: 14, color: '#1A2B4A',
  },
  cardBody: { padding: '18px 20px' },

  /* field */
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldHalf: { flex: 1 },
  label: { fontSize: 11.5, fontWeight: 700, color: '#7A8BAD', letterSpacing: '0.3px' },

  /* input */
  input: {
    background: '#F5F8FF',
    border: '1.5px solid #DDE4F3',
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13.5, fontFamily: "'Nunito', sans-serif",
    color: '#1A2B4A', outline: 'none', width: '100%',
    boxSizing: 'border-box',
  },

  /* tags */
  tagGroup: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: {
    padding: '6px 14px', borderRadius: 30,
    border: '2px solid #DDE4F3', background: '#fff',
    color: '#7A8BAD', fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
    transition: '0.15s',
  },
  tagSel: {
    background: '#4A6CF7', borderColor: '#4A6CF7',
    color: '#fff', boxShadow: '0 3px 12px rgba(74,108,247,0.3)',
  },

  /* toggle */
  toggleRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F5F8FF', border: '1.5px solid #DDE4F3', borderRadius: 10, marginBottom: 8 },
  toggleTrack: { width: 44, height: 22, borderRadius: 30, background: '#DDE4F3', cursor: 'pointer', position: 'relative', transition: '0.2s', flexShrink: 0 },
  toggleOn: { background: '#4A6CF7' },
  toggleThumb: { position: 'absolute', top: 3, left: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: '0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  toggleThumbOn: { left: 25 },
  toggleLabel: { fontSize: 13, fontWeight: 700, color: '#1A2B4A' },

  /* TNM */
  tnmRow: { display: 'flex', gap: 12, marginTop: 14 },
  tnmCol: { flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  tnmLabel: { fontSize: 12, fontWeight: 900, textAlign: 'center', color: '#4A6CF7', letterSpacing: '0.5px' },

  /* sous-type placeholder */
  subTypePlaceholder: {
    marginTop: 14, padding: '12px 14px',
    background: '#F5F8FF', border: '1.5px dashed #DDE4F3',
    borderRadius: 10, fontSize: 12, color: '#7A8BAD',
    fontWeight: 600, fontStyle: 'italic',
  },

  /* rdv badge */
  rdvBadge: {
    flexShrink: 0, fontSize: 11, fontWeight: 800,
    padding: '5px 12px', borderRadius: 20,
    border: '1.5px solid', whiteSpace: 'nowrap',
  },

  /* buttons */
  btnSave: {
    padding: '11px 24px', borderRadius: 30,
    border: 'none',
    background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)',
    color: '#fff', fontSize: 13, fontWeight: 800,
    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
    boxShadow: '0 6px 20px rgba(74,108,247,0.35)',
  },
  btnGhost: {
    padding: '11px 22px', borderRadius: 30,
    border: '1.5px solid #DDE4F3', background: '#F5F8FF',
    color: '#7A8BAD', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
  },

  /* footer */
  footer: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#fff', borderTop: '1.5px solid #DDE4F3',
    padding: '14px 40px',
    display: 'flex', justifyContent: 'flex-end', gap: 12,
    boxShadow: '0 -4px 20px rgba(74,108,247,0.08)',
    zIndex: 99,
  },
};
