import { useState } from 'react';
import axios from 'axios';
import ClusteringConfig from './ClusteringConfig';
import DataTable from './DataTable';

const card = {
  background: 'rgba(15,20,35,0.9)',
  border: '1px solid rgba(99,102,241,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
};
const inputBase = {
  padding: '9px 14px', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px',
  color: '#e2e8f0', fontSize: '13px', fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.2s',
};
const labelStyle = {
  fontSize: '11px', fontWeight: '600', letterSpacing: '0.8px',
  color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '12px 16px',
      background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
      border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: '10px', color: active ? '#a5b4fc' : '#64748b',
      fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
      cursor: 'pointer', transition: 'all 0.2s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>{label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props :
//   onImportComplete()          → navigation vers Dashboard
//   onDataReady(columns, rows)  → remonte les données vers App pour persistance
// ─────────────────────────────────────────────────────────────────────────────
function AdminImport({ onImportComplete, onDataReady }) {
  const [sourceType,   setSourceType]   = useState('file');
  const [file,         setFile]         = useState(null);
  const [dbConfig,     setDbConfig]     = useState({ type: 'PostgreSQL', host: '', database: '', user: '', password: '', port: '5432' });
  const [separator,    setSeparator]    = useState(';');
  const [message,      setMessage]      = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [columns,      setColumns]      = useState([]);
  const [allRows,      setAllRows]      = useState([]);
  const [isValidated,  setIsValidated]  = useState(false);
  const [dragOver,     setDragOver]     = useState(false);

  const handleDbChange = e => setDbConfig({ ...dbConfig, [e.target.name]: e.target.value });
  const handleDrop     = e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); };

  const handleSourceAction = async () => {
    setIsProcessing(true); setMessage(null); setColumns([]); setAllRows([]);
    try {
      let response;
      if (sourceType === 'file') {
        const fd = new FormData();
        fd.append('dataset', file);
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) fd.append('separator', separator);
        response = await axios.post('http://localhost:5000/api/data/import', fd);
      } else {
        response = await axios.post('http://localhost:5000/api/data/connect', dbConfig);
      }
      const cols = response.data.columns;
      const rows = response.data.allRows || response.data.previewData || [];
      setMessage({ type: 'success', text: response.data.message });
      setColumns(cols);
      setAllRows(rows);
      // Remonte les données vers App.jsx pour persistance inter-pages
      if (onDataReady) onDataReady(cols, rows);
    } catch {
      setMessage({ type: 'error', text: "Échec de l'acquisition des données." });
    } finally {
      setIsProcessing(false);
    }
  };

  const canSubmit = !isProcessing && (sourceType === 'file' ? !!file : (dbConfig.host && dbConfig.user && dbConfig.password));

  if (isValidated) {
    return (
      <div style={{ padding: '40px 40px 60px', maxWidth: '860px', margin: '0 auto' }}>
        <ClusteringConfig columns={columns} onComplete={onImportComplete} />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 60px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ animation: 'fadeSlideUp 0.5s ease both' }}>

        {/* ── Import card ─────────────────────────────────────────────────── */}
        <div style={{ ...card, padding: '28px 32px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0 }}>1</div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>Source de Données</h2>
              <p style={{ fontSize: '12px', color: '#475569' }}>Importez un fichier local ou connectez une base de données</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
            <TabButton active={sourceType === 'file'} onClick={() => setSourceType('file')} icon="📁" label="Importer un fichier" />
            <TabButton active={sourceType === 'db'}   onClick={() => setSourceType('db')}   icon="🔌" label="Connecter une BDD" />
          </div>

          {/* File drop zone */}
          {sourceType === 'file' && (
            <div style={{ animation: 'fadeSlideUp 0.3s ease both' }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('fileInput').click()}
                style={{ border: `2px dashed ${dragOver ? '#6366f1' : file ? '#10b981' : 'rgba(99,102,241,0.25)'}`, borderRadius: '12px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(99,102,241,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', marginBottom: '14px' }}
              >
                <input id="fileInput" type="file" accept=".csv,.txt,.xlsx" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                <div style={{ fontSize: '26px', marginBottom: '8px' }}>{file ? '✅' : '📂'}</div>
                {file ? (
                  <>
                    <p style={{ color: '#10b981', fontWeight: '600', fontSize: '14px' }}>{file.name}</p>
                    <p style={{ color: '#475569', fontSize: '12px', marginTop: '3px' }}>{(file.size / 1024).toFixed(1)} KB · Cliquez pour changer</p>
                  </>
                ) : (
                  <>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Glissez un fichier ou cliquez pour parcourir</p>
                    <p style={{ color: '#334155', fontSize: '11px', marginTop: '4px' }}>CSV · TXT · XLSX</p>
                  </>
                )}
              </div>
              {file && (file.name.endsWith('.csv') || file.name.endsWith('.txt')) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={labelStyle}>Séparateur</span>
                  {[';', ',', '|', '\t'].map(s => (
                    <button key={s} onClick={() => setSeparator(s)} style={{ padding: '6px 13px', borderRadius: '7px', border: `1px solid ${separator === s ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, background: separator === s ? 'rgba(99,102,241,0.12)' : 'transparent', color: separator === s ? '#a5b4fc' : '#64748b', fontFamily: 'monospace', fontSize: '13px', cursor: 'pointer' }}>
                      {s === '\t' ? 'TAB' : s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DB fields */}
          {sourceType === 'db' && (
            <div style={{ animation: 'fadeSlideUp 0.3s ease both' }}>
              <div style={{ marginBottom: '14px' }}>
                <span style={labelStyle}>Type</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['PostgreSQL', 'Databricks'].map(t => (
                    <button key={t} onClick={() => setDbConfig({ ...dbConfig, type: t })} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${dbConfig.type === t ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`, background: dbConfig.type === t ? 'rgba(99,102,241,0.1)' : 'transparent', color: dbConfig.type === t ? '#a5b4fc' : '#64748b', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer' }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { name: 'host', placeholder: 'Hôte / URL', label: 'Hôte' },
                  { name: 'database', placeholder: 'Base / Catalogue', label: 'Base de données' },
                  { name: 'user', placeholder: 'Identifiant', label: 'Utilisateur' },
                  { name: 'password', placeholder: '••••••••', label: 'Mot de passe', type: 'password' },
                  { name: 'port', placeholder: '5432', label: 'Port' },
                ].map(f => (
                  <div key={f.name}>
                    <span style={labelStyle}>{f.label}</span>
                    <input name={f.name} type={f.type || 'text'} placeholder={f.placeholder} onChange={handleDbChange}
                      style={{ ...inputBase, width: '100%', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleSourceAction} disabled={!canSubmit} style={{
            marginTop: '20px', width: '100%', padding: '13px',
            background: canSubmit ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.12)',
            border: 'none', borderRadius: '10px', color: canSubmit ? 'white' : '#475569',
            fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
            cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: canSubmit ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
          }}
            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isProcessing
              ? <><span style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Chargement…</>
              : sourceType === 'file' ? '⚡ Analyser le fichier' : '🔗 Tester la connexion'
            }
          </button>

          {message && (
            <div style={{ marginTop: '14px', padding: '11px 16px', borderRadius: '8px', background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: message.type === 'success' ? '#6ee7b7' : '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeSlideUp 0.3s ease both' }}>
              {message.type === 'success' ? '✓' : '✕'} {message.text}
            </div>
          )}
        </div>

        {/* ── DataTable ───────────────────────────────────────────────────── */}
        {columns.length > 0 && allRows.length > 0 && (
          <div style={{ ...card, padding: '24px 28px', animation: 'fadeSlideUp 0.4s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>Aperçu des données</h3>
                  <span style={{ fontSize: '10px', padding: '2px 9px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7', fontWeight: '600' }}>CHARGÉ</span>
                </div>
                <p style={{ fontSize: '11.5px', color: '#475569' }}>{allRows.length.toLocaleString('fr-FR')} lignes · {columns.length} colonnes importées</p>
              </div>
              <button onClick={() => setIsValidated(true)} style={{
                padding: '10px 20px', background: 'linear-gradient(135deg,#06b6d4,#0891b2)',
                border: 'none', borderRadius: '10px', color: 'white',
                fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(6,182,212,0.25)', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Configurer le clustering →
              </button>
            </div>
            <DataTable columns={columns} allRows={allRows} />
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder{color:#334155}
      `}</style>
    </div>
  );
}

export default AdminImport;