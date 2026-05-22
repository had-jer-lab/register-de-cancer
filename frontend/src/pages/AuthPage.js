import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Heart, Database, FileText, Users, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]           = useState({ email: '', password: '' });
  const [showPassword, setShowPwd] = useState(false);
  const [isLoading, setIsLoading]  = useState(false);
  const [error, setError]          = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update auth context
        login(data.user, data.access, data.refresh);

        // Redirection selon le rôle (vient de Django)
        navigate(data.route);
      } else {
        const msg =
          data.non_field_errors?.[0] ||
          data.email?.[0]            ||
          data.password?.[0]         ||
          'Email ou mot de passe incorrect';
        setError(msg);
      }
    } catch (err) {
      setError('Impossible de contacter le serveur. Vérifiez que Django est lancé.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={s.root}>
      {/* Fond décoratif */}
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={s.card}>
        {/* ── Panneau gauche ── */}
        <div style={s.left}>
          <div style={s.leftInner}>
            {/* Logo */}
            <div style={s.logoRow}>
              <div style={s.logoBox}>
                <Heart size={28} color="#fff" strokeWidth={2.5} />
              </div>
              <div>
                <div style={s.logoTitle}>Registre de Cancer</div>
                <div style={s.logoSub}>Système de Gestion Oncologique</div>
              </div>
            </div>

            {/* Features */}
            <div style={s.features}>
              {[
                { icon: <Database size={18} />, title: 'Gestion Complète',      sub: 'Base de données centralisée des cas de cancer' },
                { icon: <FileText size={18} />, title: 'Suivi Thérapeutique',    sub: 'Traçabilité complète des parcours de soins'    },
                { icon: <Users    size={18} />, title: 'Collaboration Médicale', sub: 'Plateforme sécurisée pour les équipes soignantes' },
              ].map(({ icon, title, sub }) => (
                <div key={title} style={s.feature}>
                  <div style={s.featureIco}>{icon}</div>
                  <div>
                    <div style={s.featureTitle}>{title}</div>
                    <div style={s.featureSub}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={s.leftFooter}>© 2026 Registre National du Cancer • Algérie</div>
        </div>

        {/* ── Panneau droit ── */}
        <div style={s.right}>
          <div style={s.formWrap}>
            <h2 style={s.title}>Connexion</h2>
            <p style={s.subtitle}>Accédez à votre espace professionnel</p>

            <form onSubmit={handleLogin} style={s.form}>
              {/* Email */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Email professionnel</label>
                <div style={s.inputWrap}>
                  <Mail size={18} style={s.inputIcon} />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="exemple@hopital.dz"
                    style={s.input}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Mot de passe</label>
                <div style={s.inputWrap}>
                  <Lock size={18} style={s.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={{ ...s.input, paddingRight: 44 }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPassword)}
                    style={s.eyeBtn}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div style={s.errorBox}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Bouton */}
              <button type="submit" disabled={isLoading} style={s.btn}>
                {isLoading ? (
                  <span style={s.btnLoading}>
                    <svg style={s.spinner} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="4"/>
                      <path d="M4 12a8 8 0 018-8" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                    Connexion...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <p style={s.note}>
              Accès réservé au personnel médical autorisé
            </p>
          </div>
        </div>
      </div>

      {/* Animation spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blob {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(30px,-50px) scale(1.1); }
          66%  { transform: translate(-20px,20px) scale(0.9); }
          100% { transform: translate(0,0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EEF2FF 0%, #fff 50%, #EEF2FF 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, position: 'relative', overflow: 'hidden',
    fontFamily: "'Nunito', sans-serif",
  },
  blob1: {
    position: 'absolute', top: '-10%', right: '-5%',
    width: 400, height: 400,
    background: 'rgba(74,108,247,.12)', borderRadius: '50%',
    filter: 'blur(60px)',
    animation: 'blob 7s infinite',
  },
  blob2: {
    position: 'absolute', bottom: '-10%', left: '-5%',
    width: 400, height: 400,
    background: 'rgba(74,108,247,.08)', borderRadius: '50%',
    filter: 'blur(60px)',
    animation: 'blob 7s infinite 2s',
  },
  card: {
    width: '100%', maxWidth: 900,
    background: '#fff', borderRadius: 28,
    boxShadow: '0 25px 60px rgba(74,108,247,.15)',
    overflow: 'hidden', display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    position: 'relative', zIndex: 1,
  },

  /* Panneau gauche */
  left: {
    background: 'linear-gradient(160deg, #1a2f6b 0%, #0f1c3f 100%)',
    padding: '48px 40px',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    position: 'relative', overflow: 'hidden',
  },
  leftInner: { position: 'relative', zIndex: 1 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 },
  logoBox: {
    width: 52, height: 52, borderRadius: 14,
    background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(74,108,247,.5)', flexShrink: 0,
  },
  logoTitle: { fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 18, color: '#fff' },
  logoSub:   { fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600 },
  features:  { display: 'flex', flexDirection: 'column', gap: 28 },
  feature:   { display: 'flex', alignItems: 'flex-start', gap: 16 },
  featureIco: {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', flexShrink: 0,
  },
  featureTitle: { fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 },
  featureSub:   { fontSize: 12, color: 'rgba(255,255,255,.55)', lineHeight: 1.5 },
  leftFooter:   { fontSize: 11, color: 'rgba(255,255,255,.3)', position: 'relative', zIndex: 1 },

  /* Panneau droit */
  right: {
    padding: '48px 44px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  formWrap: { width: '100%', maxWidth: 360 },
  title: {
    fontFamily: "'Poppins',sans-serif", fontWeight: 800,
    fontSize: 28, color: '#1A2B4A', margin: '0 0 8px',
  },
  subtitle: { fontSize: 14, color: '#7A8BAD', fontWeight: 600, marginBottom: 32 },

  form: { display: 'flex', flexDirection: 'column', gap: 20 },

  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 700, color: '#4A5568' },
  inputWrap: { position: 'relative' },
  inputIcon: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: '#A0AEC0', pointerEvents: 'none',
  },
  input: {
    width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 13, paddingBottom: 13,
    background: '#F7F9FF', border: '2px solid #E8ECF8', borderRadius: 14,
    fontSize: 14, fontFamily: "'Nunito',sans-serif", color: '#1A2B4A',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color .2s',
  },
  eyeBtn: {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#A0AEC0',
    display: 'flex', alignItems: 'center', padding: 0,
  },

  errorBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#FFF5F5', border: '1.5px solid #FED7D7',
    borderRadius: 12, padding: '12px 16px',
    color: '#E53E3E', fontSize: 13, fontWeight: 600,
  },

  btn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #4A6CF7, #6B87FF)',
    color: '#fff', border: 'none', borderRadius: 14,
    fontSize: 15, fontWeight: 800, cursor: 'pointer',
    fontFamily: "'Nunito',sans-serif",
    boxShadow: '0 8px 24px rgba(74,108,247,.4)',
    transition: 'opacity .2s',
    marginTop: 8,
  },
  btnLoading: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  spinner: {
    width: 20, height: 20,
    animation: 'spin .8s linear infinite',
  },

  note: {
    marginTop: 24, textAlign: 'center',
    fontSize: 12, color: '#A0AEC0', fontWeight: 600,
  },
};