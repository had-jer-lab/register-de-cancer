import API_BASE from '../utils/apiConfig';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API = API_BASE;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str || str === '—') return '—';
  try { const [y, m, d] = str.split('-'); return `${d}/${m}/${y}`; }
  catch { return str; }
}

function calcAge(dob) {
  if (!dob) return null;
  const b = new Date(dob), t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return age;
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function InfoCard({ icon, title, children, color = '#4A6CF7' }) {
  return (
    <div style={s.card}>
      <div style={{ ...s.cardHeader, borderLeftColor: color }}>
        <span style={s.cardIcon}>{icon}</span>
        <span style={{ ...s.cardTitle, color }}>{title}</span>
      </div>
      <div style={s.cardBody}>{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowValue}>{value || <span style={s.empty}>—</span>}</span>
    </div>
  );
}

function Badge({ text, color, bg }) {
  return (
    <span style={{ ...s.badge, color, background: bg }}>{text}</span>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={s.loadingScreen}>
      <div style={s.spinner} />
      <div style={s.loadingText}>Chargement de votre dossier…</div>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────

function ErrorScreen({ message }) {
  return (
    <div style={s.loadingScreen}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1A2B4A', marginBottom: 8 }}>
        Dossier inaccessible
      </div>
      <div style={{ fontSize: 14, color: '#7A8BAD', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
        {message || 'Ce lien est invalide ou a expiré. Contactez votre médecin.'}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function PatientPublicView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [patient,  setPatient]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [activeTab, setActive]  = useState('infos');

  useEffect(() => {
    if (!id || !token) {
      setError('Lien invalide.');
      setLoading(false);
      return;
    }

    // Vérifier que le token correspond au numéro de dossier
    const fetchPatient = async () => {
      try {
        // Appel public — on utilise un endpoint de lecture publique
        // Pour l'instant on utilise l'endpoint normal avec un token spécial
        // En production, créez un endpoint /api/patients/public/<id>/ sans auth
        const res = await fetch(`${API}/patients/public/${id}/?token=${encodeURIComponent(token)}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.status === 401) {
          // Essayer avec le token stocké (si le patient s'est connecté)
          const accessToken = localStorage.getItem('access_token');
          if (!accessToken) {
            setError('Accès non autorisé. Demandez à votre médecin de vous donner accès.');
            setLoading(false);
            return;
          }
          const res2 = await fetch(`${API}/patients/${id}/`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (!res2.ok) throw new Error();
          const data = await res2.json();
          validateAndSet(data);
        } else if (res.ok) {
          const data = await res.json();
          validateAndSet(data);
        } else {
          throw new Error();
        }
      } catch {
        setError('Dossier introuvable ou accès refusé.');
      } finally {
        setLoading(false);
      }
    };

    const validateAndSet = (data) => {
      // Vérifier le token = base64 du numéro de dossier
      try {
        const decoded = atob(token);
        if (decoded !== data.numero_dossier && decoded !== String(data.id)) {
          setError('Lien invalide ou expiré.');
          return;
        }
      } catch {
        setError('Lien invalide.');
        return;
      }
      setPatient(data);
    };

    fetchPatient();
  }, [id, token]);

  if (loading) return <LoadingScreen />;
  if (error || !patient) return <ErrorScreen message={error} />;

  const age = calcAge(patient.date_naissance);
  const dernierCancer = patient.cancers?.[0];
  const stade = dernierCancer?.stade_clinique || dernierCancer?.stade_pathologique;

  const TABS = [
    { id: 'infos',    label: 'Mes infos',    icon: '👤' },
    { id: 'cancer',   label: 'Mon cancer',   icon: '🎗' },
    { id: 'traitement', label: 'Traitements', icon: '💊' },
    { id: 'rdv',      label: 'Consultations', icon: '📅' },
  ];

  return (
    <div style={s.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #DDE4F3; border-radius: 4px; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.headerBrand}>
          <div style={s.brandIcon}>⚕</div>
          <span style={s.brandName}>MedDossier</span>
        </div>
        <div style={s.headerBadge}>Dossier patient</div>
      </div>

      {/* ── HERO ── */}
      <div style={s.hero}>
        <div style={s.heroAvatar}>
          {(patient.first_name?.[0] || '?')}{(patient.last_name?.[0] || '?')}
        </div>
        <div style={s.heroInfo}>
          <h1 style={s.heroName}>{patient.first_name} {patient.last_name}</h1>
          <div style={s.heroMeta}>
            <span style={s.heroBadge}>
              {patient.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'}
            </span>
            {age !== null && (
              <span style={s.heroBadge}>{age} ans</span>
            )}
            <span style={{ ...s.heroBadge, background: '#1A2B4A', color: '#fff' }}>
              {patient.numero_dossier}
            </span>
          </div>
          {dernierCancer && stade && (
            <div style={{ marginTop: 8 }}>
              <Badge
                text={`Stade ${stade}`}
                color={stade === 'IV' ? '#dc2626' : stade === 'III' ? '#ea580c' : stade === 'II' ? '#d97706' : '#059669'}
                bg={stade === 'IV' ? '#fee2e2' : stade === 'III' ? '#ffedd5' : stade === 'II' ? '#fef3c7' : '#d1fae5'}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={s.tabs}>
        {TABS.map(tab => (
          <button key={tab.id}
            style={{ ...s.tab, ...(activeTab === tab.id ? s.tabActive : {}) }}
            onClick={() => setActive(tab.id)}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={s.content}>

        {/* Infos personnelles */}
        {activeTab === 'infos' && (
          <div style={s.section}>
            <InfoCard icon="🪪" title="Informations personnelles" color="#4A6CF7">
              <Row label="Nom complet"       value={`${patient.first_name} ${patient.last_name}`} />
              <Row label="Date de naissance" value={fmtDate(patient.date_naissance)} />
              <Row label="أ‚ge"               value={age !== null ? `${age} ans` : null} />
              <Row label="Sexe"              value={patient.sexe === 'M' ? 'Masculin' : 'Féminin'} />
              <Row label="Téléphone"         value={patient.phone} />
              <Row label="N° Dossier"        value={patient.numero_dossier} />
            </InfoCard>

            <InfoCard icon="📍" title="Localisation" color="#059669">
              <Row label="Wilaya"      value={patient.wilaya_name} />
              <Row label="Commune"     value={patient.commune_name} />
              <Row label="Hôpital"     value={patient.hospital_name} />
              <Row label="Médecin"     value={patient.medecin_nom} />
            </InfoCard>

            {/* Note sécurité */}
            <div style={s.securityNote}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1A2B4A', marginBottom: 3 }}>
                  Données sécurisées
                </div>
                <div style={{ fontSize: 12, color: '#7A8BAD', lineHeight: 1.5 }}>
                  Ces informations sont confidentielles et protégées. Ne partagez pas ce lien avec des tiers.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancer */}
        {activeTab === 'cancer' && (
          <div style={s.section}>
            {!dernierCancer ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎗</div>
                <div style={{ fontWeight: 700, color: '#1A2B4A' }}>Aucun cancer enregistré</div>
              </div>
            ) : (
              <>
                <InfoCard icon="🎗" title="Diagnostic" color="#dc2626">
                  <Row label="Type"           value={dernierCancer.cancer_type_name} />
                  <Row label="Stade"          value={stade ? `Stade ${stade}` : null} />
                  <Row label="TNM"            value={dernierCancer.tnm} />
                  <Row label="Grade"          value={dernierCancer.grade} />
                  <Row label="Date diagnos."  value={fmtDate(dernierCancer.date_diagnostic)} />
                </InfoCard>

                {/* Statut */}
                <div style={s.statutCards}>
                  {[
                    { label: 'Localisé',     val: dernierCancer.localise,     icon: '📍', color: '#059669' },
                    { label: 'Métastatique', val: dernierCancer.metastatique, icon: '⚠️', color: '#dc2626' },
                    { label: 'Récidive',     val: dernierCancer.recidive,     icon: '🔄', color: '#d97706' },
                  ].map(({ label, val, icon, color }) => (
                    <div key={label} style={{
                      ...s.statutCard,
                      borderColor: val ? color + '40' : '#E8EDF5',
                      background: val ? color + '08' : '#F8FAFC',
                    }}>
                      <span style={{ fontSize: 20 }}>{icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: val ? color : '#7A8BAD' }}>{label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                        background: val ? color + '18' : '#E8EDF5',
                        color: val ? color : '#7A8BAD',
                      }}>
                        {val ? 'Oui' : 'Non'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Métastases */}
                {dernierCancer.metastases?.length > 0 && (
                  <InfoCard icon="⚠️" title="Sites métastatiques" color="#dc2626">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
                      {dernierCancer.metastases.map((m, i) => (
                        <span key={i} style={s.metaBadge}>{m.organe}</span>
                      ))}
                    </div>
                  </InfoCard>
                )}
              </>
            )}
          </div>
        )}

        {/* Traitements */}
        {activeTab === 'traitement' && (
          <div style={s.section}>
            {!dernierCancer?.treatments?.length ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💊</div>
                <div style={{ fontWeight: 700, color: '#1A2B4A' }}>Aucun traitement enregistré</div>
              </div>
            ) : (
              dernierCancer.treatments.map((t, i) => (
                <div key={i} style={s.treatCard}>
                  <div style={s.treatHeader}>
                    <span style={s.treatIcon}>💊</span>
                    <div>
                      <div style={s.treatType}>{t.type_traitement_display || t.type_traitement}</div>
                      {t.protocole && <div style={s.treatProto}>{t.protocole}</div>}
                    </div>
                    {t.statut && (
                      <span style={{
                        ...s.treatStatut,
                        color: t.statut === 'en_cours' ? '#4A6CF7' : t.statut === 'termine' ? '#059669' : '#7A8BAD',
                        background: t.statut === 'en_cours' ? '#EEF2FF' : t.statut === 'termine' ? '#d1fae5' : '#F5F8FF',
                      }}>
                        {t.statut_display || t.statut}
                      </span>
                    )}
                  </div>
                  <div style={s.treatBody}>
                    {t.intention && <Row label="Intention" value={t.intention_display || t.intention} />}
                    {t.ligne     && <Row label="Ligne"     value={t.ligne} />}
                    {t.date_debut && <Row label="Début"   value={fmtDate(t.date_debut)} />}
                    {t.date_fin  && <Row label="Fin"      value={fmtDate(t.date_fin)} />}
                    {t.cycles_prevus && (
                      <Row label="Cycles" value={`${t.cycles_realises || 0} / ${t.cycles_prevus}`} />
                    )}
                    {t.reponse_tumorale && <Row label="Réponse" value={t.reponse_display || t.reponse_tumorale} />}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Consultations */}
        {activeTab === 'rdv' && (
          <div style={s.section}>
            {!patient.consultations?.length ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ fontWeight: 700, color: '#1A2B4A' }}>Aucune consultation enregistrée</div>
              </div>
            ) : (
              patient.consultations.map((c, i) => (
                <div key={i} style={s.consultCard}>
                  <div style={s.consultDate}>{fmtDate(c.consultation_date)}</div>
                  {c.motif && <div style={s.consultMotif}>{c.motif}</div>}
                  {c.compte_rendu && <div style={s.consultCR}>{c.compte_rendu}</div>}
                  {c.next_visit_date && (
                    <div style={s.consultNext}>
                      📅 Prochain RDV : <strong>{fmtDate(c.next_visit_date)}</strong>
                    </div>
                  )}
                  <div style={s.consultMedecin}>{c.user_name}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={s.footer}>
        <span>⚕ MedDossier — Registre National du Cancer • Algérie</span>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    minHeight: '100vh', background: '#F8FAFC',
    fontFamily: "'Nunito', sans-serif",
    maxWidth: 480, margin: '0 auto',
    paddingBottom: 40,
  },

  // Loading
  loadingScreen: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 16,
    background: '#F8FAFC', fontFamily: "'Nunito', sans-serif",
    padding: 24, textAlign: 'center',
  },
  spinner: {
    width: 40, height: 40, borderRadius: '50%',
    border: '3px solid #DDE4F3', borderTopColor: '#4A6CF7',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { fontSize: 14, color: '#7A8BAD', fontWeight: 600 },

  // Header
  header: {
    background: 'linear-gradient(135deg, #1a2f6b 0%, #0f1c3f 100%)',
    padding: '16px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 34, height: 34, borderRadius: 10,
    background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, color: '#fff',
  },
  brandName: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 800, fontSize: 16, color: '#fff',
  },
  headerBadge: {
    fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
    background: 'rgba(255,255,255,0.12)',
    padding: '4px 12px', borderRadius: 20,
  },

  // Hero
  hero: {
    background: 'linear-gradient(135deg, #1a2f6b 0%, #0f1c3f 100%)',
    padding: '20px 20px 32px',
    display: 'flex', alignItems: 'center', gap: 16,
    borderBottom: '4px solid #4A6CF7',
  },
  heroAvatar: {
    width: 60, height: 60, borderRadius: 16,
    background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: 20,
    fontFamily: "'Poppins', sans-serif", flexShrink: 0,
    boxShadow: '0 8px 20px rgba(74,108,247,0.4)',
  },
  heroInfo: { flex: 1 },
  heroName: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 8,
  },
  heroMeta: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  heroBadge: {
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: 'rgba(255,255,255,0.15)', color: '#fff',
  },

  badge: {
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
    display: 'inline-block', marginTop: 4,
  },

  // Tabs
  tabs: {
    display: 'flex', background: '#fff',
    borderBottom: '1px solid #E8EDF5',
    position: 'sticky', top: 0, zIndex: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  tab: {
    flex: 1, padding: '12px 4px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 3,
    border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 10, fontWeight: 700, color: '#7A8BAD',
    fontFamily: "'Nunito', sans-serif", transition: '0.15s',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#4A6CF7', borderBottomColor: '#4A6CF7',
    background: '#F8FAFF',
  },

  // Content
  content: { padding: '16px', animation: 'fadeIn 0.3s ease' },
  section:  { display: 'flex', flexDirection: 'column', gap: 14 },

  // Cards
  card: {
    background: '#fff', borderRadius: 14,
    border: '1px solid #E8EDF5',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', background: '#FAFBFF',
    borderBottom: '1px solid #F0F4FF',
    borderLeft: '4px solid #4A6CF7',
  },
  cardIcon:  { fontSize: 15 },
  cardTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13 },
  cardBody:  { padding: '8px 0' },

  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 16px', borderBottom: '1px solid #F8FAFC', fontSize: 13,
  },
  rowLabel: { color: '#7A8BAD', fontWeight: 600, fontSize: 12 },
  rowValue: { fontWeight: 700, color: '#1A2B4A', textAlign: 'right', maxWidth: '60%' },
  empty:    { color: '#C5D0E8', fontStyle: 'italic', fontWeight: 600 },

  // Statut cards
  statutCards: { display: 'flex', gap: 10 },
  statutCard: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6, padding: '14px 8px', borderRadius: 12,
    border: '1.5px solid', textAlign: 'center',
  },

  // Meta badge
  metaBadge: {
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
    background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
  },

  // Treatment
  treatCard: {
    background: '#fff', borderRadius: 14,
    border: '1px solid #E8EDF5',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  treatHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', background: '#FAFBFF',
    borderBottom: '1px solid #F0F4FF',
  },
  treatIcon: { fontSize: 22, flexShrink: 0 },
  treatType: { fontWeight: 800, fontSize: 14, color: '#1A2B4A' },
  treatProto: { fontSize: 12, color: '#7A8BAD', marginTop: 2 },
  treatStatut: {
    marginLeft: 'auto', padding: '3px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 800, flexShrink: 0,
  },
  treatBody: { padding: '4px 0' },

  // Consultation
  consultCard: {
    background: '#fff', borderRadius: 14,
    border: '1px solid #E8EDF5',
    padding: '14px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    borderLeft: '4px solid #4A6CF7',
  },
  consultDate: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 800, fontSize: 13, color: '#4A6CF7', marginBottom: 6,
  },
  consultMotif: { fontSize: 14, fontWeight: 700, color: '#1A2B4A', marginBottom: 6 },
  consultCR:    { fontSize: 13, color: '#4A5568', lineHeight: 1.6, marginBottom: 8 },
  consultNext:  { fontSize: 12, color: '#059669', fontWeight: 700, marginBottom: 4 },
  consultMedecin: { fontSize: 11, color: '#7A8BAD', fontWeight: 600 },

  // Security note
  securityNote: {
    display: 'flex', gap: 12, padding: '14px 16px',
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 12,
  },

  // Empty state
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '48px 20px', textAlign: 'center',
    background: '#fff', borderRadius: 14, border: '1px solid #E8EDF5',
  },

  // Footer
  footer: {
    textAlign: 'center', padding: '20px 16px 0',
    fontSize: 11, color: '#7A8BAD', fontWeight: 600,
  },
};

