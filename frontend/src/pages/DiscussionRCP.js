import API_BASE from '../utils/apiConfig';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── API Helper ───────────────────────────────────────────────────────────────
const API = `${API_BASE}/`;

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) { localStorage.clear(); window.location.href = '/auth'; return; }
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw err; }
  if (res.status === 204) return {};
  return res.json();
}

const urgencyFromStade = (stade = '') => {
  if (stade.includes('4') || stade.toUpperCase().includes('IV'))  return 'élevée';
  if (stade.includes('3') || stade.toUpperCase().includes('III')) return 'modérée';
  return 'faible';
};
const urgencyClass = (u) =>
  u === 'élevée' ? s.urgElevee : u === 'modérée' ? s.urgModeree : s.urgFaible;


// ─── MyPatientsOverlay ───────────────────────────────────────────────────────
function MyPatientsOverlay({ patients, rcpList, onClose, onSelectRcp, activeFilter, setActiveFilter, s }) {
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('date');

  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86400000);
  const weekEnd    = new Date(todayStart.getTime() + 7  * 86400000);
  const monthEnd   = new Date(todayStart.getTime() + 30 * 86400000);

  const filteredList = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q ? rcpList : rcpList.filter(r =>
      (r.patient     || '').toLowerCase().includes(q) ||
      (r.cancer_type || '').toLowerCase().includes(q) ||
      (r.stade       || '').toLowerCase().includes(q) ||
      (r.decision    || '').toLowerCase().includes(q)
    );
    return sortBy === 'patient'
      ? [...list].sort((a, b) => (a.patient || '').localeCompare(b.patient || '', 'fr'))
      : list;
  }, [rcpList, search, sortBy]);

  const grp = { ongoing:[], today:[], week:[], month:[], future:[], closedOk:[], closedNoDoc:[] };

  filteredList.forEach(r => {
    const d = new Date(r.date);
    if (r.status === 'ongoing') {
      grp.ongoing.push(r);
    } else if (r.status === 'closed') {
      if (r.decision) grp.closedOk.push(r);
      else            grp.closedNoDoc.push(r);
    } else {
      if      (d >= todayStart && d < todayEnd) grp.today.push(r);
      else if (d >= todayEnd   && d < weekEnd)  grp.week.push(r);
      else if (d >= weekEnd    && d < monthEnd) grp.month.push(r);
      else if (d >= monthEnd)                   grp.future.push(r);
      else                                       grp.closedNoDoc.push(r);
    }
  });

  const GROUPS = [
    { key:'ongoing',     items:grp.ongoing,     label:'En cours',                  topColor:'#48BB78', tagBg:'#C6F6D5', tagColor:'#276749' },
    { key:'today',       items:grp.today,       label:"📅 Aujourd'hui",               topColor:'#4A90E2', tagBg:'#EBF8FF', tagColor:'#2B6CB0' },
    { key:'week',        items:grp.week,        label:'📆 Cette semaine',             topColor:'#ED8936', tagBg:'#FEEBC8', tagColor:'#C05621' },
    { key:'month',       items:grp.month,       label:'📗 Ce mois',                   topColor:'#9F7AEA', tagBg:'#FAF5FF', tagColor:'#553C9A' },
    { key:'future',      items:grp.future,      label:'🔭 Mois suivants',             topColor:'#718096', tagBg:'#EDF2F7', tagColor:'#4a5568' },
    { key:'closedOk',    items:grp.closedOk,    label:'✅ Clôturées — décision prise',topColor:'#38A169', tagBg:'#F0FFF4', tagColor:'#276749' },
    { key:'closedNoDoc', items:grp.closedNoDoc, label:'⚠️ Clôturées — sans décision', topColor:'#E53E3E', tagBg:'#FFF5F5', tagColor:'#C53030' },
  ].filter(g => g.items.length > 0);

  const visibleGroups = activeFilter === 'all' ? GROUPS
    : activeFilter === 'rapports' ? []
    : GROUPS.filter(g => g.key === activeFilter);

  const showRapports = activeFilter === 'all' || activeFilter === 'rapports';

  const statusTag = (r) => {
    if (r.status === 'ongoing') return { label:'En cours', bg:'#C6F6D5', color:'#276749' };
    if (r.status === 'closed')  return { label:'Clôturée',  bg:'#EDF2F7', color:'#4a5568' };
    return                             { label:'⏳ Planifiée', bg:'#FEEBC8', color:'#C05621' };
  };

  const RcpCard = ({ r }) => {
    const tag = statusTag(r);
    return (
      <div className="card-h"
        style={{ background:'white', borderRadius:12, padding:'14px 16px', cursor:'pointer',
                 border:'1.5px solid #e2e8f0', boxShadow:'0 2px 6px rgba(0,0,0,.05)', transition:'all .2s' }}
        onClick={() => { onClose(); onSelectRcp(r.id); }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
          <div style={{ fontWeight:700, color:'#2d3748', fontSize:14, flex:1, marginRight:8 }}>{r.patient}</div>
          <span style={{ padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:700, background:tag.bg, color:tag.color, whiteSpace:'nowrap' }}>{tag.label}</span>
        </div>
        <div style={{ fontSize:12, color:'#718096', marginBottom:8 }}>
          {r.cancer_type || '—'} &nbsp;•&nbsp; Stade <strong>{r.stade || '—'}</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#a0aec0' }}>
          <span>{new Date(r.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</span>
          <span>{r.participants_count} part.</span>
        </div>
        {r.decision && (
          <div style={{ marginTop:8, padding:'5px 8px', background:'#F0FFF4', borderRadius:6, fontSize:11, color:'#276749', borderLeft:'3px solid #48BB78' }}>
            {r.decision.length > 55 ? r.decision.slice(0,55)+'…' : r.decision}
          </div>
        )}
      </div>
    );
  };

  const filterBtns = [
    { key:'all',         label:'Tout',             count:filteredList.length },
    { key:'ongoing',     label:'En cours',      count:grp.ongoing.length },
    { key:'today',       label:"📅 Aujourd'hui",   count:grp.today.length },
    { key:'week',        label:'📆 Cette semaine', count:grp.week.length },
    { key:'month',       label:'📗 Ce mois',       count:grp.month.length },
    { key:'future',      label:'🔭 Mois suivants', count:grp.future.length },
    { key:'closedOk',    label:'✅ Avec décision', count:grp.closedOk.length },
    { key:'closedNoDoc', label:'⚠️ Sans décision', count:grp.closedNoDoc.length },
    { key:'rapports',    label:'Rapports PDF',  count:grp.closedOk.length },
  ].filter(b => b.count > 0 || b.key === 'all');

  const openPdf = async (r) => {
    if (r.rapport_url) { window.open(r.rapport_url, '_blank'); return; }
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}rcp/${r.id}/rapport/`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) { window.open(data.url, '_blank'); return; }
      }
    } catch {}
    onClose(); onSelectRcp(r.id);
  };

  return (
    <div style={s.overlay}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontSize:20, color:'#2d3748', fontWeight:800 }}>📋 Mes Patients & Réunions RCP</h2>
        <button style={s.closeBtn} onClick={onClose}>Fermer</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {[
          { val:patients.length,        label:'Patients',       color:'#4A90E2' },
          { val:grp.ongoing.length,     label:'En cours',       color:'#276749' },
          { val:grp.today.length+grp.week.length+grp.month.length+grp.future.length, label:'Planifiées', color:'#C05621' },
          { val:grp.closedOk.length,    label:'Décision prise', color:'#553C9A' },
          { val:grp.closedNoDoc.length, label:'Sans décision',  color:'#C53030' },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ background:'white', padding:'14px 16px', borderRadius:12, borderTop:'3px solid '+color, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:26, fontWeight:800, color, marginBottom:2 }}>{val}</div>
            <div style={{ fontSize:11, color:'#718096', fontWeight:600 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:220, position:'relative' }}>
          <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#a0aec0', pointerEvents:'none' }}>🔍</span>
          <input type="text" placeholder="Rechercher patient, cancer, décision..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', padding:'9px 36px 9px 34px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none', background:'white', boxSizing:'border-box' }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#a0aec0', fontSize:14 }}>✕</button>
          )}
        </div>
        <div style={{ display:'flex', background:'#EDF2F7', borderRadius:9, padding:3, gap:2 }}>
          {[['date','📅 Date'],['patient','👤 Patient']].map(([k,l]) => (
            <button key={k} onClick={() => setSortBy(k)}
              style={{ padding:'6px 12px', borderRadius:7, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s',
                background: sortBy===k ? 'white' : 'transparent',
                color:      sortBy===k ? '#4A90E2' : '#718096',
                boxShadow:  sortBy===k ? '0 1px 4px rgba(0,0,0,.1)' : 'none' }}>
              {l}
            </button>
          ))}
        </div>
        {search && <span style={{ fontSize:12, color:'#718096', fontWeight:600 }}>{filteredList.length} résultat(s)</span>}
      </div>
      <div style={{ display:'flex', gap:7, marginBottom:22, flexWrap:'wrap' }}>
        {filterBtns.map(({ key, label, count }) => (
          <button key={key} onClick={() => setActiveFilter(key)}
            style={{ padding:'6px 13px', borderRadius:20, border:'1.5px solid', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .15s',
              background:  activeFilter===key ? '#4A90E2' : 'white',
              color:       activeFilter===key ? 'white'   : '#4a5568',
              borderColor: activeFilter===key ? '#4A90E2' : '#e2e8f0' }}>
            {label} <span style={{ opacity:.7 }}>({count})</span>
          </button>
        ))}
      </div>
      {visibleGroups.map(g => (
        <div key={g.key} style={{ marginBottom:30 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:4, height:20, borderRadius:2, background:g.topColor }} />
            <h3 style={{ fontSize:14, fontWeight:800, color:g.tagColor, margin:0 }}>{g.label}</h3>
            <span style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:g.tagBg, color:g.tagColor }}>{g.items.length}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {g.items.map(r => <RcpCard key={r.id} r={r} />)}
          </div>
        </div>
      ))}
      {showRapports && grp.closedOk.length > 0 && (
        <div style={{ marginBottom:30 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:4, height:20, borderRadius:2, background:'#4A90E2' }} />
            <h3 style={{ fontSize:14, fontWeight:800, color:'#2B6CB0', margin:0 }}>Rapports PDF</h3>
            <span style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:'#EBF8FF', color:'#2B6CB0' }}>{grp.closedOk.length}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {grp.closedOk.map(r => (
              <div key={r.id} style={{ background:'white', borderRadius:10, padding:'12px 16px', border:'1.5px solid #e2e8f0', display:'flex', alignItems:'center', gap:14, boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
                <div style={{ width:40, height:40, borderRadius:9, background:'#EBF8FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#2B6CB0', flexShrink:0 }}>PDF</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:'#2d3748', fontSize:13 }}>{r.patient}</div>
                  <div style={{ fontSize:12, color:'#718096', marginTop:2 }}>{r.cancer_type || '—'} — Stade {r.stade || '—'}</div>
                  {r.decision && <div style={{ fontSize:11, color:'#276749', marginTop:3 }}>{r.decision.length>70 ? r.decision.slice(0,70)+'…' : r.decision}</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                  <span style={{ fontSize:11, color:'#a0aec0' }}>{new Date(r.date).toLocaleDateString('fr-FR')}</span>
                  <button onClick={async (e) => { e.stopPropagation(); await openPdf(r); }}
                    style={{ padding:'6px 14px', background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', color:'white', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    Ouvrir PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {filteredList.length === 0 && (
        <div style={{ textAlign:'center', padding:60, color:'#a0aec0' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>{search ? '🔍' : '📭'}</div>
          <div style={{ fontSize:15, fontWeight:600 }}>{search ? 'Aucun résultat pour "'+search+'"' : 'Aucune RCP trouvée'}</div>
        </div>
      )}
    </div>
  );
}

// ─── ✅ WherebyEmbed — iframe direct pour Whereby ─────────────────────────────
function WherebyEmbed({ roomUrl, onLeave }) {
  if (!roomUrl) return null;

  // Whereby supporte des paramètres via l'URL pour désactiver le lobby
  let embedUrl = roomUrl;
  try {
    const url = new URL(roomUrl);
    url.searchParams.set('embed', 'true');
    url.searchParams.set('skipMediaPermissionPrompt', 'true');
    url.searchParams.set('displayName', 'Médecin RCP');
    embedUrl = url.toString();
  } catch (e) {
    embedUrl = roomUrl;
  }

  return (
    <div style={{ flex: 1, width: '100%', minHeight: 0, position: 'relative' }}>
      <iframe
        key={roomUrl}
        src={embedUrl}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        allowFullScreen
        title="Vidéo-conférence RCP"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function DiscussionRCP() {

  const currentUser = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  // ── State principal ────────────────────────────────────────────────────────
  const [patients,           setPatients]           = useState([]);
  const [rcpList,            setRcpList]            = useState([]);
  const [notifs,             setNotifs]             = useState([]);
  const [selectedRcp,        setSelectedRcp]        = useState(null);
  const [loadingRcp,         setLoadingRcp]         = useState(false);
  const [messageInput,       setMessageInput]       = useState('');
  const [voteLoading,        setVoteLoading]        = useState(false);
  const [voteProposal,       setVoteProposal]       = useState('');
  const [showVoteInput,      setShowVoteInput]      = useState(false);
  const [decisionInput,      setDecisionInput]      = useState('');
  const [treatmentProtocol,  setTreatmentProtocol]  = useState('');
  const [showDecision,       setShowDecision]       = useState(false);
  const [isMinimized,        setIsMinimized]        = useState(false);
  const [isFullscreen,       setIsFullscreen]       = useState(false);
  const [showNotifs,         setShowNotifs]         = useState(false);
  const [showMyPatients,     setShowMyPatients]     = useState(false);
  const [toast,              setToast]              = useState('');

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const [sidebarView,          setSidebarView]          = useState('rcpList');
  const [patientDetail,        setPatientDetail]        = useState(null);
  const [loadingPatientDetail, setLoadingPatientDetail] = useState(false);
  const [activeFilter,         setActiveFilter]         = useState('all');

  // ── 🎤 Vocal ───────────────────────────────────────────────────────────────
  const [isRecording,  setIsRecording]  = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef   = useRef(null);
  const [newMsgCount,  setNewMsgCount]  = useState(0);
  const isAtBottomRef  = useRef(true);
  const [recSeconds,   setRecSeconds]   = useState(0);
  const recIntervalRef   = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef   = useRef(null);
  const audioChunksRef   = useRef([]);

  // ── 🖼️ Image ───────────────────────────────────────────────────────────────
  const [attachedImage,   setAttachedImage]   = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [lightboxImg,     setLightboxImg]     = useState(null);
  const [isDragging,      setIsDragging]      = useState(false);
  const imageInputRef = useRef(null);

  // ── 📹 Vidéo-conférence ────────────────────────────────────────────────────
  const [videoCallOpen,    setVideoCallOpen]    = useState(false);
  const [incomingCall,     setIncomingCall]     = useState(false);
  const [videoCallLoading, setVideoCallLoading] = useState(false);

  // ── Create RCP Modal ───────────────────────────────────────────────────────
  const [showCreateModal,    setShowCreateModal]    = useState(false);
  const [createStep,         setCreateStep]         = useState(1);
  const [selectedPatient,    setSelectedPatient]    = useState(null);
  const [patientCancers,     setPatientCancers]     = useState([]);
  const [selectedCancer,     setSelectedCancer]     = useState(null);
  const [allMedecins,        setAllMedecins]        = useState([]);
  const [invitedDoctors,     setInvitedDoctors]     = useState([]);
  const [meetingDatetime,    setMeetingDatetime]    = useState('');
  const [presentationReason, setPresentationReason] = useState('');
  const [createLoading,      setCreateLoading]      = useState(false);

  const chatRef        = useRef(null);
  const messagesEndRef = useRef(null);
  const unreadCount    = notifs.filter(n => !n.is_read).length;
  const prevUnreadRef  = useRef(0);

  // ── Multi-select vote ────────────────────────────────────────
  const [selectedForVote, setSelectedForVote] = useState([]);

  // ── Son + Push notification ──────────────────────────────────
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  const playNotifSound = useCallback(() => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;
      const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
      resume.then(() => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = 820;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
      });
    } catch {}
  }, []);

  const showPushNotif = useCallback((title, body) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') new Notification(title, { body, icon: '/favicon.ico' });
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ── Chargements initiaux ───────────────────────────────────────────────────
  const loadPatients    = useCallback(async () => {
    try { 
      const d = await apiFetch('rcp/mes-patients/');
      console.log('📋 Patients loaded:', d);
      if (d) setPatients(d); 
    } catch (err) {
      console.error('❌ Error loading patients:', err);
    }
  }, []);
  const loadRcpHistory  = useCallback(async () => {
    try { const d = await apiFetch('rcp/history/'); if (d) setRcpList(d); } catch {}
  }, []);
  const loadNotifs      = useCallback(async () => {
    try { const d = await apiFetch('rcp/notifications/'); if (d) setNotifs(d); } catch {}
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  useEffect(() => {
    const newUnread = notifs.filter(n => !n.is_read).length;
    if (newUnread > prevUnreadRef.current) {
      playNotifSound();
      const latest = notifs.find(n => !n.is_read);
      if (latest) showPushNotif('RCP — Nouvelle notification', latest.message);
    }
    prevUnreadRef.current = newUnread;
  }, [notifs, playNotifSound, showPushNotif]);

  useEffect(() => { loadPatients(); loadRcpHistory(); loadNotifs(); }, [loadPatients, loadRcpHistory, loadNotifs]);

  useEffect(() => {
    if (!selectedRcp) return;
    const iv = setInterval(async () => {
      try {
        const d = await apiFetch(`rcp/${selectedRcp.rcp_id}/`);
        if (!d) return;
        if (d.video_call_active && !selectedRcp.video_call_active && !selectedRcp.is_creator) {
          setIncomingCall(true);
        }
        if (!d.video_call_active && selectedRcp.video_call_active) {
          setVideoCallOpen(false);
          setIncomingCall(false);
          showToast('Vidéo-conférence terminée');
        }
        setSelectedRcp(d);
      } catch {}
    }, 10000);
    return () => clearInterval(iv);
  }, [selectedRcp]);

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    const count = selectedRcp?.messages?.length || 0;
    if (count > prevMsgCountRef.current) {
      if (isAtBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setNewMsgCount(0);
      } else {
        setNewMsgCount(n => n + (count - prevMsgCountRef.current));
      }
    }
    prevMsgCountRef.current = count;
  }, [selectedRcp?.messages?.length]);

  useEffect(() => {
    const checkPending = async () => {
      try { await apiFetch('rcp/check-pending/'); await loadNotifs(); } catch {}
    };
    checkPending();
    const iv = setInterval(checkPending, 60000);
    return () => clearInterval(iv);
  }, [loadNotifs]);

  const loadPatientDetail = useCallback(async (patientId) => {
    if (!patientId) return;
    setLoadingPatientDetail(true);
    try {
      const d = await apiFetch(`patients/${patientId}/`);
      if (d) setPatientDetail(d);
    } catch { showToast('Erreur chargement dossier patient'); }
    finally { setLoadingPatientDetail(false); }
  }, []);

  useEffect(() => {
    if (sidebarView === 'patientFile' && selectedRcp?.patient_id) {
      loadPatientDetail(selectedRcp.patient_id);
    }
  }, [sidebarView, selectedRcp?.patient_id, loadPatientDetail]);

  useEffect(() => {
    setPatientDetail(null);
  }, [selectedRcp?.rcp_id]);

  // ── Sélectionner RCP ───────────────────────────────────────────────────────
  const selectRcp = async (rcpId) => {
    setLoadingRcp(true);
    try { const d = await apiFetch(`rcp/${rcpId}/`); if (d) { setSelectedRcp(d); setIsMinimized(false); } }
    catch { showToast('Erreur chargement RCP'); }
    finally { setLoadingRcp(false); }
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  const handleNotifClick = async (notif) => {
    setShowNotifs(false);
    try { await apiFetch(`rcp/notifications/${notif.id}/read/`, { method: 'POST' }); } catch {}
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    if (notif.rcp_id) selectRcp(notif.rcp_id);
  };

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedRcp) return;
    const text = messageInput.trim();
    setMessageInput('');
    try {
      const msg = await apiFetch(`rcp/${selectedRcp.rcp_id}/chat/`, {
        method: 'POST', body: JSON.stringify({ message: text }),
      });
      if (msg) setSelectedRcp(prev => ({ ...prev, messages: [...prev.messages, msg] }));
    } catch { showToast('Erreur envoi message'); setMessageInput(text); }
  };

  // ── Vote ───────────────────────────────────────────────────────────────────
  const handleVote = async (proposalIndex, voteValue) => {
    if (!selectedRcp) return;
    setVoteLoading(true);
    try {
      const res = await apiFetch(`rcp/${selectedRcp.rcp_id}/vote/`, {
        method: 'POST', body: JSON.stringify({ vote: voteValue, proposal_index: proposalIndex }),
      });
      if (res) {
        setSelectedRcp(prev => ({
          ...prev,
          proposals: (prev.proposals || []).map(p =>
            p.index === proposalIndex
              ? { ...p, summary: res.vote_summary, my_vote: res.my_vote }
              : p
          ),
        }));
        showToast(voteValue === 'cancel' ? 'Vote annulé' : 'Vote enregistré');
      }
    } catch (e) { showToast(e?.error || 'Erreur vote'); }
    finally { setVoteLoading(false); }
  };

  const handleAddProposal = async (msg) => {
    if (!selectedRcp) return;
    const newProp = {
      text: msg.msg_type === 'voice' ? `Message vocal de ${msg.user}` : msg.message,
      user: msg.user,
      msg_type: msg.msg_type,
      duration: msg.duration || '',
    };
    try {
      const res = await apiFetch(`rcp/${selectedRcp.rcp_id}/add-proposal/`, {
        method: 'POST', body: JSON.stringify({ proposal: newProp }),
      });
      if (res?.ok) {
        showToast('Avis ajouté au vote');
        await selectRcp(selectedRcp.rcp_id);
      }
    } catch { showToast('Erreur'); }
  };

  const handleSetVote = async (proposalsArray) => {
    if (!selectedRcp || !proposalsArray?.length) return;
    try {
      await apiFetch(`rcp/${selectedRcp.rcp_id}/set-vote/`, {
        method: 'POST', body: JSON.stringify({ proposals: proposalsArray }),
      });
      showToast('Vote ouvert — Les médecins ont été notifiés');
      setShowVoteInput(false); setSelectedForVote([]);
      await selectRcp(selectedRcp.rcp_id);
    } catch { showToast('Erreur ouverture vote'); }
  };

  const handleCloseVote = async () => {
    if (!selectedRcp) return;
    try {
      const res = await apiFetch(`rcp/${selectedRcp.rcp_id}/close-vote/`, { method: 'POST' });
      if (res?.winner) {
        const label = res.winner.msg_type === 'voice'
          ? `[Vocal de ${res.winner.user}]`
          : res.winner.text;
        showToast(`Proposition gagnante : ${label.slice(0, 60)}`);
        setDecisionInput(res.winner.msg_type === 'voice'
          ? `Message vocal de ${res.winner.user}`
          : res.winner.text
        );
        setShowDecision(true);
      } else {
        showToast('Vote fermé');
      }
      await selectRcp(selectedRcp.rcp_id);
    } catch { showToast('Erreur fermeture vote'); }
  };

  const toggleSelectForVote = (msg) => {
    setSelectedForVote(prev =>
      prev.find(m => m.id === msg.id)
        ? prev.filter(m => m.id !== msg.id)
        : [...prev, msg]
    );
  };

  // ── File attachment ────────────────────────────────────────────────────────
  const handleSendFile = async () => {
    if (!attachedFile || !selectedRcp) return;
    const form = new FormData();
    form.append('file', attachedFile);
    form.append('message', attachedFile.name);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}rcp/${selectedRcp.rcp_id}/chat/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRcp(prev => ({ ...prev, messages: [...(prev.messages||[]), data] }));
        showToast('Fichier envoyé');
        setAttachedFile(null);
      }
    } catch { showToast('Erreur envoi fichier'); }
  };

  // ── 🖼️ Image handlers ─────────────────────────────────────────────────────
  const compressImage = (file, maxWidth = 1200, quality = 0.82) =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale  = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => { URL.revokeObjectURL(url); resolve(blob); },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          quality
        );
      };
      img.src = url;
    });

  const handleImageSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('❌ Fichier non valide — choisissez une image');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('❌ Image trop lourde (max 15 Mo)');
      return;
    }
    setAttachedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSendImage = async () => {
    if (!attachedImage || !selectedRcp) return;
    try {
      showToast('📤 Envoi en cours...');
      const compressed = await compressImage(attachedImage);
      const form = new FormData();
      form.append('image', compressed, attachedImage.name);
      form.append('message', attachedImage.name);
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `${API}rcp/${selectedRcp.rcp_id}/chat/`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedRcp(prev => ({ ...prev, messages: [...(prev.messages || []), data] }));
        showToast('🖼️ Image envoyée');
        setAttachedImage(null);
        setImagePreviewUrl(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`❌ ${err?.error || 'Erreur envoi image'}`);
      }
    } catch { showToast('❌ Erreur réseau'); }
  };

  // ── 📹 Vidéo-conférence handlers ───────────────────────────────────────────
  const handleStartVideo = async () => {
    if (!selectedRcp) return;
    setVideoCallLoading(true);
    try {
      const res = await apiFetch(`rcp/${selectedRcp.rcp_id}/start-video/`, { method: 'POST' });
      if (res?.room) {
        setSelectedRcp(prev => ({ ...prev, video_call_active: true, video_call_room: res.room }));
        setVideoCallOpen(true);
        showToast('Vidéo-conférence démarrée');
      }
    } catch { showToast('Erreur démarrage vidéo'); }
    finally { setVideoCallLoading(false); }
  };

  const handleEndVideo = async () => {
    if (!selectedRcp) return;
    try {
      await apiFetch(`rcp/${selectedRcp.rcp_id}/end-video/`, { method: 'POST' });
      setVideoCallOpen(false);
      setSelectedRcp(prev => ({ ...prev, video_call_active: false }));
      showToast('Vidéo-conférence terminée');
    } catch { showToast('Erreur fermeture vidéo'); }
  };

  const handleAcceptCall  = () => { setIncomingCall(false); setVideoCallOpen(true); };
  const handleDeclineCall = () => { setIncomingCall(false); showToast('Appel refusé'); };

  // ── 🎤 Vocal ───────────────────────────────────────────────────────────────
  const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      audioStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(250);
      setIsRecording(true);
      setRecSeconds(0);
      recIntervalRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      showToast('❌ Microphone non autorisé — vérifiez les permissions du navigateur');
    }
  };

  const cancelRecording = () => {
    clearInterval(recIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecSeconds(0);
  };

  const sendVoiceMessage = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    const durationAtSend = recSeconds;
    mr.onstop = async () => {
      const chunks = [...audioChunksRef.current];
      if (!chunks.length) { showToast('❌ Aucun audio capturé'); return; }
      const mimeType = mr.mimeType || 'audio/webm';
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      const formData = new FormData();
      formData.append('audio', blob, `voice.${ext}`);
      formData.append('duration', durationAtSend);
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`${API}rcp/${selectedRcp.rcp_id}/chat/`, {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        });
        if (res.ok) {
          const msg = await res.json();
          setSelectedRcp(prev => ({ ...prev, messages: [...(prev.messages || []), msg] }));
          showToast('🎤 Message vocal envoyé');
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(`❌ ${err?.error || 'Erreur envoi vocal'}`);
        }
      } catch { showToast('❌ Erreur réseau'); }
      if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t => t.stop()); audioStreamRef.current = null; }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    };
    clearInterval(recIntervalRef.current);
    mr.stop();
    setIsRecording(false);
    setRecSeconds(0);
  };

  const handleStartRcp = async () => {
    if (!selectedRcp) return;
    try {
      await apiFetch(`rcp/${selectedRcp.rcp_id}/start/`, { method: 'POST' });
      showToast('✅ RCP démarrée — Les médecins ont été notifiés');
      await selectRcp(selectedRcp.rcp_id);
      loadRcpHistory();
    } catch (e) { showToast(e?.error || 'Erreur démarrage'); }
  };

  const handleValidate = async () => {
    if (!decisionInput.trim() || !selectedRcp) return;
    try {
      await apiFetch(`rcp/${selectedRcp.rcp_id}/validate/`, {
        method: 'POST', body: JSON.stringify({ decision_text: decisionInput, treatment_protocol: treatmentProtocol }),
      });
      showToast('✓ Décision validée — Rapport généré');
      setShowDecision(false); setDecisionInput('');
      await selectRcp(selectedRcp.rcp_id);
      loadRcpHistory();
    } catch { showToast('Erreur validation'); }
  };

  const handleDownloadRapport = async () => {
    if (!selectedRcp) return;
    try {
      const res = await apiFetch(`rcp/${selectedRcp.rcp_id}/rapport/`);
      if (res?.url) window.open(res.url, '_blank');
    } catch { showToast('Rapport non disponible'); }
  };

  // ── CREATE RCP ─────────────────────────────────────────────────────────────
  const openCreateModal = async () => {
    setCreateStep(1); setSelectedPatient(null); setSelectedCancer(null);
    setInvitedDoctors([]); setMeetingDatetime(''); setPresentationReason('');
    setShowCreateModal(true);
    try { const d = await apiFetch('rcp/medecins/'); if (d) setAllMedecins(d); } catch {}
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient); setSelectedCancer(null); setPatientCancers([]);
    try {
      const d = await apiFetch(`patients/${patient.id}/cancers/`);
      if (d) setPatientCancers(d);
    } catch { showToast('Erreur chargement cancers'); }
    setCreateStep(2);
  };

  const handleSelectCancer = (cancer) => { setSelectedCancer(cancer); setCreateStep(3); };

  const toggleDoctor = (id) => {
    setInvitedDoctors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreateRcp = async () => {
    if (!selectedCancer || !meetingDatetime) { showToast('Choisissez un cancer et une date'); return; }
    setCreateLoading(true);
    try {
      const res = await apiFetch('rcp/create/', {
        method: 'POST',
        body: JSON.stringify({
          cancer_id: selectedCancer.id, meeting_datetime: meetingDatetime,
          invited_users: invitedDoctors, presentation_reason: presentationReason,
        }),
      });
      showToast('✓ RCP créée avec succès');
      setShowCreateModal(false);
      await loadRcpHistory();
      if (res?.rcp_id) selectRcp(res.rcp_id);
    } catch { showToast('Erreur création RCP'); }
    finally { setCreateLoading(false); }
  };

  // ── PatientFile Sidebar ────────────────────────────────────────────────────
  const PatientFileSidebar = () => {
    if (!selectedRcp) {
      return (
        <div style={{ textAlign:'center', padding:'40px 16px', color:'#a0aec0' }}>
          <div style={{ fontSize:36, marginBottom:10 }}></div>
          <div style={{ fontSize:13, fontWeight:600 }}>Sélectionnez une RCP d'abord</div>
        </div>
      );
    }
    if (loadingPatientDetail) {
      return (
        <div style={{ textAlign:'center', padding:'40px 16px', color:'#a0aec0' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>⟳</div>
          <div style={{ fontSize:12 }}>Chargement du dossier...</div>
        </div>
      );
    }
    const p = patientDetail;
    const urgency = urgencyFromStade(selectedRcp.stade || '');
    const cancer = p?.cancers?.find(c => String(c.id) === String(selectedRcp.cancer_id)) || p?.cancers?.[0];

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={s.pfCard}>
          <div style={s.pfCardHeader}>1 — Infos personnelles</div>
          <div style={s.pfRow}><span style={s.pfLabel}>Nom</span><span style={s.pfVal}>{p?.full_name || selectedRcp.patient}</span></div>
          <div style={s.pfRow}><span style={s.pfLabel}>Date de naissance</span><span style={s.pfVal}>{p?.date_naissance || '—'}</span></div>
          <div style={s.pfRow}><span style={s.pfLabel}>أ‚ge</span><span style={s.pfVal}>{p?.age ?? selectedRcp.age} ans</span></div>
          <div style={s.pfRow}><span style={s.pfLabel}>Sexe</span><span style={s.pfVal}>{p?.sexe === 'M' ? '🧑 Masculin' : p?.sexe === 'F' ? '👩 Féminin' : '—'}</span></div>
          <div style={s.pfRow}><span style={s.pfLabel}>N° Dossier</span><span style={{ ...s.pfVal, fontFamily:'monospace', fontSize:11 }}>{p?.numero_dossier || selectedRcp.numero_dossier}</span></div>
          {p?.phone      && <div style={s.pfRow}><span style={s.pfLabel}>Téléphone</span><span style={s.pfVal}>{p.phone}</span></div>}
          {p?.commune_name && <div style={s.pfRow}><span style={s.pfLabel}>Commune</span><span style={s.pfVal}>{p.commune_name}</span></div>}
          {p?.wilaya_name  && <div style={s.pfRow}><span style={s.pfLabel}>Wilaya</span><span style={s.pfVal}>{p.wilaya_name}</span></div>}
        </div>
        <div style={s.pfCard}>
          <div style={s.pfCardHeader}>2 — Diagnostic & Cancer</div>
          <div style={s.pfRow}><span style={s.pfLabel}>Type</span><span style={{ ...s.pfVal, fontSize:11 }}>{selectedRcp.cancer_type || '—'}</span></div>
          <div style={s.pfRow}>
            <span style={s.pfLabel}>Stade</span>
            <span style={{ padding:'2px 10px', borderRadius:6, fontSize:12, fontWeight:700, background:'#EDF2F7', color:'#2d3748' }}>Stade {selectedRcp.stade || '—'}</span>
          </div>
          {selectedRcp.tnm && <div style={s.pfRow}><span style={s.pfLabel}>TNM</span><span style={{ ...s.pfVal, fontFamily:'monospace', letterSpacing:1 }}>{selectedRcp.tnm}</span></div>}
          {cancer?.grade && <div style={s.pfRow}><span style={s.pfLabel}>Grade</span><span style={s.pfVal}>{cancer.grade}</span></div>}
          {cancer?.date_diagnostic && <div style={s.pfRow}><span style={s.pfLabel}>Date diagnostic</span><span style={s.pfVal}>{cancer.date_diagnostic}</span></div>}
          <div style={s.pfRow}>
            <span style={s.pfLabel}>Priorité</span>
            <span style={{ ...s.urgBadge, ...urgencyClass(urgency), padding:'3px 10px', borderRadius:6 }}>
              {urgency === 'élevée' ? '🔴 Élevée' : urgency === 'modérée' ? '🟡 Modérée' : '🟢 Faible'}
            </span>
          </div>
          {cancer?.histology && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #EDF2F7' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', marginBottom:6 }}>🧬 Histologie</div>
              {cancer.histology.type_histologique  && <div style={s.pfRow}><span style={s.pfLabel}>Type</span><span style={{ ...s.pfVal, fontSize:11 }}>{cancer.histology.type_histologique}</span></div>}
              {cancer.histology.grade_histologique && <div style={s.pfRow}><span style={s.pfLabel}>Grade histo</span><span style={s.pfVal}>{cancer.histology.grade_histologique}</span></div>}
              {cancer.histology.marge_chirurgicale && <div style={s.pfRow}><span style={s.pfLabel}>Marge</span><span style={s.pfVal}>{cancer.histology.marge_chirurgicale}</span></div>}
              {cancer.histology.envahissement_vasculaire != null && (
                <div style={s.pfRow}>
                  <span style={s.pfLabel}>Envah. vasc.</span>
                  <span style={{ ...s.pfVal, color: cancer.histology.envahissement_vasculaire ? '#C53030' : '#276749' }}>
                    {cancer.histology.envahissement_vasculaire ? '✔ Oui' : '✗ Non'}
                  </span>
                </div>
              )}
            </div>
          )}
          {cancer?.metastases?.length > 0 && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #EDF2F7' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', marginBottom:6 }}>📍 Métastases</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {cancer.metastases.map((m, i) => (
                  <span key={i} style={{ padding:'2px 8px', background:'#FED7D7', color:'#C53030', borderRadius:20, fontSize:11, fontWeight:700 }}>{m.organe}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={s.pfCard}>
          <div style={s.pfCardHeader}>3 — Données biologiques & Imagerie</div>
          <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', marginBottom:6 }}>🧪 Examens biologiques</div>
          {cancer?.biological_exams?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
              {cancer.biological_exams.map((e, i) => (
                <div key={i} style={{ background:'#F7FAFC', borderRadius:7, padding:'6px 9px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#2d3748' }}>{e.type_analyse}</div>
                  {e.resultat && <div style={{ fontSize:11, color:'#718096', marginTop:2 }}>{e.resultat}</div>}
                  {e.date_analyse && <div style={{ fontSize:10, color:'#a0aec0' }}>{e.date_analyse}</div>}
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize:11, color:'#cbd5e0', fontStyle:'italic', marginBottom:10 }}>Aucun examen biologique</div>}
          <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', marginBottom:6 }}>🩻 Imagerie</div>
          {cancer?.imaging_exams?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {cancer.imaging_exams.map((e, i) => (
                <div key={i} style={{ background:'#F7FAFC', borderRadius:7, padding:'6px 9px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#2d3748' }}>{e.type_examen}</div>
                  {e.conclusion && <div style={{ fontSize:11, color:'#718096', marginTop:2 }}>{e.conclusion}</div>}
                  {e.date_examen && <div style={{ fontSize:10, color:'#a0aec0' }}>{e.date_examen}</div>}
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize:11, color:'#cbd5e0', fontStyle:'italic' }}>Aucun examen d'imagerie</div>}
        </div>
        <div style={s.pfCard}>
          <div style={s.pfCardHeader}>4 — Habitudes de vie & Antécédents</div>
          <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', marginBottom:6 }}>⚠️ Antécédents</div>
          {p?.risk_factors?.length > 0 ? (
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
              {p.risk_factors.map((r, i) => (
                <span key={i} style={{ padding:'3px 9px', background:'#FEEBC8', color:'#C05621', borderRadius:20, fontSize:11, fontWeight:700 }}>{r.name}</span>
              ))}
            </div>
          ) : <div style={{ fontSize:11, color:'#cbd5e0', fontStyle:'italic', marginBottom:10 }}>Aucun facteur de risque</div>}
          <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', marginBottom:6 }}>🚬 Habitudes</div>
          {p?.habits?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {p.habits.map((h, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F7FAFC', borderRadius:7, padding:'5px 9px' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#2d3748' }}>{h.name}</span>
                  <div>
                    {h.frequency && <span style={{ fontSize:11, color:'#718096' }}>{h.frequency}</span>}
                    {h.duration_years && <span style={{ fontSize:11, color:'#a0aec0', marginLeft:5 }}>{h.duration_years} ans</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize:11, color:'#cbd5e0', fontStyle:'italic' }}>Aucune habitude enregistrée</div>}
        </div>
        <div style={s.pfCard}>
          <div style={s.pfCardHeader}>5 — Résumé & Validation</div>
          <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', marginBottom:6 }}>💊 Traitements</div>
          {cancer?.treatments?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
              {cancer.treatments.map((t, i) => (
                <div key={i} style={{ background:'#F0FFF4', borderRadius:7, padding:'6px 9px', borderLeft:'3px solid #48BB78' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#276749' }}>{t.type_traitement}</div>
                  {t.protocole && <div style={{ fontSize:11, color:'#4a5568', marginTop:2 }}>{t.protocole}</div>}
                  {(t.date_debut || t.date_fin) && <div style={{ fontSize:10, color:'#a0aec0', marginTop:2 }}>{t.date_debut || '?'} → {t.date_fin || 'En cours'}</div>}
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize:11, color:'#cbd5e0', fontStyle:'italic', marginBottom:10 }}>Aucun traitement enregistré</div>}
          <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', marginBottom:6 }}>📅 Derniers suivis</div>
          {cancer?.follow_ups?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
              {cancer.follow_ups.slice(0, 2).map((f, i) => (
                <div key={i} style={{ background:'#F7FAFC', borderRadius:7, padding:'6px 9px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:'#a0aec0' }}>{f.date_visite}</span>
                    {f.statut_clinique && <span style={{ fontSize:11, fontWeight:700, color:'#4A90E2' }}>{f.statut_clinique}</span>}
                  </div>
                  {f.observation && <div style={{ fontSize:11, color:'#718096', marginTop:2 }}>{f.observation}</div>}
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize:11, color:'#cbd5e0', fontStyle:'italic', marginBottom:10 }}>Aucun suivi enregistré</div>}
          {selectedRcp.decision ? (
            <div style={{ background:'#FEF5E7', borderRadius:8, padding:'8px 10px', borderLeft:'3px solid #F39C12' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#C05621', marginBottom:4 }}>Décision RCP</div>
              <div style={{ fontSize:11, color:'#4a5568', lineHeight:1.6 }}>{selectedRcp.decision}</div>
            </div>
          ) : <div style={{ fontSize:11, color:'#cbd5e0', fontStyle:'italic' }}>Décision non encore prise</div>}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 7px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 4px; }
        .btn-h:hover { opacity:.85; transform:translateY(-1px); }
        .card-h:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.1) !important; }
        .doctor-row:hover { background: #EBF8FF !important; }
        .img-msg:hover img { transform: scale(1.03); }
        @keyframes slideIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes pulse   { 0%,100%{box-shadow:0 0 0 10px rgba(74,144,226,.15),0 0 0 20px rgba(74,144,226,.07)} 50%{box-shadow:0 0 0 14px rgba(74,144,226,.2),0 0 0 28px rgba(74,144,226,.09)} }
        @media (max-width: 768px) {
          .rcp-main-layout { grid-template-columns: 1fr !important; }
          .rcp-sidebar { display: none !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.logoSection}>
          <div style={s.logo}>🏥</div>
          <span style={s.logoText}>Discussion RCP</span>
        </div>
        <div style={s.headerActions}>
          <button className="btn-h" style={s.createBtn} onClick={openCreateModal}>Nouvelle RCP</button>
          <button className="btn-h" style={s.myPatientsBtn} onClick={() => setShowMyPatients(!showMyPatients)}>Mes patients</button>
          <div style={s.notifIcon} onClick={() => setShowNotifs(!showNotifs)}>
            🔔 {unreadCount > 0 && <div style={s.notifBadge}>{unreadCount}</div>}
          </div>
        </div>
      </div>

      {/* ── MODAL CREATE RCP ── */}
      {showCreateModal && (
        <div style={s.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h2 style={{ fontSize:20, color:'#2d3748', fontWeight:700 }}>Créer une RCP</h2>
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  {['1. Patient','2. Cancer','3. Médecins & Date'].map((label, i) => (
                    <div key={i} style={{
                      padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700,
                      background: createStep===i+1 ? '#4A90E2' : createStep>i+1 ? '#C6F6D5' : '#EDF2F7',
                      color:      createStep===i+1 ? 'white'   : createStep>i+1 ? '#276749' : '#a0aec0',
                    }}>
                      {createStep>i+1 ? '✓ ':''}{label}
                    </div>
                  ))}
                </div>
              </div>
              <button style={s.closeBtn} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              {createStep === 1 && (
                <div>
                  <p style={s.stepDesc}>Choisissez le patient pour cette RCP :</p>
                  <div style={s.patientList}>
                    {patients.length === 0 && <p style={{ color:'#a0aec0', textAlign:'center', padding:30 }}>Aucun patient trouvé</p>}
                    {patients.map(p => (
                      <div key={p.id} className="card-h" style={s.patientRow} onClick={() => handleSelectPatient(p)}>
                        <div style={s.patientRowAvatar}>{p.name[0]}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, color:'#2d3748', fontSize:15 }}>{p.name}</div>
                          <div style={{ fontSize:13, color:'#718096', marginTop:3 }}>{p.age} ans • {p.numero_dossier}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:12, color:'#4A90E2', fontWeight:600 }}>🔬 {p.cancers_count} cancer{p.cancers_count>1?'s':''}</div>
                          {p.stade && <div style={{ fontSize:12, color:'#718096' }}>Stade {p.stade}</div>}
                        </div>
                        <span style={{ color:'#4A90E2', fontSize:18, marginLeft:8 }}>›</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {createStep === 2 && selectedPatient && (
                <div>
                  <div style={s.selectedPatientBanner}><strong>{selectedPatient.name}</strong> — {selectedPatient.age} ans — {selectedPatient.numero_dossier}</div>
                  <p style={s.stepDesc}>Ce patient a <strong>{patientCancers.length}</strong> cancer(s). Choisissez le cancer à discuter :</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {patientCancers.map(c => (
                      <div key={c.id} className="card-h" style={{ ...s.cancerRow, borderColor: selectedCancer?.id===c.id ? '#4A90E2':'#e2e8f0', background: selectedCancer?.id===c.id ? '#EBF8FF':'white' }} onClick={() => handleSelectCancer(c)}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, color:'#2d3748', fontSize:15, marginBottom:6 }}>🔬 {c.cancer_type}</div>
                          <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:13, color:'#718096' }}>
                            <span>📊 Stade: <strong>{c.stade}</strong></span>
                            {c.tnm !== '—' && <span>TNM: <strong>{c.tnm}</strong></span>}
                            {c.grade !== '—' && <span>Grade: <strong>{c.grade}</strong></span>}
                            {c.date_diagnostic && <span>📅 {c.date_diagnostic}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          {c.rcp_count > 0 && <div style={{ fontSize:12, color:'#718096' }}>{c.rcp_count} RCP précédente(s)</div>}
                          {selectedCancer?.id === c.id && <div style={{ fontSize:18, color:'#4A90E2' }}>✓</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={s.stepBtns}>
                    <button style={s.btnSecondary} onClick={() => setCreateStep(1)}>← Retour</button>
                    <button className="btn-h" style={{ ...s.btnPrimary, opacity:selectedCancer?1:0.5 }} disabled={!selectedCancer} onClick={() => selectedCancer && setCreateStep(3)}>Suivant →</button>
                  </div>
                </div>
              )}
              {createStep === 3 && selectedCancer && (
                <div>
                  <div style={s.selectedPatientBanner}><strong>{selectedPatient.name}</strong> — 🔬 {selectedCancer.cancer_type} — Stade {selectedCancer.stade}</div>
                  <div style={s.fieldGroup}>
                    <label style={s.fieldLabel}>📅 Date et heure de la réunion *</label>
                    <input type="datetime-local" style={s.input} value={meetingDatetime} onChange={e => setMeetingDatetime(e.target.value)} />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.fieldLabel}>📌 Raison de présentation</label>
                    <textarea rows={2} style={{ ...s.input, resize:'none' }} placeholder="Ex: Tumeur 4.2cm, stade avancé..." value={presentationReason} onChange={e => setPresentationReason(e.target.value)} />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.fieldLabel}>Inviter des médecins ({invitedDoctors.length} sélectionné{invitedDoctors.length!==1?'s':''})</label>
                    <div style={s.doctorList}>
                      {allMedecins.length === 0 && <p style={{ color:'#a0aec0', fontSize:13, padding:12 }}>Aucun professionnel disponible</p>}
                      {allMedecins.map(m => {
                        const isSelected = invitedDoctors.includes(m.id);
                        return (
                          <div key={m.id} className="doctor-row" style={{ ...s.doctorRow, background:isSelected?'#EBF8FF':'white', borderColor:isSelected?'#4A90E2':'#e2e8f0' }} onClick={() => toggleDoctor(m.id)}>
                            <div style={{ ...s.doctorAvatar, background:isSelected?'#4A90E2':'#EDF2F7', color:isSelected?'white':'#4a5568' }}>{(m.name||'?')[0].toUpperCase()}</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:600, fontSize:14, color:'#2d3748' }}>{m.name}</div>
                              <div style={{ fontSize:12, color:'#718096' }}>{
                              {
                                medecin: 'Médecin',
                                epidimio: 'Épidimio',
                                anapate: 'Anapath',
                                pharmacie: 'Pharmacie',
                              }[m.role] || m.role
                            } • {m.email}</div>
                            </div>
                            <div style={{ fontSize:18, color:isSelected?'#4A90E2':'#e2e8f0' }}>{isSelected?'✓':'○'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={s.stepBtns}>
                    <button style={s.btnSecondary} onClick={() => setCreateStep(2)}>← Retour</button>
                    <button className="btn-h" style={{ ...s.btnPrimary, opacity:(!meetingDatetime||createLoading)?0.5:1 }} disabled={!meetingDatetime||createLoading} onClick={handleCreateRcp}>
                      {createLoading ? '...' : 'Créer la RCP'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL NOTIFICATIONS ── */}
      {showNotifs && (
        <div style={s.notifsPanel}>
          <div style={s.notifsHeader}>
            <h3 style={{ fontSize:16, color:'#2d3748' }}>Notifications</h3>
            <button style={s.closeBtn} onClick={() => setShowNotifs(false)}>✕</button>
          </div>
          <div style={{ maxHeight:400, overflowY:'auto' }}>
            {notifs.length === 0 && <p style={{ padding:20, textAlign:'center', color:'#a0aec0' }}>Aucune notification</p>}
            {notifs.map(notif => (
              <div key={notif.id} style={{ ...s.notifItem, background:notif.is_read?'white':'#EBF8FF' }} onClick={() => handleNotifClick(notif)}>
                <div style={{ fontSize:13, fontWeight:700, color:'#2d3748', marginBottom:3 }}>{notif.patient || 'RCP'}</div>
                <div style={{ fontSize:12, color:'#718096' }}>{notif.message}</div>
                <div style={{ fontSize:11, color:'#a0aec0', marginTop:3 }}>{new Date(notif.created_at).toLocaleString('fr-FR')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VUE MES PATIENTS ── */}
      {showMyPatients && (
        <MyPatientsOverlay
          patients={patients} rcpList={rcpList}
          onClose={() => setShowMyPatients(false)} onSelectRcp={selectRcp}
          activeFilter={activeFilter} setActiveFilter={setActiveFilter} s={s}
        />
      )}

      {/* ── LAYOUT PRINCIPAL ── */}
      <div className="rcp-main-layout" style={{ ...s.mainLayout, gridTemplateColumns: isFullscreen ? '1fr' : '290px 1fr' }}>

        {/* ══ SIDEBAR ══ */}
        {!isFullscreen && (
          <div className="rcp-sidebar" style={s.sidebar}>
            <div style={s.sidebarToggle}>
              <button style={{ ...s.toggleBtn, ...(sidebarView==='rcpList' ? s.toggleBtnActive : {}) }} onClick={() => setSidebarView('rcpList')}>
                Liste RCP
              </button>
              <button style={{ ...s.toggleBtn, ...(sidebarView==='patientFile' ? s.toggleBtnActive : {}) }} onClick={() => setSidebarView('patientFile')}>
                Dossier patient
              </button>
            </div>
            {sidebarView === 'rcpList' ? (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', textTransform:'uppercase', marginBottom:10 }}>RCP récentes</div>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {rcpList.slice(0, 15).map(rcp => {
                    const isActive = selectedRcp?.rcp_id === rcp.id;
                    return (
                      <div key={rcp.id} className="card-h"
                        style={{ ...s.rcpSidebarCard, ...(isActive ? s.rcpSidebarActive : {}),
                          borderLeft: rcp.status==='ongoing' ? '3px solid #48BB78' : rcp.status==='scheduled' ? '3px solid #F6AD55' : '3px solid #e2e8f0' }}
                        onClick={() => selectRcp(rcp.id)}>
                        <div style={{ fontWeight:600, color:'#2d3748', fontSize:13, marginBottom:4 }}>{rcp.patient}</div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                          <span style={s.stageBadge}>Stade {rcp.stade}</span>
                          <span style={{ ...s.urgBadge, ...urgencyClass(urgencyFromStade(rcp.stade)) }}>{urgencyFromStade(rcp.stade)}</span>
                          {rcp.status==='ongoing'   && <span style={{ fontSize:10, background:'#C6F6D5', color:'#276749', padding:'1px 6px', borderRadius:4, fontWeight:700 }}>En cours</span>}
                          {rcp.status==='scheduled' && <span style={{ fontSize:10, background:'#FEEBC8', color:'#C05621', padding:'1px 6px', borderRadius:4, fontWeight:700 }}>Planifiée</span>}
                          {rcp.status==='closed'    && <span style={{ fontSize:10, background:'#EDF2F7', color:'#718096', padding:'1px 6px', borderRadius:4, fontWeight:600 }}>Clôturée</span>}
                          {rcp.video_call_active && <span style={{ fontSize:10, background:'#EBF8FF', color:'#2B6CB0', padding:'1px 6px', borderRadius:4, fontWeight:700 }}>En appel</span>}
                        </div>
                      </div>
                    );
                  })}
                  {rcpList.length === 0 && (
                    <div style={{ textAlign:'center', padding:30, color:'#a0aec0', fontSize:13 }}>
                      Aucune RCP<br />
                      <button className="btn-h" style={{ ...s.createBtn, marginTop:12, fontSize:12 }} onClick={openCreateModal}>Créer</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <PatientFileSidebar />
            )}
          </div>
        )}

        {/* ══ CONTENU PRINCIPAL ══ */}
        <div style={s.mainContent}>
          <div style={{ ...s.patientHeaderBar, padding: isMinimized ? '13px 26px' : '20px 26px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={s.patientIcon}></div>
                <h2 style={{ fontSize: isMinimized ? 16 : 20, color:'#2d3748', fontWeight:700 }}>
                  {loadingRcp ? '...' : selectedRcp ? selectedRcp.patient : 'Sélectionnez une RCP'}
                </h2>
                {selectedRcp && (
                  <span style={{ padding:'3px 10px', borderRadius:8, fontSize:12, fontWeight:700,
                    background: selectedRcp.status==='ongoing' ? '#C6F6D5' : '#EDF2F7',
                    color:      selectedRcp.status==='ongoing' ? '#276749' : '#4a5568' }}>
                    {selectedRcp.status === 'ongoing' ? 'En cours' : 'Clôturée'}
                  </span>
                )}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {selectedRcp?.status === 'ongoing' && selectedRcp?.is_creator && (
                  !selectedRcp.video_call_active ? (
                    <button className="btn-h" style={{
                      padding:'6px 14px', background:'linear-gradient(135deg,#48BB78,#38A169)',
                      color:'white', border:'none', borderRadius:8, cursor:'pointer',
                      fontWeight:700, fontSize:12, transition:'all .2s',
                      opacity: videoCallLoading ? 0.6 : 1,
                    }}
                    disabled={videoCallLoading}
                    onClick={handleStartVideo}>
                      📹 {videoCallLoading ? 'Démarrage...' : 'Vidéo-conférence'}
                    </button>
                  ) : (
                    <button className="btn-h" style={{
                      padding:'6px 14px', background:'#C6F6D5', color:'#276749',
                      border:'1.5px solid #48BB78', borderRadius:8, cursor:'pointer',
                      fontWeight:700, fontSize:12, animation:'blink 1.5s infinite',
                    }}
                    onClick={() => setVideoCallOpen(true)}>
                      🟢 Rejoindre l'appel
                    </button>
                  )
                )}
                {selectedRcp?.status === 'ongoing' && !selectedRcp?.is_creator && selectedRcp?.video_call_active && (
                  <button className="btn-h" style={{
                    padding:'6px 14px', background:'#C6F6D5', color:'#276749',
                    border:'1.5px solid #48BB78', borderRadius:8, cursor:'pointer',
                    fontWeight:700, fontSize:12,
                  }}
                  onClick={() => setVideoCallOpen(true)}>
                    🟢 Rejoindre l'appel
                  </button>
                )}
                {selectedRcp?.rapport_url && (
                  <button className="btn-h" style={s.rapportBtn} onClick={handleDownloadRapport}>Rapport</button>
                )}
                {selectedRcp && (
                  <>
                    <button className="btn-h" style={s.iconBtn} onClick={() => setIsFullscreen(!isFullscreen)}>{isFullscreen ? '⊡' : '⊞'}</button>
                    <button className="btn-h" style={s.iconBtn} onClick={() => setIsMinimized(!isMinimized)}>{isMinimized ? '▼' : '▲'}</button>
                  </>
                )}
              </div>
            </div>
            {!isMinimized && selectedRcp && (
              <div style={{ marginTop:12, display:'flex', gap:18, flexWrap:'wrap', fontSize:13, color:'#718096' }}>
                <span>📋 <strong>{selectedRcp.numero_dossier}</strong></span>
                <span>🎂 {selectedRcp.age} ans</span>
                <span>🔬 {selectedRcp.cancer_type}</span>
                <span>📊 Stade <strong>{selectedRcp.stade}</strong></span>
                {selectedRcp.tnm && <span>TNM <strong>{selectedRcp.tnm}</strong></span>}
                <span>📅 {new Date(selectedRcp.date).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>

          {/* Chat zone */}
          <div
            ref={chatRef}
            style={{ ...s.chatWrapper, ...(isDragging ? s.chatDragging : {}), position:'relative' }}
            onScroll={e => {
              const el = e.currentTarget;
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              isAtBottomRef.current = atBottom;
              if (atBottom) setNewMsgCount(0);
            }}
            onDragOver={e  => { e.preventDefault(); if (selectedRcp?.status === 'ongoing') setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
            onDrop={e => {
              e.preventDefault(); setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file?.type.startsWith('image/')) handleImageSelect(file);
            }}
          >
            {isDragging && (
              <div style={s.dragOverlay}>
                <div style={{ fontSize:52, marginBottom:12 }}>🖼️</div>
                <div style={{ fontSize:18, fontWeight:800, color:'#4A90E2' }}>Déposez l'image ici</div>
                <div style={{ fontSize:13, color:'#718096', marginTop:6 }}>Elle sera envoyée dans la discussion</div>
              </div>
            )}

            <div style={{ padding:26 }}>
              {loadingRcp ? (
                <div style={{ textAlign:'center', padding:60, color:'#a0aec0' }}>
                  <div style={{ fontSize:30 }}>⟳</div>
                  <div style={{ marginTop:8 }}>Chargement...</div>
                </div>
              ) : !selectedRcp ? (
                <div style={{ textAlign:'center', padding:60, color:'#a0aec0' }}>
                  <div style={{ fontSize:50, marginBottom:12 }}>💬</div>
                  <div style={{ fontWeight:600, fontSize:16 }}>Sélectionnez une RCP dans la liste</div>
                  <div style={{ fontSize:13, marginTop:6, marginBottom:20 }}>ou créez-en une nouvelle</div>
                  <button className="btn-h" style={s.createBtn} onClick={openCreateModal}>Créer une RCP</button>
                </div>
              ) : (
                <>
                  {selectedRcp.status === 'scheduled' && (
                    <div style={s.scheduledBanner}>
                      <div style={{ fontSize:32, marginBottom:10 }}>⏳</div>
                      <div style={{ fontWeight:700, fontSize:16, color:'#744210', marginBottom:6 }}>RCP planifiée — pas encore démarrée</div>
                      <div style={{ fontSize:13, color:'#92400e', marginBottom:16 }}>
                        📅 {new Date(selectedRcp.date).toLocaleDateString('fr-FR')} à {new Date(selectedRcp.date).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                      </div>
                      {selectedRcp.is_creator && (
                        <button className="btn-h" style={s.startBtn} onClick={handleStartRcp}>Démarrer la réunion</button>
                      )}
                      {!selectedRcp.is_creator && (
                        <div style={{ fontSize:13, color:'#92400e', fontStyle:'italic' }}>En attente du démarrage par le médecin responsable</div>
                      )}
                    </div>
                  )}

                  <div style={s.panel}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                      <span style={{ fontWeight:700, color:'#2d3748', fontSize:15 }}>Participants</span>
                      <span style={s.countBadge}>{selectedRcp.participants?.length || 0}</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {(selectedRcp.participants || []).map((p, i) => (
                        <div key={i} style={s.participantChip}>
                          <div style={s.participantAvatar}>{(p.name||'?')[0].toUpperCase()}</div>
                          <span style={{ fontSize:13, color:'#4a5568' }}>{p.name}</span>
                          <span style={{ fontSize:11, color:'#a0aec0' }}>• {p.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={s.panel}>
                    <h3 style={{ fontSize:15, color:'#2d3748', fontWeight:700, marginBottom:16, borderBottom:'2px solid #e2e8f0', paddingBottom:10 }}>Discussion</h3>
                    {(selectedRcp.messages || []).length === 0 ? (
                      <p style={{ color:'#a0aec0', textAlign:'center', padding:28 }}>Aucun message</p>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
                        {(selectedRcp.messages || []).map((msg, i) => {
                          const isOwn = msg.user_id === currentUser.id;
                          const prevMsg = i > 0 ? selectedRcp.messages[i-1] : null;
                          const showDateSep = !prevMsg || prevMsg.date !== msg.date;
                          return (
                            <React.Fragment key={i}>
                              {showDateSep && (
                                <div style={{ textAlign:'center', margin:'10px 0' }}>
                                  <span style={{ background:'#e2e8f0', color:'#718096', fontSize:11, fontWeight:600, padding:'3px 12px', borderRadius:20 }}>
                                    {msg.date === new Date().toLocaleDateString('fr-FR') ? "Aujourd'hui" : msg.date}
                                  </span>
                                </div>
                              )}
                              <div style={{ display:'flex', flexDirection:'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                                <span style={{ fontSize:11, fontWeight:600, color: isOwn ? '#718096' : '#4A6CF7',
                                  marginLeft: isOwn ? 0 : 44, marginBottom:2,
                                  alignSelf: isOwn ? 'flex-end' : 'flex-start' }}>
                                  {isOwn ? 'Vous' : msg.user}
                                </span>
                                <div style={{ display:'flex', alignItems:'flex-end', gap:8, flexDirection: isOwn ? 'row-reverse' : 'row', maxWidth:'78%' }}>
                                  {!isOwn && (
                                    <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:`hsl(${(msg.user||'').charCodeAt(0)*17%360},55%,55%)`, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>
                                      {(msg.user||'?')[0].toUpperCase()}
                                    </div>
                                  )}
                                  <div style={{ display:'flex', flexDirection:'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ padding: msg.msg_type === 'image' ? '4px' : '9px 13px', borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isOwn ? 'linear-gradient(135deg,#4A6CF7,#6B87FF)' : '#F0F4FF', color: isOwn ? '#fff' : '#2D3748', fontSize:13, lineHeight:1.5, boxShadow: isOwn ? '0 2px 8px rgba(74,108,247,.25)' : '0 1px 3px rgba(0,0,0,.08)', wordBreak:'break-word', minWidth: msg.msg_type==='voice' ? 180 : 'unset' }}>
                                      {msg.msg_type === 'file' ? (
                                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                          <span style={{ fontSize:20 }}>📎</span>
                                          <a href={msg.audio_url || '#'} target="_blank" rel="noreferrer"
                                            style={{ color: isOwn ? 'white' : '#4A6CF7', fontSize:13, fontWeight:600, textDecoration:'underline', wordBreak:'break-all' }}>
                                            {msg.message || 'Fichier joint'}
                                          </a>
                                        </div>
                                      ) : msg.msg_type === 'image' ? (
                                        <div
                                          className="img-msg"
                                          style={{ cursor:'pointer', borderRadius:12, overflow:'hidden', maxWidth:260 }}
                                          onClick={() => setLightboxImg(msg.image_url || msg.audio_url)}
                                        >
                                          <img
                                            src={msg.image_url || msg.audio_url}
                                            alt={msg.message || 'Image'}
                                            style={{ width:'100%', display:'block', borderRadius:12, transition:'transform .2s', maxHeight:320, objectFit:'cover' }}
                                          />
                                          {msg.message && msg.message !== msg.image_url && (
                                            <div style={{ fontSize:10, color: isOwn ? 'rgba(255,255,255,.7)' : '#a0aec0', padding:'4px 6px 2px' }}>
                                              {msg.message}
                                            </div>
                                          )}
                                        </div>
                                      ) : msg.msg_type === 'voice' ? (
                                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                          <button onClick={() => { const a = document.getElementById(`audio-${msg.id}`); if (a) a.paused ? a.play() : a.pause(); }} style={{ width:30, height:30, borderRadius:'50%', border:'none', cursor:'pointer', background: isOwn ? 'rgba(255,255,255,.3)' : '#4A6CF7', color:'white', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>▶</button>
                                          <div style={{ display:'flex', alignItems:'center', gap:2 }}>
                                            {[10,16,24,14,28,18,12,22,16,10,20,14,26,12,18].map((h, wi) => (
                                              <span key={wi} style={{ display:'block', width:3, height:h, borderRadius:3, background: isOwn ? 'rgba(255,255,255,.8)' : '#4A6CF7', opacity:.75 }} />
                                            ))}
                                          </div>
                                          <span style={{ fontSize:11, opacity:.75 }}>{msg.duration || '0:00'}</span>
                                          {msg.audio_url && <audio id={`audio-${msg.id}`} src={msg.audio_url} style={{ display:'none' }} />}
                                        </div>
                                      ) : msg.message}
                                    </div>
                                    <span style={{ fontSize:10, color:'#a0aec0', marginTop:3, paddingLeft:4, paddingRight:4, display:'flex', alignItems:'center', gap:3 }}>
                                      {msg.time}
                                      {isOwn && <span style={{ color:'#4A90E2', fontSize:11, fontWeight:700 }}>✓✓</span>}
                                    </span>
                                    {selectedRcp.is_creator && selectedRcp.status==='ongoing' && !selectedRcp.decision && msg.msg_type !== 'image' && (
                                      selectedRcp.vote_open ? (
                                        <button onClick={() => handleAddProposal(msg)}
                                          style={{ marginTop:2, padding:'2px 10px', fontSize:11, fontWeight:700, borderRadius:5,
                                            border:'none', cursor:'pointer', background:'transparent',
                                            color:'#D69E2E', textDecoration:'underline',
                                            alignSelf: isOwn ? 'flex-end' : 'flex-start' }}>
                                          + Ajouter au vote
                                        </button>
                                      ) : (
                                        <button onClick={() => toggleSelectForVote(msg)}
                                          style={{ marginTop:2, padding:'2px 10px', fontSize:11, fontWeight:700, borderRadius:5,
                                            border:'none', cursor:'pointer', transition:'all .15s',
                                            alignSelf: isOwn ? 'flex-end' : 'flex-start',
                                            background: selectedForVote.find(m=>m.id===msg.id) ? '#EBF4FF' : 'transparent',
                                            color:      selectedForVote.find(m=>m.id===msg.id) ? '#3182CE' : '#a0aec0',
                                            textDecoration: selectedForVote.find(m=>m.id===msg.id) ? 'none' : 'underline' }}>
                                          {selectedForVote.find(m=>m.id===msg.id) ? '✓ Sélectionné' : 'Mettre en vote'}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                    {selectedRcp.status === 'ongoing' && (
                      <div style={{ marginTop:8 }}>
                        {selectedRcp.is_creator && !selectedRcp.vote_open && !selectedRcp.decision && (
                          selectedForVote.length === 0 ? (
                            <div style={{ padding:'10px 14px', background:'#F7FAFC', borderRadius:10, border:'1px dashed #CBD5E0', fontSize:12, color:'#A0AEC0', textAlign:'center' }}>
                              Cochez les messages à soumettre au vote
                            </div>
                          ) : (
                            <div style={{ background:'#EBF4FF', borderRadius:10, padding:12, border:'1px solid #BEE3F8' }}>
                              <div style={{ fontSize:12, fontWeight:700, color:'#2B6CB0', marginBottom:8 }}>
                                {selectedForVote.length} message(s) sélectionné(s) — chacun aura son propre vote
                              </div>
                              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                                {selectedForVote.map((m, i) => (
                                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, background:'white', borderRadius:7, padding:'6px 10px', border:'1px solid #BEE3F8' }}>
                                    <span style={{ fontSize:11, fontWeight:700, color:'#4A6CF7', minWidth:16 }}>{i+1}.</span>
                                    <span style={{ fontSize:12, color:'#4A5568', fontWeight:600, flex:1 }}>{m.user}</span>
                                    <span style={{ fontSize:12, color:'#718096', flex:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                      {m.msg_type === 'voice' ? `Message vocal (${m.duration || '0:00'})` : m.message}
                                    </span>
                                    <button onClick={() => toggleSelectForVote(m)} style={{ background:'none', border:'none', color:'#A0AEC0', cursor:'pointer', fontSize:13 }}>✕</button>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display:'flex', gap:8 }}>
                                <button className="btn-h" style={{ padding:'7px 18px', background:'#4A6CF7', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}
                                  onClick={() => handleSetVote(selectedForVote.map((m, i) => ({
                                    index: i,
                                    text: m.msg_type === 'voice' ? `Message vocal de ${m.user}` : m.message,
                                    user: m.user,
                                    msg_type: m.msg_type,
                                    duration: m.duration || '',
                                  })))}>
                                  Lancer le vote
                                </button>
                                <button style={{ padding:'7px 14px', background:'#EDF2F7', color:'#718096', border:'none', borderRadius:8, fontSize:13, cursor:'pointer' }} onClick={() => setSelectedForVote([])}>
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )
                        )}
                        {selectedRcp.vote_open && selectedRcp.proposals?.length > 0 && (
                          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12,
                            position:'sticky', bottom:0, background:'#fffdf5',
                            borderTop:'2px solid #F6AD55', padding:'10px 0 0 0', zIndex:10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={{ fontSize:13, fontWeight:800, color:'#2D3748' }}>Propositions en vote</span>
                              {selectedRcp.is_creator && (
                                <div style={{ display:'flex', gap:6 }}>
                                  <button className="btn-h" style={{ padding:'5px 12px', background:'#EDF2F7', color:'#718096', border:'none', borderRadius:7, fontSize:11, cursor:'pointer' }}
                                    onClick={async () => {
                                      if (!window.confirm('Annuler tout le vote et recommencer ?')) return;
                                      try {
                                        await apiFetch(`rcp/${selectedRcp.rcp_id}/close-vote/`, { method:'POST' });
                                        await selectRcp(selectedRcp.rcp_id);
                                        setSelectedForVote([]);
                                        showToast('Vote annulé — vous pouvez en créer un nouveau');
                                      } catch { showToast('Erreur'); }
                                    }}>
                                    Annuler le vote
                                  </button>
                                  <button className="btn-h" style={{ padding:'5px 14px', background:'#FED7D7', color:'#C53030', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }} onClick={handleCloseVote}>Fermer le vote</button>
                                </div>
                              )}
                            </div>
                            {(selectedRcp.proposals || []).map((prop) => (
                              <div key={prop.index} style={{ background:'#FFFBEB', borderRadius:10, padding:12, border:'2px solid #F6AD55' }}>
                                <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                                  <span style={{ fontSize:12, fontWeight:800, color:'#C05621', minWidth:20 }}>{prop.index + 1}.</span>
                                  <div style={{ flex:1 }}>
                                    <span style={{ fontSize:11, color:'#A0AEC0', fontWeight:600 }}>{prop.user} — </span>
                                    <span style={{ fontSize:13, color:'#2D3748', fontWeight:600 }}>
                                      {prop.msg_type === 'voice' ? `Message vocal (${prop.duration || '0:00'})` : prop.text}
                                    </span>
                                  </div>
                                </div>
                                {!prop.my_vote ? (
                                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                                    {[{v:'approve',label:'Approuver',bg:'#C6F6D5',color:'#276749'},{v:'reject',label:'Rejeter',bg:'#FED7D7',color:'#C53030'},{v:'abstain',label:'Abstention',bg:'#EDF2F7',color:'#4A5568'}].map(({v,label,bg,color}) => (
                                      <button key={v} className="btn-h" disabled={voteLoading}
                                        style={{ padding:'7px 16px', background:bg, color, border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}
                                        onClick={() => handleVote(prop.index, v)}>
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                                    <span style={{ background:'#F0FFF4', borderRadius:7, padding:'5px 12px', fontSize:12, color:'#276749', fontWeight:700 }}>
                                      Votre vote : {prop.my_vote === 'approve' ? 'Approuvé' : prop.my_vote === 'reject' ? 'Rejeté' : 'Abstention'}
                                    </span>
                                    <button disabled={voteLoading} onClick={() => handleVote(prop.index, 'cancel')}
                                      style={{ fontSize:11, color:'#E53E3E', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', padding:0 }}>
                                      Annuler mon vote
                                    </button>
                                  </div>
                                )}
                                {prop.summary && (
                                  <div style={{ fontSize:11, color:'#A0AEC0' }}>
                                    {prop.summary.voted}/{prop.summary.total} ont voté
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {!selectedRcp.vote_open && selectedRcp.proposals?.length > 0 && !selectedRcp.decision && (
                          <div style={{ background:'#F7FAFC', borderRadius:10, padding:12, border:'1px solid #E2E8F0', marginBottom:10 }}>
                            <div style={{ fontSize:12, fontWeight:800, color:'#4A5568', marginBottom:8 }}>Résultats du vote</div>
                            {(selectedRcp.proposals || []).map(prop => (
                              <div key={prop.index} style={{ marginBottom:8, paddingBottom:8, borderBottom:'1px solid #EDF2F7' }}>
                                <div style={{ fontSize:12, color:'#2D3748', fontWeight:600, marginBottom:4 }}>
                                  {prop.index+1}. {prop.user} — {prop.msg_type==='voice' ? 'Message vocal' : prop.text?.slice(0,60)}
                                </div>
                                <div style={{ display:'flex', gap:14, fontSize:12 }}>
                                  <span style={{ color:'#276749', fontWeight:700 }}>{prop.summary?.approve || 0} Approuvé</span>
                                  <span style={{ color:'#C53030', fontWeight:700 }}>{prop.summary?.reject || 0} Rejeté</span>
                                  <span style={{ color:'#718096', fontWeight:700 }}>{prop.summary?.abstain || 0} Abstention</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div ref={messagesEndRef} />

                    {selectedRcp.decision && (
                      <div style={s.decisionBox}>
                        <div style={{ fontWeight:700, color:'#D68910', marginBottom:8, fontSize:14 }}>Décision Validée</div>
                        <div style={{ color:'#4a5568', lineHeight:1.6 }}>{selectedRcp.decision}</div>
                        {selectedRcp.treatment_protocol && (
                          <div style={{ marginTop:10, background:'#F0FFF4', borderRadius:8, padding:'10px 14px', borderLeft:'3px solid #48BB78' }}>
                            <div style={{ fontWeight:700, fontSize:12, color:'#276749', marginBottom:6 }}>Protocole de Traitement</div>
                            <pre style={{ margin:0, fontSize:12, color:'#2D3748', fontFamily:'inherit', whiteSpace:'pre-wrap' }}>{selectedRcp.treatment_protocol}</pre>
                          </div>
                        )}
                        {selectedRcp.signature_code && (
                          <div style={{ marginTop:10, background:'#EBF4FF', borderRadius:8, padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:16 }}>🔐</span>
                            <div>
                              <div style={{ fontSize:11, color:'#2C5282', fontWeight:700 }}>Signature Numérique</div>
                              <code style={{ fontSize:12, color:'#1a2f6b', fontWeight:700, letterSpacing:1 }}>{selectedRcp.signature_code}</code>
                            </div>
                          </div>
                        )}
                        {selectedRcp.rapport_url && (
                          <button className="btn-h" style={{ marginTop:10, padding:'7px 16px', background:'#4A90E2', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }} onClick={handleDownloadRapport}>Télécharger PDF</button>
                        )}
                      </div>
                    )}

                    {selectedRcp.status === 'ongoing' && !selectedRcp.decision && (
                      <div style={{ marginTop:18 }}>
                        {!selectedRcp.is_creator ? (
                          <div style={{ background:'#EDF2F7', borderRadius:10, padding:'10px 14px', color:'#718096', fontSize:13, fontStyle:'italic', display:'flex', alignItems:'center', gap:8 }}>
                            <span>⏳</span><span>En attente de la décision du responsable...</span>
                          </div>
                        ) : !showDecision ? (
                          <button className="btn-h" style={{ padding:'9px 20px', background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', color:'white', border:'none', borderRadius:9, cursor:'pointer', fontWeight:700, fontSize:13 }} onClick={() => setShowDecision(true)}>Valider une décision</button>
                        ) : (
                          <div style={{ background:'#FEF5E7', borderRadius:12, padding:16, border:'1px solid #F6AD55' }}>
                            <div style={{ fontWeight:700, marginBottom:8, color:'#744210', fontSize:14 }}>Décision finale</div>
                            <div style={{ fontWeight:600, fontSize:12, color:'#744210', marginBottom:4 }}>Décision thérapeutique *</div>
                            <textarea rows={3} style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #DDE4F3', fontSize:13, resize:'none', marginBottom:12, boxSizing:'border-box' }} placeholder="Ex: Chimiothérapie adjuvante recommandée..." value={decisionInput} onChange={e => setDecisionInput(e.target.value)} />
                            <div style={{ fontWeight:600, fontSize:12, color:'#744210', marginBottom:4 }}>Protocole de traitement (optionnel)</div>
                            <textarea rows={4} style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #DDE4F3', fontSize:13, resize:'none', marginBottom:10, boxSizing:'border-box' }} placeholder={"Ex:\n- Docetaxel 75 mg/m² J1\n- Carboplatine AUC5 J1"} value={treatmentProtocol} onChange={e => setTreatmentProtocol(e.target.value)} />
                            <div style={{ display:'flex', gap:8 }}>
                              <button className="btn-h" style={{ padding:'8px 18px', background:'#48BB78', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 }} onClick={handleValidate}>Confirmer</button>
                              <button style={{ padding:'8px 16px', background:'#EDF2F7', color:'#4a5568', border:'none', borderRadius:8, cursor:'pointer', fontSize:13 }} onClick={() => { setShowDecision(false); setDecisionInput(''); setTreatmentProtocol(''); }}>Annuler</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* New message badge */}
          {newMsgCount > 0 && (
            <div style={{ textAlign:'center', padding:'6px 0', background:'white', borderTop:'1px solid #e2e8f0' }}>
              <button onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); setNewMsgCount(0); }}
                style={{ padding:'5px 16px', background:'#4A6CF7', color:'white', border:'none', borderRadius:20,
                  fontSize:12, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(74,108,247,.35)' }}>
                {newMsgCount} nouveau{newMsgCount > 1 ? 'x' : ''} message{newMsgCount > 1 ? 's' : ''} ↓
              </button>
            </div>
          )}

          {/* Input message */}
          {selectedRcp && selectedRcp.status === 'ongoing' && (
            <>
              {isRecording && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', background:'#FFF5F5', borderTop:'1.5px solid #FEB2B2' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#E53E3E', animation:'blink .9s infinite', flexShrink:0 }} />
                  <span style={{ fontSize:15, fontWeight:700, color:'#E53E3E', minWidth:40 }}>{fmtDur(recSeconds)}</span>
                  <div style={{ flex:1, display:'flex', alignItems:'center', gap:2 }}>
                    {[8,14,20,12,18,24,10,16,22,8,18,14,20,10,16].map((h, i) => (
                      <span key={i} style={{ display:'block', width:3, height:h, borderRadius:3, background:'#E53E3E', opacity:.7 }} />
                    ))}
                  </div>
                  <button onClick={cancelRecording} style={{ padding:'6px 14px', background:'#FED7D7', border:'none', borderRadius:8, color:'#C53030', fontWeight:700, fontSize:12, cursor:'pointer' }}>✕ Annuler</button>
                  <button onClick={sendVoiceMessage} style={{ padding:'6px 14px', background:'#4A90E2', border:'none', borderRadius:8, color:'white', fontWeight:700, fontSize:12, cursor:'pointer' }}>Envoyer</button>
                </div>
              )}

              {!isRecording && imagePreviewUrl && (
                <div style={s.imgPreviewBar}>
                  <img src={imagePreviewUrl} alt="preview" style={s.imgPreviewThumb} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#2B6CB0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {attachedImage?.name}
                    </div>
                    <div style={{ fontSize:11, color:'#718096', marginTop:2 }}>
                      {attachedImage ? (attachedImage.size / 1024 / 1024).toFixed(2) + ' Mo' : ''}
                    </div>
                  </div>
                  <button onClick={() => { setAttachedImage(null); setImagePreviewUrl(null); }}
                    style={{ background:'none', border:'none', color:'#A0AEC0', cursor:'pointer', fontSize:16, padding:'0 4px' }}>✕</button>
                  <button className="btn-h" onClick={handleSendImage} style={s.imgSendBtn}>
                    🖼️ Envoyer
                  </button>
                </div>
              )}

              {!isRecording && (
                <div style={s.inputArea}>
                  <input ref={fileInputRef} type="file" style={{ display:'none' }}
                    onChange={e => { if(e.target.files[0]) setAttachedFile(e.target.files[0]); }} />
                  <input ref={imageInputRef} type="file" accept="image/*" style={{ display:'none' }}
                    onChange={e => { if (e.target.files[0]) handleImageSelect(e.target.files[0]); }} />

                  {attachedFile && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:'#EBF4FF', borderRadius:7, fontSize:12, color:'#2B6CB0', maxWidth:160, overflow:'hidden' }}>
                      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{attachedFile.name}</span>
                      <button onClick={() => setAttachedFile(null)} style={{ background:'none', border:'none', color:'#A0AEC0', cursor:'pointer', fontSize:13, padding:0 }}>✕</button>
                    </div>
                  )}

                  <input type="text" placeholder="Écrire un commentaire... (Entrée pour envoyer)" style={s.msgInput}
                    value={messageInput} onChange={e => setMessageInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (attachedFile ? handleSendFile() : sendMessage())} />

                  <button title="Joindre un fichier" onClick={() => fileInputRef.current?.click()}
                    style={{ width:40, height:40, borderRadius:9, border:'1px solid #e2e8f0', background:'#f7fafc', color:'#718096', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    📎
                  </button>

                  <button title="Envoyer une image" onClick={() => imageInputRef.current?.click()}
                    style={{ width:40, height:40, borderRadius:9, border:'1px solid #e2e8f0', background:'#f7fafc', color:'#718096', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    🖼️
                  </button>

                  <button title="Message vocal" onClick={startRecording}
                    style={{ width:40, height:40, borderRadius:9, border:'1px solid #e2e8f0', background:'#f7fafc', color:'#718096', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    🎤
                  </button>

                  <button className="btn-h" style={s.sendBtn} onClick={attachedFile ? handleSendFile : sendMessage}>Envoyer ➤</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── POPUPS VIDÉO ── */}
      {incomingCall && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:20, padding:'36px 40px', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.3)', maxWidth:360, width:'90%' }}>
            <div style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 16px', background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, animation:'pulse 1.4s infinite' }}>📹</div>
            <div style={{ fontSize:11, fontWeight:700, color:'#a0aec0', textTransform:'uppercase', marginBottom:6 }}>Appel entrant</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#2d3748', marginBottom:6 }}>{selectedRcp?.patient}</div>
            <div style={{ fontSize:13, color:'#718096', marginBottom:28 }}>Vidéo-conférence RCP démarrée par le responsable</div>
            <div style={{ display:'flex', gap:24, justifyContent:'center' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <button onClick={handleDeclineCall} style={{ width:56, height:56, borderRadius:'50%', border:'none', background:'#FED7D7', color:'#C53030', fontSize:22, cursor:'pointer', boxShadow:'0 4px 14px rgba(229,62,62,.3)' }}>📵</button>
                <span style={{ fontSize:12, color:'#C53030', fontWeight:600 }}>Refuser</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <button onClick={handleAcceptCall} style={{ width:56, height:56, borderRadius:'50%', border:'none', background:'linear-gradient(135deg,#48BB78,#38A169)', color:'white', fontSize:22, cursor:'pointer', boxShadow:'0 4px 14px rgba(72,187,120,.4)' }}>📹</button>
                <span style={{ fontSize:12, color:'#276749', fontWeight:600 }}>Accepter</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ✅ 📹 VIDÉO CALL — Whereby iframe ── */}
      {videoCallOpen && selectedRcp?.video_call_room && (
        <div style={{ position:'fixed', inset:0, zIndex:9998, display:'flex', flexDirection:'column', background:'#000' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', background:'#1a202c', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:'#48BB78', animation:'blink .9s infinite' }} />
              <span style={{ fontSize:14, fontWeight:700, color:'white' }}>📹 {selectedRcp.patient}</span>
              <span style={{ fontSize:12, color:'#a0aec0' }}>{selectedRcp.cancer_type} • Stade {selectedRcp.stade}</span>
            </div>
            {selectedRcp.is_creator ? (
              <button onClick={handleEndVideo} style={{ padding:'7px 16px', background:'#C53030', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Terminer pour tous
              </button>
            ) : (
              <button onClick={() => setVideoCallOpen(false)} style={{ padding:'7px 16px', background:'#4a5568', color:'white', border:'none', borderRadius:8, fontSize:13, cursor:'pointer' }}>
                ✕ Quitter
              </button>
            )}
          </div>
          {/* ✅ WherebyEmbed remplace JitsiMeetEmbed */}
          <WherebyEmbed roomUrl={selectedRcp.video_call_room} onLeave={() => setVideoCallOpen(false)} />
        </div>
      )}

      {/* ── 🖼️ LIGHTBOX ── */}
      {lightboxImg && (
        <div style={s.lightboxOverlay} onClick={() => setLightboxImg(null)}>
          <div style={s.lightboxContainer} onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxImg(null)} style={s.lightboxClose}>✕</button>
            <img src={lightboxImg} alt="Aperçu" style={s.lightboxImg} />
            <a href={lightboxImg} download style={s.lightboxDownload} onClick={e => e.stopPropagation()}>
              ⬇️ Télécharger
            </a>
          </div>
        </div>
      )}

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  root:           { minHeight:'100vh', background:'linear-gradient(135deg,#e3e8f7,#f0e7f7)', fontFamily:'-apple-system, BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' },
  header:         { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', background:'white', boxShadow:'0 2px 10px rgba(0,0,0,.06)' },
  logoSection:    { display:'flex', alignItems:'center', gap:12 },
  logo:           { width:42, height:42, background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 },
  logoText:       { fontSize:20, color:'#2d3748', fontWeight:700 },
  headerActions:  { display:'flex', alignItems:'center', gap:12 },
  createBtn:      { padding:'9px 18px', background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s' },
  myPatientsBtn:  { padding:'9px 16px', background:'#EDF2F7', color:'#4A90E2', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s' },
  notifIcon:      { width:38, height:38, borderRadius:'50%', background:'#f7fafc', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:17, position:'relative' },
  notifBadge:     { position:'absolute', top:3, right:3, width:17, height:17, background:'#E53E3E', borderRadius:'50%', color:'white', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' },
  modalOverlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', animation:'fadeIn .2s', padding:16 },
  modal:          { background:'white', borderRadius:18, width:'100%', maxWidth:580, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.3)', animation:'slideIn .2s' },
  modalHeader:    { padding:'22px 26px 16px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 },
  modalBody:      { padding:'20px 26px', overflowY:'auto', flex:1 },
  stepDesc:       { fontSize:14, color:'#718096', marginBottom:14 },
  patientList:    { display:'flex', flexDirection:'column', gap:10, maxHeight:360, overflowY:'auto' },
  patientRow:     { display:'flex', alignItems:'center', gap:12, padding:'13px 16px', background:'#f7fafc', borderRadius:12, cursor:'pointer', border:'2px solid transparent', transition:'all .2s' },
  patientRowAvatar:{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0 },
  selectedPatientBanner: { background:'#EBF8FF', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#2b6cb0', marginBottom:14, border:'1px solid #BEE3F8' },
  cancerRow:      { display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, cursor:'pointer', border:'2px solid', transition:'all .2s' },
  fieldGroup:     { marginBottom:16 },
  fieldLabel:     { display:'block', fontSize:13, fontWeight:700, color:'#4a5568', marginBottom:7 },
  input:          { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, outline:'none', fontFamily:'inherit' },
  doctorList:     { maxHeight:220, overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' },
  doctorRow:      { display:'flex', alignItems:'center', gap:10, padding:'11px 14px', cursor:'pointer', border:'1px solid', borderLeft:'none', borderRight:'none', borderTop:'none', transition:'all .15s' },
  doctorAvatar:   { width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, transition:'all .2s' },
  stepBtns:       { display:'flex', justifyContent:'space-between', marginTop:20 },
  btnPrimary:     { padding:'10px 22px', background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', transition:'all .2s' },
  btnSecondary:   { padding:'10px 18px', background:'#EDF2F7', color:'#4a5568', border:'none', borderRadius:10, fontSize:13, cursor:'pointer' },
  closeBtn:       { background:'none', border:'none', fontSize:17, color:'#a0aec0', cursor:'pointer', padding:'4px 8px' },
  notifsPanel:    { position:'fixed', top:75, right:18, width:360, maxHeight:480, background:'white', borderRadius:14, boxShadow:'0 8px 30px rgba(0,0,0,.15)', overflow:'hidden', zIndex:1000, animation:'slideIn .2s' },
  notifsHeader:   { padding:'14px 18px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' },
  notifItem:      { padding:'12px 18px', borderBottom:'1px solid #f7fafc', cursor:'pointer', transition:'background .2s' },
  overlay:        { position:'fixed', top:76, left:0, right:0, bottom:0, background:'#f7fafc', zIndex:999, overflowY:'auto', padding:'26px 30px', animation:'slideIn .2s' },
  mainLayout:     { display:'grid', height:'calc(100vh - 76px)', overflow:'hidden', transition:'all .3s' },
  sidebar:        { background:'#f7fafc', padding:18, overflowY:'auto', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', gap:12 },
  sidebarToggle:  { display:'flex', background:'#EDF2F7', borderRadius:10, padding:3, gap:3, flexShrink:0 },
  toggleBtn:      { flex:1, padding:'7px 6px', borderRadius:8, border:'none', background:'transparent', fontSize:11, fontWeight:700, color:'#718096', cursor:'pointer', transition:'all .2s', whiteSpace:'nowrap' },
  toggleBtnActive:{ background:'white', color:'#4A90E2', boxShadow:'0 1px 4px rgba(0,0,0,.1)' },
  pfCard:         { background:'white', borderRadius:10, padding:'12px 14px', boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:'1px solid #e2e8f0' },
  pfCardHeader:   { fontSize:12, fontWeight:800, color:'#4A90E2', marginBottom:10, paddingBottom:7, borderBottom:'1px solid #EDF2F7' },
  pfRow:          { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7, gap:8 },
  pfLabel:        { fontSize:11, color:'#a0aec0', fontWeight:600, flexShrink:0 },
  pfVal:          { fontSize:12, color:'#2d3748', fontWeight:700, textAlign:'right' },
  rcpSidebarCard: { background:'white', padding:12, borderRadius:11, cursor:'pointer', transition:'all .2s', border:'2px solid transparent' },
  rcpSidebarActive:{ borderColor:'#4A90E2', boxShadow:'0 4px 12px rgba(74,144,226,.2)' },
  stageBadge:     { padding:'2px 7px', borderRadius:5, background:'#EDF2F7', color:'#4a5568', fontSize:11 },
  urgBadge:       { padding:'2px 7px', borderRadius:5, fontSize:11 },
  urgElevee:      { background:'#FED7D7', color:'#C53030' },
  urgModeree:     { background:'#FEEBC8', color:'#C05621' },
  urgFaible:      { background:'#C6F6D5', color:'#2F855A' },
  mainContent:    { background:'white', display:'flex', flexDirection:'column', overflow:'hidden' },
  patientHeaderBar:{ background:'white', borderBottom:'1px solid #e2e8f0', transition:'all .2s' },
  patientIcon:    { width:36, height:36, background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 },
  rapportBtn:     { padding:'6px 14px', background:'#C6F6D5', color:'#276749', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12, transition:'all .2s' },
  iconBtn:        { background:'#EDF2F7', border:'none', width:32, height:32, borderRadius:7, cursor:'pointer', fontSize:15, transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center' },
  chatWrapper:    { flex:1, overflowY:'auto', background:'#f7fafc' },
  chatDragging:   { background:'#EBF4FF', outline:'3px dashed #4A90E2', outlineOffset:-6 },
  dragOverlay:    { position:'absolute', inset:0, zIndex:50, background:'rgba(235,244,255,.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)', pointerEvents:'none' },
  panel:          { background:'white', borderRadius:13, padding:20, marginBottom:18, boxShadow:'0 2px 8px rgba(0,0,0,.05)' },
  countBadge:     { background:'#4A90E2', color:'white', padding:'2px 9px', borderRadius:5, fontSize:12, fontWeight:700 },
  participantChip:{ display:'flex', alignItems:'center', gap:7, padding:'6px 11px', background:'#f7fafc', borderRadius:8 },
  participantAvatar:{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 },
  decisionBox:    { background:'#FEF5E7', borderRadius:11, padding:16, borderLeft:'4px solid #F39C12', marginTop:14 },
  inputArea:      { padding:'12px 20px', background:'white', borderTop:'1px solid #e2e8f0', display:'flex', gap:8, alignItems:'center' },
  msgInput:       { flex:1, padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:9, fontSize:13, outline:'none' },
  sendBtn:        { padding:'10px 22px', background:'linear-gradient(135deg,#5CA0F2,#4A90E2)', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s' },
  startBtn:       { padding:'11px 28px', background:'linear-gradient(135deg,#48BB78,#38A169)', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow:'0 4px 14px rgba(72,187,120,.4)' },
  scheduledBanner:{ background:'#FFFBEB', borderRadius:14, padding:'28px 20px', textAlign:'center', border:'2px solid #F6AD55', marginBottom:18 },
  toast:          { position:'fixed', bottom:20, right:20, background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', color:'white', padding:'12px 20px', borderRadius:11, fontSize:13, fontWeight:700, boxShadow:'0 10px 28px rgba(74,144,226,.4)', zIndex:9999 },
  imgPreviewBar:  { display:'flex', alignItems:'center', gap:10, padding:'10px 20px', background:'#EBF4FF', borderTop:'1.5px solid #BEE3F8' },
  imgPreviewThumb:{ width:52, height:52, objectFit:'cover', borderRadius:9, flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,.12)' },
  imgSendBtn:     { padding:'8px 18px', background:'linear-gradient(135deg,#4A90E2,#5CA0F2)', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' },
  lightboxOverlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', animation:'fadeIn .2s', cursor:'zoom-out' },
  lightboxContainer:{ position:'relative', maxWidth:'92vw', maxHeight:'90vh', display:'flex', flexDirection:'column', alignItems:'center', gap:14, cursor:'default' },
  lightboxImg:    { maxWidth:'100%', maxHeight:'80vh', borderRadius:14, boxShadow:'0 20px 60px rgba(0,0,0,.5)', objectFit:'contain' },
  lightboxClose:  { position:'absolute', top:-16, right:-16, width:36, height:36, borderRadius:'50%', border:'none', background:'white', color:'#2d3748', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,.3)', display:'flex', alignItems:'center', justifyContent:'center' },
  lightboxDownload:{ padding:'9px 22px', background:'white', color:'#4A90E2', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 14px rgba(0,0,0,.2)' },
};






