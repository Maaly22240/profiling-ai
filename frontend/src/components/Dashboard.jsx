import { useEffect, useState, useRef } from 'react';
import api from '../api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import DataTable    from './DataTable';
import ExportButton from './ExportButton';
import MapChart     from './MapChart';

const PALETTE = ['#E87722','#2C7BE5','#10b981','#f59e0b','#ef4444','#1B4B9A','#E84393','#14b8a6'];
const getColor = i => PALETTE[i % PALETTE.length];

const glass = {
  background: 'rgba(6,14,36,0.88)',
  border: '1px solid rgba(44,123,229,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(27,75,154,0.08)',
};

// ─────────────────────────────────────────────────────────────────────────────
// FORMATAGE INTELLIGENT DES NOMBRES
// ─────────────────────────────────────────────────────────────────────────────
function fmtNum(value, unit = '') {
  if (value == null || isNaN(value)) return '—';
  const n = Number(value);
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} Md`;
  if (Math.abs(n) >= 1_000_000)     return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  if (Math.abs(n) >= 1_000)         return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')} K`;
  return n.toLocaleString('fr-FR');
}

// ─────────────────────────────────────────────────────────────────────────────
// LABELS PAR DÉFAUT (persistés dans localStorage)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_LABELS = {
  // KPI cards
  kpi_clients:   'Total clients',
  kpi_ca:        'CA total',
  kpi_avg:       'Montant moyen',
  kpi_recency:   'Récence moy.',
  kpi_frequency: 'Fréquence moy.',
  // Graphes
  chart_donut:   'Répartition des clients',
  chart_distrib: 'Distribution par segment',
  chart_bars:    'Contribution au CA par segment',
  chart_scatter: 'Nuage de points',
  chart_map:     'Distribution géographique — Maroc',
  chart_table:   'Données importées',
  // Unités KPI
  unit_clients:   'abonnés',
  unit_ca:        'MAD',
  unit_avg:       'MAD / client',
  unit_recency:   'jours',
  unit_frequency: 'transactions',
};

function loadLabels() {
  try {
    const saved = localStorage.getItem('profiling_labels');
    return saved ? { ...DEFAULT_LABELS, ...JSON.parse(saved) } : { ...DEFAULT_LABELS };
  } catch { return { ...DEFAULT_LABELS }; }
}

