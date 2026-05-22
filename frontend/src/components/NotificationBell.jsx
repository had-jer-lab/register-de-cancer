/**
 * NotificationBell.jsx
 * Cloche de notifications — clic sur notification → redirige vers le dossier patient
 *
 * Usage dans Dashboard/Header:
 *   import NotificationBell from '../components/NotificationBell';
 *   <NotificationBell />
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:8000/api';

export default function NotificationBell() {
  const [notifs,  setNotifs]  = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const token  = localStorage.getItem('access_token');
  const unread = notifs.filter(n => !n.is_read).length;

  // ── Charger notifications ────────────────────────────────────────────────
  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifs(await res.json());
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fermer panel au clic dehors
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Marquer comme lu + naviguer vers dossier ─────────────────────────────
  const handleNotifClick = async (notif) => {
    // 1. Marquer comme lu
    if (!notif.is_read) {
      try {
        await fetch(`${API}/notifications/${notif.id}/read/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (_) {}
    }

    // 2. Fermer le panel
    setOpen(false);

    // 3. Naviguer vers le dossier patient si disponible
    if (notif.patient_id) {
      navigate(`/patient/${notif.patient_id}`);
    }
  };

  const markAllRead = async () => {
    const unreadNotifs = notifs.filter(n => !n.is_read);
    await Promise.all(
      unreadNotifs.map(n =>
        fetch(`${API}/notifications/${n.id}/read/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      )
    );
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const fmtDate = (iso) => {
    const d    = new Date(iso);
    const now  = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1)    return 'À l\'instant';
    if (diff < 60)   return `il y a ${diff} min`;
    if (diff < 1440) return `il y a ${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const typeIcon = (type) => ({
    form_submission: '📋',
    doublon:         '⚠️',
    rcp:             '🩺',
    system:          '🔔',
  }[type] || '🔔');

  const typeColor = (type) => ({
    form_submission: '#6366f1',
    doublon:         '#f59e0b',
    rcp:             '#059669',
    system:          '#64748B',
  }[type] || '#64748B');

  /* ── Styles ── */
  const s = {
    wrap: { position: 'relative' },

    bell: {
      width: 40, height: 40, borderRadius: 12,
      background: open ? '#EEF2FF' : '#fff',
      border: '1.5px solid #E2E8F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', position: 'relative', transition: '0.15s',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },

    badge: {
      position: 'absolute', top: -4, right: -4,
      width: 18, height: 18, borderRadius: '50%',
      background: 'linear-gradient(135deg,#ef4444,#dc2626)',
      color: '#fff', fontSize: 10, fontWeight: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid #fff',
      boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
      animation: unread > 0 ? 'pulse 2s infinite' : 'none',
    },

    panel: {
      position: 'absolute', top: 48, right: 0, zIndex: 9999,
      width: 360, maxHeight: 500,
      background: '#fff', borderRadius: 18,
      border: '1.5px solid #E2E8F5',
      boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    },

    panelHeader: {
      padding: '14px 18px', borderBottom: '1.5px solid #F1F5F9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#FAFBFF', flexShrink: 0,
    },

    panelTitle: { fontWeight: 800, fontSize: 14, color: '#1e293b' },

    markAll: {
      fontSize: 11, color: '#6366f1', fontWeight: 700,
      cursor: 'pointer', background: 'none', border: 'none', padding: 0,
    },

    list: { overflowY: 'auto', flex: 1 },

    item: (read) => ({
      padding: '13px 18px',
      borderBottom: '1px solid #F8FAFF',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      background: read ? '#fff' : '#F5F4FF',
      cursor: 'pointer',
      transition: 'background 0.15s',
    }),

    iconWrap: (color) => ({
      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
      background: color + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, border: `1px solid ${color}22`,
    }),

    itemTitle: { fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 2 },
    itemMsg:   { fontSize: 11, color: '#64748B', lineHeight: 1.45 },

    dossierLink: {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, color: '#6366f1', fontWeight: 800,
      marginTop: 4,
      background: '#EEF2FF', borderRadius: 6, padding: '2px 7px',
    },

    itemDate:  { fontSize: 10, color: '#94A3B8', marginTop: 3 },

    unreadDot: {
      width: 8, height: 8, borderRadius: '50%',
      background: '#6366f1', flexShrink: 0, marginTop: 8,
      boxShadow: '0 0 6px #6366f188',
    },

    empty: {
      padding: '48px 18px', textAlign: 'center',
      color: '#94A3B8', fontSize: 13,
    },

    viewAllBtn: {
      padding: '12px', textAlign: 'center', borderTop: '1.5px solid #F1F5F9',
      fontSize: 12, fontWeight: 700, color: '#6366f1',
      cursor: 'pointer', background: '#FAFBFF', flexShrink: 0,
    },
  };

  return (
    <>
      {/* Animation CSS pour badge */}
      <style>{`
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.15); }
        }
        .notif-item:hover { background: #F0F0FF !important; }
      `}</style>

      <div style={s.wrap} ref={panelRef}>
        {/* ── Bell button ── */}
        <div
          style={s.bell}
          onClick={() => { setOpen(o => !o); if (!open) load(); }}
          title="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={open ? '#6366f1' : '#64748B'} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unread > 0 && (
            <div style={s.badge}>{unread > 9 ? '9+' : unread}</div>
          )}
        </div>

        {/* ── Dropdown panel ── */}
        {open && (
          <div style={s.panel}>

            {/* Header */}
            <div style={s.panelHeader}>
              <div style={s.panelTitle}>
                Notifications
                {unread > 0 && (
                  <span style={{ color: '#6366f1', marginLeft: 6 }}>({unread})</span>
                )}
              </div>
              {unread > 0 && (
                <button style={s.markAll} onClick={markAllRead}>
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* List */}
            <div style={s.list}>
              {loading && notifs.length === 0 ? (
                <div style={s.empty}>⏳ Chargement…</div>
              ) : notifs.length === 0 ? (
                <div style={s.empty}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
                  Aucune notification
                </div>
              ) : (
                notifs.map(n => (
                  <div
                    key={n.id}
                    className="notif-item"
                    style={s.item(n.is_read)}
                    onClick={() => handleNotifClick(n)}
                    title={n.patient_id ? `Ouvrir le dossier ${n.dossier}` : ''}
                  >
                    {/* Icon */}
                    <div style={s.iconWrap(typeColor(n.type))}>
                      {typeIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.itemTitle}>{n.title}</div>
                      <div style={s.itemMsg}>{n.message}</div>

                      {/* Dossier badge — cliquable */}
                      {n.dossier && (
                        <div style={s.dossierLink}>
                          📁 {n.dossier}
                          {n.patient_id && (
                            <span style={{ color: '#4f46e5' }}>→ Voir dossier</span>
                          )}
                        </div>
                      )}

                      <div style={s.itemDate}>{fmtDate(n.created_at)}</div>
                    </div>

                    {/* Unread indicator */}
                    {!n.is_read && <div style={s.unreadDot} />}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div
                style={s.viewAllBtn}
                onClick={() => { setOpen(false); navigate('/notifications'); }}
              >
                Voir toutes les notifications →
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}