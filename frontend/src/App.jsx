import { useState } from 'react';
import HomePage      from './components/HomePage';
import AdminImport   from './components/AdminImport';
import Dashboard     from './components/Dashboard';
import ClusterDetail from './components/ClusterDetail';

function App() {
  const [page,         setPage]         = useState('home');
  const [isLoggedIn,   setIsLoggedIn]   = useState(false);
  // Données importées — persistées entre les pages
  const [importedData, setImportedData] = useState({ columns: [], rows: [] });

  const login  = () => { setIsLoggedIn(true);  setPage('import'); };
  const logout = () => { setIsLoggedIn(false); setPage('home'); setImportedData({ columns: [], rows: [] }); };

  const handleDataReady = (columns, rows) => setImportedData({ columns, rows });

  const PAGE_LABELS = { home: 'Accueil', import: 'Import', dashboard: 'Dashboard', pareto: 'Analyse Pareto' };
  const PAGES       = ['home', 'import', 'dashboard', 'pareto'];
  const breadcrumb  = PAGES.slice(1, PAGES.indexOf(page) + 1).filter(() => isLoggedIn);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0e1a 0%,#0d1224 50%,#0a0f1e 100%)', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* Blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: '700px', height: '700px', borderRadius: '50%', top: '-250px', left: '-150px', background: 'radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', bottom: 0, right: '-150px', background: 'radial-gradient(circle,rgba(6,182,212,0.06) 0%,transparent 70%)' }} />
      </div>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)', background: 'rgba(10,14,26,0.85)', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

        {/* Logo + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div onClick={() => setPage(isLoggedIn ? 'dashboard' : 'home')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: 'white', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>P</div>
            <span style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.3px', color: '#f1f5f9' }}>Profiling<span style={{ color: '#6366f1' }}>.</span>ai</span>
          </div>
          {isLoggedIn && page !== 'home' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '8px' }}>
              {breadcrumb.map((p, i) => (
                <span key={p} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {i > 0 && <span style={{ color: '#1e293b', fontSize: '12px' }}>›</span>}
                  <span onClick={() => setPage(p)} style={{ fontSize: '12px', color: p === page ? '#a5b4fc' : '#334155', cursor: p === page ? 'default' : 'pointer', fontWeight: p === page ? '600' : '400', transition: 'color 0.2s' }}
                    onMouseEnter={e => { if (p !== page) e.currentTarget.style.color = '#64748b'; }}
                    onMouseLeave={e => { if (p !== page) e.currentTarget.style.color = '#334155'; }}
                  >{PAGE_LABELS[p]}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '11px', color: '#475569', letterSpacing: '0.5px' }}>SYSTÈME ACTIF</span>
          </div>
          {isLoggedIn && (
            <div style={{ display: 'flex', gap: '3px' }}>
              {[
                { id: 'import',    label: 'Import',    icon: '📥' },
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'pareto',    label: 'Pareto',    icon: '📈' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setPage(tab.id)} style={{
                  padding: '6px 12px',
                  background: page === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: page === tab.id ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                  borderRadius: '8px', color: page === tab.id ? '#a5b4fc' : '#475569',
                  fontFamily: 'inherit', fontSize: '12px', fontWeight: page === tab.id ? '600' : '400',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  <span>{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>
          )}
          {isLoggedIn && (
            <button onClick={logout} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '8px', color: '#fca5a5', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
            >⎋ Déco</button>
          )}
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1 }}>
        {page === 'home'      && <HomePage onLogin={login} />}
        {page === 'import'    && (
          <AdminImport
            onImportComplete={() => setPage('dashboard')}
            onDataReady={handleDataReady}
          />
        )}
        {page === 'dashboard' && (
          <Dashboard
            onNavigatePareto={() => setPage('pareto')}
            importedColumns={importedData.columns}
            importedRows={importedData.rows}
          />
        )}
        {page === 'pareto'    && <ClusterDetail onBack={() => setPage('dashboard')} />}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0e1a}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#0a0e1a}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
      `}</style>
    </div>
  );
}

export default App;