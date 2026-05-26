/**
 * PatientPublicForm.jsx
 * Formulaire public accessible via QR code — sans login requis
 * Route: /patient-form/:token
 *
 * App.js:
 *   import PatientPublicForm from './pages/PatientPublicForm';
 *   <Route path="/patient-form/:token" element={<PatientPublicForm />} />
 */

import API_BASE from '../utils/apiConfig';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';


const API = API_BASE;
export default function PatientPublicForm() {
  const { token } = useParams();  // ← react-router, pas window.location

  const [config,     setConfig]     = useState(null);
  const [formData,   setFormData]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');
  const [step,       setStep]       = useState(0);

  useEffect(() => {
    if (!token) { setError('Lien invalide.'); setLoading(false); return; }
    fetch(`${API}/patient-form/${token}/`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setConfig(data);
        const init = {};
        (data.fields || []).forEach(f => { init[f.key] = ''; });
        setFormData(init);
        setLoading(false);
      })
      .catch(() => { setError('Impossible de charger le formulaire.'); setLoading(false); });
  }, [token]);

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const res  = await fetch(`${API}/patient-form/${token}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) setSubmitted(true);
      else setError(data.error || 'Erreur lors de la soumission.');
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    }
    setSubmitting(false);
  };

  const fields       = config?.fields || [];
  const STEP_SIZE    = 4;
  const steps        = [];
  for (let i = 0; i < fields.length; i += STEP_SIZE) steps.push(fields.slice(i, i + STEP_SIZE));
  const currentFields = steps[step] || [];
  const isLastStep    = step === steps.length - 1;
  const progress      = steps.length > 0 ? ((step + 1) / steps.length) * 100 : 100;
  const updateField   = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  const st = {
    page: { minHeight:'100vh', background:'linear-gradient(160deg,#0f172a 0%,#1e293b 50%,#0f2744 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" },
    card: { width:'100%', maxWidth:480, background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.5)' },
    header: { background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', padding:'28px 28px 20px' },
    logoRow: { display:'flex', alignItems:'center', gap:10, marginBottom:16 },
    logo: { width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 },
    logoText: { color:'rgba(255,255,255,0.9)', fontWeight:700, fontSize:15 },
    patientName: { color:'#fff', fontWeight:800, fontSize:22, marginBottom:4 },
    dossierBadge: { display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', borderRadius:20, padding:'4px 12px', fontSize:12, color:'rgba(255,255,255,0.8)', fontWeight:600 },
    progressWrap: { padding:'16px 28px 0', background:'rgba(0,0,0,0.2)' },
    progressBar: { height:4, borderRadius:4, background:'rgba(255,255,255,0.1)', overflow:'hidden', marginBottom:8 },
    progressFill: { height:'100%', borderRadius:4, background:'linear-gradient(90deg,#60a5fa,#a78bfa)', transition:'width 0.4s ease', width:`${progress}%` },
    stepText: { fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600, marginBottom:16, display:'flex', justifyContent:'space-between' },
    body: { padding:'24px 28px 28px' },
    fieldWrap: { marginBottom:18 },
    label: { display:'block', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.6)', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.5px' },
    input: { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'12px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit' },
    select: { width:'100%', boxSizing:'border-box', background:'#1e2d45', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'12px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit', cursor:'pointer' },
    textarea: { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'12px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit', resize:'vertical', minHeight:80 },
    btnRow: { display:'flex', gap:10, marginTop:28 },
    btnBack: { flex:1, padding:'13px', borderRadius:12, border:'none', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', fontSize:14, fontWeight:700, cursor:'pointer' },
    btnNext: { flex:2, padding:'13px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(124,58,237,0.4)' },
    success: { padding:'40px 28px', textAlign:'center' },
    successIcon: { width:72, height:72, borderRadius:'50%', margin:'0 auto 20px', background:'linear-gradient(135deg,#059669,#34d399)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, boxShadow:'0 8px 32px rgba(52,211,153,0.4)' },
    successTitle: { color:'#fff', fontWeight:800, fontSize:22, marginBottom:8 },
    successSub: { color:'rgba(255,255,255,0.6)', fontSize:14, lineHeight:1.6 },
    errorMsg: { background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, padding:'12px 16px', color:'#fca5a5', fontSize:13, fontWeight:600, marginTop:16 },
    loading: { padding:'60px 28px', textAlign:'center', color:'rgba(255,255,255,0.5)' },
  };

  if (loading) return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={st.loading}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Chargement du formulaire…</div>
      </div>
    </div>
  );

  if (error && !config) return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={{ ...st.loading, color:'#fca5a5' }}><div style={{ fontSize:32, marginBottom:12 }}>❌</div>{error}</div>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={st.success}>
          <div style={st.successIcon}>✓</div>
          <div style={st.successTitle}>Merci !</div>
          <div style={st.successSub}>
            Vos informations ont été transmises à votre médecin.<br />
            Dossier : <strong style={{ color:'#60a5fa' }}>{config?.dossier}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={st.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={st.card}>

        {/* Header */}
        <div style={st.header}>
          <div style={st.logoRow}>
            <div style={st.logo}>🏥</div>
            <span style={st.logoText}>MedDossier</span>
          </div>
          <div style={st.patientName}>Bonjour, {config?.patient_name} 👋</div>
          <div style={st.dossierBadge}>📁 Dossier {config?.dossier}</div>
          {config?.medecin && (
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:8 }}>
              Médecin référent : {config.medecin}
            </div>
          )}
        </div>

        {/* Progress */}
        {steps.length > 1 && (
          <div style={st.progressWrap}>
            <div style={st.progressBar}><div style={st.progressFill} /></div>
            <div style={st.stepText}>
              <span>Étape {step + 1} sur {steps.length}</span>
              <span>{Math.round(progress)}% complété</span>
            </div>
          </div>
        )}

        {/* Body */}
        <div style={st.body}>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginBottom:20 }}>
            Merci de remplir les informations ci-dessous. Elles seront transmises directement à votre médecin.
          </div>

          {currentFields.map(field => (
            <div key={field.key} style={st.fieldWrap}>
              <label style={st.label}>
                {field.label}{field.required && <span style={{ color:'#f87171' }}> *</span>}
              </label>
              {field.type === 'select' ? (
                <select style={st.select} value={formData[field.key] || ''} onChange={e => updateField(field.key, e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea style={st.textarea} placeholder={field.placeholder || ''} value={formData[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} />
              ) : (
                <input style={st.input} type={field.type || 'text'} placeholder={field.placeholder || ''} value={formData[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} />
              )}
            </div>
          ))}

          {error && <div style={st.errorMsg}>⚠ {error}</div>}

          <div style={st.btnRow}>
            {step > 0 && <button style={st.btnBack} onClick={() => setStep(s => s - 1)}>← Retour</button>}
            <button
              style={{ ...st.btnNext, opacity: submitting ? 0.7 : 1 }}
              onClick={isLastStep ? handleSubmit : () => setStep(s => s + 1)}
              disabled={submitting}
            >
              {submitting ? '⏳ Envoi…' : isLastStep ? '✓ Envoyer mes informations' : 'Continuer →'}
            </button>
          </div>

          <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:'rgba(255,255,255,0.3)' }}>
            🔒 Vos données sont sécurisées et confidentielles
          </div>
        </div>
      </div>
    </div>
  );
} 