function saveLabels(labels) {
  try { localStorage.setItem('profiling_labels', JSON.stringify(labels)); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAMP ÉDITABLE — double-clic pour modifier
// ─────────────────────────────────────────────────────────────────────────────
function EditableLabel({ value, labelKey, editMode, onSave, style = {}, inputStyle = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  if (!editMode) return <span style={style}>{value}</span>;

  if (editing) return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onSave(labelKey, draft); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Enter') { onSave(labelKey, draft); setEditing(false); } if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
      style={{
        background: 'rgba(232,119,34,0.08)', border: '1px solid rgba(232,119,34,0.4)',
        borderRadius: '5px', color: '#FFA94D', fontFamily: 'inherit',
        fontSize: 'inherit', fontWeight: 'inherit', letterSpacing: 'inherit',
        padding: '1px 6px', outline: 'none', width: 'auto', minWidth: '80px',
        ...inputStyle,
      }}
    />
  );

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      title="Double-clic pour modifier"
      style={{
        ...style,
        cursor: 'text',
        borderBottom: '1px dashed rgba(232,119,34,0.4)',
        paddingBottom: '1px',
        transition: 'all 0.15s',
      }}
    >{value}</span>
  );
}

// ── Tooltip recharts ──────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(4,9,26,0.97)', border:'1px solid rgba(232,119,34,0.25)', borderRadius:'10px', padding:'10px 14px', fontSize:'12px', color:'#e2e8f0', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
      {label && <p style={{ color:'#FFA94D', fontWeight:'600', marginBottom:'4px' }}>{label}</p>}
      {payload.map((p,i) => <p key={i} style={{ color:p.color||'#94a3b8' }}>{p.name} : <strong>{typeof p.value==='number'?fmtNum(p.value):p.value}</strong></p>)}
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ labelKey, value, rawValue, unit, unitKey, icon, color, delay, editMode, onSave, labels }) {
  return (
    <div style={{ ...glass, padding:'20px 22px', flex:1, minWidth:'140px', animation:`fadeSlideUp 0.5s ${delay}s ease both`, borderLeft:`3px solid ${color}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <EditableLabel value={labels[labelKey]} labelKey={labelKey} editMode={editMode} onSave={onSave}
          style={{ fontSize:'10px', fontWeight:'600', color:'#607CA8', textTransform:'uppercase', letterSpacing:'0.7px' }}
        />
        <span style={{ fontSize:'15px', width:'30px', height:'30px', borderRadius:'7px', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</span>
      </div>
      <p style={{ fontSize:'22px', fontWeight:'800', color:'#f0f4ff', letterSpacing:'-0.8px', lineHeight:1 }} title={rawValue?.toLocaleString('fr-FR')}>
        {value}
      </p>
      <EditableLabel value={labels[unitKey]} labelKey={unitKey} editMode={editMode} onSave={onSave}
        style={{ fontSize:'10px', color:'#607CA8', marginTop:'3px' }}
      />
    </div>
  );
}

// ── Donut label ───────────────────────────────────────────────────────────────
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
  if (pct < 5) return null;
  const R = Math.PI/180, r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return <text x={cx+r*Math.cos(-midAngle*R)} y={cy+r*Math.sin(-midAngle*R)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{pct}%</text>;
};

// ── Distribution barre ────────────────────────────────────────────────────────
function SegmentDistribution({ segments, colorMap }) {
  const max = Math.max(...segments.map(s => s.count));
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      {[...segments].sort((a,b) => b.count-a.count).map((s,i) => {
        const color = colorMap[s.name] || getColor(i);
        return (
          <div key={s.name}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:color, flexShrink:0 }}/>
                <span style={{ fontSize:'12.5px', color:'#e2e8f0', fontWeight:'500' }}>{s.name}</span>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <span style={{ fontSize:'11.5px', color:'#607CA8', fontFamily:"'DM Mono',monospace" }}>{fmtNum(s.count)}</span>
                <span style={{ fontSize:'11.5px', color, fontWeight:'700', minWidth:'38px', textAlign:'right' }}>{s.pct}%</span>
              </div>
            </div>
            <div style={{ height:'6px', borderRadius:'3px', background:'rgba(44,123,229,0.08)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(s.count/max)*100}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:'3px', transition:'width 0.8s ease' }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
function Dropdown({ value, onChange, options, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      {label && <span style={{ fontSize:'11px', color:'#607CA8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{label}</span>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding:'7px 28px 7px 12px', background:'rgba(27,75,154,0.08)',
        border:'1px solid rgba(44,123,229,0.25)', borderRadius:'8px',
        color:'#e2e8f0', fontFamily:'inherit', fontSize:'12.5px',
        outline:'none', cursor:'pointer', appearance:'none',
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23607CA8'/%3E%3C/svg%3E")`,
        backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Section title éditable ─────────────────────────────────────────────────────
function SectionTitle({ labelKey, subKey, sub, labels, editMode, onSave }) {
  return (
    <div style={{ marginBottom:'2px' }}>
      <EditableLabel value={labels[labelKey]} labelKey={labelKey} editMode={editMode} onSave={onSave}
        style={{ fontSize:'13px', fontWeight:'700', color:'#e2e8f0', display:'block' }}
      />
      {sub !== undefined && (
        <p style={{ fontSize:'11px', color:'#607CA8', marginTop:'2px' }}>{sub}</p>
      )}
    </div>
  );
}

// ── Bubble Chart ──────────────────────────────────────────────────────────────
function BubbleChart({ scatter, colorMap, detected, xAxis }) {
  const xKey = xAxis || detected.recency || '';
  const byS  = {};
  const zVals = scatter.map(pt => pt.z || 1).filter(v => v > 0);
  const zMin  = Math.min(...zVals) || 1;
  const zMax  = Math.max(...zVals) || 1;
  const normZ = zMax === zMin ? () => 40 : z => 12 + ((z - zMin) / (zMax - zMin)) * 60;

  scatter.forEach(pt => {
    const s = pt.segment || 'N/A';
    if (!byS[s]) byS[s] = [];
    byS[s].push({ ...pt, x: xKey ? (pt[xKey] ?? 0) : 0, bSize: normZ(pt.z || 1) });
  });

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top:20, right:30, bottom:40, left:20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,123,229,0.06)" />
        <XAxis type="number" dataKey="x" name={xKey}
          label={{ value:xKey, position:'insideBottom', offset:-14, fill:'#607CA8', fontSize:11 }}
          tick={{ fill:'#607CA8', fontSize:10 }}
          tickFormatter={v => fmtNum(v)}
        />
        <YAxis type="number" dataKey="y" name={detected.amount}
          label={{ value:`${detected.amount} (MAD)`, angle:-90, position:'insideLeft', offset:10, fill:'#607CA8', fontSize:11 }}
          tick={{ fill:'#607CA8', fontSize:10 }}
          tickFormatter={v => fmtNum(v)}
        />
        <ZAxis type="number" dataKey="bSize" range={[30, 400]} />
        <Tooltip cursor={{ strokeDasharray:'4 4', stroke:'rgba(232,119,34,0.2)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            const color = colorMap[d?.segment] || '#E87722';
            return (
              <div style={{ background:'rgba(4,9,26,0.97)', border:`1px solid ${color}40`, borderRadius:'10px', padding:'10px 14px', fontSize:'11.5px', color:'#e2e8f0', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
                <p style={{ color, fontWeight:'700', marginBottom:'6px', fontSize:'12px' }}>{d?.segment}</p>
                <p style={{ color:'#94a3b8' }}>{xKey} : <strong style={{ color:'#e2e8f0' }}>{fmtNum(d?.x)}</strong></p>
                <p style={{ color:'#94a3b8' }}>Montant : <strong style={{ color:'#FFA94D' }}>{fmtNum(d?.y)} MAD</strong></p>
                {detected.frequency && <p style={{ color:'#94a3b8' }}>Fréquence : <strong style={{ color:'#e2e8f0' }}>{d?.z}</strong></p>}
              </div>
            );
          }}
        />
        {Object.entries(byS).map(([seg, pts], i) => {
          const color = colorMap[seg] || getColor(i);
          return <Scatter key={seg} name={seg} data={pts} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1} strokeOpacity={0.8} />;
        })}
        <Legend formatter={v => <span style={{ fontSize:'11px', color:'#94a3b8' }}>{v}</span>} iconType="circle" iconSize={10} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ── Scatter 3D ────────────────────────────────────────────────────────────────
function Scatter3D({ scatter, colorMap, detected, xAxis }) {
  const ref   = useRef(null);
  const [err, setErr]   = useState('');
  const [ready, setReady] = useState(false);
  const xKey = xAxis || detected.recency || '';

  useEffect(() => {
    if (window.Plotly) { renderPlot(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.plot.ly/plotly-2.26.0.min.js';
    s.onload = () => { setReady(true); renderPlot(); };
    s.onerror = () => setErr('Impossible de charger Plotly.');
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch {} };
  }, []);

  useEffect(() => { if (window.Plotly && scatter.length > 0) renderPlot(); }, [scatter, ready, xAxis]);

  const renderPlot = () => {
    if (!ref.current || !window.Plotly) return;
    const byS = {};
    scatter.forEach(pt => {
      const s = pt.segment || 'N/A';
      if (!byS[s]) byS[s] = { x:[], y:[], z:[], text:[] };
      const xv = xKey ? (pt[xKey] ?? 0) : 0;
      byS[s].x.push(xv);
      byS[s].y.push(pt.y);
      byS[s].z.push(pt.z || 1);
      byS[s].text.push(`${s}<br>${xKey}: ${fmtNum(xv)}<br>Montant: ${fmtNum(pt.y)} MAD`);
    });
    const traces = Object.entries(byS).map(([seg, d], i) => ({
      type:'scatter3d', mode:'markers', name:seg,
      x:d.x, y:d.y, z:d.z, text:d.text, hoverinfo:'text',
      marker:{ size:4, color:colorMap[seg]||getColor(i), opacity:0.7, line:{ width:0 } },
    }));
    const layout = {
      paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
      scene:{
        xaxis:{ title:{ text:xKey||'X', font:{ color:'#607CA8', size:10 } }, gridcolor:'rgba(44,123,229,0.08)', tickfont:{ color:'#607CA8', size:9 } },
        yaxis:{ title:{ text:detected.amount||'Montant', font:{ color:'#607CA8', size:10 } }, gridcolor:'rgba(44,123,229,0.08)', tickfont:{ color:'#607CA8', size:9 } },
        zaxis:{ title:{ text:detected.frequency||'Fréquence', font:{ color:'#607CA8', size:10 } }, gridcolor:'rgba(44,123,229,0.08)', tickfont:{ color:'#607CA8', size:9 } },
        bgcolor:'rgba(4,9,26,0.6)',
      },
      legend:{ font:{ color:'#94a3b8', size:11 }, bgcolor:'rgba(0,0,0,0)', bordercolor:'rgba(44,123,229,0.2)', borderwidth:1 },
      margin:{ l:0, r:0, t:10, b:0 },
    };
    window.Plotly.react(ref.current, traces, layout, { responsive:true, displayModeBar:false });
  };

  if (err) return <p style={{ color:'#fca5a5', padding:'20px', fontSize:'12px' }}>{err}</p>;
  if (!ready && !window.Plotly) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'300px', gap:'12px' }}>
      <div style={{ width:'24px', height:'24px', border:'2px solid rgba(232,119,34,0.2)', borderTopColor:'#E87722', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <span style={{ color:'#607CA8', fontSize:'12px' }}>Chargement moteur 3D…</span>
    </div>
  );
  return <div ref={ref} style={{ width:'100%', height:'360px' }}/>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PANNEAU ADMIN — édition des labels
// ─────────────────────────────────────────────────────────────────────────────
function AdminLabelPanel({ labels, onSave, onReset, onClose }) {
  const groups = [
    {
      title: 'Indicateurs KPI', keys: [
        { key:'kpi_clients',   label:'KPI — Clients' },
        { key:'kpi_ca',        label:'KPI — CA' },
        { key:'kpi_avg',       label:'KPI — Montant moyen' },
        { key:'kpi_recency',   label:'KPI — Récence' },
        { key:'kpi_frequency', label:'KPI — Fréquence' },
        { key:'unit_clients',  label:'Unité — Clients' },
        { key:'unit_ca',       label:'Unité — CA' },
        { key:'unit_avg',      label:'Unité — Montant moy.' },
        { key:'unit_recency',  label:'Unité — Récence' },
        { key:'unit_frequency',label:'Unité — Fréquence' },
      ]
    },
    {
      title: 'Titres des graphiques', keys: [
        { key:'chart_donut',   label:'Titre — Donut' },
        { key:'chart_distrib', label:'Titre — Distribution' },
        { key:'chart_bars',    label:'Titre — Barres CA' },
        { key:'chart_scatter', label:'Titre — Nuage de points' },
        { key:'chart_map',     label:'Titre — Carte' },
        { key:'chart_table',   label:'Titre — Table données' },
      ]
    },
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ ...glass, width:'100%', maxWidth:'680px', maxHeight:'85vh', display:'flex', flexDirection:'column', animation:'fadeSlideUp 0.3s ease both' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(44,123,229,0.12)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h3 style={{ fontSize:'16px', fontWeight:'700', color:'#f0f4ff', marginBottom:'3px' }}>⚙️ Personnalisation des labels</h3>
            <p style={{ fontSize:'11.5px', color:'#607CA8' }}>Modifiez les noms des indicateurs et titres des graphiques</p>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={onReset} style={{ padding:'7px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px', color:'#fca5a5', fontFamily:'inherit', fontSize:'12px', cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.08)'}
            >↺ Réinitialiser</button>
            <button onClick={onClose} style={{ padding:'7px 14px', background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:'8px', color:'white', fontFamily:'inherit', fontSize:'12px', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 12px rgba(16,185,129,0.3)' }}>
              ✓ Fermer
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', padding:'20px 24px', flex:1 }}>
          {groups.map(group => (
            <div key={group.title} style={{ marginBottom:'24px' }}>
              <p style={{ fontSize:'11px', fontWeight:'600', color:'#607CA8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid rgba(44,123,229,0.08)' }}>
                {group.title}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {group.keys.map(({ key, label }) => (
                  <div key={key}>
                    <p style={{ fontSize:'10.5px', color:'#4A6A96', marginBottom:'4px' }}>{label}</p>
                    <input
                      value={labels[key] || ''}
                      onChange={e => onSave(key, e.target.value)}
                      style={{
                        width:'100%', padding:'8px 11px',
                        background:'rgba(27,75,154,0.08)',
                        border:'1px solid rgba(44,123,229,0.2)',
                        borderRadius:'7px', color:'#e2e8f0',
                        fontFamily:'inherit', fontSize:'12.5px',
                        outline:'none', boxSizing:'border-box', transition:'border-color 0.2s',
                      }}
                      onFocus={e=>e.target.style.borderColor='rgba(232,119,34,0.5)'}
                      onBlur={e=>e.target.style.borderColor='rgba(44,123,229,0.2)'}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding:'12px 24px', borderTop:'1px solid rgba(44,123,229,0.1)', flexShrink:0 }}>
          <p style={{ fontSize:'11px', color:'#2E4A72' }}>💡 Les modifications sont sauvegardées automatiquement dans votre navigateur.</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ onNavigatePareto, importedColumns=[], importedRows=[] }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [vizMode,    setVizMode]    = useState('bubble');
  const [xAxis,      setXAxis]      = useState(null);
  const [editMode,   setEditMode]   = useState(false);
  const [showPanel,  setShowPanel]  = useState(false);
  const [labels,     setLabels]     = useState(loadLabels);

  const handleQuickSegment = async (col) => {
    try {
      await api.post('/api/clustering/config', { mode:'existing', targetColumn:col });
      setLoading(true);
      const r = await api.get('/api/analytics/global');
      setData(r.data);
      if (r.data.detected?.recency && !xAxis) setXAxis(r.data.detected.recency);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSaveLabel = (key, value) => {
    setLabels(prev => {
      const next = { ...prev, [key]: value };
      saveLabels(next);
      return next;
    });
  };

  const handleResetLabels = () => {
    setLabels({ ...DEFAULT_LABELS });
    saveLabels({ ...DEFAULT_LABELS });
  };

  useEffect(() => {
    api.get('/api/analytics/global')
      .then(r => {
        setData(r.data);
        setLoading(false);
        if (!xAxis && r.data.detected?.recency) setXAxis(r.data.detected.recency);
      })
      .catch(e => { setError(e.response?.data?.error || e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(232,119,34,0.2)', borderTopColor:'#E87722', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ color:'#607CA8', fontSize:'13px' }}>Chargement des analytics…</p>
    </div>
  );

  if (!data || data.empty) {
    const reason = data?.reason;
    const cols   = data?.columns || [];
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh', flexDirection:'column', gap:'20px', padding:'40px', textAlign:'center' }}>
        <div style={{ width:'64px', height:'64px', borderRadius:'16px', background:'rgba(232,119,34,0.1)', border:'1px solid rgba(232,119,34,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px' }}>
          {reason === 'no_segment' ? '🏷️' : '📂'}
        </div>
        <div>
          <h2 style={{ fontSize:'18px', fontWeight:'700', color:'#f0f4ff', marginBottom:'8px' }}>
            {reason === 'no_segment' ? 'Colonne de segments introuvable' : 'Aucune donnée disponible'}
          </h2>
          <p style={{ fontSize:'13px', color:'#607CA8', maxWidth:'480px', lineHeight:'1.7', margin:'0 auto' }}>
            {reason === 'no_segment'
              ? <>Les données sont chargées ({cols.length} colonnes). Cliquez sur une colonne pour l'utiliser comme segment.</>
              : <>Placez un fichier dans <code style={{ color:'#FFA94D', fontFamily:'monospace', background:'rgba(232,119,34,0.08)', padding:'1px 7px', borderRadius:'4px' }}>backend/data/</code></>
            }
          </p>
        </div>
        {reason === 'no_segment' && cols.length > 0 && (
          <div style={{ padding:'14px 20px', background:'rgba(27,75,154,0.06)', border:'1px solid rgba(44,123,229,0.15)', borderRadius:'10px', maxWidth:'420px', width:'100%' }}>
            <p style={{ fontSize:'11px', color:'#607CA8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px' }}>Colonnes disponibles</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {cols.map(col => (
                <button key={col} onClick={() => handleQuickSegment(col)}
                  style={{ padding:'5px 12px', borderRadius:'7px', background:'rgba(44,123,229,0.08)', border:'1px solid rgba(44,123,229,0.15)', color:'#94a3b8', fontFamily:'monospace', fontSize:'11.5px', cursor:'pointer' }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='rgba(232,119,34,0.12)'; e.currentTarget.style.color='#FFA94D'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='rgba(44,123,229,0.08)'; e.currentTarget.style.color='#94a3b8'; }}
                >{col}</button>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => window.location.reload()}
          style={{ padding:'10px 20px', background:'rgba(44,123,229,0.1)', border:'1px solid rgba(44,123,229,0.25)', borderRadius:'9px', color:'#2C7BE5', fontFamily:'inherit', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
          ↺ Rafraîchir
        </button>
      </div>
    );
  }

  if (error) return (
    <div style={{ padding:'60px', textAlign:'center' }}>
      <p style={{ color:'#fca5a5', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', padding:'16px 24px', borderRadius:'10px', display:'inline-block', fontSize:'13px' }}>✕ {error}</p>
    </div>
  );

  const { kpis, segments, scatter, detected, numericColumns, latCol: sLatCol, lngCol: sLngCol } = data;
  const colorMap = {};
  segments.forEach((s,i) => { colorMap[s.name] = getColor(i); });
  const sortedBars = [...segments].sort((a,b) => (b.totalAmount||b.count)-(a.totalAmount||a.count));
  const numCols    = numericColumns || [];
  const xOptions   = numCols.filter(c => c !== detected.amount).map(c => ({ value:c, label:c }));

  return (
    <div style={{ padding:'32px 40px 60px', maxWidth:'1200px', margin:'0 auto' }}>

      {/* Panneau admin */}
      {showPanel && (
        <AdminLabelPanel
          labels={labels}
          onSave={handleSaveLabel}
          onReset={handleResetLabels}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px', animation:'fadeSlideUp 0.4s ease both', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#E87722,#D4620D)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'white' }}>3</div>
            <h2 style={{ fontSize:'20px', fontWeight:'800', color:'#f0f4ff', letterSpacing:'-0.5px' }}>Dashboard Global</h2>
          </div>
          <p style={{ fontSize:'12px', color:'#607CA8', marginLeft:'38px' }}>
            {fmtNum(kpis.totalClients)} clients · {kpis.segmentCount} segments
          </p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>

          {/* Bouton personnaliser (admin) */}
          <button onClick={() => setShowPanel(true)} style={{
            padding:'8px 14px', background:'rgba(232,119,34,0.08)',
            border:'1px solid rgba(232,119,34,0.25)', borderRadius:'9px',
            color:'#FFA94D', fontFamily:'inherit', fontSize:'12px', fontWeight:'600',
            cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'6px',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(232,119,34,0.15)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(232,119,34,0.08)'}
          >
            ⚙️ Personnaliser
          </button>

          <ExportButton label="Exporter" />
          <button onClick={onNavigatePareto} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#2C7BE5,#1A6BC5)', border:'none', borderRadius:'10px', color:'white', fontFamily:'inherit', fontSize:'13px', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 20px rgba(44,123,229,0.3)', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'7px' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
          >Analyse Pareto →</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'flex', gap:'12px', marginBottom:'18px', flexWrap:'wrap' }}>
        <KpiCard labelKey="kpi_clients"   unitKey="unit_clients"   value={fmtNum(kpis.totalClients)}  rawValue={kpis.totalClients}  icon="👥" color="#E87722" delay={0.05} editMode={editMode} onSave={handleSaveLabel} labels={labels}/>
        <KpiCard labelKey="kpi_ca"        unitKey="unit_ca"        value={fmtNum(kpis.totalAmount)}   rawValue={kpis.totalAmount}   icon="💰" color="#10b981" delay={0.1}  editMode={editMode} onSave={handleSaveLabel} labels={labels}/>
        <KpiCard labelKey="kpi_avg"       unitKey="unit_avg"       value={fmtNum(kpis.avgAmount)}     rawValue={kpis.avgAmount}     icon="📈" color="#2C7BE5" delay={0.15} editMode={editMode} onSave={handleSaveLabel} labels={labels}/>
        <KpiCard labelKey="kpi_recency"   unitKey="unit_recency"   value={fmtNum(kpis.avgRecency)}    rawValue={kpis.avgRecency}    icon="🕐" color="#f59e0b" delay={0.2}  editMode={editMode} onSave={handleSaveLabel} labels={labels}/>
        <KpiCard labelKey="kpi_frequency" unitKey="unit_frequency" value={fmtNum(kpis.avgFrequency)}  rawValue={kpis.avgFrequency}  icon="🔄" color="#1B4B9A" delay={0.25} editMode={editMode} onSave={handleSaveLabel} labels={labels}/>
      </div>

      {/* Donut + Distribution */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
        <div style={{ ...glass, padding:'22px', animation:'fadeSlideUp 0.5s 0.3s ease both' }}>
          <SectionTitle labelKey="chart_donut" sub="Part de chaque segment" labels={labels} editMode={editMode} onSave={handleSaveLabel}/>
          <div style={{ marginTop:'14px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={segments} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={88} labelLine={false} label={renderLabel}>
                  {segments.map((s,i) => <Cell key={s.name} fill={getColor(i)} stroke="rgba(0,0,0,0.4)" strokeWidth={2}/>)}
                </Pie>
                <Tooltip content={<DarkTooltip/>}/>
                <Legend formatter={v => <span style={{ fontSize:'11px', color:'#94a3b8' }}>{v}</span>} iconType="circle" iconSize={8}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ ...glass, padding:'22px', animation:'fadeSlideUp 0.5s 0.32s ease both' }}>
          <SectionTitle labelKey="chart_distrib" sub="Clients et pourcentages" labels={labels} editMode={editMode} onSave={handleSaveLabel}/>
          <div style={{ marginTop:'18px' }}>
            <SegmentDistribution segments={segments} colorMap={colorMap}/>
          </div>
        </div>
      </div>

      {/* Barres CA */}
      <div style={{ ...glass, padding:'22px', marginBottom:'14px', animation:'fadeSlideUp 0.5s 0.34s ease both' }}>
        <SectionTitle labelKey="chart_bars"
          sub={detected.amount ? 'Montant total cumulé (MAD)' : 'Nombre de clients'}
          labels={labels} editMode={editMode} onSave={handleSaveLabel}
        />
        <div style={{ marginTop:'14px' }}>
          <ResponsiveContainer width="100%" height={Math.max(180, segments.length*44)}>
            <BarChart data={sortedBars} layout="vertical" margin={{ left:8, right:24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,123,229,0.06)" horizontal={false}/>
              <XAxis type="number" tick={{ fill:'#607CA8', fontSize:10 }} tickFormatter={v => fmtNum(v)}/>
              <YAxis type="category" dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} width={86}/>
              <Tooltip content={<DarkTooltip/>}/>
              <Bar dataKey={detected.amount?'totalAmount':'count'} name={detected.amount?'Montant (MAD)':'Clients'} radius={[0,6,6,0]}>
                {sortedBars.map((s,i) => <Cell key={s.name} fill={colorMap[s.name]||getColor(i)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bubble / 3D */}
      {detected.amount && scatter.length > 0 && (
        <div style={{ ...glass, padding:'22px', marginBottom:'14px', animation:'fadeSlideUp 0.5s 0.38s ease both' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <SectionTitle labelKey="chart_scatter" labels={labels} editMode={editMode} onSave={handleSaveLabel}/>
              <p style={{ fontSize:'11px', color:'#607CA8', marginTop:'2px' }}>
                Y fixe = <strong style={{ color:'#FFA94D' }}>{detected.amount}</strong> · X = <strong style={{ color:'#2C7BE5' }}>{xAxis || detected.recency || '—'}</strong> · <strong style={{ color:'#10b981' }}>{fmtNum(scatter.length)}</strong> points
              </p>
            </div>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
              {xOptions.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                  <span style={{ fontSize:'11px', color:'#607CA8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>Axe X</span>
                  <select value={xAxis || detected.recency || ''} onChange={e => setXAxis(e.target.value)} style={{
                    padding:'7px 24px 7px 10px', background:'rgba(27,75,154,0.08)',
                    border:'1px solid rgba(44,123,229,0.25)', borderRadius:'8px',
                    color:'#e2e8f0', fontFamily:'inherit', fontSize:'12.5px',
                    outline:'none', cursor:'pointer', appearance:'none',
                    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23607CA8'/%3E%3C/svg%3E")`,
                    backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center',
                  }}>
                    {xOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <Dropdown value={vizMode} onChange={setVizMode} label="Vue"
                options={[{value:'bubble',label:'Bubble Chart 2D'},{value:'3d',label:'Scatter 3D (Plotly)'}]}/>
            </div>
          </div>
          {vizMode==='bubble' && <BubbleChart scatter={scatter} colorMap={colorMap} detected={detected} xAxis={xAxis||detected.recency}/>}
          {vizMode==='3d'     && <Scatter3D   scatter={scatter} colorMap={colorMap} detected={detected} xAxis={xAxis||detected.recency}/>}
        </div>
      )}

      {/* Carte */}
      <div style={{ ...glass, padding:'22px', marginBottom:'14px', animation:'fadeSlideUp 0.5s 0.42s ease both' }}>
        <SectionTitle labelKey="chart_map" sub="Localisation des clients · points colorés par segment" labels={labels} editMode={editMode} onSave={handleSaveLabel}/>
        <div style={{ marginTop:'14px' }}>
          <MapChart columns={importedColumns} segmentCol={data.segmentColumn||''} latCol={sLatCol} lngCol={sLngCol}/>
        </div>
      </div>

      {/* DataTable */}
      {/* DataTable — serveur si > 5k lignes, client sinon */}
      <div style={{ ...glass, padding:'22px', animation:'fadeSlideUp 0.5s 0.46s ease both' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <SectionTitle labelKey="chart_table" labels={labels} editMode={editMode} onSave={handleSaveLabel}/>
            {(kpis.totalClients > 0) && (
              <span style={{ fontSize:'10px', padding:'2px 9px', borderRadius:'20px', background:'rgba(44,123,229,0.1)', border:'1px solid rgba(44,123,229,0.2)', color:'#2C7BE5', fontWeight:'600' }}>
                {fmtNum(kpis.totalClients)} lignes
              </span>
            )}
          </div>
          <ExportButton label="Exporter" size="sm"/>
        </div>
        {importedRows.length > 5000 || importedRows.length === 0
          ? <DataTable columns={data.columns||importedColumns} allRows={[]} compact={true} serverMode={true}/>
          : <DataTable columns={importedColumns} allRows={importedRows} compact={true} serverMode={false}/>
        }
      </div>

      <style>{`
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        select option{background:#060E22;color:#e2e8f0}
      `}</style>
    </div>
  );
}

export default Dashboard;