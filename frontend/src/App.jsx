import React from 'react';
import { useState, useEffect } from 'react';
import HomePage      from './components/HomePage';
import AdminImport   from './components/AdminImport';
import Dashboard     from './components/Dashboard';
import ClusterDetail from './components/ClusterDetail';
import { getStoredAuth, verifyToken, logout } from './api';


// ─────────────────────────────────────────────────────────────────────────────
// PROFILE MENU DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = React.useState(false);

  // Initiales de l'utilisateur
  const initials = user.username
    ? user.username.slice(0,2).toUpperCase()
    : 'AD';

  // Heure d'expiration lisible
  const expiresAt = user.expiresAt
    ? new Date(user.expiresAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
    : null;

  return (
    <div style={{ position:'relative' }}>
      {/* Bouton profil */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:'flex', alignItems:'center', gap:'9px',
          padding:'5px 12px 5px 5px',
          background: open ? 'rgba(232,119,34,0.15)' : 'rgba(27,75,154,0.08)',
          border: open ? '1px solid rgba(232,119,34,0.4)' : '1px solid rgba(44,123,229,0.15)',
          borderRadius:'10px', cursor:'pointer',
          transition:'all 0.2s', fontFamily:'inherit',
        }}
        onMouseEnter={e=>{ if(!open){ e.currentTarget.style.background='rgba(27,75,154,0.14)'; e.currentTarget.style.borderColor='rgba(44,123,229,0.25)'; }}}
        onMouseLeave={e=>{ if(!open){ e.currentTarget.style.background='rgba(27,75,154,0.08)'; e.currentTarget.style.borderColor='rgba(44,123,229,0.15)'; }}}
      >
        {/* Avatar */}
        <div style={{
          width:'28px', height:'28px', borderRadius:'8px',
          background:'linear-gradient(135deg,#E87722,#1B3568)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'11px', fontWeight:'700', color:'white', flexShrink:0,
          boxShadow:'0 2px 8px rgba(232,119,34,0.3)',
        }}>{initials}</div>
        <div style={{ textAlign:'left' }}>
          <p style={{ fontSize:'12px', fontWeight:'600', color:'#e2e8f0', lineHeight:1.2 }}>{user.username}</p>
          <p style={{ fontSize:'10px', color:'#4A6A96', textTransform:'uppercase', letterSpacing:'0.4px' }}>{user.role}</p>
        </div>
        {/* Chevron */}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft:'2px', transform: open?'rotate(180deg)':'rotate(0)', transition:'transform 0.2s', flexShrink:0 }}>
          <path d="M1 1l4 4 4-4" stroke="#607CA8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay pour fermer */}
          <div style={{ position:'fixed', inset:0, zIndex:198 }} onClick={()=>setOpen(false)} />
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:199,
            background:'rgba(4,9,26,0.98)',
            border:'1px solid rgba(44,123,229,0.2)',
            borderRadius:'14px', minWidth:'220px',
            boxShadow:'0 16px 48px rgba(0,0,0,0.6)',
            overflow:'hidden',
            animation:'dropIn 0.15s ease both',
          }}>
            {/* Header profil */}
            <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid rgba(44,123,229,0.1)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg,#E87722,#1B3568)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:'white', boxShadow:'0 2px 10px rgba(232,119,34,0.3)' }}>{initials}</div>
                <div>
                  <p style={{ fontSize:'13px', fontWeight:'600', color:'#f0f4ff' }}>{user.username}</p>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', marginTop:'2px', padding:'1px 7px', background:'rgba(232,119,34,0.1)', border:'1px solid rgba(232,119,34,0.2)', borderRadius:'20px' }}>
                    <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981' }} />
                    <span style={{ fontSize:'10px', color:'#FFA94D', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>{user.role}</span>
                  </div>
                </div>
              </div>
              {expiresAt && (
                <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 8px', background:'rgba(27,75,154,0.06)', border:'1px solid rgba(44,123,229,0.1)', borderRadius:'6px' }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#4A6A96" strokeWidth="1.2"/><path d="M6 3.5V6l2 1.5" stroke="#4A6A96" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  <span style={{ fontSize:'10.5px', color:'#4A6A96' }}>Session expire à <strong style={{ color:'#607CA8' }}>{expiresAt}</strong></span>
                </div>
              )}
            </div>

            {/* Menu items */}
            <div style={{ padding:'6px' }}>
              <MenuItem icon="👤" label="Mon profil"       sub="Informations du compte"  onClick={()=>setOpen(false)} />
              <MenuItem icon="⚙️" label="Paramètres"       sub="Préférences de la plateforme" onClick={()=>setOpen(false)} />
              <MenuItem icon="📊" label="Historique"       sub="Analyses précédentes"    onClick={()=>setOpen(false)} />

              <div style={{ height:'1px', background:'rgba(239,68,68,0.1)', margin:'6px 0' }} />

              <button onClick={()=>{ setOpen(false); onLogout(); }} style={{
                width:'100%', padding:'9px 12px',
                background:'transparent', border:'none',
                borderRadius:'8px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:'10px',
                transition:'background 0.15s', fontFamily:'inherit', textAlign:'left',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <span style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>⎋</span>
                <div>
                  <p style={{ fontSize:'12.5px', fontWeight:'600', color:'#fca5a5', margin:0 }}>Déconnexion</p>
                  <p style={{ fontSize:'10.5px', color:'rgba(252,165,165,0.5)', margin:0 }}>Fermer la session</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

function MenuItem({ icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', padding:'8px 12px',
      background:'transparent', border:'none',
      borderRadius:'8px', cursor:'pointer',
      display:'flex', alignItems:'center', gap:'10px',
      transition:'background 0.15s', fontFamily:'inherit', textAlign:'left',
    }}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(44,123,229,0.08)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
    >
      <span style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(27,75,154,0.1)', border:'1px solid rgba(44,123,229,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>{icon}</span>
      <div>
        <p style={{ fontSize:'12.5px', fontWeight:'500', color:'#e2e8f0', margin:0 }}>{label}</p>
        <p style={{ fontSize:'10.5px', color:'#4A6A96', margin:0 }}>{sub}</p>
      </div>
    </button>
  );
}

function App() {
  const [page,         setPage]         = useState('home');
  const [isLoggedIn,   setIsLoggedIn]   = useState(false);
  const [user,         setUser]         = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [sessionMsg,   setSessionMsg]   = useState('');
  const [importedData, setImportedData] = useState({ columns:[], rows:[] });

  // ── Au chargement : vérifie si un token valide existe déjà ───────────────
  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      // Vérifie côté serveur
      verifyToken().then(serverUser => {
        if (serverUser) {
          setUser(serverUser);
          setIsLoggedIn(true);
          setPage('import');
        }
        setAuthChecking(false);
      });
    } else {
      setAuthChecking(false);
    }
  }, []);

  // ── Écoute l'événement d'expiration de session (depuis api.js) ────────────
  useEffect(() => {
    const handler = (e) => {
      setIsLoggedIn(false);
      setUser(null);
      setPage('home');
      setImportedData({ columns:[], rows:[] });
      setSessionMsg(e.detail?.reason || 'Session expirée. Veuillez vous reconnecter.');
      setTimeout(() => setSessionMsg(''), 5000);
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setPage('import');
    setSessionMsg('');
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUser(null);
    setPage('home');
    setImportedData({ columns:[], rows:[] });
  };

  const handleDataReady = (columns, rows) => setImportedData({ columns, rows });

  const PAGE_LABELS = { home:'Accueil', import:'Import', dashboard:'Dashboard', pareto:'Pareto' };
  const PAGES       = ['home','import','dashboard','pareto'];
  const breadcrumb  = PAGES.slice(1, PAGES.indexOf(page)+1).filter(()=>isLoggedIn);

  // ── Écran de vérification initial ─────────────────────────────────────────
  if (authChecking) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#04091A,#060E22)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px', fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width:'36px', height:'36px', border:'3px solid rgba(232,119,34,0.2)', borderTopColor:'#E87722', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#607CA8', fontSize:'13px' }}>Vérification de la session…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#04091A 0%,#060E22 50%,#04091A 100%)', fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

      {/* Blobs */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
        <div style={{ position:'absolute', width:'700px', height:'700px', borderRadius:'50%', top:'-250px', left:'-150px', background:'radial-gradient(circle,rgba(232,119,34,0.06) 0%,transparent 70%)' }} />
        <div style={{ position:'absolute', width:'500px', height:'500px', borderRadius:'50%', bottom:0, right:'-150px', background:'radial-gradient(circle,rgba(44,123,229,0.06) 0%,transparent 70%)' }} />
      </div>

      {/* Toast session expirée */}
      {sessionMsg && (
        <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:200, padding:'12px 18px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:'10px', color:'#fca5a5', fontSize:'13px', fontWeight:'500', backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:'10px', fontFamily:'inherit', animation:'toastIn 0.3s ease both' }}>
          <span>⚠</span>{sessionMsg}
        </div>
      )}

      {/* Navbar */}
      <nav style={{ position:'sticky', top:0, zIndex:100, borderBottom:'1px solid rgba(44,123,229,0.15)', backdropFilter:'blur(20px)', background:'rgba(4,9,26,0.88)', padding:'0 40px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px' }}>

        {/* Logo + breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div onClick={()=>setPage(isLoggedIn?'dashboard':'home')} style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#E87722,#1B3568)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'800', color:'white', boxShadow:'0 0 20px rgba(232,119,34,0.35)' }}>P</div>
            <span style={{ fontSize:'17px', fontWeight:'700', letterSpacing:'-0.3px', color:'#f0f4ff' }}>
              Profiling<span style={{ color:'#E87722', fontWeight:'900' }}>.</span>ai
            </span>
          </div>

          {isLoggedIn && page!=='home' && (
            <div style={{ display:'flex', alignItems:'center', gap:'5px', marginLeft:'8px' }}>
              {breadcrumb.map((p,i)=>(
                <span key={p} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  {i>0 && <span style={{ color:'#162140', fontSize:'12px' }}>›</span>}
                  <span onClick={()=>setPage(p)} style={{ fontSize:'12px', color:p===page?'#FFA94D':'#2E4A72', cursor:p===page?'default':'pointer', fontWeight:p===page?'600':'400', transition:'color 0.2s' }}
                    onMouseEnter={e=>{if(p!==page)e.currentTarget.style.color='#607CA8';}}
                    onMouseLeave={e=>{if(p!==page)e.currentTarget.style.color='#2E4A72';}}
                  >{PAGE_LABELS[p]}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>

          {/* Indicateur système (non connecté) */}
          {!isLoggedIn && (
            <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#10b981', boxShadow:'0 0 8px #10b981', animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:'11px', color:'#607CA8', letterSpacing:'0.5px' }}>SYSTÈME ACTIF</span>
            </div>
          )}

          {/* Tabs navigation */}
          {isLoggedIn && (
            <div style={{ display:'flex', gap:'3px' }}>
              {[{id:'import',label:'Import',icon:'📥'},{id:'dashboard',label:'Dashboard',icon:'📊'},{id:'pareto',label:'Pareto',icon:'📈'}].map(tab=>(
                <button key={tab.id} onClick={()=>setPage(tab.id)} style={{ padding:'6px 11px', background:page===tab.id?'rgba(232,119,34,0.12)':'transparent', border:page===tab.id?'1px solid rgba(232,119,34,0.4)':'1px solid transparent', borderRadius:'8px', color:page===tab.id?'#FFA94D':'#4A6A96', fontFamily:'inherit', fontSize:'12px', fontWeight:page===tab.id?'600':'400', cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'5px' }}>
                  <span>{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Profil dropdown */}
          {isLoggedIn && user && (
            <ProfileMenu user={user} onLogout={handleLogout} />
          )}
        </div>
      </nav>

      <main style={{ position:'relative', zIndex:1 }}>
        {page==='home'      && <HomePage onLogin={handleLogin} />}
        {page==='import'    && <AdminImport onImportComplete={()=>setPage('dashboard')} onDataReady={handleDataReady} />}
        {page==='dashboard' && <Dashboard onNavigatePareto={()=>setPage('pareto')} importedColumns={importedData.columns} importedRows={importedData.rows} />}
        {page==='pareto'    && <ClusterDetail onBack={()=>setPage('dashboard')} />}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#04091A}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#04091A}
        ::-webkit-scrollbar-thumb{background:#0E1F3E;border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:#1B3568}
      `}</style>
    </div>
  );
}

export default App;