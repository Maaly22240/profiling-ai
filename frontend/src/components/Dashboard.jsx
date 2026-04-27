import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import DataTable from './DataTable';

const PALETTE = ['#E87722','#2C7BE5','#10b981','#f59e0b','#ef4444','#1B4B9A','#E84393','#14b8a6'];
const getColor = i => PALETTE[i % PALETTE.length];

const glass = {
  background: 'rgba(6,14,36,0.88)',
  border: '1px solid rgba(232,119,34,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(27,75,154,0.08)',
};

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(4,9,26,0.97)', border: '1px solid rgba(232,119,34,0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
      {label && <p style={{ color: '#FFA94D', fontWeight: '600', marginBottom: '4px' }}>{label}</p>}
      {payload.map((p, i) => <p key={i} style={{ color: p.color || '#94a3b8' }}>{p.name} : <strong>{typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}</strong></p>)}
    </div>
  );
};

function KpiCard({ label, value, unit, icon, color, delay }) {
  return (
    <div style={{ ...glass, padding: '20px 22px', flex: 1, minWidth: '140px', animation: `fadeSlideUp 0.5s ${delay}s ease both`, opacity: 0, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: '600', color: '#4A6A96', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</span>
        <span style={{ fontSize: '15px', width: '30px', height: '30px', borderRadius: '7px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      </div>
      <p style={{ fontSize: '22px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.8px', lineHeight: 1 }}>{value ?? '—'}</p>
      {unit && <p style={{ fontSize: '10px', color: '#4A6A96', marginTop: '3px' }}>{unit}</p>}
    </div>
  );
}

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
  if (pct < 5) return null;
  const R = Math.PI / 180, r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{pct}%</text>;
};

// ── Sélecteur dropdown générique ─────────────────────────────────────────────
function Dropdown({ value, onChange, options, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {label && <span style={{ fontSize: '11px', color: '#4A6A96', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{label}</span>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding: '7px 28px 7px 12px', background: 'rgba(27,75,154,0.1)',
        border: '1px solid rgba(232,119,34,0.25)', borderRadius: '8px',
        color: '#e2e8f0', fontFamily: 'inherit', fontSize: '12.5px',
        outline: 'none', cursor: 'pointer', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Scatter 2D RFM (recharts) ─────────────────────────────────────────────────
function RFMScatter2D({ scatter, colorMap, detected }) {
  const scatterBySeg = {};
  scatter.forEach(pt => {
    if (!scatterBySeg[pt.segment]) scatterBySeg[pt.segment] = [];
    scatterBySeg[pt.segment].push(pt);
  });
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,75,154,0.08)" />
        <XAxis type="number" dataKey="x" name="Récence"
          label={{ value: `Récence (jours)`, position: 'insideBottom', offset: -12, fill: '#4A6A96', fontSize: 11 }}
          tick={{ fill: '#4A6A96', fontSize: 10 }} />
        <YAxis type="number" dataKey="y" name="Montant"
          label={{ value: 'Montant (MAD)', angle: -90, position: 'insideLeft', fill: '#4A6A96', fontSize: 11 }}
          tick={{ fill: '#4A6A96', fontSize: 10 }} />
        <ZAxis type="number" dataKey="z" range={[18, 110]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0]?.payload;
          return (
            <div style={{ background: 'rgba(4,9,26,0.97)', border: '1px solid rgba(232,119,34,0.25)', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#e2e8f0' }}>
              <p style={{ color: colorMap[d?.segment] || '#E87722', fontWeight: '700', marginBottom: '4px' }}>{d?.segment}</p>
              <p>Récence : {d?.x} j</p>
              <p>Montant : {d?.y?.toLocaleString('fr-FR')} MAD</p>
              <p>Fréquence : {d?.z}</p>
            </div>
          );
        }} />
        {Object.entries(scatterBySeg).map(([seg, pts], i) => (
          <Scatter key={seg} name={seg} data={pts} fill={colorMap[seg] || getColor(i)} fillOpacity={0.65} />
        ))}
        <Legend formatter={v => <span style={{ fontSize: '11px', color: '#94a3b8' }}>{v}</span>} iconType="circle" iconSize={8} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ── Scatter 3D via Plotly (chargement dynamique) ──────────────────────────────
function RFMScatter3D({ scatter, colorMap, segments, detected }) {
  const ref      = useRef(null);
  const [error,  setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Charge Plotly dynamiquement depuis le CDN pour éviter la dépendance npm
    if (window.Plotly) { renderPlot(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.plot.ly/plotly-2.26.0.min.js';
    script.onload  = () => { setLoaded(true); renderPlot(); };
    script.onerror = () => setError('Impossible de charger Plotly (vérifiez votre connexion internet).');
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  useEffect(() => { if (window.Plotly && scatter.length > 0) renderPlot(); }, [scatter, loaded]);

  const renderPlot = () => {
    if (!ref.current || !window.Plotly) return;

    // Grouper par segment
    const bySegment = {};
    scatter.forEach(pt => {
      const s = pt.segment || 'N/A';
      if (!bySegment[s]) bySegment[s] = { x: [], y: [], z: [], text: [] };
      bySegment[s].x.push(pt.x);          // Récence
      bySegment[s].y.push(pt.y);          // Montant
      bySegment[s].z.push(pt.z || 1);     // Fréquence
      bySegment[s].text.push(`${s}<br>Récence: ${pt.x} j<br>Montant: ${pt.y?.toLocaleString('fr-FR')} MAD<br>Fréquence: ${pt.z}`);
    });

    const traces = Object.entries(bySegment).map(([seg, d], i) => ({
      type: 'scatter3d',
      mode: 'markers',
      name: seg,
      x: d.x, y: d.y, z: d.z,
      text: d.text,
      hoverinfo: 'text',
      marker: {
        size: 4,
        color: colorMap[seg] || getColor(i),
        opacity: 0.75,
        line: { width: 0 },
      },
    }));

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor:  'rgba(0,0,0,0)',
      scene: {
        xaxis: { title: { text: detected.recency   || 'Récence',   font: { color: '#607CA8', size: 10 } }, gridcolor: 'rgba(44,123,229,0.12)', zerolinecolor: 'rgba(255,255,255,0.1)', tickfont: { color: '#4A6A96', size: 9 } },
        yaxis: { title: { text: detected.amount    || 'Montant',   font: { color: '#607CA8', size: 10 } }, gridcolor: 'rgba(44,123,229,0.12)', zerolinecolor: 'rgba(255,255,255,0.1)', tickfont: { color: '#4A6A96', size: 9 } },
        zaxis: { title: { text: detected.frequency || 'Fréquence', font: { color: '#607CA8', size: 10 } }, gridcolor: 'rgba(44,123,229,0.12)', zerolinecolor: 'rgba(255,255,255,0.1)', tickfont: { color: '#4A6A96', size: 9 } },
        bgcolor: 'rgba(10,14,26,0.6)',
      },
      legend: { font: { color: '#94a3b8', size: 11 }, bgcolor: 'rgba(0,0,0,0)', bordercolor: 'rgba(232,119,34,0.2)', borderwidth: 1 },
      margin: { l: 0, r: 0, t: 10, b: 0 },
    };

    window.Plotly.react(ref.current, traces, layout, { responsive: true, displayModeBar: false });
  };

  if (error) return <p style={{ color: '#fca5a5', padding: '20px', fontSize: '12px' }}>{error}</p>;
  if (!loaded && !window.Plotly) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px', gap: '12px' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid rgba(232,119,34,0.2)', borderTopColor: '#E87722', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#4A6A96', fontSize: '12px' }}>Chargement du moteur 3D…</span>
    </div>
  );

  return <div ref={ref} style={{ width: '100%', height: '360px' }} />;
}

// ── Distribution par segment (barres horizontales + pourcentages) ─────────────
function SegmentDistribution({ segments, colorMap }) {
  const max = Math.max(...segments.map(s => s.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[...segments].sort((a, b) => b.count - a.count).map((s, i) => {
        const color = colorMap[s.name] || getColor(i);
        const pct   = s.pct;
        return (
          <div key={s.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '12.5px', color: '#e2e8f0', fontWeight: '500' }}>{s.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '11.5px', color: '#607CA8', fontFamily: "'DM Mono',monospace" }}>
                  {s.count.toLocaleString('fr-FR')}
                </span>
                <span style={{ fontSize: '11.5px', color: color, fontWeight: '700', minWidth: '38px', textAlign: 'right' }}>{pct}%</span>
              </div>
            </div>
            <div style={{ height: '7px', borderRadius: '4px', background: 'rgba(27,75,154,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(s.count / max) * 100}%`, background: `linear-gradient(90deg,${color}99,${color})`, borderRadius: '4px', transition: 'width 0.8s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ onNavigatePareto, importedColumns = [], importedRows = [] }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [vizMode, setVizMode] = useState('scatter2d');  // 'scatter2d' | 'scatter3d'

  useEffect(() => {
    axios.get('http://localhost:5000/api/analytics/global')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.error || e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(232,119,34,0.2)', borderTopColor: '#E87722', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#4A6A96', fontSize: '13px' }}>Chargement des analytics…</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <p style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '16px 24px', borderRadius: '10px', display: 'inline-block', fontSize: '13px' }}>✕ {error}</p>
    </div>
  );

  const { kpis, segments, scatter, detected } = data;
  const colorMap = {};
  segments.forEach((s, i) => { colorMap[s.name] = getColor(i); });
  const fmt       = n => n != null ? n.toLocaleString('fr-FR') : '—';
  const sortedBars = [...segments].sort((a, b) => (b.totalAmount || b.count) - (a.totalAmount || a.count));
  const hasRFM    = detected.recency && detected.amount;

  const VIZ_OPTIONS = [
    { value: 'scatter2d', label: '2D — Nuage RFM (recharts)' },
    { value: 'scatter3d', label: '3D — Espace RFM (Plotly)' },
  ];

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', animation: 'fadeSlideUp 0.4s ease both' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#E87722,#1B4B9A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white' }}>3</div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Dashboard Global</h2>
          </div>
          <p style={{ fontSize: '12px', color: '#4A6A96', marginLeft: '38px' }}>
            {kpis.totalClients.toLocaleString('fr-FR')} clients · {kpis.segmentCount} segments
          </p>
        </div>
        <button onClick={onNavigatePareto} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#2C7BE5,#1A6BC5)', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 20px rgba(44,123,229,0.3)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >Analyse Pareto →</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <KpiCard label="Total clients"  value={fmt(kpis.totalClients)}  unit="abonnés"       icon="👥" color="#E87722" delay={0.05} />
        <KpiCard label="CA total"       value={fmt(kpis.totalAmount)}   unit="MAD"           icon="💰" color="#10b981" delay={0.1}  />
        <KpiCard label="Montant moyen"  value={fmt(kpis.avgAmount)}     unit="MAD / client"  icon="📈" color="#2C7BE5" delay={0.15} />
        <KpiCard label="Récence moy."   value={fmt(kpis.avgRecency)}    unit="jours"         icon="🕐" color="#f59e0b" delay={0.2}  />
        <KpiCard label="Fréquence moy." value={fmt(kpis.avgFrequency)}  unit="transactions"  icon="🔄" color="#1B4B9A" delay={0.25} />
      </div>

      {/* Donut + Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

        {/* Donut */}
        <div style={{ ...glass, padding: '22px', animation: 'fadeSlideUp 0.5s 0.3s ease both', opacity: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginBottom: '2px' }}>Répartition des clients</p>
          <p style={{ fontSize: '11px', color: '#4A6A96', marginBottom: '14px' }}>Part de chaque segment dans le portefeuille</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={segments} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={88} labelLine={false} label={renderLabel}>
                {segments.map((s, i) => <Cell key={s.name} fill={getColor(i)} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
              <Legend formatter={v => <span style={{ fontSize: '11px', color: '#94a3b8' }}>{v}</span>} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution */}
        <div style={{ ...glass, padding: '22px', animation: 'fadeSlideUp 0.5s 0.32s ease both', opacity: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginBottom: '2px' }}>Distribution par segment</p>
          <p style={{ fontSize: '11px', color: '#4A6A96', marginBottom: '18px' }}>Répartition détaillée — clients et pourcentages</p>
          <SegmentDistribution segments={segments} colorMap={colorMap} />
        </div>
      </div>

      {/* Barres horizontales CA */}
      <div style={{ ...glass, padding: '22px', marginBottom: '14px', animation: 'fadeSlideUp 0.5s 0.34s ease both', opacity: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginBottom: '2px' }}>
          {detected.amount ? 'Contribution au CA par segment' : 'Volume clients par segment'}
        </p>
        <p style={{ fontSize: '11px', color: '#4A6A96', marginBottom: '14px' }}>
          {detected.amount ? 'Montant total cumulé (MAD) — trié par valeur décroissante' : 'Nombre de clients par segment'}
        </p>
        <ResponsiveContainer width="100%" height={Math.max(180, segments.length * 44)}>
          <BarChart data={sortedBars} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,75,154,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#4A6A96', fontSize: 10 }} tickFormatter={v => v.toLocaleString('fr-FR')} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={86} />
            <Tooltip content={<DarkTooltip />} />
            <Bar dataKey={detected.amount ? 'totalAmount' : 'count'} name={detected.amount ? 'Montant (MAD)' : 'Clients'} radius={[0, 6, 6, 0]}>
              {sortedBars.map((s, i) => <Cell key={s.name} fill={colorMap[s.name] || getColor(i)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Visualisation RFM avec sélecteur dropdown */}
      {hasRFM && (
        <div style={{ ...glass, padding: '22px', marginBottom: '14px', animation: 'fadeSlideUp 0.5s 0.38s ease both', opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginBottom: '2px' }}>Visualisation RFM</p>
              <p style={{ fontSize: '11px', color: '#4A6A96' }}>
                {vizMode === 'scatter2d'
                  ? `Récence × Montant · taille = fréquence · ${scatter.length} pts`
                  : `Espace RFM 3D — Récence / Montant / Fréquence · ${scatter.length} pts`
                }
              </p>
            </div>
            <Dropdown
              value={vizMode}
              onChange={setVizMode}
              options={VIZ_OPTIONS}
              label="Visualisation"
            />
          </div>

          {vizMode === 'scatter2d' && (
            <RFMScatter2D scatter={scatter} colorMap={colorMap} detected={detected} />
          )}
          {vizMode === 'scatter3d' && (
            <RFMScatter3D scatter={scatter} colorMap={colorMap} segments={segments} detected={detected} />
          )}
        </div>
      )}

      {/* DataTable des données importées */}
      {importedColumns.length > 0 && importedRows.length > 0 && (
        <div style={{ ...glass, padding: '22px', animation: 'fadeSlideUp 0.5s 0.42s ease both', opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>Données importées</p>
            <span style={{ fontSize: '10px', padding: '2px 9px', borderRadius: '20px', background: 'rgba(232,119,34,0.1)', border: '1px solid rgba(232,119,34,0.2)', color: '#FFA94D', fontWeight: '600' }}>
              {importedRows.length.toLocaleString('fr-FR')} lignes · {importedColumns.length} colonnes
            </span>
          </div>
          <DataTable columns={importedColumns} allRows={importedRows} compact={true} />
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        select option{background:#060E22;color:#e2e8f0}
      `}</style>
    </div>
  );
}

export default Dashboard;