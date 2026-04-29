import { useState } from 'react';
import { login } from '../api';

const ORANGE  = '#E87722';
const NAVY    = '#1B3568';
const BLUE    = '#2C7BE5';
const EMERALD = '#10b981';

const glass = {
  background: 'rgba(6,14,36,0.9)',
  border: '1px solid rgba(44,123,229,0.2)',
  borderRadius: '20px',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
};

const inputStyle = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(27,75,154,0.08)',
  border: '1px solid rgba(44,123,229,0.2)',
  borderRadius: '10px', color: '#e2e8f0',
  fontSize: '14px', fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};

const FEATURES = [
  { icon: '↓', color: ORANGE, title: 'Import Multi-source',   desc: 'CSV, Excel, ou connexion directe PostgreSQL / Databricks.' },
  { icon: '◎', color: NAVY,   title: 'Clustering K-Means',    desc: 'Pipeline RFM automatisé — sélection des features, entraînement, segmentation.' },
  { icon: '▦', color: BLUE,   title: 'Dashboard Interactif',  desc: 'KPIs, visualisations 2D / 3D, analyse Pareto par cluster.' },
  { icon: '⬡', color: EMERALD,title: 'Accès Sécurisé (JWT)',  desc: 'Sessions sécurisées avec tokens JWT — expiration automatique en 8h.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// onLogin reçoit l'objet user renvoyé par l'API
// ─────────────────────────────────────────────────────────────────────────────
function HomePage({ onLogin }) {
  const [creds,   setCreds]   = useState({ username:'', password:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { user } = await login(creds.username, creds.password);
      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = creds.username && creds.password && !loading;

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <section style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px 60px', textAlign:'center' }}>

        {/* Badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 18px', borderRadius:'100px', background:'rgba(232,119,34,0.1)', border:'1px solid rgba(232,119,34,0.3)', marginBottom:'28px', animation:'fadeSlideUp 0.5s ease both' }}>
          <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:EMERALD, boxShadow:`0 0 8px ${EMERALD}` }} />
          <span style={{ fontSize:'11px', fontWeight:'600', letterSpacing:'1px', color:'#94a3b8', textTransform:'uppercase' }}>Plateforme Intelligence Client</span>
        </div>

        {/* Titre */}
        <h1 style={{ fontSize:'clamp(36px,5vw,62px)', fontWeight:'800', letterSpacing:'-2px', lineHeight:'1.1', color:'#f0f4ff', marginBottom:'20px', animation:'fadeSlideUp 0.5s 0.1s ease both', opacity:0 }}>
          Segmentez vos clients<br />
          <span style={{ background:'linear-gradient(135deg,#E87722,#2C7BE5)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>avec l'IA</span>
        </h1>

        <p style={{ fontSize:'15px', color:'#607CA8', maxWidth:'500px', lineHeight:'1.7', marginBottom:'52px', animation:'fadeSlideUp 0.5s 0.2s ease both', opacity:0 }}>
          Importez vos données abonnés, lancez un pipeline K-Means RFM et obtenez un dashboard de segmentation actionnable.
        </p>

        {/* Feature cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'14px', width:'100%', maxWidth:'860px', marginBottom:'60px' }}>
          {FEATURES.map((f,i)=>(
            <div key={f.title} style={{ ...glass, padding:'22px', textAlign:'left', animation:`fadeSlideUp 0.5s ${0.25+i*0.08}s ease both`, opacity:0, transition:'transform 0.2s, box-shadow 0.2s', cursor:'default' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 16px 48px rgba(0,0,0,0.5),0 0 0 1px ${f.color}33`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=glass.boxShadow;}}>
              <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:`${f.color}18`, border:`1px solid ${f.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:f.color, fontWeight:'700', marginBottom:'12px' }}>{f.icon}</div>
              <h3 style={{ fontSize:'13.5px', fontWeight:'700', color:'#e2e8f0', marginBottom:'7px' }}>{f.title}</h3>
              <p style={{ fontSize:'12px', color:'#4A6A96', lineHeight:'1.6' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Login form */}
        <div style={{ ...glass, width:'100%', maxWidth:'390px', padding:'36px 38px', animation:'fadeSlideUp 0.5s 0.6s ease both', opacity:0 }}>
          <div style={{ textAlign:'center', marginBottom:'26px' }}>
            <div style={{ width:'46px', height:'46px', borderRadius:'12px', background:'linear-gradient(135deg,#E87722,#D4620D)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', margin:'0 auto 14px', boxShadow:'0 8px 24px rgba(232,119,34,0.35)' }}>🔑</div>
            <h2 style={{ fontSize:'17px', fontWeight:'700', color:'#f0f4ff', marginBottom:'4px' }}>Espace Administrateur</h2>
            <p style={{ fontSize:'12px', color:'#4A6A96' }}>Session sécurisée JWT · Expiration : 8h</p>
          </div>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            {[
              { name:'username', label:'Identifiant', placeholder:'admin', type:'text' },
              { name:'password', label:'Mot de passe', placeholder:'••••••••', type:'password' },
            ].map(f=>(
              <div key={f.name}>
                <span style={{ display:'block', fontSize:'10px', fontWeight:'600', letterSpacing:'0.8px', color:'#607CA8', textTransform:'uppercase', marginBottom:'6px' }}>{f.label}</span>
                <input name={f.name} type={f.type} placeholder={f.placeholder}
                  value={creds[f.name]} onChange={e=>setCreds({...creds,[f.name]:e.target.value})}
                  style={{ ...inputStyle, borderColor:focused===f.name?ORANGE:'rgba(44,123,229,0.2)', boxShadow:focused===f.name?`0 0 0 3px rgba(232,119,34,0.12)`:'none' }}
                  onFocus={()=>setFocused(f.name)} onBlur={()=>setFocused('')} />
              </div>
            ))}

            {error && (
              <div style={{ padding:'10px 14px', borderRadius:'8px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5', fontSize:'12.5px', display:'flex', alignItems:'center', gap:'8px', animation:'fadeSlideUp 0.3s ease both' }}>
                ✕ {error}
              </div>
            )}

            <button type="submit" disabled={!canSubmit} style={{ marginTop:'4px', width:'100%', padding:'13px', background:canSubmit?'linear-gradient(135deg,#E87722,#D4620D)':'rgba(232,119,34,0.1)', border:'none', borderRadius:'10px', color:canSubmit?'white':'#4A6A96', fontFamily:'inherit', fontSize:'14px', fontWeight:'600', cursor:canSubmit?'pointer':'not-allowed', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:canSubmit?'0 4px 20px rgba(232,119,34,0.4)':'none' }}
              onMouseEnter={e=>{if(canSubmit)e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';}}>
              {loading
                ? <><span style={{ width:'15px', height:'15px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />Vérification…</>
                : '→ Accéder à la plateforme'
              }
            </button>
          </form>

          <p style={{ marginTop:'18px', textAlign:'center', fontSize:'11px', color:'#2E4A72' }}>
            Démo : <span style={{ color:'#4A6A96', fontFamily:'monospace' }}>admin</span>
            {' / '}
            <span style={{ color:'#4A6A96', fontFamily:'monospace' }}>admin123</span>
          </p>
        </div>
      </section>

      <footer style={{ borderTop:'1px solid rgba(44,123,229,0.1)', padding:'18px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:'11px', color:'#2E4A72' }}>Profiling<span style={{ color:ORANGE, fontWeight:'900' }}>.</span>ai © 2025</span>
        <span style={{ fontSize:'11px', color:'#2E4A72', letterSpacing:'0.4px' }}>SNDE · Direction Système d'Information</span>
      </footer>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder{color:#2E4A72}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 100px #060E22 inset !important;-webkit-text-fill-color:#e2e8f0 !important}
      `}</style>
    </div>
  );
}

export default HomePage;