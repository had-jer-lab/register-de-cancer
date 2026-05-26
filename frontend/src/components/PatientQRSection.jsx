import React, { useState, useEffect, useRef } from 'react';
import API_BASE from '../utils/apiConfig';
// QR généré via API externe — aucune dépendance npm
function getQRImgUrl(text, size) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=1e1b4b&bgcolor=ffffff&qzone=2&format=png`;
}

const API = API_BASE;
    
const DEFAULT_FIELDS = [
  { key: 'telephone',   label: 'Téléphone',              type: 'tel',      required: false },
  { key: 'wilaya',      label: 'Wilaya',                  type: 'text',     required: false },
  { key: 'commune',     label: 'Commune',                 type: 'text',     required: false },
  { key: 'hopital',     label: 'Hôpital / Établissement', type: 'text',     required: false },
  { key: 'profession',  label: 'Profession',              type: 'text',     required: false },
  { key: 'poids',       label: 'Poids (kg)',              type: 'number',   required: false },
  { key: 'taille',      label: 'Taille (cm)',             type: 'number',   required: false },
  { key: 'sport',       label: 'Activité physique',       type: 'select',   required: false,
    options: ['Oui — régulière', 'Oui — occasionnelle', 'Non'] },
  { key: 'tabac',       label: 'Tabagisme',               type: 'select',   required: false,
    options: ['Non fumeur', 'Fumeur actif', 'Ancien fumeur'] },
  { key: 'alcool',      label: 'Consommation alcool',     type: 'select',   required: false,
    options: ['Aucune', 'Occasionnelle', 'Régulière'] },
  { key: 'allergies',   label: 'Allergies connues',       type: 'textarea', required: false },
  { key: 'antecedents', label: 'Antécédents familiaux',   type: 'textarea', required: false },
  { key: 'observations',label: 'Autres informations',     type: 'textarea', required: false },
];

export default function PatientQRSection({ patientId, patientName, dossier, modalMode = false, onClose }) {
  const [qrData,      setQrData]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [expanded,    setExpanded]    = useState(modalMode);
  const [showPrint,   setShowPrint]   = useState(false); // s'ouvre après génération du QR
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const printRef = useRef(null);

  const token = localStorage.getItem('access_token');

  const generateQR = async () => {
    setLoading(true);
    try {
      const FRONTEND = process.env.REACT_APP_FRONTEND_URL
        || `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API}/patients/${patientId}/generate-form-token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ frontend_url: FRONTEND, fields: DEFAULT_FIELDS }),
      });
      const data = await res.json();
      setQrData(data);
      if (data?.form_url) setShowPrint(true); // ouvre le modal dès que le QR est prêt
    } catch (e) { console.error('QR gen error:', e); }
    setLoading(false);
  };

  const loadSubmissions = async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch(`${API}/patients/${patientId}/form-submissions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSubmissions(await res.json());
    } catch (_) {}
    setLoadingSubs(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (expanded) { generateQR(); loadSubmissions(); }
  }, [expanded, patientId]);

  const copyLink = () => {
    if (!qrData?.form_url) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(qrData.form_url);
    } else {
      const el = document.createElement('textarea');
      el.value = qrData.form_url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR Code — ${patientName || ''}</title>
      <style>
        body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f8faff; font-family:sans-serif; }
        .card { background:#fff; border-radius:20px; padding:32px 28px; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.12); max-width:320px; width:100%; }
        .logo { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:20px; }
        .logo-icon { width:36px; height:36px; background:linear-gradient(135deg,#4A6CF7,#7c3aed); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px; }
        .logo-text { font-weight:800; font-size:16px; color:#1e293b; }
        .qr-wrap { display:inline-block; padding:12px; border:2px solid #e0e7ff; border-radius:16px; margin:12px 0; }
        .name { font-weight:800; font-size:18px; color:#1e293b; margin:8px 0 4px; }
        .dos  { font-size:13px; color:#6366f1; font-weight:600; margin-bottom:12px; }
        .hint { font-size:12px; color:#94A3B8; margin-top:8px; }
        @media print { body { background:#fff; } }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const s = {
    wrap:      { borderRadius: 16, border: '1.5px solid #E2E8F5', background: '#F8FAFF', marginBottom: 16, overflow: 'hidden' },
    header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', background: '#fff', borderBottom: expanded ? '1.5px solid #E2E8F5' : 'none' },
    title:     { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 14, color: '#334155' },
    icon:      { width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
    body:      { padding: '20px 18px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' },
    qrBox:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
    qrWrap:    { padding: 12, background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(99,102,241,0.12)', border: '2px solid #e0e7ff' },
    linkBox:   { flex: 1, minWidth: 200 },
    linkLabel: { fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 },
    linkInput: { width: '100%', boxSizing: 'border-box', background: '#fff', border: '1.5px solid #E2E8F5', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#334155', fontFamily: 'monospace', outline: 'none' },
    btn:       (color) => ({ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: color, color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }),
    btnRow:    { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    subTitle:  { fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 10, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 },
    subItem:   { background: '#fff', border: '1px solid #E2E8F5', borderRadius: 10, padding: '10px 14px', marginBottom: 8, fontSize: 13 },
    subDate:   { fontSize: 11, color: '#94A3B8', fontWeight: 600 },
    subField:  { display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' },
    subTag:    { background: '#EEF2FF', color: '#4F46E5', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
    badge:     { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 },
    // Modal print
    overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modal:     { background: '#fff', borderRadius: 24, padding: '28px 24px', maxWidth: 380, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', textAlign: 'center' },
    modalHdr:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle:{ fontWeight: 800, fontSize: 16, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 },
    closeBtn:  { background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  };

  // ── Print card (caché, pour l'impression) ─────────────────────────────────
  const PrintCard = () => (
    <div ref={printRef} style={{ display: 'none' }}>
      <div className="card">
        <div className="logo">
          <div className="logo-icon">🏥</div>
          <span className="logo-text">MedDossier</span>
        </div>
        <div className="qr-wrap">
          {qrData && (
            <img src={getQRImgUrl(qrData.form_url, 180)} alt="QR" width={180} height={180} style={{ borderRadius:8 }} />
          )}
        </div>
        <div className="name">{patientName || '—'}</div>
        <div className="dos">N° {dossier || '—'}</div>
        <div className="hint">📱 Scannez pour voir votre dossier</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Vue inline — cachée en modalMode */}
      <div style={{ ...s.wrap, display: modalMode ? 'none' : undefined }}>
        <div style={s.header} onClick={() => setExpanded(e => !e)}>
          <div style={s.title}>
            <div style={s.icon}>📲</div>
            Formulaire Patient — QR Code
            {submissions.length > 0 && (
              <span style={s.badge}>{submissions.length} réponse{submissions.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <span style={{ fontSize: 18, color: '#94A3B8', transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>âŒ„</span>
        </div>

        {expanded && (
          <div style={s.body}>
            {loading ? (
              <div style={{ color: '#94A3B8', fontSize: 13, padding: '12px 0' }}>⏳ Génération du QR…</div>
            ) : qrData ? (
              <>
                {/* QR Code */}
                <div style={s.qrBox}>
                  <div style={s.qrWrap}>
                    <img src={getQRImgUrl(qrData.form_url, 148)} alt="QR" width={148} height={148} style={{ borderRadius:8, display:"block" }} />
                  </div>
                  <div style={s.btnRow}>
                    <button style={s.btn('#6366f1')} onClick={() => setShowPrint(true)}>🖨 Imprimer</button>
                    <button style={s.btn(copied ? '#059669' : '#64748B')} onClick={copyLink}>
                      {copied ? '✓ Copié' : '🔗 Copier lien'}
                    </button>
                  </div>
                </div>

                {/* Lien + soumissions */}
                <div style={s.linkBox}>
                  <div style={s.linkLabel}>Lien formulaire</div>
                  <input style={s.linkInput} readOnly value={qrData.form_url} onClick={e => e.target.select()} />
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8, lineHeight: 1.5 }}>
                    📱 Scannez ce QR code pour accéder au formulaire.<br />
                    Le patient peut remplir ses informations sans connexion.
                  </div>

                  {loadingSubs ? (
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 16 }}>Chargement des réponses…</div>
                  ) : submissions.length > 0 ? (
                    <>
                      <div style={s.subTitle}>📋 Réponses reçues ({submissions.length})</div>
                      {submissions.slice(0, 3).map(sub => (
                        <div key={sub.id} style={s.subItem}>
                          <div style={s.subDate}>
                            {new Date(sub.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={s.subField}>
                            {Object.entries(sub.submitted_data).filter(([, v]) => v).map(([k, v]) => (
                              <span key={k} style={s.subTag}>{k}: {v}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {submissions.length > 3 && (
                        <div style={{ fontSize: 12, color: '#6366f1', marginTop: 6, fontWeight: 600 }}>
                          +{submissions.length - 3} autre{submissions.length - 3 > 1 ? 's' : ''} réponse{submissions.length - 3 > 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 16, fontStyle: 'italic' }}>
                      Aucune réponse reçue pour le moment.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button style={s.btn('#6366f1')} onClick={generateQR}>Générer QR Code</button>
            )}
          </div>
        )}
      </div>

      {/* Hidden print card */}
      {qrData && <PrintCard />}

      {/* Modal impression — ظƒظٹظ…ا ط§ظ„طµظˆرة */}
      {showPrint && qrData && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setShowPrint(false)}>
          <div style={s.modal}>
            <div style={s.modalHdr}>
              <div style={s.modalTitle}>
                <div style={{ width:32, height:32, background:'linear-gradient(135deg,#4A6CF7,#7c3aed)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📲</div>
                QR Code Patient
              </div>
              <button style={s.closeBtn} onClick={() => { setShowPrint(false); if (modalMode && onClose) onClose(); }}>✕</button>
            </div>

            {/* Card imprimable */}
            <div style={{ background:'#F8FAFF', borderRadius:16, padding:'24px 20px', border:'1.5px solid #E2E8F5', marginBottom:20 }}>
              {/* Logo */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:16 }}>
                <div style={{ width:32, height:32, background:'linear-gradient(135deg,#4A6CF7,#7c3aed)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🏥</div>
                <span style={{ fontWeight:800, fontSize:15, color:'#1e293b' }}>MedDossier</span>
              </div>
              {/* QR */}
              <div style={{ display:'inline-block', padding:10, background:'#fff', borderRadius:14, border:'2px solid #e0e7ff', marginBottom:12 }}>
                <img src={getQRImgUrl(qrData.form_url, 180)} alt="QR" width={180} height={180} style={{ borderRadius:8 }} />
              </div>
              {/* Infos */}
              <div style={{ fontWeight:800, fontSize:17, color:'#1e293b', marginBottom:4 }}>{patientName || '—'}</div>
              <div style={{ fontSize:13, color:'#6366f1', fontWeight:600, marginBottom:10 }}>N° {dossier || '—'}</div>
              <div style={{ fontSize:12, color:'#94A3B8', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                📱 Scannez pour voir votre dossier
              </div>
            </div>

            {/* Boutons */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowPrint(false)}
                style={{ flex:1, padding:'12px', borderRadius:12, border:'1.5px solid #E2E8F5', background:'#fff', color:'#64748B', fontWeight:700, cursor:'pointer', fontSize:13 }}>
                Fermer
              </button>
              <button onClick={handlePrint}
                style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#4A6CF7,#7c3aed)', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:13, boxShadow:'0 4px 16px rgba(74,108,247,0.35)' }}>
                🖨 Imprimer le QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



