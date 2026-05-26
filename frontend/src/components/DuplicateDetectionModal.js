import React, { useState } from "react";

// ── Fuzzy similarity helpers ─────────────────────────────────────────────────
function normStr(s = '') {
  return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}
function strSim(a, b) {
  if (!a || !b) return 0;
  const na = normStr(a), nb = normStr(b);
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(na, nb) / maxLen) * 100);
}
function dateSim(d1, d2) {
  if (!d1 || !d2) return 0;
  try {
    const t1 = new Date(d1), t2 = new Date(d2);
    if (isNaN(t1) || isNaN(t2)) return normStr(d1) === normStr(d2) ? 100 : 0;
    const diffDays = Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
    if (diffDays === 0) return 100;
    if (diffDays <= 7) return 80;
    if (diffDays <= 365) return 30;
    return 0;
  } catch { return 0; }
}

// ── Date format helper ───────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    if (!isNaN(d)) {
      return String(d.getDate()).padStart(2,'0') + '/' +
             String(d.getMonth()+1).padStart(2,'0') + '/' +
             d.getFullYear();
    }
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) return parts[2]+'/'+parts[1]+'/'+parts[0];
  } catch(_) {}
  return str;
}

// ── Clean backend dash placeholder ───────────────────────────────────────────
function cleanDash(v) {
  return (!v || v === '—' || v === '-') ? '' : v;
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function pctColor(p) {
  if (p >= 90) return { solid: "#22c55e", light: "#dcfce7", text: "#16a34a" };
  if (p >= 70) return { solid: "#f59e0b", light: "#fef3c7", text: "#d97706" };
  return { solid: "#ef4444", light: "#fee2e2", text: "#dc2626" };
}

// ── Design tokens (light neumorphic) ─────────────────────────────────────────
const BG   = "#e8edf5";       // fond principal doux
const CARD = "#edf1f8";       // fond carte
const SHD  = "6px 6px 14px #c8cfe0, -4px -4px 10px #ffffff";
const SHD_IN = "inset 3px 3px 7px #c8cfe0, inset -3px -3px 7px #ffffff";
const BORDER = "1.5px solid rgba(255,255,255,0.85)";
const TEXT  = "#2d3a52";
const MUTED = "#7a8aaa";

// ── SVG Icons ────────────────────────────────────────────────────────────────
const Ic = {
  user:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  calendar:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  mapPin:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  home:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  phone:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.38 2 2 0 0 1 3.58 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.97-1.97a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  ribbon:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  pill:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/><circle cx="18" cy="18" r="3"/><path d="m22 22-1.5-1.5"/></svg>,
  stethoscope: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>,
  clock:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  shuffle:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
  warning:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  check:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  note:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  plus:        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chart:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
};

// ── Circular gauge (kima image 3) ─────────────────────────────────────────────
function CircleGauge({ pct }) {
  const c = pctColor(pct);
  const r = 38, stroke = 7;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        {/* Neumorphic inset background */}
        <circle cx="48" cy="48" r="44" fill={BG} filter="url(#neu)" />
        {/* Track */}
        <circle cx="48" cy="48" r={r} fill="none" stroke="#d0d8e8" strokeWidth={stroke} />
        {/* Progress */}
        <circle cx="48" cy="48" r={r} fill="none"
          stroke={c.solid} strokeWidth={stroke}
          strokeDasharray={circ.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ filter: `drop-shadow(0 0 6px ${c.solid}88)` }}
        />
        <defs>
          <filter id="neu">
            <feDropShadow dx="3" dy="3" stdDeviation="4" floodColor="#c8cfe0" floodOpacity="0.7"/>
            <feDropShadow dx="-3" dy="-3" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.9"/>
          </filter>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 900, fontSize: 20, color: c.solid, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: "1px", textTransform: "uppercase" }}>Match</span>
      </div>
    </div>
  );
}

