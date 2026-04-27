import { useState } from 'react';
import axios from 'axios';

// ── Design tokens (cohérents avec le reste de l'app) ──────────────────────
const INDIGO  = '#6366f1';
const VIOLET  = '#8b5cf6';
const CYAN    = '#06b6d4';
const EMERALD = '#10b981';

const glass = {
  background: 'rgba(15,20,35,0.85)',
  border: '1px solid rgba(99,102,241,0.18)',
  borderRadius: '20px',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(99,102,241,0.2)',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};

// ── Feature card data ─────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '📥',
    color: INDIGO,
    title: 'Import Multi-source',
    desc: 'Chargez vos données depuis un fichier CSV, Excel, ou connectez directement PostgreSQL / Databricks.',
  },
  {
    icon: '🧠',
    color: VIOLET,
    title: 'Clustering K-Means',
    desc: 'Pipeline RFM automatisé : sélection des features, entraînement du modèle, labellisation des segments.',
  },
  {
    icon: '📊',
    color: CYAN,
    title: 'Dashboard Interactif',
    desc: 'Visualisez la répartition des segments, les KPIs clés et exportez les résultats en un clic.',
  },
  {
    icon: '🔒',
    color: EMERALD,
    title: 'Accès Sécurisé',
    desc: 'Interface réservée aux administrateurs. Chaque session est authentifiée et tracée.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
function HomePage({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleChange = (e) =>
    setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulation connexion (à remplacer par un vrai endpoint /api/auth)
    await new Promise((r) => setTimeout(r, 900));

    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      onLogin();
    } else {
      setError('Identifiants incorrects. Essayez admin / admin123');
    }
    setLoading(false);
  };

  const canSubmit = credentials.username && credentials.password && !loading;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 60px',
        textAlign: 'center',
        position: 'relative',
      }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px',
          borderRadius: '100px',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          marginBottom: '28px',
          animation: 'fadeSlideUp 0.5s ease both',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: EMERALD, boxShadow: `0 0 8px ${EMERALD}` }} />
          <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>
            Plateforme Intelligence Client
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: '800',
          letterSpacing: '-2px',
          lineHeight: '1.1',
          color: '#f1f5f9',
          marginBottom: '20px',
          animation: 'fadeSlideUp 0.5s 0.1s ease both',
          opacity: 0,
        }}>
          Segmentez vos clients<br />
          <span style={{
            background: `linear-gradient(135deg, ${INDIGO}, ${CYAN})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>avec l'IA</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          maxWidth: '520px',
          lineHeight: '1.7',
          marginBottom: '52px',
          animation: 'fadeSlideUp 0.5s 0.2s ease both',
          opacity: 0,
        }}>
          Importez vos données abonnés, lancez un pipeline K-Means RFM et
          obtenez un dashboard de segmentation actionnable — en quelques minutes.
        </p>

        {/* Feature cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          width: '100%',
          maxWidth: '880px',
          marginBottom: '64px',
        }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} style={{
              ...glass,
              padding: '24px',
              textAlign: 'left',
              animation: `fadeSlideUp 0.5s ${0.25 + i * 0.08}s ease both`,
              opacity: 0,
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${f.color}33`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = glass.boxShadow;
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${f.color}18`,
                border: `1px solid ${f.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', marginBottom: '14px',
              }}>{f.icon}</div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.6' }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── LOGIN FORM ─────────────────────────────────────────────────── */}
        <div style={{
          ...glass,
          width: '100%',
          maxWidth: '400px',
          padding: '36px 40px',
          animation: 'fadeSlideUp 0.5s 0.6s ease both',
          opacity: 0,
        }}>
          {/* Form header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: `linear-gradient(135deg, ${INDIGO}, ${VIOLET})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', margin: '0 auto 16px',
              boxShadow: `0 8px 24px ${INDIGO}40`,
            }}>🔑</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
              Espace Administrateur
            </h2>
            <p style={{ fontSize: '12.5px', color: '#475569' }}>
              Accès réservé aux équipes Data &amp; SI
            </p>
          </div>

          {/* Fields */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{
                display: 'block', fontSize: '11px', fontWeight: '600',
                letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase',
                marginBottom: '6px',
              }}>Identifiant</span>
              <input
                name="username"
                type="text"
                placeholder="admin"
                value={credentials.username}
                onChange={handleChange}
                style={{
                  ...inputStyle,
                  borderColor: focused === 'username' ? INDIGO : 'rgba(99,102,241,0.2)',
                  boxShadow: focused === 'username' ? `0 0 0 3px ${INDIGO}18` : 'none',
                }}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused('')}
              />
            </div>

            <div>
              <span style={{
                display: 'block', fontSize: '11px', fontWeight: '600',
                letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase',
                marginBottom: '6px',
              }}>Mot de passe</span>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={credentials.password}
                onChange={handleChange}
                style={{
                  ...inputStyle,
                  borderColor: focused === 'password' ? INDIGO : 'rgba(99,102,241,0.2)',
                  boxShadow: focused === 'password' ? `0 0 0 3px ${INDIGO}18` : 'none',
                }}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5',
                fontSize: '12.5px',
                display: 'flex', alignItems: 'center', gap: '8px',
                animation: 'fadeSlideUp 0.3s ease both',
              }}>
                ✕ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                marginTop: '4px',
                width: '100%',
                padding: '13px',
                background: canSubmit
                  ? `linear-gradient(135deg, ${INDIGO}, ${VIOLET})`
                  : 'rgba(99,102,241,0.12)',
                border: 'none',
                borderRadius: '10px',
                color: canSubmit ? 'white' : '#475569',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '600',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: canSubmit ? `0 4px 20px ${INDIGO}40` : 'none',
              }}
              onMouseEnter={e => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '15px', height: '15px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Vérification…
                </>
              ) : '→ Accéder à la plateforme'}
            </button>
          </form>

          {/* Hint */}
          <p style={{
            marginTop: '20px', textAlign: 'center',
            fontSize: '11.5px', color: '#334155',
          }}>
            Démo : <span style={{ color: '#475569', fontFamily: 'monospace' }}>admin</span>
            {' / '}
            <span style={{ color: '#475569', fontFamily: 'monospace' }}>admin123</span>
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(99,102,241,0.1)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '12px', color: '#1e293b' }}>
          Profiling<span style={{ color: INDIGO }}>.</span>ai © 2025
        </span>
        <span style={{ fontSize: '11px', color: '#1e293b', letterSpacing: '0.5px' }}>
          SNDE · Direction Système d'Information
        </span>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: #334155; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #0d1224 inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }
      `}</style>
    </div>
  );
}

export default HomePage;