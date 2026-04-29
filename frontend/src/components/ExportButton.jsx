import { useState } from 'react';

const ORANGE = '#E87722';

// ─────────────────────────────────────────────────────────────────────────────
// Bouton d'export réutilisable
// Props :
//   label       — texte affiché (défaut "Exporter")
//   showLabel   — afficher le label (défaut true)
//   size        — 'sm' | 'md' (défaut 'md')
// ─────────────────────────────────────────────────────────────────────────────
function ExportButton({ label = 'Exporter', showLabel = true, size = 'md' }) {
  const [open,        setOpen]        = useState(false);
  const [loadingCsv,  setLoadingCsv]  = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const download = async (format) => {
    const setter = format === 'csv' ? setLoadingCsv : setLoadingXlsx;
    setter(true);
    setOpen(false);
    try {
      const res = await fetch(`http://localhost:5000/api/export/${format}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `profiling_export_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Export ${format.toUpperCase()} téléchargé avec succès`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setter(false);
    }
  };

  const pad   = size === 'sm' ? '6px 12px' : '9px 18px';
  const fsize = size === 'sm' ? '12px'     : '13px';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>

      {/* Bouton principal */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: pad,
          background: open
            ? 'rgba(232,119,34,0.2)'
            : 'rgba(232,119,34,0.1)',
          border: `1px solid rgba(232,119,34,${open ? '0.5' : '0.3'})`,
          borderRadius: '9px',
          color: '#FFA94D',
          fontFamily: 'inherit',
          fontSize: fsize,
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.18s',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,119,34,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background = open ? 'rgba(232,119,34,0.2)' : 'rgba(232,119,34,0.1)'}
      >
        {/* Icône téléchargement */}
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v8M4 7l3 3 3-3M2 11h10" stroke="#FFA94D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {showLabel && label}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ marginLeft: '2px', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path d="M1 2l3 3 3-3" stroke="#FFA94D" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay pour fermer au clic extérieur */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 99,
            background: 'rgba(4,9,26,0.98)',
            border: '1px solid rgba(44,123,229,0.25)',
            borderRadius: '12px',
            padding: '6px',
            minWidth: '200px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            animation: 'dropIn 0.15s ease both',
          }}>

            {/* CSV */}
            <button
              onClick={() => download('csv')}
              disabled={loadingCsv}
              style={{
                width: '100%', padding: '10px 14px',
                background: 'transparent',
                border: 'none', borderRadius: '8px',
                color: loadingCsv ? '#4A6A96' : '#e2e8f0',
                fontFamily: 'inherit', fontSize: '13px',
                cursor: loadingCsv ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'background 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!loadingCsv) e.currentTarget.style.background = 'rgba(44,123,229,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {loadingCsv
                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#e2e8f0', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                : <span style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>CSV</span>
              }
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>
                  {loadingCsv ? 'Génération…' : 'Exporter en CSV'}
                </p>
                <p style={{ fontSize: '11px', color: '#4A6A96', margin: 0 }}>
                  Compatible Excel, Google Sheets
                </p>
              </div>
            </button>

            <div style={{ height: '1px', background: 'rgba(44,123,229,0.1)', margin: '4px 0' }} />

            {/* XLSX */}
            <button
              onClick={() => download('xlsx')}
              disabled={loadingXlsx}
              style={{
                width: '100%', padding: '10px 14px',
                background: 'transparent',
                border: 'none', borderRadius: '8px',
                color: loadingXlsx ? '#4A6A96' : '#e2e8f0',
                fontFamily: 'inherit', fontSize: '13px',
                cursor: loadingXlsx ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'background 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!loadingXlsx) e.currentTarget.style.background = 'rgba(44,123,229,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {loadingXlsx
                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#e2e8f0', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                : <span style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(44,123,229,0.15)', border: '1px solid rgba(44,123,229,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#2C7BE5', flexShrink: 0 }}>XLS</span>
              }
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>
                  {loadingXlsx ? 'Génération…' : 'Exporter en Excel'}
                </p>
                <p style={{ fontSize: '11px', color: '#4A6A96', margin: 0 }}>
                  3 feuilles : données · stats · métriques
                </p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
          padding: '12px 18px',
          background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
          borderRadius: '10px',
          color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5',
          fontSize: '13px', fontWeight: '500',
          display: 'flex', alignItems: 'center', gap: '10px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'toastIn 0.3s ease both',
          fontFamily: 'inherit',
        }}>
          <span style={{ fontSize: '16px' }}>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes dropIn  { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default ExportButton;