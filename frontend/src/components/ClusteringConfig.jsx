import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

// ── Styles partagés ───────────────────────────────────────────────────────────
const card = {
  background: 'rgba(6,14,36,0.93)',
  border: '1px solid rgba(232,119,34,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(27,75,154,0.08)',
};
const labelStyle = {
  fontSize: '11px', fontWeight: '600', letterSpacing: '0.8px',
  color: '#607CA8', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};
const PALETTE = ['#E87722','#2C7BE5','#10b981','#f59e0b','#ef4444','#1B4B9A'];

// ── Jauge de qualité Silhouette ───────────────────────────────────────────────
function SilhouetteGauge({ value }) {
  const pct  = Math.max(0, Math.min(1, (value + 1) / 2)) * 100; // -1→1 mappé 0→100%
  const color = value >= 0.5 ? '#10b981' : value >= 0.3 ? '#f59e0b' : '#ef4444';
  const label = value >= 0.5 ? 'Excellent' : value >= 0.3 ? 'Acceptable' : 'Faible';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#607CA8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Silhouette</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color, letterSpacing: '-0.5px' }}>{value.toFixed(3)}</span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: `${color}18`, color, border: `1px solid ${color}30`, fontWeight: '600' }}>{label}</span>
        </div>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(44,123,229,0.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: '3px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

// ── Carte métrique ────────────────────────────────────────────────────────────
function MetricCard({ label, value, description, color = '#E87722' }) {
  return (
    <div style={{ background: 'rgba(27,75,154,0.05)', border: `1px solid ${color}20`, borderRadius: '10px', padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
      <p style={{ fontSize: '10px', color: '#4A6A96', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px', fontWeight: '600' }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' }}>{value}</p>
      {description && <p style={{ fontSize: '10px', color: '#2E4A72', marginTop: '3px' }}>{description}</p>}
    </div>
  );
}

// ── Log de progression ────────────────────────────────────────────────────────
function ProgressLog({ steps }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [steps]);
  return (
    <div style={{ background: 'rgba(4,9,26,0.5)', border: '1px solid rgba(232,119,34,0.1)', borderRadius: '10px', padding: '14px 16px', fontFamily: "'DM Mono', monospace", fontSize: '12px', maxHeight: '160px', overflowY: 'auto' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '4px', opacity: i < steps.length - 1 ? 0.5 : 1, transition: 'opacity 0.3s' }}>
          <span style={{ color: s.type === 'error' ? '#ef4444' : s.type === 'done' ? '#10b981' : '#E87722', flexShrink: 0 }}>
            {s.type === 'error' ? '✕' : s.type === 'done' ? '✓' : '›'}
          </span>
          <span style={{ color: s.type === 'error' ? '#fca5a5' : '#94a3b8' }}>{s.message}</span>
        </div>
      ))}
      {steps.length === 0 && <span style={{ color: '#2E4A72' }}>En attente du lancement…</span>}
      <div ref={endRef} />
    </div>
  );
}

// ── Tooltip recharts ──────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(4,9,26,0.97)', border: '1px solid rgba(232,119,34,0.25)', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#e2e8f0' }}>
      <p style={{ color: '#FFA94D', fontWeight: '600', marginBottom: '4px' }}>k = {label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name} : <strong>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</strong></p>)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODE CARD
