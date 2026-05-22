import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // ✅ useLocation ajouté
import { usePatient } from '../context/PatientContext';
import NotificationBell from '../components/NotificationBell';

// ─── API helper ───────────────────────────────────────────────────────────────
const API = 'http://localhost:8000/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/auth';
    return;
  }
  if (!res.ok) throw await res.json();
  return res.json();
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  actif:    { bg: 'rgba(0,201,167,0.12)',  color: '#00C9A7', border: 'rgba(0,201,167,0.25)' },
  suivi:    { bg: 'rgba(74,108,247,0.1)',  color: '#4A6CF7', border: 'rgba(74,108,247,0.2)' },
  critique: { bg: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: 'rgba(255,107,107,0.22)' },
  decede:   { bg: 'rgba(122,139,173,0.1)', color: '#7A8BAD', border: 'rgba(122,139,173,0.2)' },
};

const STADE_COLORS = {
  I:   { bg: 'rgba(0,201,167,0.12)', color: '#00C9A7' },
  II:  { bg: 'rgba(255,162,107,0.12)', color: '#FFA26B' },
  III: { bg: 'rgba(255,107,107,0.12)', color: '#FF6B6B' },
  IV:  { bg: 'rgba(155,89,182,0.12)', color: '#9B59B6' },
};

