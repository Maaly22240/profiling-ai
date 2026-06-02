import { useState, useEffect } from 'react';
import api from '../api';

const ORANGE = '#E87722';
const BLUE   = '#2C7BE5';
const NAVY   = '#1B3568';

const glass = {
  background: 'rgba(6,14,36,0.88)',
  border: '1px solid rgba(44,123,229,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(27,75,154,0.08)',
};

const inputBase = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(27,75,154,0.08)',
  border: '1px solid rgba(44,123,229,0.2)',
  borderRadius: '9px', color: '#e2e8f0',
  fontSize: '13px', fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};

const labelSt = {
  fontSize: '11px', fontWeight: '600', letterSpacing: '0.8px',
  color: '#607CA8', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

// ── Composants utilitaires ────────────────────────────────────────────────────
function SectionCard({ title, icon, children, delay = 0 }) {
  return (
    <div style={{ ...glass, padding: '24px 28px', animation: `fadeSlideUp 0.5s ${delay}s ease both`, opacity: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(44,123,229,0.1)' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f0f4ff' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(44,123,229,0.06)' }}>
      <span style={{ fontSize: '12px', color: '#607CA8', fontWeight: '500' }}>{label}</span>
      <span style={{ fontSize: '12.5px', color: '#e2e8f0', fontFamily: mono ? "'DM Mono', monospace" : 'inherit', fontWeight: '500' }}>{value}</span>
    </div>
  );
}

function Alert({ type, text }) {
  const ok = type === 'success';
  return (
    <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeSlideUp 0.3s ease both',
      background: ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
      color: ok ? '#6ee7b7' : '#fca5a5',
    }}>
      {ok ? '✓' : '✕'} {text}
    </div>
  );
}

function PasswordInput({ label, name, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <span style={labelSt}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input
          name={name} type={show ? 'text' : 'password'}
          value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.name, e.target.value)}
          style={{ ...inputBase, paddingRight: '40px',
            borderColor: focused ? ORANGE : 'rgba(44,123,229,0.2)',
            boxShadow: focused ? `0 0 0 3px rgba(232,119,34,0.1)` : 'none',
          }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
        <button type="button" onClick={() => setShow(s => !s)} style={{
          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#4A6A96', fontSize: '12px', padding: '2px',
        }}>
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}

// ── Indicateur force du mot de passe ─────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];

  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i < score ? colors[score] : 'rgba(44,123,229,0.12)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <p style={{ fontSize: '10.5px', color: colors[score] || '#4A6A96' }}>{labels[score] || 'Très faible'}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ProfilePage({ user }) {
  const [pwForm,    setPwForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg,     setPwMsg]     = useState(null);
  const [history,   setHistory]   = useState([]);

  const set = (k, v) => setPwForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get('/api/auth/history')
      .then(r => setHistory(r.data.history || []))
      .catch(() => {});
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return setPwMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
    if (pwForm.newPassword.length < 6)
      return setPwMsg({ type: 'error', text: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });

    setPwLoading(true);
    try {
      const r = await api.post('/api/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      setPwMsg({ type: 'success', text: r.data.message });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Rafraîchit l'historique
      api.get('/api/auth/history').then(r => setHistory(r.data.history || [])).catch(()=>{});
    } catch(e) {
      setPwMsg({ type: 'error', text: e.response?.data?.error || 'Erreur lors du changement.' });
    } finally {
      setPwLoading(false);
    }
  };

  // Calcule infos session
  const expiresAt  = user.expiresAt ? new Date(user.expiresAt) : null;
  const timeLeft   = expiresAt ? Math.max(0, Math.round((expiresAt - Date.now()) / 60000)) : null;
  const expiresStr = expiresAt ? expiresAt.toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  const initials = user.username?.slice(0, 2).toUpperCase() || 'AD';

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: '860px', margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', animation: 'fadeSlideUp 0.4s ease both' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg,#E87722,#1B3568)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800', color: 'white', boxShadow: '0 8px 24px rgba(232,119,34,0.35)', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#f0f4ff', letterSpacing: '-0.5px', marginBottom: '3px' }}>{user.username}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: 'rgba(232,119,34,0.1)', border: '1px solid rgba(232,119,34,0.25)', color: '#FFA94D', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user.role}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#607CA8' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
              Session active
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* ── Informations du compte ─────────────────────────────────────────── */}
        <SectionCard title="Informations du compte" icon="👤" delay={0.05}>
          <InfoRow label="Identifiant"       value={user.username}  mono />
          <InfoRow label="Rôle"              value={user.role} />
          <InfoRow label="Session expire le" value={expiresStr} />
          <InfoRow label="Temps restant"     value={timeLeft !== null ? `${timeLeft} min` : '—'} />

          {/* Barre de vie de la session */}
          {timeLeft !== null && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '10.5px', color: '#4A6A96' }}>Durée de session</span>
                <span style={{ fontSize: '10.5px', color: timeLeft < 30 ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                  {timeLeft < 30 ? '⚠ Expire bientôt' : '● Active'}
                </span>
              </div>
              <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(44,123,229,0.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (timeLeft / 480) * 100)}%`,
                  background: timeLeft < 30 ? 'linear-gradient(90deg,#ef4444,#f59e0b)' : 'linear-gradient(90deg,#10b981,#2C7BE5)',
                  borderRadius: '3px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Paramètres plateforme ─────────────────────────────────────────── */}
        <SectionCard title="Plateforme" icon="⚙️" delay={0.1}>
          <InfoRow label="Version"      value="1.0.0" />
          <InfoRow label="Backend"      value="Node.js / Express" />
          <InfoRow label="ML Pipeline"  value="scikit-learn (Python)" />
          <InfoRow label="IA Insights"  value="Claude Sonnet" />
          <InfoRow label="Base de données" value="PostgreSQL · Databricks" />

          {/* Thème (démo - non fonctionnel, placeholder) */}
          <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(27,75,154,0.06)', border: '1px solid rgba(44,123,229,0.1)', borderRadius: '8px' }}>
            <p style={{ fontSize: '11px', color: '#4A6A96', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Thème</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['Sombre', 'Clair', 'Auto'].map((t, i) => (
                <button key={t} style={{ flex: 1, padding: '6px', borderRadius: '7px', border: `1px solid ${i === 0 ? 'rgba(232,119,34,0.4)' : 'rgba(44,123,229,0.1)'}`, background: i === 0 ? 'rgba(232,119,34,0.1)' : 'transparent', color: i === 0 ? '#FFA94D' : '#4A6A96', fontFamily: 'inherit', fontSize: '11px', fontWeight: i === 0 ? '600' : '400', cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── Changer le mot de passe ───────────────────────────────────────── */}
        <SectionCard title="Changer le mot de passe" icon="🔑" delay={0.15}>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <PasswordInput label="Mot de passe actuel" name="currentPassword" value={pwForm.currentPassword} onChange={set} placeholder="••••••••" />
            <div>
              <PasswordInput label="Nouveau mot de passe" name="newPassword" value={pwForm.newPassword} onChange={set} placeholder="Min. 6 caractères" />
              <PasswordStrength password={pwForm.newPassword} />
            </div>
            <PasswordInput label="Confirmer le mot de passe" name="confirmPassword" value={pwForm.confirmPassword} onChange={set} placeholder="••••••••" />

            {pwMsg && <Alert type={pwMsg.type} text={pwMsg.text} />}

            <button type="submit" disabled={pwLoading || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword} style={{
              padding: '11px', borderRadius: '9px', border: 'none',
              background: (!pwLoading && pwForm.currentPassword && pwForm.newPassword && pwForm.confirmPassword)
                ? 'linear-gradient(135deg,#E87722,#D4620D)'
                : 'rgba(232,119,34,0.1)',
              color: (!pwLoading && pwForm.currentPassword && pwForm.newPassword && pwForm.confirmPassword) ? 'white' : '#4A6A96',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
              cursor: (!pwLoading && pwForm.currentPassword) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              transition: 'all 0.2s',
              boxShadow: (!pwLoading && pwForm.currentPassword) ? '0 4px 16px rgba(232,119,34,0.3)' : 'none',
            }}>
              {pwLoading && <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
              {pwLoading ? 'Mise à jour…' : '🔑 Mettre à jour le mot de passe'}
            </button>
          </form>
        </SectionCard>

        {/* ── Historique de session ─────────────────────────────────────────── */}
        <SectionCard title="Historique de session" icon="📊" delay={0.2}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: '13px', color: '#4A6A96' }}>Aucune action enregistrée</p>
              <p style={{ fontSize: '11px', color: '#2E4A72', marginTop: '4px' }}>Les actions apparaîtront ici après utilisation</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 12px', background: 'rgba(27,75,154,0.05)', border: '1px solid rgba(44,123,229,0.08)', borderRadius: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(44,123,229,0.1)', border: '1px solid rgba(44,123,229,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                    {h.action.includes('passe') ? '🔑' : h.action.includes('import') ? '📥' : h.action.includes('cluster') ? '🧠' : '📋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0', marginBottom: '2px' }}>{h.action}</p>
                    <p style={{ fontSize: '11px', color: '#4A6A96', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.detail}</p>
                    <p style={{ fontSize: '10px', color: '#2E4A72', fontFamily: "'DM Mono', monospace" }}>
                      {new Date(h.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

      </div>

      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        input::placeholder { color: #2E4A72; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #0E1F3E; border-radius: 3px; }
      `}</style>
    </div>
  );
}

export default ProfilePage;