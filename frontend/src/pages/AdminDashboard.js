import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StatisticsEditor from './Statistics';

// ─── API Helper ───────────────────────────────────────────────────────────────
const API = 'http://localhost:8000/api/auth';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

// ─── Status / Role colors ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  actif:    { bg: 'rgba(0,201,167,0.12)',  color: '#00C9A7', border: 'rgba(0,201,167,0.25)' },
  inactif:  { bg: 'rgba(122,139,173,0.1)', color: '#7A8BAD', border: 'rgba(122,139,173,0.2)' },
  suspendu: { bg: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: 'rgba(255,107,107,0.22)' },
};
const ROLE_COLORS = {
  medecin:    { bg: 'rgba(74,108,247,0.1)',  color: '#4A6CF7' },
  biologiste: { bg: 'rgba(0,201,167,0.12)',  color: '#00C9A7' },
};
const ALL_PERMISSIONS = [
  { key: 'perm_read',   label: 'Lecture',      icon: '👁',  desc: 'Consulter les dossiers patients' },
  { key: 'perm_write',  label: 'Écriture',     icon: '✏',  desc: 'Créer / modifier des dossiers' },
  { key: 'perm_rcp',    label: 'RCP',          icon: '💬', desc: 'Participer aux réunions RCP' },
  { key: 'perm_lab',    label: 'Laboratoire',  icon: '🔬', desc: 'Accès aux données biologiques' },
  { key: 'perm_stats',  label: 'Statistiques', icon: '📊', desc: 'Voir les tableaux de bord' },
  { key: 'perm_import', label: 'Import',       icon: '📥', desc: 'Importer des données CSV/Excel' },
];

