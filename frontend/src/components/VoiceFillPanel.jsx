// components/VoiceFillPanel.jsx
import { apiUrl } from '../utils/apiConfig';
import React, { useState } from 'react';
import { useWhisperInput } from '../hooks/useWhisperInput';

const FIELD_LABELS = {
  nom:'Nom', prenom:'Prénom', dob:'Date naissance', sexe:'Sexe',
  famille:'Situation', tel:'Téléphone', wilaya:'Wilaya', commune:'Commune',
  profession:'Profession', poids:'Poids (kg)', taillep:'Taille (cm)',
  tabac:'Tabagisme', allergies:'Allergies', observations:'Observations',
};

export function VoiceFillPanel({ onFill }) {
  const [transcript, setTranscript] = useState('');
  const [parsed,     setParsed]     = useState({});
  const [applied,    setApplied]    = useState(false);
  const [error,      setError]      = useState('');
  const [lang,       setLang]       = useState('ar');

  const handleResult = ({ fields, transcript: t }) => {
    setTranscript(prev => prev ? prev + ' ' + t : t);
    setParsed(prev => ({ ...prev, ...fields }));
    setApplied(false);
    setError('');
  };

  const { listening, loading, supported, toggle } = useWhisperInput({
    lang,
    onResult: handleResult,
    onError:  setError,
  });

  const applyFields = () => { onFill(parsed); setApplied(true); };
  const reset = () => { setTranscript(''); setParsed({}); setApplied(false); setError(''); };
  const fieldCount = Object.keys(parsed).length;

  const sendText = async (text) => {
    if (!text) return;
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl('/patients/voice-parse/'), {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ transcript: text }),
      });
      const fields = await res.json();
      if (!res.ok) throw new Error(fields.error || `Erreur ${res.status}`);
      setTranscript(text);
      setParsed(prev => ({ ...prev, ...fields }));
      setApplied(false);
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.titleRow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2">
            <rect x="9" y="2" width="6" height="11" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="9" y1="22" x2="15" y2="22"/>
          </svg>
          <span style={s.title}>Dictée vocale intelligente</span>
          <span style={s.hint}>— Whisper + Groq</span>
        </div>
        <select value={lang} onChange={e => setLang(e.target.value)} style={s.langSelect}>
          <option value="ar">Arabe / Dialecte</option>
          <option value="fr">Français</option>
          <option value="auto">Automatique</option>
        </select>
      </div>

      <div style={s.examples}>
        <span style={s.exLabel}>Exemple : </span>
        <span style={s.exText}>"Patient Benali Ahmed d'Oran, marié, non-fumeur, poids 80 kg"</span>
      </div>

      {supported ? (
        <button
          onClick={toggle}
          disabled={loading}
          style={{ ...s.micBtn, ...(listening ? s.micActive : {}), ...(loading ? s.micLoading : {}) }}
        >
          {listening ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E53E3E">
                <rect x="3" y="8" width="3" height="8" rx="1.5">
                  <animate attributeName="height" values="8;14;8" dur="0.7s" repeatCount="indefinite"/>
                  <animate attributeName="y" values="8;5;8" dur="0.7s" repeatCount="indefinite"/>
                </rect>
                <rect x="10.5" y="5" width="3" height="14" rx="1.5">
                  <animate attributeName="height" values="14;8;14" dur="0.7s" repeatCount="indefinite"/>
                  <animate attributeName="y" values="5;8;5" dur="0.7s" repeatCount="indefinite"/>
                </rect>
                <rect x="18" y="8" width="3" height="8" rx="1.5">
                  <animate attributeName="height" values="8;14;8" dur="0.7s" repeatCount="indefinite"/>
                  <animate attributeName="y" values="8;5;8" dur="0.7s" repeatCount="indefinite"/>
                </rect>
              </svg>
              Appuyez pour arrêter et envoyer…
            </>
          ) : loading ? '⏳ Whisper analyse…' : '🎤 Démarrer la dictée'}
        </button>
      ) : (
        <div style={s.unsupported}>⚠ Microphone non disponible dans ce navigateur</div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div style={{display:'flex', gap:8, marginBottom:8, marginTop:4}}>
          <input type="text" placeholder="Test textuel — Saisissez et appuyez sur Entrée"
            style={{flex:1, padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13}}
            onKeyDown={e => { if (e.key==='Enter' && e.target.value) { sendText(e.target.value); e.target.value=''; } }}
          />
          <button onClick={e => { const i=e.target.previousSibling; if(i.value){sendText(i.value);i.value='';} }}
            style={{padding:'8px 14px', borderRadius:8, background:'#4A90E2', color:'white', border:'none', cursor:'pointer'}}>
            Envoyer
          </button>
        </div>
      )}

      {transcript && (
        <div style={s.transcript}>
          <span style={s.tLabel}>Transcription : </span>
          <span style={s.tText}>"{transcript}"</span>
        </div>
      )}

      {error && <div style={s.error}>⚠ {error}</div>}

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
            <button onClick={applyFields} style={{...s.apply,...(applied?s.applyDone:{})}} disabled={applied}>
              {applied ? '✓ Appliqué' : `Remplir ${fieldCount} champ${fieldCount > 1 ? 's' : ''}`}
            </button>
            <button onClick={reset} style={s.reset}>Effacer</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  panel:       { background:'white', borderRadius:14, padding:'16px 20px', border:'1.5px solid #e2e8f0', marginBottom:24 },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 },
  titleRow:    { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  title:       { fontSize:14, fontWeight:600, color:'#2d3748' },
  hint:        { fontSize:12, color:'#a0aec0', fontStyle:'italic' },
  langSelect:  { fontSize:12, padding:'4px 8px', borderRadius:8, border:'1px solid #e2e8f0', cursor:'pointer' },
  examples:    { background:'#f7fafc', borderRadius:8, padding:'7px 12px', marginBottom:12, fontSize:12 },
  exLabel:     { color:'#a0aec0' },
  exText:      { color:'#4a5568', fontStyle:'italic' },
  micBtn:      { marginBottom:12, padding:'11px 24px', borderRadius:10, border:'1.5px solid #4A90E2', background:'white', color:'#4A90E2', fontSize:14, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, transition:'all 0.2s' },
  micActive:   { background:'#FFF5F5', border:'1.5px solid #E53E3E', color:'#E53E3E', boxShadow:'0 0 0 4px rgba(229,62,62,0.1)' },
  micLoading:  { opacity:0.65, cursor:'not-allowed' },
  transcript:  { background:'#f7fafc', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13 },
  tLabel:      { color:'#a0aec0', fontSize:11 },
  tText:       { color:'#4a5568', fontStyle:'italic' },
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
  reset:       { padding:'9px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'white', color:'#718096', fontSize:13, cursor:'pointer' },
  unsupported: { padding:12, background:'#FFF5F5', borderRadius:10, color:'#E53E3E', fontSize:13, marginBottom:16 },
};