// ─────────────────────────────────────────────────────────────────────────────
function ModeCard({ value, current, onChange, icon, title, description }) {
  const active = current === value;
  return (
    <label style={{
      flex: 1, padding: '20px', borderRadius: '12px',
      border: `2px solid ${active ? 'rgba(232,119,34,0.5)' : 'rgba(44,123,229,0.1)'}`,
      background: active ? 'rgba(232,119,34,0.08)' : 'rgba(27,75,154,0.05)',
      cursor: 'pointer', transition: 'all 0.2s',
      boxShadow: active ? '0 0 24px rgba(232,119,34,0.12)' : 'none',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <input type="radio" name="mode" value={value} onChange={onChange} style={{ display: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: active ? '#FFA94D' : '#94a3b8' }}>{title}</span>
        {active && <span style={{ marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%', background: 'linear-gradient(135deg,#E87722,#1B4B9A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>✓</span>}
      </div>
      <p style={{ fontSize: '12px', color: '#4A6A96', lineHeight: '1.5', margin: 0 }}>{description}</p>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function ClusteringConfig({ columns, onComplete }) {
  const [mode,             setMode]             = useState('');
  const [segmentColumn,    setSegmentColumn]    = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [nClusters,        setNClusters]        = useState('auto');
  const [isProcessing,     setIsProcessing]     = useState(false);
  const [progressSteps,    setProgressSteps]    = useState([]);
  const [message,          setMessage]          = useState(null);
  const [kmeansResults,    setKmeansResults]    = useState(null);   // résultats finaux
  const eventSourceRef = useRef(null);

  const handleFeatureToggle = (col) =>
    setSelectedFeatures(prev => prev.includes(col) ? prev.filter(f => f !== col) : [...prev, col]);

  const addStep = (type, msg) =>
    setProgressSteps(prev => [...prev, { type, message: msg }]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsProcessing(true);
    setMessage(null);
    setKmeansResults(null);
    setProgressSteps([]);

    // ── Mode existant : POST classique ────────────────────────────────────
    if (mode === 'existing') {
      try {
        const r = await axios.post('http://localhost:5000/api/clustering/config', { mode: 'existing', targetColumn: segmentColumn });
        setMessage({ type: 'success', text: r.data.message });
        setTimeout(() => onComplete(), 1800);
      } catch {
        setMessage({ type: 'error', text: 'Erreur lors de la configuration.' });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // ── Mode new : SSE → pipeline Python ─────────────────────────────────
    const featuresParam = selectedFeatures.join(',');
    const url = `http://localhost:5000/api/clustering/run?features=${encodeURIComponent(featuresParam)}&n_clusters=${nClusters}`;

    addStep('progress', 'Connexion au pipeline Python…');

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'progress') {
        addStep('progress', data.message);
      }

      if (data.type === 'done') {
        addStep('done', data.message);
        es.close();
        setIsProcessing(false);
        setKmeansResults(data);
        setMessage({ type: 'success', text: `Pipeline terminé — ${data.n_clusters} clusters trouvés.` });
      }

      if (data.type === 'error') {
        addStep('error', data.message);
        es.close();
        setIsProcessing(false);
        setMessage({ type: 'error', text: data.message });
      }
    };

    es.onerror = () => {
      addStep('error', 'Connexion SSE interrompue.');
      es.close();
      setIsProcessing(false);
      setMessage({ type: 'error', text: 'Connexion au serveur perdue.' });
    };
  };

  const canSubmit = !isProcessing && mode &&
    (mode === 'existing' ? !!segmentColumn : selectedFeatures.length >= 2);

  const metricsAvailable = kmeansResults?.metrics;
  const elbowData        = kmeansResults?.metrics?.inertia_curve    || [];
  const silData          = kmeansResults?.metrics?.silhouette_curve || [];
  // Fusionne les deux courbes sur k
  const curveData = elbowData.map((pt, i) => ({
    k: pt.k,
    inertia:    pt.inertia,
    silhouette: silData[i]?.silhouette ?? null,
  }));

  return (
    <div style={{ animation: 'fadeSlideUp 0.4s ease both' }}>
      <div style={{ ...card, padding: '32px 36px' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#2C7BE5,#1A6BC5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white' }}>2</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>Configuration du Profiling</h2>
          </div>
          <p style={{ fontSize: '13px', color: '#4A6A96', marginLeft: '40px' }}>Définissez comment les segments client vont être déterminés</p>
        </div>

        {/* ── Mode Selection ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: '28px' }}>
          <span style={labelStyle}>État du jeu de données</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <ModeCard value="existing" current={mode} onChange={e => setMode(e.target.value)} icon="🗂️" title="Clustering existant"  description="Votre dataset contient déjà une colonne de segments. Sélectionnez-la pour continuer." />
            <ModeCard value="new"      current={mode} onChange={e => setMode(e.target.value)} icon="🧠" title="Générer des clusters" description="Lance un vrai pipeline K-Means (scikit-learn) sur vos données pour créer de nouveaux segments." />
          </div>
        </div>

        {/* ── EXISTING ────────────────────────────────────────────────────── */}
        {mode === 'existing' && (
          <div style={{ padding: '20px 24px', background: 'rgba(27,75,154,0.05)', border: '1px solid rgba(232,119,34,0.15)', borderRadius: '12px', marginBottom: '20px', animation: 'fadeSlideUp 0.3s ease both' }}>
            <span style={labelStyle}>Colonne contenant les segments</span>
            <select value={segmentColumn} onChange={e => setSegmentColumn(e.target.value)} style={{ width: '100%', maxWidth: '320px', padding: '10px 14px', background: 'rgba(27,75,154,0.08)', border: '1px solid rgba(232,119,34,0.2)', borderRadius: '8px', color: segmentColumn ? '#e2e8f0' : '#4A6A96', fontFamily: 'inherit', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}>
              <option value="">— Choisir une colonne —</option>
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        )}

        {/* ── NEW : Features + Options K-Means ───────────────────────────── */}
        {mode === 'new' && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease both' }}>

            {/* Feature selection */}
            <div style={{ padding: '20px 24px', background: 'rgba(27,75,154,0.05)', border: '1px solid rgba(232,119,34,0.15)', borderRadius: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={labelStyle}>Variables pour K-Means</span>
                <span style={{ fontSize: '11px', color: '#E87722', background: 'rgba(232,119,34,0.1)', padding: '2px 10px', borderRadius: '20px', fontWeight: '600' }}>
                  {selectedFeatures.length} sélectionnée{selectedFeatures.length > 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#4A6A96', marginBottom: '14px', lineHeight: '1.5' }}>
                💡 Sélectionnez au minimum <strong style={{ color: '#94a3b8' }}>2 variables numériques</strong>. Préférez Récence, Fréquence, Montant pour un profiling RFM optimal.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '8px' }}>
                {columns.map(col => {
                  const checked = selectedFeatures.includes(col);
                  return (
                    <label key={col} onClick={() => handleFeatureToggle(col)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: checked ? 'rgba(232,119,34,0.1)' : 'rgba(27,75,154,0.06)', border: `1px solid ${checked ? 'rgba(232,119,34,0.4)' : 'rgba(44,123,229,0.12)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, background: checked ? 'linear-gradient(135deg,#E87722,#1B4B9A)' : 'rgba(44,123,229,0.1)', border: `1px solid ${checked ? 'transparent' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>{checked ? '✓' : ''}</div>
                      <span style={{ fontSize: '12.5px', color: checked ? '#FFD0A0' : '#607CA8', fontWeight: checked ? '600' : '400', wordBreak: 'break-word' }}>{col}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* K selector */}
            <div style={{ padding: '18px 24px', background: 'rgba(27,75,154,0.05)', border: '1px solid rgba(232,119,34,0.12)', borderRadius: '12px', marginBottom: '14px' }}>
              <span style={labelStyle}>Nombre de clusters (k)</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setNClusters('auto')} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${nClusters === 'auto' ? 'rgba(232,119,34,0.5)' : 'rgba(44,123,229,0.12)'}`, background: nClusters === 'auto' ? 'rgba(232,119,34,0.15)' : 'transparent', color: nClusters === 'auto' ? '#FFA94D' : '#607CA8', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✨ Auto (Elbow + Silhouette)
                </button>
                {[2, 3, 4, 5, 6].map(k => (
                  <button key={k} onClick={() => setNClusters(String(k))} style={{ padding: '8px 18px', borderRadius: '8px', border: `1px solid ${nClusters === String(k) ? 'rgba(232,119,34,0.5)' : 'rgba(44,123,229,0.12)'}`, background: nClusters === String(k) ? 'rgba(232,119,34,0.15)' : 'transparent', color: nClusters === String(k) ? '#FFA94D' : '#607CA8', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}>
                    k = {k}
                  </button>
                ))}
              </div>
              {nClusters === 'auto' && (
                <p style={{ fontSize: '11px', color: '#2E4A72', marginTop: '8px' }}>Le pipeline calculera automatiquement le k optimal via la méthode du coude et le score Silhouette.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Bouton Lancer ───────────────────────────────────────────────── */}
        {!kmeansResults && (
          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            width: '100%', padding: '14px',
            background: canSubmit ? 'linear-gradient(135deg,#E87722,#1B4B9A)' : 'rgba(232,119,34,0.12)',
            border: 'none', borderRadius: '10px',
            color: canSubmit ? 'white' : '#4A6A96',
            fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
            cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: canSubmit ? '0 4px 20px rgba(232,119,34,0.3)' : 'none',
          }}
            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isProcessing ? (
              <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Pipeline en cours…</>
            ) : mode === 'new' ? '🧠 Lancer le pipeline K-Means' : '✦ Valider la configuration'}
          </button>
        )}

        {/* ── Log de progression ──────────────────────────────────────────── */}
        {(isProcessing || progressSteps.length > 0) && mode === 'new' && (
          <div style={{ marginTop: '16px', animation: 'fadeSlideUp 0.3s ease both' }}>
            <span style={{ ...labelStyle, marginBottom: '8px' }}>Journal d'exécution</span>
            <ProgressLog steps={progressSteps} />
          </div>
        )}

        {/* ── Message ─────────────────────────────────────────────────────── */}
        {message && (
          <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: message.type === 'success' ? '#6ee7b7' : '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeSlideUp 0.3s ease both' }}>
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}
      </div>

      {/* ── RÉSULTATS K-MEANS ─────────────────────────────────────────────── */}
      {kmeansResults && metricsAvailable && (
        <div style={{ ...card, padding: '28px 36px', marginTop: '16px', animation: 'fadeSlideUp 0.5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white' }}>✓</div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Résultats du Pipeline K-Means</h3>
              <p style={{ fontSize: '11px', color: '#4A6A96' }}>{kmeansResults.n_clusters} clusters générés · {kmeansResults.cluster_names?.join(', ')}</p>
            </div>
          </div>

          {/* Métriques de validation */}
          <div style={{ marginBottom: '24px' }}>
            <span style={labelStyle}>Métriques de validation</span>
            <div style={{ marginBottom: '14px' }}>
              <SilhouetteGauge value={metricsAvailable.silhouette} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <MetricCard
                label="Davies-Bouldin"
                value={metricsAvailable.davies_bouldin.toFixed(3)}
                description="Plus bas = meilleure séparation"
                color="#2C7BE5"
              />
              <MetricCard
                label="Calinski-Harabász"
                value={metricsAvailable.calinski_harabasz.toFixed(0)}
                description="Plus haut = clusters plus denses"
                color="#1B4B9A"
              />
              <MetricCard
                label="k optimal"
                value={metricsAvailable.optimal_k}
                description={`Déterminé par Elbow + Silhouette`}
                color="#10b981"
              />
            </div>
          </div>

          {/* Courbes Elbow + Silhouette */}
          {curveData.length >= 2 && (
            <div style={{ marginBottom: '24px' }}>
              <span style={labelStyle}>Courbes de sélection de k</span>
              <div style={{ background: 'rgba(4,9,26,0.4)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(27,75,154,0.08)' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={curveData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,75,154,0.08)" />
                    <XAxis dataKey="k" tick={{ fill: '#4A6A96', fontSize: 10 }} label={{ value: 'k (clusters)', position: 'insideBottom', offset: -2, fill: '#4A6A96', fontSize: 10 }} />
                    <YAxis yAxisId="left"  tick={{ fill: '#4A6A96', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fill: '#4A6A96', fontSize: 10 }} tickFormatter={v => v.toFixed(1)} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend formatter={v => <span style={{ fontSize: '11px', color: '#94a3b8' }}>{v}</span>} />
                    <ReferenceLine yAxisId="left" x={metricsAvailable.optimal_k} stroke="#E87722" strokeDasharray="6 3" strokeWidth={2} label={{ value: `k=${metricsAvailable.optimal_k}`, position: 'top', fill: '#FFA94D', fontSize: 10 }} />
                    <Line yAxisId="left"  type="monotone" dataKey="inertia"    name="Inertie (Elbow)"  stroke="#2C7BE5" strokeWidth={2} dot={{ r: 4, fill: '#2C7BE5', strokeWidth: 0 }} />
                    <Line yAxisId="right" type="monotone" dataKey="silhouette" name="Silhouette"        stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Centroides */}
          {kmeansResults.centroids && (
            <div style={{ marginBottom: '24px' }}>
              <span style={labelStyle}>Centroides des clusters (valeurs moyennes réelles)</span>
              <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(232,119,34,0.12)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(232,119,34,0.08)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#FFA94D', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid rgba(232,119,34,0.15)' }}>Segment</th>
                      {kmeansResults.features?.map(f => (
                        <th key={f} style={{ padding: '10px 16px', textAlign: 'right', color: '#FFA94D', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid rgba(232,119,34,0.15)' }}>{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(kmeansResults.centroids).map(([name, vals], i) => (
                      <tr key={name} style={{ borderBottom: '1px solid rgba(27,75,154,0.08)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                          <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{name}</span>
                        </td>
                        {kmeansResults.features?.map(f => (
                          <td key={f} style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>{vals[f]?.toLocaleString('fr-FR') ?? '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bouton vers Dashboard */}
          <button onClick={onComplete} style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg,#2C7BE5,#1A6BC5)',
            border: 'none', borderRadius: '10px', color: 'white',
            fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 20px rgba(44,123,229,0.3)',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(44,123,229,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(44,123,229,0.3)'; }}
          >
            Voir le Dashboard →
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        select option { background: #060E22; color: #e2e8f0; }
      `}</style>
    </div>
  );
}

export default ClusteringConfig;