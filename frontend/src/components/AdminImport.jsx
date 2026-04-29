import { useState } from 'react';
import api from '../api';
import ClusteringConfig from './ClusteringConfig';
import DataTable from './DataTable';

const card = {
  background: 'rgba(6,14,36,0.9)',
  border: '1px solid rgba(44,123,229,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(27,75,154,0.08)',
};
const inputBase = {
  padding: '9px 14px', background: 'rgba(27,75,154,0.08)',
  border: '1px solid rgba(44,123,229,0.2)', borderRadius: '8px',
  color: '#e2e8f0', fontSize: '13px', fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: '11px', fontWeight: '600', letterSpacing: '0.8px',
  color: '#607CA8', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

function Field({ label, name, value, onChange, placeholder, type='text' }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <input name={name} type={type} value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.name, e.target.value)}
        style={inputBase}
        onFocus={e=>e.target.style.borderColor='#E87722'}
        onBlur={e=>e.target.style.borderColor='rgba(44,123,229,0.2)'}
      />
    </div>
  );
}

function Alert({ type, text }) {
  const ok = type==='success';
  return (
    <div style={{ padding:'10px 14px', borderRadius:'8px', background:ok?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${ok?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`, color:ok?'#6ee7b7':'#fca5a5', fontSize:'12.5px', display:'flex', alignItems:'center', gap:'8px', animation:'fadeSlideUp 0.3s ease both' }}>
      {ok?'✓':'✕'} {text}
    </div>
  );
}

function Btn({ onClick, disabled, loading, children, variant='primary', size='md' }) {
  const colors = {
    primary: 'linear-gradient(135deg,#E87722,#D4620D)',
    blue:    'linear-gradient(135deg,#2C7BE5,#1A6BC5)',
    ghost:   'rgba(44,123,229,0.08)',
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: size==='sm'?'7px 14px':'11px 20px',
      background: disabled?'rgba(44,123,229,0.06)':colors[variant]||colors.primary,
      border: variant==='ghost'?'1px solid rgba(44,123,229,0.15)':'none',
      borderRadius:'9px', color: disabled?'#4A6A96':variant==='ghost'?'#607CA8':'white',
      fontFamily:'inherit', fontSize:size==='sm'?'12px':'13px', fontWeight:'600',
      cursor:disabled?'not-allowed':'pointer', transition:'all 0.2s',
      display:'flex', alignItems:'center', gap:'7px', whiteSpace:'nowrap',
      boxShadow: disabled||variant==='ghost'?'none':variant==='blue'?'0 4px 16px rgba(44,123,229,0.25)':'0 4px 16px rgba(232,119,34,0.3)',
    }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.transform='translateY(-1px)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; }}
    >
      {loading && <span style={{ width:'13px', height:'13px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />}
      {children}
    </button>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function Stepper({ step, steps }) {
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:'22px' }}>
      {steps.map((s,i)=>(
        <div key={s.n} style={{ display:'flex', alignItems:'center', flex:i<steps.length-1?1:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
            <div style={{ width:'26px', height:'26px', borderRadius:'50%', flexShrink:0, transition:'all 0.3s',
              background: step>s.n?'#10b981':step===s.n?'linear-gradient(135deg,#E87722,#D4620D)':'rgba(44,123,229,0.08)',
              border: step>=s.n?'none':'1px solid rgba(44,123,229,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'10px', fontWeight:'700', color:step>=s.n?'white':'#4A6A96' }}>
              {step>s.n?'✓':s.n}
            </div>
            <span style={{ fontSize:'12px', color:step===s.n?'#FFA94D':step>s.n?'#6ee7b7':'#4A6A96', fontWeight:step===s.n?'600':'400', whiteSpace:'nowrap' }}>{s.label}</span>
          </div>
          {i<steps.length-1 && <div style={{ flex:1, height:'1px', margin:'0 10px', background:step>s.n?'rgba(16,185,129,0.4)':'rgba(44,123,229,0.1)', transition:'background 0.3s' }} />}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTEUR PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────
function PgConnector({ onLoaded }) {
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState({ host:'localhost', port:'5432', database:'', user:'', password:'' });
  const [tables,    setTables]    = useState([]);
  const [dbConfig,  setDbConfig]  = useState(null);
  const [selTable,  setSelTable]  = useState('');
  const [tableInfo, setTableInfo] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState(null);
  const [search,    setSearch]    = useState('');
  const [rowLimit,  setRowLimit]  = useState('100000');

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleConnect = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.post('/api/data/connect', { dbType:'postgresql', ...form });
      setTables(r.data.tables); setDbConfig(r.data.dbConfig);
      setMsg({ type:'success', text:r.data.message }); setStep(2);
    } catch(e) { setMsg({ type:'error', text:e.response?.data?.error||e.message }); }
    finally { setLoading(false); }
  };

  const handlePreview = async (tableName) => {
    setSelTable(tableName); setLoading(true); setMsg(null);
    try {
      const r = await api.post('/api/data/preview', { dbConfig, tableName });
      setTableInfo(r.data); setStep(3);
    } catch(e) { setMsg({ type:'error', text:e.response?.data?.error||e.message }); }
    finally { setLoading(false); }
  };

  const handleLoad = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.post('/api/data/load', { dbConfig, tableName:selTable, limit:parseInt(rowLimit)||100000 });
      setMsg({ type:'success', text:r.data.message });
      onLoaded(r.data.columns, r.data.allRows, r.data.message);
    } catch(e) { setMsg({ type:'error', text:e.response?.data?.error||e.message }); }
    finally { setLoading(false); }
  };

  const filtered = tables.filter(t=>t.full.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Stepper step={step} steps={[{n:1,label:'Connexion'},{n:2,label:'Sélection table'},{n:3,label:'Aperçu & chargement'}]} />

      {step===1 && (
        <div style={{ animation:'fadeSlideUp 0.3s ease both' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
            <Field label="Hôte"           name="host"     value={form.host}     onChange={set} placeholder="localhost" />
            <Field label="Port"           name="port"     value={form.port}     onChange={set} placeholder="5432" />
            <Field label="Base de données" name="database" value={form.database} onChange={set} placeholder="ma_base" />
            <Field label="Utilisateur"    name="user"     value={form.user}     onChange={set} placeholder="postgres" />
          </div>
          <div style={{ marginBottom:'16px' }}>
            <Field label="Mot de passe" name="password" value={form.password} onChange={set} placeholder="••••••••" type="password" />
          </div>
          {msg && <div style={{ marginBottom:'12px' }}><Alert type={msg.type} text={msg.text} /></div>}
          <Btn onClick={handleConnect} loading={loading} disabled={loading||!form.host||!form.database||!form.user||!form.password}>
            {loading?'Connexion…':'🔗 Se connecter à PostgreSQL'}
          </Btn>
        </div>
      )}

      {step===2 && (
        <div style={{ animation:'fadeSlideUp 0.3s ease both' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
            <div>
              <p style={{ fontSize:'13px', fontWeight:'600', color:'#f0f4ff', marginBottom:'2px' }}>{tables.length} table{tables.length>1?'s':''} disponible{tables.length>1?'s':''}</p>
              <p style={{ fontSize:'11px', color:'#607CA8' }}>{form.database} · {form.host}</p>
            </div>
            <Btn variant='ghost' size='sm' onClick={()=>{setStep(1);setMsg(null);}}>← Modifier</Btn>
          </div>
          <div style={{ position:'relative', marginBottom:'12px' }}>
            <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#4A6A96', pointerEvents:'none' }}>🔍</span>
            <input type="text" placeholder="Rechercher une table…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ ...inputBase, paddingLeft:'30px' }}
              onFocus={e=>e.target.style.borderColor='#E87722'}
              onBlur={e=>e.target.style.borderColor='rgba(44,123,229,0.2)'}
            />
          </div>
          <div style={{ maxHeight:'280px', overflowY:'auto', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'8px' }}>
            {filtered.length===0 && <p style={{ color:'#4A6A96', fontSize:'12px', gridColumn:'1/-1', padding:'20px', textAlign:'center' }}>Aucune table</p>}
            {filtered.map(t=>(
              <button key={t.full} onClick={()=>handlePreview(t.full)} disabled={loading}
                style={{ padding:'11px 14px', textAlign:'left', background:'rgba(27,75,154,0.06)', border:'1px solid rgba(44,123,229,0.12)', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', color:'inherit' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(232,119,34,0.08)';e.currentTarget.style.borderColor='rgba(232,119,34,0.3)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(27,75,154,0.06)';e.currentTarget.style.borderColor='rgba(44,123,229,0.12)';}}>
                <p style={{ fontSize:'12px', fontWeight:'600', color:'#e2e8f0', fontFamily:'monospace', marginBottom:'2px' }}>{t.name}</p>
                <p style={{ fontSize:'10px', color:'#4A6A96' }}>{t.schema} · {t.size}</p>
              </button>
            ))}
          </div>
          {msg && <div style={{ marginTop:'10px' }}><Alert type={msg.type} text={msg.text} /></div>}
          {loading && <p style={{ fontSize:'12px', color:'#607CA8', marginTop:'8px' }}>Chargement aperçu…</p>}
        </div>
      )}

      {step===3 && tableInfo && (
        <TablePreviewAndLoad tableName={selTable} tableInfo={tableInfo} rowLimit={rowLimit}
          setRowLimit={setRowLimit} loading={loading} msg={msg}
          onLoad={handleLoad} onBack={()=>{setStep(2);setTableInfo(null);setMsg(null);}} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTEUR Databricks
// ─────────────────────────────────────────────────────────────────────────────
function DatabricksConnector({ onLoaded }) {
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState({ hostname:'', httpPath:'', token:'', catalog:'', schema:'' });
  const [tables,    setTables]    = useState([]);
  const [dbConfig,  setDbConfig]  = useState(null);
  const [selTable,  setSelTable]  = useState('');
  const [tableInfo, setTableInfo] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState(null);
  const [search,    setSearch]    = useState('');
  const [rowLimit,  setRowLimit]  = useState('100000');

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleConnect = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.post('/api/data/connect', { dbType:'databricks', ...form });
      setTables(r.data.tables); setDbConfig(r.data.dbConfig);
      setMsg({ type:'success', text:r.data.message }); setStep(2);
    } catch(e) { setMsg({ type:'error', text:e.response?.data?.error||e.message }); }
    finally { setLoading(false); }
  };

  const handlePreview = async (tableName) => {
    setSelTable(tableName); setLoading(true); setMsg(null);
    try {
      const r = await api.post('/api/data/preview', { dbConfig, tableName });
      setTableInfo(r.data); setStep(3);
    } catch(e) { setMsg({ type:'error', text:e.response?.data?.error||e.message }); }
    finally { setLoading(false); }
  };

  const handleLoad = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await api.post('/api/data/load', { dbConfig, tableName:selTable, limit:parseInt(rowLimit)||100000 });
      setMsg({ type:'success', text:r.data.message });
      onLoaded(r.data.columns, r.data.allRows, r.data.message);
    } catch(e) { setMsg({ type:'error', text:e.response?.data?.error||e.message }); }
    finally { setLoading(false); }
  };

  const filtered = tables.filter(t=>t.full.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Stepper step={step} steps={[{n:1,label:'Connexion'},{n:2,label:'Sélection table'},{n:3,label:'Aperçu & chargement'}]} />

      {step===1 && (
        <div style={{ animation:'fadeSlideUp 0.3s ease both' }}>
          {/* Aide Databricks */}
          <div style={{ padding:'10px 14px', background:'rgba(44,123,229,0.06)', border:'1px solid rgba(44,123,229,0.12)', borderRadius:'8px', marginBottom:'16px', fontSize:'12px', color:'#607CA8', lineHeight:'1.6' }}>
            <strong style={{ color:'#2C7BE5' }}>Databricks SQL Warehouse</strong><br/>
            Hostname : <code style={{ fontFamily:'monospace', color:'#e2e8f0' }}>adb-xxxx.azuredatabricks.net</code><br/>
            HTTP Path : <code style={{ fontFamily:'monospace', color:'#e2e8f0' }}>/sql/1.0/warehouses/xxxx</code><br/>
            Token : votre Personal Access Token Databricks
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'12px', marginBottom:'12px' }}>
            <Field label="Hostname"  name="hostname" value={form.hostname} onChange={set} placeholder="adb-xxxx.azuredatabricks.net" />
            <Field label="HTTP Path" name="httpPath" value={form.httpPath} onChange={set} placeholder="/sql/1.0/warehouses/xxxx" />
            <Field label="Token"     name="token"    value={form.token}    onChange={set} placeholder="dapi…" type="password" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
            <Field label="Catalogue (optionnel)" name="catalog" value={form.catalog} onChange={set} placeholder="hive_metastore" />
            <Field label="Schéma (optionnel)"    name="schema"  value={form.schema}  onChange={set} placeholder="default" />
          </div>
          {msg && <div style={{ marginBottom:'12px' }}><Alert type={msg.type} text={msg.text} /></div>}
          <Btn onClick={handleConnect} loading={loading} disabled={loading||!form.hostname||!form.httpPath||!form.token}>
            {loading?'Connexion…':'⚡ Se connecter à Databricks'}
          </Btn>
        </div>
      )}

      {step===2 && (
        <div style={{ animation:'fadeSlideUp 0.3s ease both' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
            <div>
              <p style={{ fontSize:'13px', fontWeight:'600', color:'#f0f4ff', marginBottom:'2px' }}>{tables.length} table{tables.length>1?'s':''} disponible{tables.length>1?'s':''}</p>
              <p style={{ fontSize:'11px', color:'#607CA8' }}>{form.catalog||'hive_metastore'} · {form.hostname}</p>
            </div>
            <Btn variant='ghost' size='sm' onClick={()=>{setStep(1);setMsg(null);}}>← Modifier</Btn>
          </div>
          <div style={{ position:'relative', marginBottom:'12px' }}>
            <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#4A6A96', pointerEvents:'none' }}>🔍</span>
            <input type="text" placeholder="Rechercher une table…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ ...inputBase, paddingLeft:'30px' }}
              onFocus={e=>e.target.style.borderColor='#E87722'}
              onBlur={e=>e.target.style.borderColor='rgba(44,123,229,0.2)'}
            />
          </div>
          <div style={{ maxHeight:'280px', overflowY:'auto', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'8px' }}>
            {filtered.length===0 && <p style={{ color:'#4A6A96', fontSize:'12px', gridColumn:'1/-1', padding:'20px', textAlign:'center' }}>Aucune table</p>}
            {filtered.map(t=>(
              <button key={t.full} onClick={()=>handlePreview(t.full)} disabled={loading}
                style={{ padding:'11px 14px', textAlign:'left', background:'rgba(27,75,154,0.06)', border:'1px solid rgba(44,123,229,0.12)', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', color:'inherit' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(232,119,34,0.08)';e.currentTarget.style.borderColor='rgba(232,119,34,0.3)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(27,75,154,0.06)';e.currentTarget.style.borderColor='rgba(44,123,229,0.12)';}}>
                <p style={{ fontSize:'12px', fontWeight:'600', color:'#e2e8f0', fontFamily:'monospace', marginBottom:'2px' }}>{t.name}</p>
                <p style={{ fontSize:'10px', color:'#4A6A96' }}>{t.schema}</p>
              </button>
            ))}
          </div>
          {msg && <div style={{ marginTop:'10px' }}><Alert type={msg.type} text={msg.text} /></div>}
          {loading && <p style={{ fontSize:'12px', color:'#607CA8', marginTop:'8px' }}>Chargement aperçu…</p>}
        </div>
      )}

      {step===3 && tableInfo && (
        <TablePreviewAndLoad tableName={selTable} tableInfo={tableInfo} rowLimit={rowLimit}
          setRowLimit={setRowLimit} loading={loading} msg={msg}
          onLoad={handleLoad} onBack={()=>{setStep(2);setTableInfo(null);setMsg(null);}} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant partagé : aperçu table + bouton charger
// ─────────────────────────────────────────────────────────────────────────────
function TablePreviewAndLoad({ tableName, tableInfo, rowLimit, setRowLimit, loading, msg, onLoad, onBack }) {
  const selectStyle = {
    ...inputBase, width:'auto', minWidth:'160px', cursor:'pointer',
    appearance:'none', paddingRight:'28px',
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23607CA8'/%3E%3C/svg%3E")`,
    backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
  };
  return (
    <div style={{ animation:'fadeSlideUp 0.3s ease both' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
        <div>
          <p style={{ fontSize:'13px', fontWeight:'600', color:'#f0f4ff', fontFamily:'monospace', marginBottom:'2px' }}>{tableName}</p>
          <p style={{ fontSize:'11px', color:'#607CA8' }}>{tableInfo.totalRows?.toLocaleString('fr-FR')} lignes · {tableInfo.columns?.length} colonnes</p>
        </div>
        <Btn variant='ghost' size='sm' onClick={onBack}>← Autre table</Btn>
      </div>

      {/* Badges colonnes avec types */}
      <div style={{ marginBottom:'14px' }}>
        <p style={{ ...labelStyle, marginBottom:'8px' }}>Colonnes</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
          {(tableInfo.columnInfo||tableInfo.columns.map(c=>({name:c,type:'?'}))).map(c=>(
            <div key={c.name} style={{ padding:'4px 10px', borderRadius:'6px', background:'rgba(27,75,154,0.08)', border:'1px solid rgba(44,123,229,0.15)', display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ fontSize:'11.5px', color:'#e2e8f0', fontFamily:'monospace' }}>{c.name}</span>
              {c.type && <span style={{ fontSize:'10px', color:'#4A6A96', background:'rgba(44,123,229,0.1)', padding:'1px 6px', borderRadius:'4px' }}>{c.type}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Aperçu 10 lignes */}
      <div style={{ marginBottom:'16px' }}>
        <p style={{ ...labelStyle, marginBottom:'8px' }}>Aperçu — 10 premières lignes</p>
        <DataTable columns={tableInfo.columns} allRows={tableInfo.previewData} compact={true} />
      </div>

      {/* Limit + bouton */}
      <div style={{ display:'flex', alignItems:'flex-end', gap:'12px', flexWrap:'wrap' }}>
        <div>
          <p style={{ ...labelStyle, marginBottom:'6px' }}>Lignes à charger</p>
          <select value={rowLimit} onChange={e=>setRowLimit(e.target.value)} style={selectStyle}>
            <option value="1000">1 000 lignes</option>
            <option value="5000">5 000 lignes</option>
            <option value="10000">10 000 lignes</option>
            <option value="50000">50 000 lignes</option>
            <option value="100000">100 000 lignes</option>
            <option value="999999">Tout charger</option>
          </select>
        </div>
        <Btn onClick={onLoad} loading={loading} disabled={loading}>
          {loading?'Chargement…':'⚡ Charger la table'}
        </Btn>
      </div>
      {msg && <div style={{ marginTop:'12px' }}><Alert type={msg.type} text={msg.text} /></div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL AdminImport
// ─────────────────────────────────────────────────────────────────────────────
function AdminImport({ onImportComplete, onDataReady }) {
  const [sourceType,   setSourceType]   = useState('file');
  const [file,         setFile]         = useState(null);
  const [separator,    setSeparator]    = useState(';');
  const [message,      setMessage]      = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [columns,      setColumns]      = useState([]);
  const [allRows,      setAllRows]      = useState([]);
  const [isValidated,  setIsValidated]  = useState(false);
  const [dragOver,     setDragOver]     = useState(false);

  const handleFileAction = async () => {
    if (!file) return;
    setIsProcessing(true); setMessage(null); setColumns([]); setAllRows([]);
    try {
      const fd = new FormData();
      fd.append('dataset', file);
      if (file.name.endsWith('.csv')||file.name.endsWith('.txt')) fd.append('separator', separator);
      const r = await api.post('/api/data/import', fd);
      setMessage({ type:'success', text:r.data.message });
      setColumns(r.data.columns); setAllRows(r.data.allRows||[]);
      if (onDataReady) onDataReady(r.data.columns, r.data.allRows||[]);
    } catch(e) { setMessage({ type:'error', text:e.response?.data?.error||"Échec de l'import." }); }
    finally { setIsProcessing(false); }
  };

  const handleDbLoaded = (cols, rows, msg) => {
    setColumns(cols); setAllRows(rows);
    setMessage({ type:'success', text:msg });
    if (onDataReady) onDataReady(cols, rows);
  };

  if (isValidated) return (
    <div style={{ padding:'40px 40px 60px', maxWidth:'860px', margin:'0 auto' }}>
      <ClusteringConfig columns={columns} onComplete={onImportComplete} />
    </div>
  );

  const TABS = [
    { id:'file',       icon:'📁', label:'Fichier' },
    { id:'postgresql', icon:'🐘', label:'PostgreSQL' },
    { id:'databricks', icon:'⚡', label:'Databricks' },
  ];

  return (
    <div style={{ padding:'40px 40px 60px', maxWidth:'1100px', margin:'0 auto' }}>
      <div style={{ animation:'fadeSlideUp 0.5s ease both' }}>

        <div style={{ ...card, padding:'28px 32px', marginBottom:'20px' }}>
          {/* En-tête */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'22px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#E87722,#D4620D)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'white', flexShrink:0 }}>1</div>
            <div>
              <h2 style={{ fontSize:'17px', fontWeight:'700', color:'#f0f4ff', letterSpacing:'-0.3px' }}>Source de Données</h2>
              <p style={{ fontSize:'12px', color:'#607CA8' }}>Fichier local, PostgreSQL ou Databricks</p>
            </div>
          </div>

          {/* Tabs source */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'24px' }}>
            {TABS.map(tab=>(
              <button key={tab.id} onClick={()=>setSourceType(tab.id)} style={{
                flex:1, padding:'11px 12px',
                background:sourceType===tab.id?'rgba(232,119,34,0.12)':'rgba(27,75,154,0.04)',
                border:sourceType===tab.id?'1px solid rgba(232,119,34,0.4)':'1px solid rgba(44,123,229,0.1)',
                borderRadius:'10px', color:sourceType===tab.id?'#FFA94D':'#607CA8',
                fontFamily:'inherit', fontSize:'13px', fontWeight:'600',
                cursor:'pointer', transition:'all 0.2s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'7px',
              }}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* Fichier */}
          {sourceType==='file' && (
            <div style={{ animation:'fadeSlideUp 0.3s ease both' }}>
              <div
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)setFile(f);}}
                onClick={()=>document.getElementById('fileInput').click()}
                style={{ border:`2px dashed ${dragOver?'#E87722':file?'#10b981':'rgba(44,123,229,0.2)'}`, borderRadius:'12px', padding:'30px 24px', textAlign:'center', cursor:'pointer', background:dragOver?'rgba(232,119,34,0.04)':file?'rgba(16,185,129,0.04)':'rgba(27,75,154,0.03)', transition:'all 0.2s', marginBottom:'14px' }}
              >
                <input id="fileInput" type="file" accept=".csv,.txt,.xlsx" style={{ display:'none' }} onChange={e=>setFile(e.target.files[0])} />
                <div style={{ fontSize:'24px', marginBottom:'8px' }}>{file?'✅':'📂'}</div>
                {file
                  ? <><p style={{ color:'#10b981', fontWeight:'600', fontSize:'13px' }}>{file.name}</p><p style={{ color:'#607CA8', fontSize:'11px', marginTop:'3px' }}>{(file.size/1024).toFixed(1)} KB · Cliquez pour changer</p></>
                  : <><p style={{ color:'#607CA8', fontSize:'13px', fontWeight:'500' }}>Glissez un fichier ou cliquez pour parcourir</p><p style={{ color:'#2E4A72', fontSize:'11px', marginTop:'4px' }}>CSV · TXT · XLSX</p></>
                }
              </div>
              {file && (file.name.endsWith('.csv')||file.name.endsWith('.txt')) && (
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                  <span style={labelStyle}>Séparateur</span>
                  {[';',',','|','\t'].map(s=>(
                    <button key={s} onClick={()=>setSeparator(s)} style={{ padding:'5px 12px', borderRadius:'7px', border:`1px solid ${separator===s?'rgba(232,119,34,0.5)':'rgba(44,123,229,0.1)'}`, background:separator===s?'rgba(232,119,34,0.1)':'transparent', color:separator===s?'#FFA94D':'#607CA8', fontFamily:'monospace', fontSize:'13px', cursor:'pointer' }}>
                      {s==='\t'?'TAB':s}
                    </button>
                  ))}
                </div>
              )}
              {message && <div style={{ marginBottom:'12px' }}><Alert type={message.type} text={message.text} /></div>}
              <Btn onClick={handleFileAction} loading={isProcessing} disabled={!file||isProcessing}>
                {isProcessing?'Analyse…':'⚡ Analyser le fichier'}
              </Btn>
            </div>
          )}

          {sourceType==='postgresql' && <PgConnector key="pg" onLoaded={handleDbLoaded} />}
          {sourceType==='databricks' && <DatabricksConnector key="dbx" onLoaded={handleDbLoaded} />}
        </div>

        {/* DataTable */}
        {columns.length>0 && allRows.length>0 && (
          <div style={{ ...card, padding:'24px 28px', animation:'fadeSlideUp 0.4s ease both' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                  <h3 style={{ fontSize:'15px', fontWeight:'700', color:'#f0f4ff' }}>Données chargées</h3>
                  <span style={{ fontSize:'10px', padding:'2px 9px', borderRadius:'20px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#6ee7b7', fontWeight:'600' }}>PRÊT</span>
                </div>
                <p style={{ fontSize:'11.5px', color:'#607CA8' }}>{allRows.length.toLocaleString('fr-FR')} lignes · {columns.length} colonnes</p>
              </div>
              <button onClick={()=>setIsValidated(true)} style={{ padding:'10px 20px', background:'linear-gradient(135deg,#2C7BE5,#1A6BC5)', border:'none', borderRadius:'10px', color:'white', fontFamily:'inherit', fontSize:'13px', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 16px rgba(44,123,229,0.25)', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'7px' }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
              >Configurer le clustering →</button>
            </div>
            <DataTable columns={columns} allRows={allRows} />
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder{color:#2E4A72}
        select option{background:#060E22;color:#e2e8f0}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#0E1F3E;border-radius:3px}
      `}</style>
    </div>
  );
}

export default AdminImport;