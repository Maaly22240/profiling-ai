import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import ExportButton from './ExportButton';

const PALETTE = ['#E87722','#2C7BE5','#10b981','#f59e0b','#ef4444','#1B4B9A','#E84393','#14b8a6'];
const getColor = i => PALETTE[i % PALETTE.length];

const glass = {
  background: 'rgba(6,14,36,0.88)',
  border: '1px solid rgba(44,123,229,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(27,75,154,0.08)',
};

const DarkTooltip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:'rgba(4,9,26,0.97)', border:'1px solid rgba(232,119,34,0.25)', borderRadius:'10px', padding:'10px 14px', fontSize:'12px', color:'#e2e8f0', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
      {label && <p style={{ color:'#FFA94D', fontWeight:'600', marginBottom:'6px' }}>{label}</p>}
      {payload.map((p,i) => <p key={i} style={{ color:p.color||'#94a3b8' }}>{p.name} : <strong>{typeof p.value==='number'?p.value.toLocaleString('fr-FR')+(p.unit||''):p.value}</strong></p>)}
    </div>
  );
};

const RISQUE_CLR  = { 'faible':'#10b981','moyen':'#f59e0b','élevé':'#ef4444' };
const RISQUE_ICON = { 'faible':'🟢','moyen':'🟡','élevé':'🔴' };
const PRIO_CLR    = { 'haute':'#ef4444','normale':'#2C7BE5','basse':'#607CA8' };

