import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

const PALETTE = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
const getColor = (i) => PALETTE[i % PALETTE.length];

const glass = {
  background: 'rgba(15,20,35,0.85)',
  border: '1px solid rgba(99,102,241,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
};

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(13,18,36,0.97)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'10px', padding:'10px 14px', fontSize:'12px', color:'#e2e8f0', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
      {label && <p style={{ color:'#a5b4fc', fontWeight:'600', marginBottom:'4px' }}>{label}</p>}
      {payload.map((p,i) => (
        <p key={i} style={{ color: p.color||'#94a3b8' }}>
          {p.name} : <strong>{typeof p.value==='number' ? p.value.toLocaleString('fr-FR') : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function KpiCard({ label, value, unit, icon, color, delay }) {
  return (
    <div style={{ ...glass, padding:'22px 24px', flex:1, minWidth:'150px', animation:`fadeSlideUp 0.5s ${delay}s ease both`, opacity:0, borderLeft:`3px solid ${color}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <span style={{ fontSize:'10px', fontWeight:'600', color:'#475569', textTransform:'uppercase', letterSpacing:'0.8px' }}>{label}</span>
        <span style={{ fontSize:'16px', width:'32px', height:'32px', borderRadius:'8px', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</span>
      </div>
      <p style={{ fontSize:'24px', fontWeight:'800', color:'#f1f5f9', letterSpacing:'-1px', lineHeight:1 }}>{value ?? '—'}</p>
      {unit && <p style={{ fontSize:'10px', color:'#475569', marginTop:'4px' }}>{unit}</p>}
    </div>
  );
}

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
  if (pct < 5) return null;
  const R = Math.PI/180, r = innerRadius+(outerRadius-innerRadius)*0.5;
  return <text x={cx+r*Math.cos(-midAngle*R)} y={cy+r*Math.sin(-midAngle*R)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{pct}%</text>;
};

function Dashboard({ onNavigatePareto }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/api/analytics/global')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.error || e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(99,102,241,0.2)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#475569', fontSize:'13px' }}>Chargement des analytics…</p>
    </div>
  );

  if (error) return (
    <div style={{ padding:'60px', textAlign:'center' }}>
      <p style={{ color:'#fca5a5', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', padding:'16px 24px', borderRadius:'10px', display:'inline-block', fontSize:'13px' }}>✕ {error}</p>
    </div>
  );

  const { kpis, segments, scatter, detected } = data;
  const colorMap = {};
  segments.forEach((s,i) => { colorMap[s.name] = getColor(i); });

  const scatterBySeg = {};
  scatter.forEach(pt => {
    if (!scatterBySeg[pt.segment]) scatterBySeg[pt.segment] = [];
    scatterBySeg[pt.segment].push(pt);
  });

  const fmt = (n) => n != null ? n.toLocaleString('fr-FR') : '—';
  const sortedBars = [...segments].sort((a,b) => (b.totalAmount||b.count)-(a.totalAmount||a.count));

  return (
    <div style={{ padding:'32px 40px 60px', maxWidth:'1180px', margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px', animation:'fadeSlideUp 0.4s ease both' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'white', fontWeight:'700' }}>3</div>
            <h2 style={{ fontSize:'20px', fontWeight:'800', color:'#f1f5f9', letterSpacing:'-0.5px' }}>Dashboard Global</h2>
          </div>
          <p style={{ fontSize:'12px', color:'#475569', marginLeft:'38px' }}>
            {kpis.totalClients.toLocaleString('fr-FR')} clients · {kpis.segmentCount} segments détectés
          </p>
        </div>
        <button onClick={onNavigatePareto} style={{
          padding:'10px 20px', background:'linear-gradient(135deg,#06b6d4,#0891b2)',
          border:'none', borderRadius:'10px', color:'white', fontFamily:'inherit',
          fontSize:'13px', fontWeight:'600', cursor:'pointer',
          boxShadow:'0 4px 20px rgba(6,182,212,0.3)', transition:'all 0.2s',
          display:'flex', alignItems:'center', gap:'8px',
        }}
          onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
        >
          Analyse Pareto →
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
        <KpiCard label="Total clients"   value={fmt(kpis.totalClients)}  unit="abonnés"           icon="👥" color="#6366f1" delay={0.05} />
        <KpiCard label="CA total"        value={fmt(kpis.totalAmount)}   unit="MAD"               icon="💰" color="#10b981" delay={0.1}  />
        <KpiCard label="Montant moyen"   value={fmt(kpis.avgAmount)}     unit="MAD / client"      icon="📈" color="#06b6d4" delay={0.15} />
        <KpiCard label="Récence moy."    value={fmt(kpis.avgRecency)}    unit="jours"             icon="🕐" color="#f59e0b" delay={0.2}  />
        <KpiCard label="Fréquence moy."  value={fmt(kpis.avgFrequency)}  unit="transactions"      icon="🔄" color="#8b5cf6" delay={0.25} />
      </div>

      {/* Donut + Barres */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:'14px', marginBottom:'14px' }}>

        <div style={{ ...glass, padding:'24px', animation:'fadeSlideUp 0.5s 0.3s ease both', opacity:0 }}>
          <p style={{ fontSize:'13px', fontWeight:'700', color:'#e2e8f0', marginBottom:'2px' }}>Répartition des clients</p>
          <p style={{ fontSize:'11px', color:'#475569', marginBottom:'14px' }}>Part de chaque segment dans le portefeuille</p>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={segments} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} labelLine={false} label={renderLabel}>
                {segments.map((s,i) => <Cell key={s.name} fill={getColor(i)} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
              <Legend formatter={v=><span style={{ fontSize:'11px', color:'#94a3b8' }}>{v}</span>} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...glass, padding:'24px', animation:'fadeSlideUp 0.5s 0.35s ease both', opacity:0 }}>
          <p style={{ fontSize:'13px', fontWeight:'700', color:'#e2e8f0', marginBottom:'2px' }}>
            {detected.amount ? 'Contribution au CA par segment' : 'Volume clients par segment'}
          </p>
          <p style={{ fontSize:'11px', color:'#475569', marginBottom:'14px' }}>
            {detected.amount ? 'Montant total cumulé (MAD) — trié par valeur décroissante' : 'Nombre de clients par segment'}
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={sortedBars} layout="vertical" margin={{ left:8, right:24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill:'#475569', fontSize:10 }} tickFormatter={v=>v.toLocaleString('fr-FR')} />
              <YAxis type="category" dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} width={82} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey={detected.amount?'totalAmount':'count'} name={detected.amount?'Montant (MAD)':'Clients'} radius={[0,6,6,0]}>
                {sortedBars.map((s,i) => <Cell key={s.name} fill={colorMap[s.name]||getColor(i)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter RFM */}
      {detected.recency && detected.amount && (
        <div style={{ ...glass, padding:'24px', animation:'fadeSlideUp 0.5s 0.4s ease both', opacity:0 }}>
          <p style={{ fontSize:'13px', fontWeight:'700', color:'#e2e8f0', marginBottom:'2px' }}>Nuage de points — Espace RFM</p>
          <p style={{ fontSize:'11px', color:'#475569', marginBottom:'14px' }}>
            Récence (axe X) × Montant (axe Y) · taille des points = fréquence · {scatter.length} pts affichés
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top:10, right:30, bottom:30, left:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" dataKey="x" name="Récence"
                label={{ value:`Récence (jours)`, position:'insideBottom', offset:-12, fill:'#475569', fontSize:11 }}
                tick={{ fill:'#475569', fontSize:10 }} />
              <YAxis type="number" dataKey="y" name="Montant"
                label={{ value:'Montant (MAD)', angle:-90, position:'insideLeft', fill:'#475569', fontSize:11 }}
                tick={{ fill:'#475569', fontSize:10 }} />
              <ZAxis type="number" dataKey="z" range={[18,110]} />
              <Tooltip cursor={{ strokeDasharray:'3 3', stroke:'rgba(99,102,241,0.3)' }}
                content={({ active, payload }) => {
                  if (!active||!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background:'rgba(13,18,36,0.97)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'8px', padding:'8px 12px', fontSize:'11px', color:'#e2e8f0' }}>
                      <p style={{ color:colorMap[d?.segment]||'#6366f1', fontWeight:'700', marginBottom:'4px' }}>{d?.segment}</p>
                      <p>Récence : {d?.x} j</p>
                      <p>Montant : {d?.y?.toLocaleString('fr-FR')} MAD</p>
                      <p>Fréquence : {d?.z}</p>
                    </div>
                  );
                }} />
              {Object.entries(scatterBySeg).map(([seg,pts],i) => (
                <Scatter key={seg} name={seg} data={pts} fill={colorMap[seg]||getColor(i)} fillOpacity={0.65} />
              ))}
              <Legend formatter={v=><span style={{ fontSize:'11px', color:'#94a3b8' }}>{v}</span>} iconType="circle" iconSize={8} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

export default Dashboard;