// ─── User Modal ───────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSave }) {
  const isNew = !user;
  const [form, setForm] = useState(
    user
      ? { ...user, password: '', password2: '' }
      : {
          nom: '', prenom: '', email: '', role: 'medecin',
          specialite: '', wilaya: '', etablissement: '',
          statut: 'actif', telephone: '',
          perm_read: true, perm_write: false, perm_rcp: false,
          perm_lab: false, perm_stats: false, perm_import: false,
          password: '', password2: '',
        }
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const togglePerm = (key) => setForm(prev => ({ ...prev, [key]: !prev[key] }));

  const validate = () => {
    const e = {};
    if (!form.nom.trim())    e.nom    = 'Obligatoire';
    if (!form.prenom.trim()) e.prenom = 'Obligatoire';
    if (!form.email.trim())  e.email  = 'Obligatoire';
    if (isNew) {
      if (!form.password)         e.password  = 'Le mot de passe est obligatoire';
      else if (form.password.length < 8) e.password = 'Minimum 8 caractères';
      if (form.password !== form.password2) e.password2 = 'Les mots de passe ne correspondent pas';
    } else if (form.password && form.password !== form.password2) {
      e.password2 = 'Les mots de passe ne correspondent pas';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const payload = { ...form };
    delete payload.password2;
    if (!payload.password) delete payload.password; // don't send empty password on edit
    try {
      await onSave(payload);
    } catch (err) {
      const apiErrors = {};
      if (err.email) apiErrors.email = err.email[0];
      if (err.password) apiErrors.password = err.password[0];
      if (err.non_field_errors) apiErrors.general = err.non_field_errors[0];
      setErrors(apiErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>
            <div style={s.modalIcon}>{isNew ? '➕' : '✏'}</div>
            {isNew ? 'Créer un utilisateur' : `Modifier — ${user.prenom} ${user.nom}`}
          </div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          {errors.general && (
            <div style={s.errBanner}>⚠ {errors.general}</div>
          )}

          {/* Identité */}
          <div style={s.modalSection}>
            <div style={s.modalSectionLabel}>Identité</div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>Nom *</label>
                <input style={{ ...s.mi, ...(errors.nom ? s.miErr : {}) }}
                  value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Nom de famille" />
                {errors.nom && <span style={s.errTxt}>{errors.nom}</span>}
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Prénom *</label>
                <input style={{ ...s.mi, ...(errors.prenom ? s.miErr : {}) }}
                  value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" />
                {errors.prenom && <span style={s.errTxt}>{errors.prenom}</span>}
              </div>
            </div>
            <div style={s.mfg}>
              <label style={s.ml}>Email professionnel *</label>
              <input style={{ ...s.mi, ...(errors.email ? s.miErr : {}) }}
                type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="exemple@hopital.dz" />
              {errors.email && <span style={s.errTxt}>{errors.email}</span>}
            </div>
            <div style={{ ...s.mfg, marginTop: 12 }}>
              <label style={s.ml}>Téléphone</label>
              <input style={s.mi} value={form.telephone}
                onChange={e => setForm({ ...form, telephone: e.target.value })}
                placeholder="0770 123 456" />
            </div>
          </div>

          {/* Mot de passe */}
          <div style={s.modalSection}>
            <div style={s.modalSectionLabel}>
              {isNew ? 'Mot de passe *' : 'Changer le mot de passe (optionnel)'}
            </div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>{isNew ? 'Mot de passe *' : 'Nouveau mot de passe'}</label>
                <input style={{ ...s.mi, ...(errors.password ? s.miErr : {}) }}
                  type="password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={isNew ? 'Minimum 8 caractères' : 'Laisser vide pour ne pas changer'} />
                {errors.password && <span style={s.errTxt}>{errors.password}</span>}
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Confirmer *</label>
                <input style={{ ...s.mi, ...(errors.password2 ? s.miErr : {}) }}
                  type="password" value={form.password2}
                  onChange={e => setForm({ ...form, password2: e.target.value })}
                  placeholder="Répéter le mot de passe" />
                {errors.password2 && <span style={s.errTxt}>{errors.password2}</span>}
              </div>
            </div>
          </div>

          {/* Rôle & Profil */}
          <div style={s.modalSection}>
            <div style={s.modalSectionLabel}>Rôle & Profil</div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>Rôle</label>
                <select style={s.mi} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="medecin">Médecin</option>
                  <option value="biologiste">Biologiste</option>
                </select>
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Spécialité</label>
                <input style={s.mi} value={form.specialite}
                  onChange={e => setForm({ ...form, specialite: e.target.value })} placeholder="ex: Oncologie" />
              </div>
            </div>
            <div style={s.modalGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>Wilaya</label>
                <input style={s.mi} value={form.wilaya}
                  onChange={e => setForm({ ...form, wilaya: e.target.value })} placeholder="Wilaya" />
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Établissement</label>
                <input style={s.mi} value={form.etablissement}
                  onChange={e => setForm({ ...form, etablissement: e.target.value })} placeholder="CHU / EHU…" />
              </div>
            </div>
            <div style={{ ...s.mfg, marginTop: 12 }}>
              <label style={s.ml}>Statut du compte</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {['actif', 'inactif', 'suspendu'].map(st => (
                  <button key={st} type="button"
                    style={{ ...s.statusToggle, ...(form.statut === st ? s.statusToggleActive : {}) }}
                    onClick={() => setForm({ ...form, statut: st })}>
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div style={s.modalSection}>
            <div style={s.modalSectionLabel}>Permissions d'accès</div>
            <div style={s.permGrid}>
              {ALL_PERMISSIONS.map(({ key, label, icon, desc }) => {
                const active = !!form[key];
                return (
                  <div key={key}
                    style={{ ...s.permCard, ...(active ? s.permCardActive : {}) }}
                    onClick={() => togglePerm(key)}>
                    <div style={s.permIcon}>{icon}</div>
                    <div style={s.permLabel}>{label}</div>
                    <div style={s.permDesc}>{desc}</div>
                    <div style={{ ...s.permCheck, ...(active ? s.permCheckActive : {}) }}>{active ? '✓' : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={s.modalFooter}>
          <button style={s.btnGhost} onClick={onClose} disabled={loading}>Annuler</button>
          <button style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Chargement…' : isNew ? '✓ Créer l\'utilisateur' : '✓ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Users Page ───────────────────────────────────────────────────────────────
function UsersPage({ search }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/users/');
      setUsers(Array.isArray(data) ? data : (data.results || []));
    } catch {
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  const handleSave = async (formData) => {
    if (editUser) {
      const updated = await apiFetch(`/users/${editUser.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setUsers(prev => prev.map(u => u.id === editUser.id ? updated : u));
      showToast(`✓ Utilisateur ${formData.prenom} ${formData.nom} modifié`);
    } else {
      const created = await apiFetch('/users/', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setUsers(prev => [created, ...prev]);
      showToast(`✓ Compte créé — ${formData.prenom} ${formData.nom} peut maintenant se connecter`);
    }
    setShowModal(false);
    setEditUser(null);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer le compte de ${name} ?`)) return;
    try {
      await apiFetch(`/users/${id}/`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast(`✓ Compte supprimé`);
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const filtered = users.filter(u =>
    `${u.prenom} ${u.nom} ${u.email} ${u.role} ${u.wilaya} ${u.etablissement}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {toast.msg && (
        <div style={{ ...s.toast, background: toast.type === 'error' ? 'linear-gradient(135deg,#FF6B6B,#e74c3c)' : 'linear-gradient(135deg,#00C9A7,#00a98b)' }}>
          {toast.msg}
        </div>
      )}
      {(showModal || editUser) && (
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSave={handleSave}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={s.pageTitle}>
          Mes utilisateurs
          <span style={s.pageTitleCount}>{filtered.length} compte{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <button style={s.btnPrimary} onClick={() => setShowModal(true)}>➕ Nouvel utilisateur</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7A8BAD' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Chargement des utilisateurs…
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Utilisateur', 'Rôle', 'Spécialité', 'Établissement', 'Permissions', 'Statut', 'Créé le', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                  <td style={s.td}>
                    <div style={s.patientCell}>
                      <div style={{
                        ...s.patientAvatar,
                        background: ROLE_COLORS[u.role]?.bg || '#eee',
                        color: ROLE_COLORS[u.role]?.color || '#555'
                      }}>
                        {(u.prenom?.[0] || '?')}{(u.nom?.[0] || '?')}
                      </div>
                      <div>
                        <div style={s.patientName}>{u.prenom} {u.nom}</div>
                        <div style={{ fontSize: 11, color: '#7A8BAD', fontWeight: 600 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.roleChip, ...ROLE_COLORS[u.role] }}>
                      {u.role === 'medecin' ? 'Médecin' : 'Biologiste'}
                    </span>
                  </td>
                  <td style={s.td}><span style={{ fontSize: 13, color: '#4A5568' }}>{u.specialite || '—'}</span></td>
                  <td style={s.td}>
                    <div style={{ fontSize: 12, color: '#4A6CF7', fontWeight: 700 }}>{u.etablissement || '—'}</div>
                    <div style={{ fontSize: 11, color: '#7A8BAD' }}>{u.wilaya || '—'}</div>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {ALL_PERMISSIONS.filter(p => u[p.key]).map(p => (
                        <span key={p.key} style={s.permBadge} title={p.desc}>{p.icon} {p.label}</span>
                      ))}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.statusBadge, ...(STATUS_COLORS[u.statut] || STATUS_COLORS.inactif) }}>
                      {u.statut?.charAt(0).toUpperCase() + u.statut?.slice(1)}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: '#7A8BAD', fontWeight: 600 }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.actionBtns}>
                      <button style={s.iconBtnBlue} title="Modifier" onClick={() => setEditUser(u)}>✏</button>
                      <button style={{ ...s.iconBtnBlue, color: '#FF6B6B', borderColor: 'rgba(255,107,107,0.3)' }}
                        title="Supprimer" onClick={() => handleDelete(u.id, `${u.prenom} ${u.nom}`)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#7A8BAD', padding: 50 }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
                    <div style={{ fontWeight: 700 }}>Aucun utilisateur créé</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Cliquez sur « Nouvel utilisateur » pour commencer</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Logs Page ────────────────────────────────────────────────────────────────
function LogsPage({ search }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    apiFetch('/logs/')
      .then(data => setLogs(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs
    .filter(l => filter === 'all' || l.action === filter)
    .filter(l => `${l.user_name} ${l.action} ${l.detail}`.toLowerCase().includes(search.toLowerCase()));

  const logStyle = (action) => ({
    login:  { bg: 'rgba(0,201,167,0.1)',  color: '#00C9A7', icon: '🔑' },
    logout: { bg: 'rgba(74,108,247,0.1)', color: '#4A6CF7', icon: '🚪' },
    action: { bg: 'rgba(255,162,107,0.1)', color: '#FFA26B', icon: '⚡' },
  }[action] || { bg: '#eee', color: '#666', icon: '•' });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={s.pageTitle}>
          Journal d'activité
          <span style={s.pageTitleCount}>{filtered.length} événements</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'Tout'], ['login', 'Connexions'], ['logout', 'Déconnexions'], ['action', 'Actions']].map(([val, label]) => (
            <button key={val}
              style={{ ...s.filterBtn, ...(filter === val ? s.filterBtnActive : {}) }}
              onClick={() => setFilter(val)}>{label}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7A8BAD' }}>⏳ Chargement…</div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Utilisateur', 'Type', 'Action', 'Détail', 'Horodatage'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const ls = logStyle(l.action);
                return (
                  <tr key={l.id} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                    <td style={s.td}>
                      <div style={s.patientCell}>
                        <div style={{ ...s.patientAvatar, background: ls.bg, color: ls.color, fontSize: 14 }}>{ls.icon}</div>
                        <span style={s.patientName}>{l.user_name}</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{ padding: '4px 12px', borderRadius: 30, fontSize: 12, fontWeight: 800, background: ls.bg, color: ls.color }}>
                        {ls.icon} {l.action === 'login' ? 'Connexion' : l.action === 'logout' ? 'Déconnexion' : 'Action'}
                      </span>
                    </td>
                    <td style={s.td}><span style={{ fontWeight: 700, color: '#1A2B4A', fontSize: 13 }}>{l.action}</span></td>
                    <td style={s.td}><span style={{ fontSize: 12, color: '#7A8BAD', fontWeight: 600 }}>{l.detail || '—'}</span></td>
                    <td style={s.td}>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 700, color: '#4A6CF7' }}>
                        {new Date(l.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#7A8BAD', padding: 40 }}>Aucun journal trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────
function OverviewPage({ usersCount, logsCount, setPage }) {
  return (
    <>
      <div style={s.statsGrid}>
        {[
          { label: 'Mes utilisateurs', value: String(usersCount), delta: 'médecins & biologistes', icon: '👥', color: '#4A6CF7' },
          { label: 'Activités enregistrées', value: String(logsCount), delta: 'dans le journal', icon: '📋', color: '#00C9A7' },
          { label: 'Statut système', value: 'En ligne', delta: 'Backend connecté', icon: '✅', color: '#9B59B6' },
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

      <div style={s.sectionHeader}>
        <div style={s.sectionTitle}>Navigation rapide</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { id: 'users', icon: '👤', label: 'Gérer mes utilisateurs', sub: 'Créer des comptes médecins & biologistes', color: 'linear-gradient(135deg,#4A6CF7,#6B87FF)' },
          { id: 'logs',  icon: '📋', label: 'Journal d\'activité',     sub: 'Connexions & actions des utilisateurs',  color: 'linear-gradient(135deg,#9B59B6,#8e44ad)' },
        ].map(({ id, icon, label, sub, color }) => (
          <div key={id} style={s.quickCard} onClick={() => setPage(id)}>
            <div style={{ ...s.quickIcon, background: color }}>{icon}</div>
            <div style={s.quickLabel}>{label}</div>
            <div style={s.quickSub}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={s.infoBanner}>
        <div style={{ fontSize: 22, marginBottom: 10 }}>💡</div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          Comment ça marche ?
        </div>
        <div style={{ fontSize: 13, color: '#7A8BAD', lineHeight: 1.6 }}>
          1. Créez un compte pour chaque médecin ou biologiste via <strong>« Gérer mes utilisateurs »</strong><br />
          2. Définissez un <strong>email</strong> et un <strong>mot de passe</strong> sécurisé<br />
          3. Assignez les <strong>permissions</strong> adaptées à leur rôle<br />
          4. L'utilisateur peut maintenant se connecter avec ses identifiants
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [page, setPage] = useState('overview');
  const [search, setSearch] = useState('');
  const [usersCount, setUsersCount] = useState(0);
  const [logsCount, setLogsCount] = useState(0);

  // Load counts for overview
  useEffect(() => {
    apiFetch('/users/').then(d => setUsersCount((Array.isArray(d) ? d : d.results || []).length)).catch(() => {});
    apiFetch('/logs/').then(d => setLogsCount((Array.isArray(d) ? d : d.results || []).length)).catch(() => {});
  }, []);

  const navItems = [
    { id: 'overview', icon: '🏠', label: 'Vue d\'ensemble' },
    { id: 'users',    icon: '👤', label: 'Mes utilisateurs' },
    { id: 'logs',     icon: '📋', label: 'Journal' },
    { id: 'statistics',  icon: '📊', label: 'Statistiques' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div style={s.root}>
      {/* ── SIDEBAR ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarBrand}>
          <div style={s.brandIcon}>⚕</div>
          <div>
            <span style={s.brandName}>MedDossier</span>
            <div style={s.brandSub}>Administration</div>
          </div>
        </div>

        <nav style={s.nav}>
          {navItems.map(({ id, icon, label }) => (
            <button key={id}
              style={{ ...s.navItem, ...(page === id ? s.navActive : {}) }}
              onClick={() => {
                if (id === 'statistics') {
                  navigate('/statistics');
                  return;
                }
                setPage(id);
                setSearch('');
              }}>
              <span style={s.navIcon}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div style={s.sidebarBottom}>
          <div style={s.adminBadge}>⚙ Administrateur</div>
          <div style={s.userCard}>
            <div style={s.userAvatar}>AD</div>
            <div>
              <div style={s.userName}>Administrateur</div>
              <div style={s.userRole}>Registre National</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>⬅ Déconnexion</button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={s.main}>
        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topbarTitle}>
              {page === 'overview' && 'Tableau de bord Admin'}
              {page === 'users'    && 'Gestion des utilisateurs'}
              {page === 'logs'     && 'Journal d\'activité'}
              {page === 'statistics' && 'Statistiques'}
            </div>
            <div style={s.topbarSub}>Registre National du Cancer — Panel Administrateur</div>
          </div>
          <div style={s.topbarRight}>
            {page !== 'overview' && (
              <div style={s.searchWrap}>
                <span style={s.searchIcon}>🔍</span>
                <input style={s.searchInput} type="text"
                  placeholder="Rechercher…" value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
            )}
            <div style={s.avatar}>AD</div>
          </div>
        </div>

        {page === 'overview' && <OverviewPage usersCount={usersCount} logsCount={logsCount} setPage={setPage} />}
        {page === 'users'    && <UsersPage search={search} />}
        {page === 'logs'     && <LogsPage search={search} />}
        {page === 'statistics' && <StatisticsEditor />}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: { display: 'flex', minHeight: '100vh', fontFamily: "'Nunito', sans-serif", background: '#EEF2FF' },
  sidebar: { width: 250, flexShrink: 0, background: 'linear-gradient(170deg, #1a2f6b 0%, #0f1c3f 100%)', display: 'flex', flexDirection: 'column', padding: '28px 16px', position: 'sticky', top: 0, height: '100vh' },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  brandIcon: { width: 38, height: 38, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', boxShadow: '0 5px 15px rgba(74,108,247,0.5)' },
  brandName: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 16, color: '#fff', display: 'block' },
  brandSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' },
  nav: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: 'none', background: 'transparent', fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: '0.2s', textAlign: 'left', width: '100%' },
  navActive: { background: 'rgba(74,108,247,0.3)', color: '#fff', fontWeight: 800, boxShadow: '0 2px 12px rgba(74,108,247,0.25)' },
  navIcon: { fontSize: 17, width: 20, textAlign: 'center' },
  sidebarBottom: { display: 'flex', flexDirection: 'column', gap: 8 },
  adminBadge: { padding: '6px 14px', background: 'rgba(155,89,182,0.25)', borderRadius: 8, fontSize: 11, fontWeight: 800, color: '#c39bd3', letterSpacing: '0.5px', textAlign: 'center' },
  userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 12 },
  userAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#9B59B6,#c39bd3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 },
  userName: { fontSize: 13, fontWeight: 800, color: '#fff' },
  userRole: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  logoutBtn: { padding: '9px 14px', background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  main: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  topbarTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 22, color: '#1A2B4A' },
  topbarSub: { fontSize: 13, color: '#7A8BAD', fontWeight: 600, marginTop: 2 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#7A8BAD' },
  searchInput: { background: '#fff', border: '1.5px solid #DDE4F3', borderRadius: 30, padding: '10px 16px 10px 38px', fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none', width: 260 },
  avatar: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#9B59B6,#c39bd3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 14px rgba(155,89,182,0.3)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 },
  statCard: { background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', display: 'flex', alignItems: 'center', gap: 16, border: '1.5px solid #EEF2FF' },
  statIcon: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  statInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  statValue: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 22, color: '#1A2B4A' },
  statLabel: { fontSize: 12, color: '#7A8BAD', fontWeight: 600 },
  statDelta: { fontSize: 11, fontWeight: 800, marginTop: 2 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15, color: '#1A2B4A' },
  quickCard: { background: '#fff', borderRadius: 16, padding: '24px 20px', border: '1.5px solid #EEF2FF', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: '0.22s', boxShadow: '0 4px 14px rgba(74,108,247,0.06)' },
  quickIcon: { width: 50, height: 50, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' },
  quickLabel: { fontSize: 14, fontWeight: 800, color: '#1A2B4A' },
  quickSub: { fontSize: 12, color: '#7A8BAD', fontWeight: 600 },
  infoBanner: { background: 'linear-gradient(135deg,rgba(74,108,247,0.05),rgba(0,201,167,0.03))', border: '1.5px solid rgba(74,108,247,0.15)', borderRadius: 16, padding: '24px 28px' },
  pageTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 18, color: '#1A2B4A', marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 },
  pageTitleCount: { fontSize: 13, fontWeight: 700, color: '#7A8BAD', background: '#EEF2FF', padding: '3px 10px', borderRadius: 20 },
  tableWrap: { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', border: '1.5px solid #EEF2FF' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#F5F8FF' },
  th: { padding: '13px 16px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#7A8BAD', textTransform: 'uppercase', letterSpacing: '0.9px', borderBottom: '1.5px solid #EEF2FF', whiteSpace: 'nowrap' },
  tr: { transition: '0.15s' },
  td: { padding: '13px 16px', fontSize: 13, color: '#1A2B4A', fontWeight: 600, borderBottom: '1px solid #EEF2FF' },
  patientCell: { display: 'flex', alignItems: 'center', gap: 10 },
  patientAvatar: { width: 34, height: 34, borderRadius: '50%', background: 'rgba(74,108,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6CF7', fontWeight: 800, fontSize: 11, flexShrink: 0 },
  patientName: { fontWeight: 700, color: '#1A2B4A', fontSize: 13 },
  statusBadge: { padding: '4px 12px', borderRadius: 30, fontSize: 12, fontWeight: 800, border: '1.5px solid' },
  roleChip: { padding: '4px 12px', borderRadius: 30, fontSize: 12, fontWeight: 800 },
  permBadge: { padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(74,108,247,0.08)', color: '#4A6CF7', whiteSpace: 'nowrap' },
  actionBtns: { display: 'flex', gap: 6 },
  iconBtnBlue: { width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(74,108,247,0.2)', background: 'rgba(74,108,247,0.05)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6CF7', transition: '0.2s' },
  filterBtn: { padding: '8px 16px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#7A8BAD', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  filterBtnActive: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(10,20,50,0.55)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: '#fff', borderRadius: 24, width: '100%', maxWidth: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 28px 70px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: '1.5px solid #EEF2FF' },
  modalTitle: { display: 'flex', alignItems: 'center', gap: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 18, color: '#1A2B4A' },
  modalIcon: { width: 38, height: 38, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' },
  modalClose: { width: 34, height: 34, borderRadius: 8, border: '1.5px solid #DDE4F3', background: '#F5F8FF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A8BAD' },
  modalBody: { padding: '24px 28px', overflowY: 'auto', flex: 1 },
  modalSection: { marginBottom: 24 },
  modalSectionLabel: { fontSize: 10.5, fontWeight: 900, color: '#7A8BAD', textTransform: 'uppercase', letterSpacing: '1.3px', marginBottom: 14 },
  modalGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  mfg: { display: 'flex', flexDirection: 'column', gap: 5 },
  ml: { fontSize: 11.5, fontWeight: 700, color: '#7A8BAD' },
  mi: { background: '#F5F8FF', border: '1.5px solid #DDE4F3', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none', width: '100%', boxSizing: 'border-box' },
  miErr: { borderColor: '#FF6B6B', background: 'rgba(255,107,107,0.04)' },
  errTxt: { fontSize: 11, color: '#FF6B6B', fontWeight: 700 },
  errBanner: { background: 'rgba(255,107,107,0.08)', border: '1.5px solid rgba(255,107,107,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#FF6B6B', fontWeight: 700, marginBottom: 16 },
  statusToggle: { padding: '8px 16px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#F5F8FF', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#7A8BAD', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  statusToggleActive: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  permGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 },
  permCard: { padding: '14px 12px', border: '2px solid #DDE4F3', borderRadius: 12, cursor: 'pointer', transition: '0.2s', position: 'relative', background: '#F5F8FF' },
  permCardActive: { border: '2px solid #4A6CF7', background: 'rgba(74,108,247,0.05)' },
  permIcon: { fontSize: 20, marginBottom: 6 },
  permLabel: { fontSize: 13, fontWeight: 800, color: '#1A2B4A', marginBottom: 3 },
  permDesc: { fontSize: 11, color: '#7A8BAD', lineHeight: 1.4 },
  permCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', border: '2px solid #DDE4F3', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 },
  permCheckActive: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  modalFooter: { display: 'flex', gap: 12, padding: '18px 28px', borderTop: '1.5px solid #EEF2FF', justifyContent: 'flex-end' },
  btnPrimary: { padding: '11px 24px', borderRadius: 30, border: 'none', background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", boxShadow: '0 6px 20px rgba(74,108,247,0.35)', transition: '0.2s' },
  btnGhost: { padding: '11px 24px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#F5F8FF', color: '#7A8BAD', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  toast: { position: 'fixed', bottom: 24, right: 24, color: '#fff', padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 800, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 2000, fontFamily: "'Nunito', sans-serif", maxWidth: 400 },
};