const NAV_ITEMS = [
  { icon: '🏠', label: 'Tableau de bord', id: 'dashboard' },
  { icon: '👥', label: 'Mes patients',     id: 'patients'  },
  { icon: '📊', label: 'Statistiques',     id: 'stats'     },
  { icon: '💬', label: 'Discussion RCP',   id: 'rcp'       },
  { icon: '📥', label: 'Import données',   id: 'import'    },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav]     = useState('dashboard');
  const [patients,  setPatients]      = useState([]);
  const [stats,     setStats]         = useState(null);
  const [loading,   setLoading]       = useState(true);
  const [search,    setSearch]        = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page,      setPage]          = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const [toast,     setToast]         = useState('');

  // Récupérer l'utilisateur connecté
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  })();

  const PAGE_SIZE = 10;

  // ── Charger patients ─────────────────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
      if (search) params.append('search', search);
      const data = await apiFetch(`/patients/?${params}`);
      if (data) {
        // Support pagination DRF (results) ou liste simple
        const list = Array.isArray(data) ? data : (data.results || []);
        setPatients(list);
        setTotalCount(Array.isArray(data) ? data.length : (data.count || list.length));
      }
    } catch {
      showToast('Erreur de chargement des patients');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // ── Charger stats ─────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const data = await apiFetch('/patients/stats/');
      if (data) setStats(data);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => { loadPatients(); loadStats(); }, [loadPatients, loadStats]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer le dossier de ${name} ?`)) return;
    try {
      await apiFetch(`/patients/${id}/`, { method: 'DELETE' });
      setPatients(prev => prev.filter(p => p.id !== id));
      setTotalCount(prev => prev - 1);
      showToast(`✓ Dossier supprimé`);
    } catch {
      showToast('Erreur lors de la suppression');
    }
  };

  const { reset } = usePatient();

  const handleNavClick = (id) => {
    if (id === 'stats') {
      navigate('/statistics');
      return;
    }
    setActiveNav(id);
    if (id === 'rcp')    navigate('/rcp');
    if (id === 'import') navigate('/import');
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout/', { method: 'POST' });
    } catch { /* ignore */ }
    localStorage.clear();
    reset();
    navigate('/auth');
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {toast && <div style={s.toast}>{toast}</div>}

      {/* ── SIDEBAR ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarBrand}>
          <div style={s.brandIcon}>⚕</div>
          <span style={s.brandName}>MedDossier</span>
        </div>

        <nav style={s.nav}>
          {NAV_ITEMS.map(({ icon, label, id }) => (
            <button key={id}
              style={{ ...s.navItem, ...(activeNav === id ? s.navActive : {}) }}
              onClick={() => handleNavClick(id)}>
              <span style={s.navIcon}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div style={s.sidebarBottom}>
          <div style={s.userCard}>
            <div style={s.userAvatar}>
              {(user.prenom?.[0] || 'D')}{(user.nom?.[0] || 'R')}
            </div>
            <div>
              <div style={s.userName}>Dr. {user.prenom} {user.nom}</div>
              <div style={s.userRole}>{user.specialite || user.role || 'Médecin'}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>⬅ Déconnexion</button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={s.main}>

        {/* TOP BAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topbarTitle}>
              {activeNav === 'dashboard' ? 'Tableau de bord' : 'Mes patients'}
            </div>
            <div style={s.topbarSub}>
              Dr. {user.prenom} {user.nom} — {user.etablissement || 'CHU'}
            </div>
          </div>
          <div style={s.topbarRight}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              <div style={s.searchWrap}>
                <span style={s.searchIcon}>🔍</span>
                <input style={s.searchInput} type="text"
                  placeholder="Nom, N° dossier, NIN…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)} />
              </div>
              <button type="submit" style={s.searchBtn}>Chercher</button>
            </form>
            <NotificationBell />
            <div style={s.avatar}>
              {(user.prenom?.[0] || 'D')}{(user.nom?.[0] || 'R')}
            </div>
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        {stats && (
          <div style={s.statsGrid}>
            {[
              {
                label: 'Mes patients', value: stats.total_patients,
                delta: `+${stats.this_month} ce mois`, icon: '👥', color: '#4A6CF7',
              },
              {
                label: 'Nouveaux ce mois', value: stats.this_month,
                delta: stats.evolution_pct > 0 ? `↑ ${stats.evolution_pct}%` : `↓ ${Math.abs(stats.evolution_pct)}%`,
                icon: '📈', color: stats.evolution_pct >= 0 ? '#00C9A7' : '#FF6B6B',
              },
              {
                label: 'Hommes / Femmes',
                value: `${stats.sexe?.M || 0} / ${stats.sexe?.F || 0}`,
                delta: 'répartition par sexe', icon: '⚖', color: '#FFA26B',
              },
              {
                label: 'Type le plus fréquent',
                value: stats.top_organes?.[0]?.cancers__cancer_type__name || '—',
                delta: stats.top_organes?.[0] ? `${stats.top_organes[0].count} cas` : '—',
                icon: '🎗', color: '#9B59B6',
              },
            ].map(({ label, value, delta, icon, color }) => (
              <div key={label} style={s.statCard}>
                <div style={{ ...s.statIcon, background: color + '18', color }}>{icon}</div>
                <div style={s.statInfo}>
                  <div style={s.statValue}>{value}</div>
                  <div style={s.statLabel}>{label}</div>
                  <div style={{ ...s.statDelta, color }}>{delta}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── QUICK ACTIONS ── */}
        {activeNav === 'dashboard' && (
          <>
            <div style={s.sectionHeader}>
              <div style={s.sectionTitle}>Actions rapides</div>
            </div>
            <div style={s.actionsGrid}>
              {[
                { icon: '➕', label: 'Nouveau patient',  sub: 'Créer un dossier',       color: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', action: () => navigate('/page1'), highlight: true },
                { icon: '💬', label: 'Discussion RCP',   sub: 'Réunions médicales',     color: 'linear-gradient(135deg,#00C9A7,#00a98b)', action: () => navigate('/rcp') },
                { icon: '📥', label: 'Import données',   sub: 'CSV / Excel',            color: 'linear-gradient(135deg,#FFA26B,#ff8c4a)', action: () => navigate('/import') },
                { icon: '📊', label: 'Statistiques',     sub: 'Tableaux de bord',       color: 'linear-gradient(135deg,#9B59B6,#8e44ad)', action: () => navigate('/statistics') },
              ].map(({ icon, label, sub, color, action, highlight }) => (
                <button key={label} style={{ ...s.actionCard, ...(highlight ? s.actionHighlight : {}) }} onClick={action}>
                  <div style={{ ...s.actionIcon, background: color }}>{icon}</div>
                  <div style={s.actionLabel}>{label}</div>
                  <div style={s.actionSub}>{sub}</div>
                  {highlight && <div style={s.highlightBadge}>Nouveau</div>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── TABLE PATIENTS ── */}
        <div style={s.sectionHeader}>
          <div style={s.sectionTitle}>
            {search ? `Résultats pour « ${search} »` : 'Mes patients récents'}
            <span style={s.countBadge}>{totalCount} dossier{totalCount !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {search && (
              <button style={s.clearBtn} onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                ✕ Effacer
              </button>
            )}
            <button style={s.btnPrimary} onClick={() => navigate('/page1')}>➕ Nouveau</button>
          </div>
        </div>

        <div style={s.tableWrap}>
          {loading ? (
            <div style={s.loadingBox}>
              <div style={s.spinner}>⏳</div>
              <div>Chargement de vos patients…</div>
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['N° Dossier', 'Patient', 'Âge', 'Sexe', 'Organe', 'Stade', 'Wilaya', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => {
                  const cancer = p.dernier_cancer;
                  const stade  = cancer?.stade?.replace('Stade ', '') || '—';
                  const sc     = STADE_COLORS[stade] || {};
                  return (
                    <tr key={p.id} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                      <td style={s.td}>
                        <span 
                          style={{ ...s.dossierId, cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate(`/patient/${p.id}`)}>
                          {p.numero_dossier}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={s.patientCell}>
                          <div style={s.patientAvatar}>
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <div>
                            <div style={s.patientName}>{p.first_name} {p.last_name}</div>
                            {p.national_id && (
                              <div style={{ fontSize: 11, color: '#7A8BAD', fontWeight: 600 }}>NIN: {p.national_id}</div>
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
                        {stade !== '—' ? (
                          <span style={{ ...s.stadeChip, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}40` }}>
                            Stade {stade}
                          </span>
                        ) : <span style={{ color: '#C5D0E8', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 13, color: '#4A5568' }}>{p.wilaya_name || '—'}</span>
                      </td>
                      <td style={s.td}>
                        <div style={s.actionBtns}>
                          <button style={s.iconBtnView}
                            title="Voir le dossier"
                            onClick={() => navigate(`/patient/${p.id}`)}>
                            👁
                          </button>
                          <button style={s.iconBtnEdit}
                            title="Modifier"
                            onClick={() => navigate(`/patient/${p.id}/edit`)}>
                            ✏
                          </button>
                          <button
                            style={{ ...s.iconBtnEdit, color: '#FF6B6B', borderColor: 'rgba(255,107,107,0.3)' }}
                            title="Supprimer"
                            onClick={() => handleDelete(p.id, p.full_name)}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {patients.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} style={{ ...s.td, textAlign: 'center', padding: 60 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                      <div style={{ fontWeight: 700, color: '#1A2B4A', marginBottom: 6 }}>
                        {search ? `Aucun résultat pour « ${search} »` : 'Aucun patient enregistré'}
                      </div>
                      <div style={{ fontSize: 13, color: '#7A8BAD', marginBottom: 20 }}>
                        {search
                          ? 'Essayez avec un autre terme de recherche'
                          : 'Commencez par ajouter votre premier patient'}
                      </div>
                      {!search && (
                        <button style={s.btnPrimary} onClick={() => navigate('/page1')}>
                          ➕ Ajouter un patient
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div style={s.pagination}>
            <button style={{ ...s.pageBtn, ...(page === 1 ? s.pageBtnDisabled : {}) }}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              ← Précédent
            </button>
            <div style={s.pageInfo}>
              Page <strong>{page}</strong> sur <strong>{totalPages}</strong>
              &nbsp;·&nbsp;{totalCount} résultats
            </div>
            <button style={{ ...s.pageBtn, ...(page === totalPages ? s.pageBtnDisabled : {}) }}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Suivant →
            </button>
          </div>
        )}

      </div>{/* /main */}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  root: { display: 'flex', minHeight: '100vh', fontFamily: "'Nunito', sans-serif", background: '#EEF2FF' },
  sidebar: { width: 240, flexShrink: 0, background: 'linear-gradient(170deg, #1a2f6b 0%, #0f1c3f 100%)', display: 'flex', flexDirection: 'column', padding: '28px 16px', position: 'sticky', top: 0, height: '100vh' },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  brandIcon: { width: 38, height: 38, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', boxShadow: '0 5px 15px rgba(74,108,247,0.5)' },
  brandName: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 17, color: '#fff' },
  nav: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: 'none', background: 'transparent', fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: '0.2s', textAlign: 'left', width: '100%' },
  navActive: { background: 'rgba(74,108,247,0.3)', color: '#fff', fontWeight: 800, boxShadow: '0 2px 12px rgba(74,108,247,0.25)' },
  navIcon: { fontSize: 17, width: 20, textAlign: 'center' },
  sidebarBottom: { display: 'flex', flexDirection: 'column', gap: 10 },
  userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 12 },
  userAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 800, color: '#fff' },
  userRole: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  logoutBtn: { padding: '9px 14px', background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" },
  main: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  topbarTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 22, color: '#1A2B4A' },
  topbarSub: { fontSize: 13, color: '#7A8BAD', fontWeight: 600, marginTop: 2 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#7A8BAD' },
  searchInput: { background: '#fff', border: '1.5px solid #DDE4F3', borderRadius: 30, padding: '10px 16px 10px 38px', fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none', width: 260 },
  searchBtn: { padding: '10px 18px', borderRadius: 30, border: 'none', background: '#4A6CF7', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" },
  avatar: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 14px rgba(74,108,247,0.3)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
  statCard: { background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', display: 'flex', alignItems: 'center', gap: 16, border: '1.5px solid #EEF2FF' },
  statIcon: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  statInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  statValue: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 20, color: '#1A2B4A' },
  statLabel: { fontSize: 12, color: '#7A8BAD', fontWeight: 600 },
  statDelta: { fontSize: 11, fontWeight: 800, marginTop: 2 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15, color: '#1A2B4A', display: 'flex', alignItems: 'center', gap: 8 },
  countBadge: { fontSize: 12, fontWeight: 700, color: '#7A8BAD', background: '#EEF2FF', padding: '3px 10px', borderRadius: 20 },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 },
  actionCard: { background: '#fff', borderRadius: 16, padding: '20px 14px', border: '1.5px solid #EEF2FF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: '0.22s', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 14px rgba(74,108,247,0.06)', fontFamily: "'Nunito', sans-serif" },
  actionHighlight: { border: '2px solid rgba(74,108,247,0.3)', background: 'linear-gradient(135deg, rgba(74,108,247,0.05), rgba(107,135,255,0.03))', boxShadow: '0 8px 28px rgba(74,108,247,0.18)' },
  actionIcon: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' },
  actionLabel: { fontSize: 13, fontWeight: 800, color: '#1A2B4A', textAlign: 'center' },
  actionSub: { fontSize: 11, color: '#7A8BAD', fontWeight: 600, textAlign: 'center' },
  highlightBadge: { position: 'absolute', top: 10, right: 10, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', color: '#fff', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 30, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableWrap: { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', border: '1.5px solid #EEF2FF', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#F5F8FF' },
  th: { padding: '13px 16px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#7A8BAD', textTransform: 'uppercase', letterSpacing: '0.9px', borderBottom: '1.5px solid #EEF2FF', whiteSpace: 'nowrap' },
  tr: { transition: '0.15s' },
  td: { padding: '13px 16px', fontSize: 13, color: '#1A2B4A', fontWeight: 600, borderBottom: '1px solid #EEF2FF' },
  dossierId: { fontSize: 11, fontWeight: 800, color: '#4A6CF7', fontFamily: "'Poppins', sans-serif" },
  patientCell: { display: 'flex', alignItems: 'center', gap: 10 },
  patientAvatar: { width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0 },
  patientName: { fontWeight: 700, color: '#1A2B4A', fontSize: 13 },
  ageChip: { background: '#F0F4FF', color: '#4A6CF7', padding: '3px 10px', borderRadius: 30, fontSize: 12, fontWeight: 800 },
  stadeChip: { padding: '3px 10px', borderRadius: 30, fontSize: 12, fontWeight: 800, border: '1px solid' },
  actionBtns: { display: 'flex', gap: 6 },
  iconBtnView: { width: 30, height: 30, borderRadius: 8, border: '1.5px solid rgba(74,108,247,0.2)', background: 'rgba(74,108,247,0.05)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6CF7' },
  iconBtnEdit: { width: 30, height: 30, borderRadius: 8, border: '1.5px solid rgba(74,108,247,0.2)', background: 'rgba(74,108,247,0.05)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6CF7' },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 60, color: '#7A8BAD', fontSize: 14, fontWeight: 600 },
  spinner: { fontSize: 32, animation: 'spin 1s linear infinite' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' },
  pageBtn: { padding: '9px 20px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#fff', color: '#4A6CF7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  pageInfo: { fontSize: 13, color: '#7A8BAD', fontWeight: 600 },
  clearBtn: { padding: '9px 16px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#fff', color: '#FF6B6B', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" },
  btnPrimary: { padding: '10px 20px', borderRadius: 30, border: 'none', background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", boxShadow: '0 4px 14px rgba(74,108,247,0.3)' },
  toast: { position: 'fixed', bottom: 24, right: 24, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', color: '#fff', padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 800, boxShadow: '0 10px 30px rgba(74,108,247,0.4)', zIndex: 9999, fontFamily: "'Nunito', sans-serif" },
};