// ── SimilarityBar (soft pill style) ──────────────────────────────────────────
function SimilarityBar({ pct }) {
  const c = pctColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 9, borderRadius: 99, background: BG, boxShadow: SHD_IN, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${c.solid}bb,${c.solid})`, borderRadius: 99, boxShadow: `0 0 8px ${c.solid}55`, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: c.text, minWidth: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

// ── Tag ───────────────────────────────────────────────────────────────────────
function Tag({ label, onRemove, color }) {
  const c = pctColor(80); // default blue-ish
  const bg   = color + "18";
  const bord = color + "44";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color, border: `1px solid ${bord}`, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, boxShadow: "2px 2px 6px #c8cfe088, -1px -1px 4px #ffffffcc" }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color, padding: 0, display: "flex", alignItems: "center", opacity: 0.7 }}>
          {Ic.x}
        </button>
      )}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, color }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${color},${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14, flexShrink: 0, boxShadow: `4px 4px 10px ${color}55, -2px -2px 6px #ffffffcc`, border: "2px solid rgba(255,255,255,0.7)" }}>
      {initials}
    </div>
  );
}

// ── PatientCard ───────────────────────────────────────────────────────────────
function PatientCard({ patient = {}, badge = {}, color = "#4A6CF7", otherPatient = {} }) {
  // Detect which fields differ from the other patient (for highlighting)
  const differs = (key) => {
    const v1 = normStr((patient[key] || '').toString());
    const v2 = normStr((otherPatient[key] || '').toString());
    return v1 && v2 && v1 !== v2;
  };

  const rows = [
    { icon: Ic.user,        label: "Nom Complet",    val: cleanDash(patient.nom),                                    key: "nom" },
    { icon: Ic.calendar,    label: "Date Naissance",  val: fmtDate(cleanDash(patient.dateNaissance)),                 key: "dateNaissance" },
    { icon: Ic.mapPin,      label: "Wilaya",          val: cleanDash(patient.wilaya),                                 key: "wilaya" },
    { icon: Ic.home,        label: "Commune",         val: cleanDash(patient.commune),                                key: "commune" },
    { icon: Ic.phone,       label: "Téléphone",       val: cleanDash(patient.telephone),                              key: "telephone" },
    { icon: Ic.ribbon,      label: "Cancer(s)",       val: (patient.cancers || []).filter(c=>cleanDash(c)).join(", ") || null, key: null },
    { icon: Ic.pill,        label: "Traitement",      val: (patient.traitements || []).filter(t=>cleanDash(t)).join(", ") || null, key: null },
    { icon: Ic.stethoscope, label: "Médecin",         val: cleanDash(patient.medecin),                                key: "medecin" },
    { icon: Ic.clock,       label: "Créé le",         val: fmtDate(cleanDash(patient.cree)),                          key: null },
  ];

  return (
    <div style={{ background: CARD, borderRadius: 16, minWidth: 0, boxShadow: SHD, border: BORDER, overflow: "hidden", maxHeight: "60vh", display: "flex", flexDirection: "column" }}>
      {/* Header stripe */}
      <div style={{ background: `linear-gradient(135deg,${color}22,${color}0a)`, padding: "10px 12px", borderBottom: `1.5px solid ${color}20` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color, fontSize: 12 }}>{badge.title}</span>
          <span style={{ background: color, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, boxShadow: `0 2px 8px ${color}44` }}>{badge.sub}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={patient.nom || "?"} color={color} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: TEXT }}>{patient.nom || "—"}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{patient.age}</div>
            <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 1 }}>NIN: {patient.nin || "—"}</div>
          </div>
        </div>
      </div>
      {/* Rows */}
      <div style={{ padding: "4px 0", overflowY: "auto", flex: 1 }}>
        {rows.map((r, i) => {
          const diff = r.key && differs(r.key);
          return (
            <div key={i} style={{ display: "flex", padding: "4px 10px", gap: 6, alignItems: "center", background: diff ? "#fff8ed" : "transparent", borderLeft: diff ? "3px solid #f59e0b" : "3px solid transparent" }}>
              <span style={{ color: diff ? "#f59e0b" : color, opacity: diff ? 1 : 0.65, flexShrink: 0, display: "flex", transform: "scale(0.85)" }}>{r.icon}</span>
              <span style={{ fontSize: 11, minWidth: 88, color: diff ? "#b45309" : MUTED, fontWeight: diff ? 700 : 500, flexShrink: 0 }}>{r.label}:</span>
              <span style={{ fontWeight: 700, fontSize: 12, color: diff ? "#92400e" : (r.val ? TEXT : "#bcc5d6"), fontStyle: r.val ? "normal" : "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.val || "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── FusionPanel ───────────────────────────────────────────────────────────────
function FusionPanel({ fusionData, onToggle, onAddField }) {
  const [newField, setNewField] = useState("");
  const [newValue, setNewValue] = useState("");
  const purple = "#8b5cf6";

  const FIELDS = [
    { key: "nom",           label: "Nom",           icon: Ic.user },
    { key: "dateNaissance", label: "Date Naissance", icon: Ic.calendar },
    { key: "wilaya",        label: "Wilaya",         icon: Ic.mapPin },
    { key: "commune",       label: "Commune",        icon: Ic.home },
    { key: "telephone",     label: "Téléphone",      icon: Ic.phone },
    { key: "medecin",       label: "Médecin",        icon: Ic.stethoscope },
  ];

  return (
    <div style={{ background: CARD, borderRadius: 16, minWidth: 0, boxShadow: SHD, border: `1.5px solid ${purple}30`, overflow: "hidden", maxHeight: "60vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${purple}18,${purple}08)`, padding: "14px 18px", borderBottom: `1.5px solid ${purple}20`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg,${purple},#a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: `0 2px 8px ${purple}44` }}>{Ic.shuffle}</div>
        <span style={{ fontWeight: 800, color: purple, fontSize: 14 }}>Fiche Fusionnée</span>
        <span style={{ marginLeft: "auto", background: `linear-gradient(135deg,${purple},#a78bfa)`, color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, boxShadow: `0 2px 8px ${purple}44` }}>Résultat Final</span>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", flex: 1 }}>
        {FIELDS.map(f => (
          <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: purple, opacity: 0.65, display: "flex", flexShrink: 0 }}>{f.icon}</span>
            <span style={{ fontSize: 12, minWidth: 115, color: MUTED, fontWeight: 500 }}>{f.label}:</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: fusionData[f.key] ? TEXT : "#bcc5d6", fontStyle: fusionData[f.key] ? "normal" : "italic" }}>
              {fusionData[f.key] || "—"}
            </span>
          </div>
        ))}

        {/* Cancers */}
        <div style={{ background: BG, borderRadius: 12, padding: "10px 12px", boxShadow: SHD_IN }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 7, display: "flex", alignItems: "center", gap: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <span style={{ color: "#ef4444", display: "flex" }}>{Ic.ribbon}</span> Cancers
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(fusionData.cancers || []).map(c => <Tag key={c} label={c} color="#ef4444" onRemove={() => onToggle("cancer", c)} />)}
            {(fusionData._availableCancers || []).filter(c => !(fusionData.cancers || []).includes(c)).map(c => (
              <button key={c} onClick={() => onToggle("cancer", c)}
                style={{ background: BG, border: "1.5px dashed #ef444466", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#ef4444", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, boxShadow: "2px 2px 5px #c8cfe077, -1px -1px 4px #ffffffcc" }}>
                {Ic.plus} {c}
              </button>
            ))}
          </div>
        </div>

        {/* Traitements */}
        <div style={{ background: BG, borderRadius: 12, padding: "10px 12px", boxShadow: SHD_IN }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 7, display: "flex", alignItems: "center", gap: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <span style={{ color: "#3b82f6", display: "flex" }}>{Ic.pill}</span> Traitements
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(fusionData.traitements || []).map(t => <Tag key={t} label={t} color="#3b82f6" onRemove={() => onToggle("traitement", t)} />)}
            {(fusionData._availableTraitements || []).filter(t => !(fusionData.traitements || []).includes(t)).map(t => (
              <button key={t} onClick={() => onToggle("traitement", t)}
                style={{ background: BG, border: "1.5px dashed #3b82f666", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#3b82f6", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, boxShadow: "2px 2px 5px #c8cfe077, -1px -1px 4px #ffffffcc" }}>
                {Ic.plus} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Champ personnalisé */}
        <div style={{ borderTop: `1.5px dashed ${purple}33`, paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 7, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {Ic.plus} Champ personnalisé
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input placeholder="Champ" value={newField} onChange={e => setNewField(e.target.value)}
              style={{ flex: 1, background: BG, border: BORDER, borderRadius: 10, padding: "7px 10px", fontSize: 12, outline: "none", color: TEXT, boxShadow: SHD_IN }} />
            <input placeholder="Valeur" value={newValue} onChange={e => setNewValue(e.target.value)}
              style={{ flex: 1, background: BG, border: BORDER, borderRadius: 10, padding: "7px 10px", fontSize: 12, outline: "none", color: TEXT, boxShadow: SHD_IN }} />
            <button onClick={() => { if (newField && newValue) { onAddField(newField, newValue); setNewField(""); setNewValue(""); } }}
              style={{ background: `linear-gradient(135deg,${purple},#a78bfa)`, color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 20, fontWeight: 700, cursor: "pointer", boxShadow: `3px 3px 8px ${purple}44, -1px -1px 4px #ffffffcc` }}>
              +
            </button>
          </div>
          {fusionData.extra && fusionData.extra.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {fusionData.extra.map((e, i) => <Tag key={i} label={`${e.field}: ${e.value}`} color={purple} onRemove={() => onToggle("extra", i)} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function DuplicateDetectionModal({
  patientExistant = {},
  patientNouveau  = {},
  onClose  = () => {},
  onConfirm = () => {},
}) {
  const [fusionData, setFusionData] = useState(() => {
    const cancers     = Array.from(new Set([...(patientExistant.cancers || []), ...(patientNouveau.cancers || [])]));
    const traitements = Array.from(new Set([...(patientExistant.traitements || []), ...(patientNouveau.traitements || [])]));
    return {
      nom: patientExistant.nom || patientNouveau.nom,
      dateNaissance: patientExistant.dateNaissance || patientNouveau.dateNaissance,
      wilaya:    patientExistant.wilaya    || patientNouveau.wilaya,
      commune:   patientExistant.commune   || patientNouveau.commune,
      telephone: patientExistant.telephone || patientNouveau.telephone,
      medecin:   patientExistant.medecin   || patientNouveau.medecin,
      cancers, traitements, extra: [],
      _availableCancers: cancers,
      _availableTraitements: traitements,
    };
  });

  const [note, setNote] = useState("");
  const [confirmed2, setConfirmed2] = useState(false); // user must check before merge

  // ── Similarity ──────────────────────────────────────────────────────────────
  const SIMILARITIES = [
    {
      champ: "NIN", icon: "🪪",
      val1: patientExistant.nin, val2: patientNouveau.nin,
      pct: (patientExistant.nin && patientNouveau.nin) ? strSim(patientExistant.nin, patientNouveau.nin) : 0,
      weight: 3,
      ninWarning: patientExistant.nin && patientNouveau.nin && normStr(patientExistant.nin) !== normStr(patientNouveau.nin),
    },
    {
      champ: "Nom", icon: "👤",
      val1: patientExistant.nom, val2: patientNouveau.nom,
      pct: strSim(patientExistant.nom, patientNouveau.nom), weight: 2,
    },
    {
      champ: "Date Naissance", icon: "📅",
      val1: patientExistant.dateNaissance, val2: patientNouveau.dateNaissance,
      pct: dateSim(patientExistant.dateNaissance, patientNouveau.dateNaissance), weight: 2,
    },
    {
      champ: "Téléphone", icon: "📞",
      val1: patientExistant.telephone, val2: patientNouveau.telephone,
      pct: (() => {
        const t1 = (patientExistant.telephone || "").replace(/\D/g, "");
        const t2 = (patientNouveau.telephone || "").replace(/\D/g, "");
        if (!t1 || !t2) return 0;
        return t1 === t2 ? 100 : strSim(t1, t2);
      })(), weight: 2,
    },
    {
      champ: "Wilaya", icon: "📍",
      val1: patientExistant.wilaya, val2: patientNouveau.wilaya,
      pct: (patientExistant.wilaya && patientNouveau.wilaya) ? strSim(patientExistant.wilaya, patientNouveau.wilaya) : 0,
      missing: !patientExistant.wilaya || !patientNouveau.wilaya, weight: 1,
    },
  ];

  const totalWeight = SIMILARITIES.reduce((a, s) => a + s.weight, 0);
  const totalSimilarity = Math.round(SIMILARITIES.reduce((a, s) => a + s.pct * s.weight, 0) / totalWeight);
  const TC = pctColor(totalSimilarity);

  function handleToggle(type, val) {
    setFusionData(prev => {
      if (type === "cancer")     { const e = prev.cancers.includes(val);     return { ...prev, cancers:     e ? prev.cancers.filter(c => c !== val)     : [...prev.cancers, val] }; }
      if (type === "traitement") { const e = prev.traitements.includes(val); return { ...prev, traitements: e ? prev.traitements.filter(t => t !== val) : [...prev.traitements, val] }; }
      if (type === "extra")      return { ...prev, extra: prev.extra.filter((_, i) => i !== val) };
      return prev;
    });
  }
  function handleAddField(field, value) {
    setFusionData(prev => ({ ...prev, extra: [...prev.extra, { field, value }] }));
  }

  // Success screen removed — Page5 handles success overlay after confirmed PATCH

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(180,192,215,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 9999, overflowY: "auto", padding: "20px 12px" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: "calc(100vw - 24px)", borderRadius: 24, overflow: "hidden", background: BG, boxShadow: "12px 12px 30px #b0bcd4, -8px -8px 20px #ffffff", border: BORDER }}>

        {/* ── HEADER ── */}
        <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: 14, background: `linear-gradient(135deg,${BG},${CARD})`, borderBottom: "1.5px solid rgba(255,255,255,0.9)" }}>
          {/* Icon warning */}
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0, boxShadow: "4px 4px 10px #ef444444, -2px -2px 6px #ffffffbb" }}>
            {Ic.warning}
          </div>
          <div>
            <div style={{ color: TEXT, fontWeight: 900, fontSize: 17 }}>Doublon Détecté — Fusion de Fiches</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Vérifiez et composez la fiche finale avant de confirmer</div>
          </div>

          {/* Circle gauge total similarity */}
          <div style={{ marginLeft: "auto", marginRight: 12 }}>
            <CircleGauge pct={totalSimilarity} />
          </div>

          <button onClick={onClose}
            style={{ background: BG, border: BORDER, color: MUTED, borderRadius: 12, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SHD, flexShrink: 0 }}>
            {Ic.x}
          </button>
        </div>

        {/* ── SIMILARITY TABLE ── */}
        <div style={{ padding: "16px 24px", background: CARD, borderBottom: "1.5px solid rgba(255,255,255,0.9)" }}>
          {/* Section title */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, boxShadow: SHD }}>{Ic.chart}</div>
            <span style={{ fontWeight: 800, color: TEXT, fontSize: 13 }}>Détails de Correspondance</span>
            {/* Badge total */}
            <span style={{ background: TC.light, color: TC.text, border: `1.5px solid ${TC.solid}44`, borderRadius: 20, padding: "3px 14px", fontSize: 13, fontWeight: 900, boxShadow: `2px 2px 6px ${TC.solid}22` }}>{totalSimilarity}%</span>
            <span style={{ fontSize: 11, color: MUTED }}>(NINأ—3, Nomأ—2, Dateأ—2, Télأ—2, Wilayaأ—1)</span>
          </div>

          {/* Grid */}
          <div style={{ background: BG, borderRadius: 16, padding: "12px 16px", boxShadow: SHD_IN }}>
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr 180px", gap: "8px 14px", alignItems: "center" }}>
              {/* Headers */}
              <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: 4 }}>Champ</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#4A6CF7", textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: 4 }}>Patient 1 — Existant</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: 4 }}>Patient 2 — Nouveau</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: 4 }}>Similarité</div>

              {SIMILARITIES.map(s => {
                const ninWarn = s.ninWarning;
                return (
                  <React.Fragment key={s.champ}>
                    {/* Champ label */}
                    <div style={{ fontSize: 12, color: ninWarn ? "#d97706" : TEXT, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <span>{s.icon}</span> {s.champ}
                      {ninWarn && (
                        <span style={{ background: "#fef3c7", color: "#d97706", border: "1px solid #f59e0b55", borderRadius: 8, padding: "1px 6px", fontSize: 9, fontWeight: 800, letterSpacing: "0.3px" }}>
                          ≠  DIFFÉRENTS
                        </span>
                      )}
                    </div>
                    {/* Val 1 */}
                    <div style={{ fontSize: 13, fontWeight: 700, color: ninWarn ? "#d97706" : (s.val1 ? "#4A6CF7" : "#bcc5d6"), background: ninWarn ? "#fef3c7" : "transparent", borderRadius: ninWarn ? 6 : 0, padding: ninWarn ? "2px 8px" : 0, fontStyle: s.val1 ? "normal" : "italic" }}>
                      {s.val1 || "—"}
                    </div>
                    {/* Val 2 */}
                    <div style={{ fontSize: 13, fontWeight: 700, color: ninWarn ? "#d97706" : (s.val2 ? "#059669" : "#bcc5d6"), background: ninWarn ? "#fef3c7" : "transparent", borderRadius: ninWarn ? 6 : 0, padding: ninWarn ? "2px 8px" : 0, fontStyle: s.val2 ? "normal" : "italic" }}>
                      {s.val2 || "—"}
                    </div>
                    {/* Bar */}
                    <div>
                      <SimilarityBar pct={s.pct} />
                      {ninWarn  && <div style={{ fontSize: 10, color: "#d97706", marginTop: 2, fontStyle: "italic" }}>⚠ NIN proches mais non identiques</div>}
                      {s.missing && <div style={{ fontSize: 10, color: MUTED,    marginTop: 2, fontStyle: "italic" }}>donnée absente</div>}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── THREE PANELS ── */}
        <div style={{ padding: "12px 10px", display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", gap: 10, alignItems: "flex-start", background: BG }}>
          <PatientCard patient={patientExistant} badge={{ title: "Patient 1 — Existant", sub: patientExistant.id ? `Base #${patientExistant.id}` : "Base" }} color="#4A6CF7" otherPatient={patientNouveau} />
          <FusionPanel fusionData={fusionData} onToggle={handleToggle} onAddField={handleAddField} />
          <PatientCard patient={patientNouveau}  badge={{ title: "Patient 2 — Nouveau",  sub: patientNouveau.id  || "Saisie Manuelle" }} color="#059669" otherPatient={patientExistant} />
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: "16px 24px", background: CARD, borderTop: "1.5px solid rgba(255,255,255,0.9)" }}>
          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              {Ic.note} Notes (Optionnel)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Même patient, légères différences de commune..."
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ width: "100%", background: BG, border: BORDER, borderRadius: 12, padding: "9px 13px", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: TEXT, boxShadow: SHD_IN }}
            />
          </div>

          {/* Confirmation checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer", background: BG, borderRadius: 12, padding: "10px 14px", boxShadow: SHD_IN, border: confirmed2 ? "1.5px solid #22c55e55" : BORDER }}>
            <input type="checkbox" checked={confirmed2} onChange={e => setConfirmed2(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#22c55e", cursor: "pointer" }} />
            <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
              Je confirme que ces deux fiches appartiennent au même patient
            </span>
          </label>

          {/* 3 Action buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* Annuler */}
            <button onClick={onClose}
              style={{ background: BG, color: MUTED, border: BORDER, borderRadius: 14, padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: SHD, display: "flex", alignItems: "center", gap: 6 }}>
              {Ic.x} Annuler
            </button>
            {/* Garder séparément */}
            <button
              onClick={() => { onConfirm(fusionData, note, patientExistant.id, 'garder_separe'); }}
              style={{ background: BG, color: "#d97706", border: "1.5px solid #f59e0b55", borderRadius: 14, padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: SHD, display: "flex", alignItems: "center", gap: 6 }}>
              ✦ Garder séparément
            </button>
            {/* Fusionner */}
            <button
              disabled={!confirmed2}
              onClick={() => { if (!confirmed2) return; onConfirm(fusionData, note, patientExistant.id, 'fusionner'); }}
              style={{ background: confirmed2 ? "linear-gradient(135deg,#4A6CF7,#6B87FF)" : "#d0d8e8", color: confirmed2 ? "#fff" : "#94a3b8", border: "none", borderRadius: 14, padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: confirmed2 ? "pointer" : "not-allowed", boxShadow: confirmed2 ? "4px 4px 12px #4A6CF744, -2px -2px 6px #ffffffcc" : "none", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
              {Ic.check} Confirmer la Fusion
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}