function InsightCard({ insight, loading, error, onRequest, clusterColor }) {
  if (loading) return (
    <div style={{ ...glass, padding:'24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px', minHeight:'200px' }}>
      <div style={{ width:'36px', height:'36px', border:'3px solid rgba(232,119,34,0.2)', borderTopColor:'#E87722', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#607CA8', fontSize:'13px' }}>Analyse en cours…</p>
    </div>
  );
  if (!insight && !error) return (
    <div style={{ ...glass, padding:'28px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', minHeight:'200px', textAlign:'center' }}>
      <div style={{ fontSize:'32px' }}>✦</div>
      <p style={{ color:'#607CA8', fontSize:'13px', lineHeight:'1.6' }}>Obtenez un insight IA sur ce segment<br/>généré par Claude Sonnet</p>
      <button onClick={onRequest} style={{ padding:'10px 22px', background:'linear-gradient(135deg,#E87722,#D4620D)', border:'none', borderRadius:'10px', color:'white', fontFamily:'inherit', fontSize:'13px', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 20px rgba(232,119,34,0.35)', transition:'all 0.2s' }}
        onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
        onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
      >✦ Générer l'insight IA</button>
    </div>
  );
  if (error) return (
    <div style={{ ...glass, padding:'20px' }}>
      <p style={{ color:'#fca5a5', fontSize:'12px' }}>✕ {error}</p>
      <button onClick={onRequest} style={{ marginTop:'12px', padding:'8px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'8px', color:'#fca5a5', fontFamily:'inherit', fontSize:'12px', cursor:'pointer' }}>Réessayer</button>
    </div>
  );

  return (
    <div style={{ ...glass, padding:'24px', animation:'fadeSlideUp 0.4s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'14px' }}>✦</span>
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#FFA94D' }}>Insight IA</span>
          {insight.source==='claude' && <span style={{ fontSize:'10px', color:'#E87722', background:'rgba(232,119,34,0.1)', padding:'2px 8px', borderRadius:'20px', fontWeight:'600', border:'1px solid rgba(232,119,34,0.25)' }}>Claude</span>}
        </div>
        <div style={{ display:'flex', gap:'6px' }}>
          <span style={{ fontSize:'10px', padding:'3px 10px', borderRadius:'20px', background:`${RISQUE_CLR[insight.risque]||'#607CA8'}15`, color:RISQUE_CLR[insight.risque]||'#94a3b8', fontWeight:'600', border:`1px solid ${RISQUE_CLR[insight.risque]||'#607CA8'}30` }}>
            {RISQUE_ICON[insight.risque]} Risque {insight.risque}
          </span>
          <span style={{ fontSize:'10px', padding:'3px 10px', borderRadius:'20px', background:`${PRIO_CLR[insight.priorite]||'#607CA8'}15`, color:PRIO_CLR[insight.priorite]||'#94a3b8', fontWeight:'600', border:`1px solid ${PRIO_CLR[insight.priorite]||'#607CA8'}30` }}>
            Priorité {insight.priorite}
          </span>
        </div>
      </div>
      <p style={{ fontSize:'13px', color:'#cbd5e1', lineHeight:'1.65', marginBottom:'14px', borderLeft:`3px solid ${clusterColor}`, paddingLeft:'12px' }}>{insight.profil}</p>
      <div style={{ background:'rgba(232,119,34,0.06)', border:'1px solid rgba(232,119,34,0.12)', borderRadius:'8px', padding:'10px 14px', marginBottom:'12px' }}>
        <p style={{ fontSize:'10px', color:'#607CA8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'4px' }}>Caractéristique principale</p>
        <p style={{ fontSize:'12.5px', color:'#e2e8f0' }}>{insight.caracteristique}</p>
      </div>
      <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:'8px', padding:'10px 14px' }}>
        <p style={{ fontSize:'10px', color:'#607CA8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'4px' }}>Action recommandée</p>
        <p style={{ fontSize:'12.5px', color:'#6ee7b7' }}>{insight.action}</p>
      </div>
      <button onClick={onRequest} style={{ marginTop:'14px', padding:'6px 14px', background:'transparent', border:'1px solid rgba(232,119,34,0.2)', borderRadius:'8px', color:'#E87722', fontFamily:'inherit', fontSize:'11px', cursor:'pointer', transition:'all 0.2s' }}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(232,119,34,0.08)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >↺ Régénérer</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ClusterDetail({ onBack }) {
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [activeCluster,  setActiveCluster]  = useState(0);
  const [insights,       setInsights]       = useState({});
  const [insightLoading, setInsightLoading] = useState({});
  const [insightErrors,  setInsightErrors]  = useState({});

  useEffect(() => {
    api.get('http://localhost:5000/api/analytics/clusters')
      .then(r=>{ setData(r.data); setLoading(false); })
      .catch(e=>{ setError(e.response?.data?.error||e.message); setLoading(false); });
  },[]);

  const fetchInsight = useCallback(async (clusterName, stats, allSegments) => {
    setInsightLoading(p=>({...p,[clusterName]:true}));
    setInsightErrors(p=>({...p,[clusterName]:''}));
    try {
      const r = await api.post('http://localhost:5000/api/analytics/insight',{clusterName,stats,allSegments});
      setInsights(p=>({...p,[clusterName]:r.data}));
    } catch(e) {
      setInsightErrors(p=>({...p,[clusterName]:e.response?.data?.error||e.message}));
    } finally {
      setInsightLoading(p=>({...p,[clusterName]:false}));
    }
  },[]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(232,119,34,0.2)', borderTopColor:'#E87722', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#607CA8', fontSize:'13px' }}>Calcul de l'analyse Pareto…</p>
    </div>
  );

  if (error) return (
    <div style={{ padding:'60px', textAlign:'center' }}>
      <p style={{ color:'#fca5a5', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', padding:'16px 24px', borderRadius:'10px', display:'inline-block', fontSize:'13px' }}>✕ {error}</p>
    </div>
  );

  const { pareto, radars, segments, detected } = data;
  const colorMap={};
  segments.forEach((s,i)=>{ colorMap[s.name]=getColor(i); });

  const currentSeg   = segments[activeCluster];
  const currentRadar = radars.find(r=>r.name===currentSeg?.name);
  const vitalCount   = pareto.filter(p=>p.isVital).length;
  const sortKey      = detected.amount?'totalAmount':'count';
  const unitLabel    = detected.amount?'MAD':'clients';
  const fmt          = n=>n!=null?n.toLocaleString('fr-FR'):'—';

  return (
    <div style={{ padding:'32px 40px 60px', maxWidth:'1200px', margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px', animation:'fadeSlideUp 0.4s ease both', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
            <button onClick={onBack} style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(44,123,229,0.08)', border:'1px solid rgba(44,123,229,0.15)', color:'#94a3b8', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(44,123,229,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(44,123,229,0.08)'}
            >←</button>
            <h2 style={{ fontSize:'20px', fontWeight:'800', color:'#f0f4ff', letterSpacing:'-0.5px' }}>Analyse Pareto</h2>
          </div>
          <p style={{ fontSize:'12px', color:'#607CA8', marginLeft:'38px' }}>
            Principe 80/20 — <span style={{ color:'#FFA94D' }}>{vitalCount} segment{vitalCount>1?'s':''} vital{vitalCount>1?'s':''}</span> concentrent 80% du {detected.amount?'CA':'volume'}
          </p>
        </div>

        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <ExportButton label="Exporter les résultats" />
          {/* Badge Pareto */}
          <div style={{ ...glass, padding:'12px 18px', display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:'20px', fontWeight:'800', color:'#E87722', letterSpacing:'-1px' }}>{vitalCount}/{pareto.length}</p>
              <p style={{ fontSize:'10px', color:'#607CA8', textTransform:'uppercase', letterSpacing:'0.5px' }}>Segments vitaux</p>
            </div>
            <div style={{ width:'1px', height:'32px', background:'rgba(44,123,229,0.12)' }} />
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:'20px', fontWeight:'800', color:'#10b981', letterSpacing:'-1px' }}>80%</p>
              <p style={{ fontSize:'10px', color:'#607CA8', textTransform:'uppercase', letterSpacing:'0.5px' }}>Seuil Pareto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pareto Chart */}
      <div style={{ ...glass, padding:'28px', marginBottom:'20px', animation:'fadeSlideUp 0.5s 0.1s ease both', opacity:0 }}>
        <p style={{ fontSize:'13px', fontWeight:'700', color:'#e2e8f0', marginBottom:'2px' }}>
          Diagramme de Pareto — {detected.amount?'Contribution au CA':'Volume clients'}
        </p>
        <p style={{ fontSize:'11px', color:'#607CA8', marginBottom:'18px' }}>
          Segments triés par valeur décroissante · ligne = % cumulé · segments vitaux en couleur (seuil 80%)
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={pareto} margin={{ top:10, right:60, bottom:10, left:10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,123,229,0.06)" />
            <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} />
            <YAxis yAxisId="left"  tick={{ fill:'#607CA8', fontSize:10 }} tickFormatter={v=>v.toLocaleString('fr-FR')} />
            <YAxis yAxisId="right" orientation="right" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{ fill:'#607CA8', fontSize:10 }} />
            <Tooltip content={<DarkTooltip />} />
            <Legend formatter={v=><span style={{ fontSize:'11px', color:'#94a3b8' }}>{v}</span>} />
            <Bar yAxisId="left" dataKey={sortKey} name={detected.amount?`Montant (${unitLabel})`:`Volume (${unitLabel})`} radius={[6,6,0,0]}>
              {pareto.map((p,i)=><Cell key={p.name} fill={p.isVital?(colorMap[p.name]||getColor(i)):'rgba(44,123,229,0.2)'} />)}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="cumulPct" name="% cumulé" stroke="#2C7BE5" strokeWidth={2.5} dot={{ fill:'#2C7BE5', r:4, strokeWidth:0 }} />
            <ReferenceLine yAxisId="right" y={80} stroke="#10b981" strokeDasharray="6 3" strokeWidth={2}
              label={{ value:'Seuil 80%', position:'right', fill:'#6ee7b7', fontSize:11 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'12px' }}>
          {pareto.map((p,i)=>(
            <span key={p.name} style={{ fontSize:'11px', padding:'4px 12px', borderRadius:'20px', background:p.isVital?`${colorMap[p.name]||getColor(i)}18`:'rgba(44,123,229,0.04)', border:`1px solid ${p.isVital?(colorMap[p.name]||getColor(i))+'40':'rgba(44,123,229,0.1)'}`, color:p.isVital?(colorMap[p.name]||getColor(i)):'#2E4A72', fontWeight:p.isVital?'600':'400' }}>
              {p.isVital?'★ ':''}{p.name} · {p.pct}%
            </span>
          ))}
        </div>
      </div>

      {/* Tabs segments */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap', animation:'fadeSlideUp 0.5s 0.2s ease both', opacity:0 }}>
        {segments.map((s,i)=>{
          const isVital=pareto.find(p=>p.name===s.name)?.isVital;
          return (
            <button key={s.name} onClick={()=>setActiveCluster(i)} style={{
              padding:'9px 16px',
              background:activeCluster===i?`${getColor(i)}18`:'rgba(27,75,154,0.06)',
              border:`1px solid ${activeCluster===i?getColor(i)+'55':'rgba(44,123,229,0.1)'}`,
              borderRadius:'10px', color:activeCluster===i?getColor(i):'#607CA8',
              fontFamily:'inherit', fontSize:'13px', fontWeight:activeCluster===i?'700':'400',
              cursor:'pointer', transition:'all 0.2s',
              display:'flex', alignItems:'center', gap:'6px',
            }}>
              {isVital&&<span style={{ fontSize:'10px' }}>★</span>}
              {s.name}
              <span style={{ fontSize:'10px', color:activeCluster===i?getColor(i):'#2E4A72', background:'rgba(44,123,229,0.06)', padding:'2px 7px', borderRadius:'10px' }}>{s.pct}%</span>
            </button>
          );
        })}
      </div>

      {/* Cluster detail — Radar + Insight */}
      {currentSeg && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:'14px', animation:'fadeSlideUp 0.4s ease both' }}>
          {/* Radar */}
          <div style={{ ...glass, padding:'24px' }}>
            <p style={{ fontSize:'13px', fontWeight:'700', color:'#e2e8f0', marginBottom:'2px' }}>
              Profil — <span style={{ color:colorMap[currentSeg.name]||getColor(activeCluster) }}>{currentSeg.name}</span>
            </p>
            <p style={{ fontSize:'11px', color:'#607CA8', marginBottom:'16px' }}>Métriques normalisées (0→100)</p>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={currentRadar?.radar||[]}>
                <PolarGrid stroke="rgba(44,123,229,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill:'#94a3b8', fontSize:11 }} />
                <PolarRadiusAxis domain={[0,100]} tick={{ fill:'#2E4A72', fontSize:9 }} tickCount={4} />
                <Radar name={currentSeg.name} dataKey="value"
                  stroke={colorMap[currentSeg.name]||getColor(activeCluster)}
                  fill={colorMap[currentSeg.name]||getColor(activeCluster)}
                  fillOpacity={0.18} strokeWidth={2} />
                <Tooltip content={({ active, payload }) => {
                  if (!active||!payload?.length) return null;
                  return (
                    <div style={{ background:'rgba(4,9,26,0.97)', border:'1px solid rgba(232,119,34,0.2)', borderRadius:'8px', padding:'8px 12px', fontSize:'11px', color:'#e2e8f0' }}>
                      <p style={{ color:colorMap[currentSeg.name]||getColor(activeCluster), fontWeight:'700' }}>{payload[0]?.payload?.metric}</p>
                      <p>Score : {payload[0]?.value} / 100</p>
                    </div>
                  );
                }} />
              </RadarChart>
            </ResponsiveContainer>

            {/* Mini stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'12px' }}>
              {[
                { label:'Clients',        value:fmt(currentSeg.count),       unit:`(${currentSeg.pct}%)` },
                { label:'Montant moyen',  value:fmt(currentSeg.avgAmount),   unit:'MAD' },
                { label:'Récence moy.',   value:fmt(currentSeg.avgRecency),  unit:'jours' },
                { label:'Fréquence moy.', value:fmt(currentSeg.avgFrequency),unit:'tx' },
              ].map(s=>(
                <div key={s.label} style={{ background:'rgba(27,75,154,0.06)', border:'1px solid rgba(44,123,229,0.1)', borderRadius:'8px', padding:'9px 11px' }}>
                  <p style={{ fontSize:'10px', color:'#607CA8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'3px' }}>{s.label}</p>
                  <p style={{ fontSize:'15px', fontWeight:'700', color:'#f0f4ff' }}>{s.value||'—'}</p>
                  {s.unit && <p style={{ fontSize:'10px', color:'#2E4A72' }}>{s.unit}</p>}
                </div>
              ))}
            </div>

            {pareto.find(p=>p.name===currentSeg.name)?.isVital && (
              <div style={{ marginTop:'12px', padding:'10px 14px', background:'rgba(232,119,34,0.08)', border:'1px solid rgba(232,119,34,0.2)', borderRadius:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
                <span>★</span>
                <p style={{ fontSize:'11.5px', color:'#FFA94D' }}>Segment <strong>vital</strong> — contribue aux 80% du {detected.amount?'CA':'volume'}</p>
              </div>
            )}
          </div>

          {/* Insight IA */}
          <InsightCard
            insight={insights[currentSeg.name]}
            loading={!!insightLoading[currentSeg.name]}
            error={insightErrors[currentSeg.name]}
            clusterColor={colorMap[currentSeg.name]||getColor(activeCluster)}
            onRequest={()=>fetchInsight(currentSeg.name,{...currentSeg,isVital:!!pareto.find(p=>p.name===currentSeg.name)?.isVital},segments)}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

export default ClusterDetail;