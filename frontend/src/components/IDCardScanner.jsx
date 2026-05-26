// components/IDCardScanner.jsx
import { apiUrl } from '../utils/apiConfig';
import React, { useState, useRef, useCallback } from 'react';

export function IDCardScanner({ onFill }) {
  const [mode, setMode]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [parsed, setParsed]     = useState({});
  const [applied, setApplied]   = useState(false);
  const [stream, setStream]     = useState(null);

  const fileRef   = useRef();
  const videoRef  = useRef();
  const canvasRef = useRef();

  const FIELD_LABELS = {
    nom:'Nom', prenom:'Prénom', dob:'Date naissance',
    sexe:'Sexe', wilaya:'Wilaya', commune:'Commune',
    national_id:'N° National',
  };

  const sendToBackend = useCallback(async (base64) => {
    setLoading(true);
    setError('');
    setParsed({});
    setApplied(false);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl('/patients/scan-id/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setParsed(data);
    } catch (e) {
      setError(e.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setPreview(base64);
      setMode('upload');
      stopCamera();
      sendToBackend(base64);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setMode('camera');
    setPreview(null);
    setParsed({});
    setError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      setError('Impossible d\'accéder à la caméra');
      setMode(null);
    }
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  };

  const capture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(base64);
    stopCamera();
    setMode('upload');
    sendToBackend(base64);
  };

  const reset = () => {
    stopCamera();
    setMode(null);
    setPreview(null);
    setParsed({});
    setError('');
    setApplied(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const applyFields = () => { onFill(parsed); setApplied(true); };
  const fieldCount  = Object.keys(parsed).length;

  return (
    <div style={s.panel}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.titleRow}>
          <span style={s.icon}>🪪</span>
          <span style={s.title}>Scanner la carte d'identité</span>
          <span style={s.hint}>— Remplissage automatique par IA</span>
        </div>
        {(mode || preview) && (
          <button onClick={reset} style={s.resetBtn}>↩ Recommencer</button>
        )}
      </div>

      {/* Boutons choix */}
      {!mode && !preview && (
        <div style={s.choices}>
          <button onClick={() => fileRef.current.click()} style={s.choiceBtn}>
            <span style={s.choiceIcon}>📁</span>
            <span>Importer une photo</span>
          </button>
          <button onClick={startCamera} style={s.choiceBtn}>
            <span style={s.choiceIcon}>📷</span>
            <span>Prendre en photo</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{display:'none'}}
            onChange={handleFile}
          />
        </div>
      )}

      {/* Caméra live */}
      {mode === 'camera' && !preview && (
        <div style={s.cameraBox}>
          <video ref={videoRef} autoPlay playsInline style={s.video} />
          <canvas ref={canvasRef} style={{display:'none'}} />
          <div style={s.camGuide}>Placez la carte dans le cadre</div>
          <button onClick={capture} style={s.captureBtn}>📸 Capturer</button>
        </div>
      )}

      {mode !== 'camera' && <canvas ref={canvasRef} style={{display:'none'}} />}

      {/* Preview */}
      {preview && (
        <div style={s.previewBox}>
          <img src={preview} alt="Carte d'identité" style={s.previewImg} />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={s.loading}>
          <span style={s.spinner}>⏳</span> Groq analyse la carte…
        </div>
      )}

      {/* Erreur */}
      {error && <div style={s.error}>⚠ {error}</div>}

      {/* Résultats */}
      {fieldCount > 0 && !loading && (
        <div style={s.result}>
          <div style={s.resultLabel}>Champs détectés ({fieldCount})</div>
          <div style={s.chips}>
            {Object.entries(parsed).map(([k, v]) => (
              <div key={k} style={s.chip}>
                <span style={s.ck}>{FIELD_LABELS[k] || k}</span>
                <span style={s.cv}>{v}</span>
              </div>
            ))}
          </div>
          <div style={s.btns}>
            <button
              onClick={applyFields}
              style={{ ...s.apply, ...(applied ? s.applyDone : {}) }}
              disabled={applied}
            >
              {applied ? '✓ Appliqué' : `Remplir ${fieldCount} champ${fieldCount > 1 ? 's' : ''}`}
            </button>
            <button onClick={reset} style={s.resetSmall}>Effacer</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  panel:       { background:'white', borderRadius:14, padding:'16px 20px', border:'1.5px solid #e2e8f0', marginBottom:24 },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 },
  titleRow:    { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  icon:        { fontSize:18 },
  title:       { fontSize:14, fontWeight:600, color:'#2d3748' },
  hint:        { fontSize:12, color:'#a0aec0', fontStyle:'italic' },
  resetBtn:    { fontSize:12, padding:'4px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'white', color:'#718096', cursor:'pointer' },
  choices:     { display:'flex', gap:12, marginBottom:4 },
  choiceBtn:   { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'16px 8px', borderRadius:12, border:'1.5px dashed #bee3f8', background:'#ebf8ff', color:'#2b6cb0', fontSize:13, fontWeight:600, cursor:'pointer' },
  choiceIcon:  { fontSize:24 },
  cameraBox:   { position:'relative', borderRadius:12, overflow:'hidden', marginBottom:12, background:'#000' },
  video:       { width:'100%', display:'block', borderRadius:12 },
  camGuide:    { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', border:'2px dashed rgba(255,255,255,0.7)', borderRadius:8, width:'85%', height:'55%', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:8, color:'rgba(255,255,255,0.8)', fontSize:12 },
  captureBtn:  { position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', padding:'10px 24px', borderRadius:10, border:'none', background:'#4A90E2', color:'white', fontSize:14, fontWeight:600, cursor:'pointer' },
  previewBox:  { borderRadius:10, overflow:'hidden', marginBottom:12, border:'1px solid #e2e8f0' },
  previewImg:  { width:'100%', display:'block' },
  loading:     { display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#EBF8FF', borderRadius:8, color:'#2b6cb0', fontSize:13, marginBottom:10 },
  spinner:     { fontSize:16 },
  error:       { background:'#FFF5F5', border:'1px solid #FEB2B2', borderRadius:8, padding:'8px 12px', color:'#C53030', fontSize:13, marginBottom:10 },
  result:      { border:'1px solid #C6F6D5', borderRadius:10, padding:'12px 14px', background:'#F0FFF4' },
  resultLabel: { fontSize:12, color:'#276749', fontWeight:600, marginBottom:8 },
  chips:       { display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 },
  chip:        { display:'flex', alignItems:'center', gap:5, background:'white', border:'1px solid #C6F6D5', borderRadius:7, padding:'4px 10px' },
  ck:          { fontSize:10, color:'#718096' },
  cv:          { fontSize:12, color:'#2d3748', fontWeight:600 },
  btns:        { display:'flex', gap:8 },
  apply:       { flex:1, padding:'9px 16px', borderRadius:8, border:'none', background:'#48bb78', color:'white', fontSize:13, fontWeight:600, cursor:'pointer' },
  applyDone:   { background:'#68d391', cursor:'default' },
  resetSmall:  { padding:'9px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'white', color:'#718096', fontSize:13, cursor:'pointer' },
};

