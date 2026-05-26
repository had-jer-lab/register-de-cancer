import { useNavigate } from 'react-router-dom';

export default function PatientArchive() {
  const navigate = useNavigate();
  const archives = JSON.parse(localStorage.getItem('archived_patients') || '[]');

  const handleRestore = (id) => {
    const updated = archives.filter(p => p.id !== id);
    localStorage.setItem('archived_patients', JSON.stringify(updated));
    navigate('/dashboard');
  };

  return (
    <div style={s.root}>

      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.sidebarBrand}>
          <div style={s.brandIcon}>⚕</div>
          <span style={s.brandName}>MedDossier</span>
        </div>
        <nav style={s.nav}>
          {[
            { icon: '🏠', label: 'Tableau de bord', path: '/dashboard' },
            { icon: '👥', label: 'Mes patients',     path: '/dashboard' },
            { icon: '📊', label: 'Statistiques',     path: '/statistics' },
            { icon: '💬', label: 'Discussion RCP',   path: '/rcp' },
            { icon: '📥', label: 'Import données',   path: '/import' },
            { icon: '📦', label: 'Archives',         path: '/patient-archive', active: true },
          ].map(({ icon, label, path, active }) => (
            <button key={label}
              style={{ ...s.navItem, ...(active ? s.navActive : {}) }}
              onClick={() => navigate(path)}>
              <span style={s.navIcon}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN */}
      <div style={s.main}>

        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topbarTitle}>Patients archivés</div>
            <div style={s.topbarSub}>Dossiers mis en archive</div>
          </div>
          <button style={s.backBtn} onClick={() => navigate('/dashboard')}>
            ← Retour au dashboard
          </button>
        </div>

        {/* STAT CARD */}
        <div style={s.statRow}>
          <div style={s.statCard}>
            <div style={{ ...s.statIcon, background: '#FFA26B18', color: '#FFA26B' }}>📦</div>
            <div>
              <div style={s.statValue}>{archives.length}</div>
              <div style={s.statLabel}>Dossiers archivés</div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div style={s.sectionHeader}>
          <div style={s.sectionTitle}>
            Liste des archives
            <span style={s.countBadge}>{archives.length} dossier{archives.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['N° Dossier', 'Patient', 'Âge', 'Sexe', 'Organe', 'Stade', 'Archivé le', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {archives.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...s.td, textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <div style={{ fontWeight: 700, color: '#1A2B4A', marginBottom: 6 }}>
                      Aucun dossier archivé
                    </div>
                    <div style={{ fontSize: 13, color: '#7A8BAD' }}>
                      Les dossiers archivés apparaîtront ici
                    </div>
                  </td>
                </tr>
              ) : (
                archives.map((p, i) => {
                  const cancer = p.dernier_cancer;
                  const stade  = cancer?.stade?.replace('Stade ', '') || '—';
                  const date   = p.archived_at
                    ? new Date(p.archived_at).toLocaleDateString('fr-FR')
                    : '—';
                  return (
                    <tr key={p.id} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                      <td style={s.td}>
                        <span style={s.dossierId}>{p.numero_dossier}</span>
                      </td>
                      <td style={s.td}>
                        <div style={s.patientCell}>
                          <div style={s.patientAvatar}>
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <div>
                            <div style={s.patientName}>{p.first_name} {p.last_name}</div>
                            {p.national_id && (
                              <div style={{ fontSize: 11, color: '#7A8BAD', fontWeight: 600 }}>
                                NIN: {p.national_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={s.ageChip}>{p.age} ans</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 18 }}>{p.sexe === 'M' ? '♂' : '♀'}</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A2B4A' }}>
                          {cancer?.organe || '—'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={s.stadeChip}>
                          {stade !== '—' ? `Stade ${stade}` : '—'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 12, color: '#7A8BAD', fontWeight: 600 }}>
                          {date}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button
                          style={s.restoreBtn}
                          title="Restaurer"
                          onClick={() => handleRestore(p.id)}>
                          ↩ Restaurer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  root:         { display: 'flex', minHeight: '100vh', fontFamily: "'Nunito', sans-serif", background: '#EEF2FF' },
  sidebar:      { width: 240, flexShrink: 0, background: 'linear-gradient(170deg,#1a2f6b 0%,#0f1c3f 100%)', display: 'flex', flexDirection: 'column', padding: '28px 16px', position: 'sticky', top: 0, height: '100vh' },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  brandIcon:    { width: 38, height: 38, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', boxShadow: '0 5px 15px rgba(74,108,247,0.5)' },
  brandName:    { fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 17, color: '#fff' },
  nav:          { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  navItem:      { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: 'none', background: 'transparent', fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'left', width: '100%' },
  navActive:    { background: 'rgba(74,108,247,0.3)', color: '#fff', fontWeight: 800, boxShadow: '0 2px 12px rgba(74,108,247,0.25)' },
  navIcon:      { fontSize: 17, width: 20, textAlign: 'center' },
  main:         { flex: 1, padding: '28px 32px', overflowY: 'auto' },
  topbar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  topbarTitle:  { fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 22, color: '#1A2B4A' },
  topbarSub:    { fontSize: 13, color: '#7A8BAD', fontWeight: 600, marginTop: 2 },
  backBtn:      { padding: '10px 20px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#fff', color: '#4A6CF7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" },
  statRow:      { display: 'flex', gap: 16, marginBottom: 28 },
  statCard:     { background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', display: 'flex', alignItems: 'center', gap: 16, border: '1.5px solid #EEF2FF' },
  statIcon:     { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  statValue:    { fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 20, color: '#1A2B4A' },
  statLabel:    { fontSize: 12, color: '#7A8BAD', fontWeight: 600 },
  sectionHeader:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 15, color: '#1A2B4A', display: 'flex', alignItems: 'center', gap: 8 },
  countBadge:   { fontSize: 12, fontWeight: 700, color: '#7A8BAD', background: '#EEF2FF', padding: '3px 10px', borderRadius: 20 },
  tableWrap:    { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', border: '1.5px solid #EEF2FF' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  thead:        { background: '#F5F8FF' },
  th:           { padding: '13px 16px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#7A8BAD', textTransform: 'uppercase', letterSpacing: '0.9px', borderBottom: '1.5px solid #EEF2FF', whiteSpace: 'nowrap' },
  tr:           { transition: '0.15s' },
  td:           { padding: '13px 16px', fontSize: 13, color: '#1A2B4A', fontWeight: 600, borderBottom: '1px solid #EEF2FF' },
  dossierId:    { fontSize: 11, fontWeight: 800, color: '#4A6CF7', fontFamily: "'Poppins',sans-serif" },
  patientCell:  { display: 'flex', alignItems: 'center', gap: 10 },
  patientAvatar:{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#FFA26B,#ff8c4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0 },
  patientName:  { fontWeight: 700, color: '#1A2B4A', fontSize: 13 },
  ageChip:      { background: '#FFF4EE', color: '#FFA26B', padding: '3px 10px', borderRadius: 30, fontSize: 12, fontWeight: 800 },
  stadeChip:    { padding: '3px 10px', borderRadius: 30, fontSize: 12, fontWeight: 800, background: '#F0F4FF', color: '#4A6CF7', border: '1px solid rgba(74,108,247,0.2)' },
  restoreBtn:   { padding: '7px 14px', borderRadius: 30, border: '1.5px solid rgba(0,201,167,0.3)', background: 'rgba(0,201,167,0.08)', color: '#00C9A7', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" },
};