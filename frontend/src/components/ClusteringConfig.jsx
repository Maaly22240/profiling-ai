import { useState, useRef, useEffect } from 'react';
import api from '../api';
import MapChart, { detectLatLng } from './MapChart';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

// ── Styles ────────────────────────────────────────────────────────────────────
const card = {
  background: 'rgba(6,14,36,0.9)',
  border: '1px solid rgba(44,123,229,0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(27,75,154,0.08)',
};
const labelStyle = {
  fontSize: '11px', fontWeight: '600', letterSpacing: '0.8px',
  color: '#607CA8', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};
const selectStyle = {
  padding: '9px 28px 9px 12px',
  background: 'rgba(27,75,154,0.08)',
  border: '1px solid rgba(44,123,229,0.2)',
  borderRadius: '8px', color: '#e2e8f0',
  fontFamily: 'inherit', fontSize: '13px',
  outline: 'none', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23607CA8'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
  transition: 'border-color 0.2s',
};

// ── Sélecteur colonne avec indicateur valide/invalide ─────────────────────────
function ColPicker({ label, value, onChange, columns, color = '#2C7BE5', optional = false }) {
  return (
    <div style={{ flex: 1, minWidth: '180px' }}>
      <span style={labelStyle}>{label}{optional && <span style={{ color: '#2E4A72', marginLeft: '6px', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span>}</span>
      <div style={{ position: 'relative' }}>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value || null)}
          style={{
            ...selectStyle, width: '100%',
            borderColor: value ? `${color}60` : optional ? 'rgba(44,123,229,0.2)' : 'rgba(239,68,68,0.3)',
            color: value ? '#e2e8f0' : '#607CA8',
          }}
          onFocus={e => e.target.style.borderColor = color}
          onBlur={e => e.target.style.borderColor = value ? `${color}60` : optional ? 'rgba(44,123,229,0.2)' : 'rgba(239,68,68,0.3)'}
        >
          <option value="">— {optional ? 'Non défini' : 'Choisir'} —</option>
          {columns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {value && (
          <span style={{ position: 'absolute', right: '28px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color, pointerEvents: 'none' }}>✓</span>
        )}
      </div>
    </div>
  );
}

// ── Bloc sélection coordonnées ────────────────────────────────────────────────
function GeoSelector({ columns, latCol, lngCol, onChangeLat, onChangeLng }) {
  const previewRows = []; // pas de données à ce stade, juste les colonnes

  return (
    <div style={{
      padding: '18px 20px',
      background: 'rgba(44,123,229,0.04)',
      border: '1px solid rgba(44,123,229,0.12)',
      borderRadius: '12px',
      animation: 'fadeSlideUp 0.3s ease both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '15px' }}>📍</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>Coordonnées géographiques</p>
          <p style={{ fontSize: '11px', color: '#4A6A96' }}>Pour afficher la carte de distribution des clients</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <ColPicker
          label="Latitude (Nord-Sud)"
          value={latCol}
          onChange={onChangeLat}
          columns={columns}
          color="#10b981"
          optional
        />
        <ColPicker
          label="Longitude (Est-Ouest)"
          value={lngCol}
          onChange={onChangeLng}
          columns={columns}
          color="#2C7BE5"
          optional
        />
      </div>

      {latCol && lngCol && (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '7px' }}>
          <span style={{ color: '#10b981', fontSize: '12px' }}>✓</span>
          <span style={{ fontSize: '11.5px', color: '#6ee7b7' }}>
            Carte configurée — Lat: <code style={{ fontFamily: 'monospace', color: '#10b981' }}>{latCol}</code> · Lng: <code style={{ fontFamily: 'monospace', color: '#2C7BE5' }}>{lngCol}</code>
          </span>
        </div>
      )}
      {(!latCol || !lngCol) && (
        <p style={{ marginTop: '8px', fontSize: '11px', color: '#2E4A72' }}>
          Sans coordonnées, la carte de distribution ne sera pas disponible sur le dashboard.
        </p>
      )}
    </div>
  );
}

// ── Mode card ─────────────────────────────────────────────────────────────────
function ModeCard({ value, current, onChange, icon, title, description }) {
  const active = current === value;
  return (
    <label style={{
      flex: 1, padding: '18px 20px', borderRadius: '12px',
      border: `2px solid ${active ? 'rgba(232,119,34,0.5)' : 'rgba(44,123,229,0.1)'}`,
      background: active ? 'rgba(232,119,34,0.08)' : 'rgba(27,75,154,0.04)',
      cursor: 'pointer', transition: 'all 0.2s',
      boxShadow: active ? '0 0 24px rgba(232,119,34,0.1)' : 'none',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <input type="radio" name="mode" value={value} onChange={onChange} style={{ display: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{ fontSize: '13.5px', fontWeight: '700', color: active ? '#FFA94D' : '#607CA8' }}>{title}</span>
        {active && <span style={{ marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%', background: 'linear-gradient(135deg,#E87722,#D4620D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>✓</span>}
      </div>
      <p style={{ fontSize: '12px', color: '#4A6A96', lineHeight: '1.5', margin: 0 }}>{description}</p>
    </label>
  );
}

// ── Log de progression SSE ────────────────────────────────────────────────────
function ProgressLog({ steps }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [steps]);
  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(44,123,229,0.1)', borderRadius: '10px', padding: '12px 14px', fontFamily: "'DM Mono',monospace", fontSize: '11.5px', maxHeight: '150px', overflowY: 'auto' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '3px', opacity: i < steps.length - 1 ? 0.5 : 1 }}>
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

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(4,9,26,0.97)', border: '1px solid rgba(232,119,34,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#e2e8f0' }}>
      <p style={{ color: '#FFA94D', fontWeight: '600', marginBottom: '4px' }}>k = {label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name} : <strong>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</strong></p>)}
    </div>
  );
};

function SilhouetteGauge({ value }) {
  const pct   = Math.max(0, Math.min(1, (value + 1) / 2)) * 100;
  const color = value >= 0.5 ? '#10b981' : value >= 0.3 ? '#f59e0b' : '#ef4444';
  const label = value >= 0.5 ? 'Excellent' : value >= 0.3 ? 'Acceptable' : 'Faible';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#607CA8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Silhouette</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color, letterSpacing: '-0.5px' }}>{value.toFixed(3)}</span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: `${color}18`, color, border: `1px solid ${color}30`, fontWeight: '600' }}>{label}</span>
        </div>
      </div>
      <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(44,123,229,0.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: '3px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, description, color = '#2C7BE5' }) {
  return (
    <div style={{ background: 'rgba(27,75,154,0.05)', border: `1px solid ${color}20`, borderRadius: '9px', padding: '12px 14px', borderLeft: `3px solid ${color}` }}>
      <p style={{ fontSize: '10px', color: '#607CA8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px', fontWeight: '600' }}>{label}</p>
      <p style={{ fontSize: '19px', fontWeight: '800', color: '#f0f4ff', letterSpacing: '-0.5px' }}>{value}</p>
      {description && <p style={{ fontSize: '10px', color: '#2E4A72', marginTop: '3px' }}>{description}</p>}
    </div>
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
  const [kmeansResults,    setKmeansResults]    = useState(null);

  // ── Coordonnées géographiques ─────────────────────────────────────────────
  const autoGeo = detectLatLng(columns);
  const [latCol, setLatCol] = useState(autoGeo.lat);
  const [lngCol, setLngCol] = useState(autoGeo.lng);

  // Auto-sélection de la colonne segment (priorité à "segment" exact)
  useEffect(() => {
    if (!segmentColumn && columns.length > 0) {
      const auto =
        columns.find(c => c.toLowerCase() === 'segment') ||
        columns.find(c => c.toLowerCase().startsWith('segment')) ||
        columns.find(c => ['cluster','classe','categorie','category','profil','groupe','label']
          .some(k => c.toLowerCase().replace(/[_\s-]/g,'').includes(k)));
      if (auto) setSegmentColumn(auto);
    }
  }, [columns]);

  const eventSourceRef = useRef(null);
  const addStep = (type, msg) => setProgressSteps(prev => [...prev, { type, message: msg }]);

  const handleFeatureToggle = (col) =>
    setSelectedFeatures(prev => prev.includes(col) ? prev.filter(f => f !== col) : [...prev, col]);

  // ── Sauvegarde lat/lng dans le store serveur ──────────────────────────────
  const saveGeoConfig = async () => {
    if (!latCol || !lngCol) return;
    try {
      await api.post('/api/data/geo', { latCol, lngCol });
    } catch (_) {} // non bloquant
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsProcessing(true); setMessage(null); setKmeansResults(null); setProgressSteps([]);
    await saveGeoConfig();

    if (mode === 'existing') {
      try {
        const r = await api.post('/api/clustering/config', { mode: 'existing', targetColumn: segmentColumn });
        setMessage({ type: 'success', text: r.data.message });
        setTimeout(() => onComplete(), 1800);
      } catch {
        setMessage({ type: 'error', text: 'Erreur lors de la configuration.' });
      } finally { setIsProcessing(false); }
      return;
    }

    // K-Means SSE
    const featuresParam = selectedFeatures.join(',');
    const token = localStorage.getItem('profiling_token') || '';
    const url   = `http://localhost:5000/api/clustering/run?features=${encodeURIComponent(featuresParam)}&n_clusters=${nClusters}&token=${token}`;

    addStep('progress', 'Connexion au pipeline Python…');
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') addStep('progress', data.message);
      if (data.type === 'done') {
        addStep('done', data.message);
        es.close(); setIsProcessing(false); setKmeansResults(data);
        setMessage({ type: 'success', text: `Pipeline terminé — ${data.n_clusters} clusters.` });
      }
      if (data.type === 'error') {
        addStep('error', data.message);
        es.close(); setIsProcessing(false);
        setMessage({ type: 'error', text: data.message });
      }
    };
    es.onerror = () => { addStep('error', 'Connexion SSE interrompue.'); es.close(); setIsProcessing(false); setMessage({ type: 'error', text: 'Connexion perdue.' }); };
  };

  const canSubmit = !isProcessing && mode &&
    (mode === 'existing' ? !!segmentColumn : selectedFeatures.length >= 2);

  const metricsAvailable = kmeansResults?.metrics;
  const elbowData  = kmeansResults?.metrics?.inertia_curve    || [];
  const silData    = kmeansResults?.metrics?.silhouette_curve || [];
  const curveData  = elbowData.map((pt, i) => ({ k: pt.k, inertia: pt.inertia, silhouette: silData[i]?.silhouette ?? null }));

  return (
    <div style={{ animation: 'fadeSlideUp 0.4s ease both' }}>
      <div style={{ ...card, padding: '28px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '5px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#E87722,#D4620D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white' }}>2</div>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#f0f4ff', letterSpacing: '-0.3px' }}>Configuration du Profiling</h2>
          </div>
          <p style={{ fontSize: '12px', color: '#607CA8', marginLeft: '40px' }}>Définissez les segments et les coordonnées géographiques</p>
        </div>

        {/* Mode selection */}
        <div style={{ marginBottom: '22px' }}>
          <span style={labelStyle}>Type de clustering</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <ModeCard value="existing" current={mode} onChange={e => setMode(e.target.value)} icon="🗂️" title="Clustering existant" description="Votre dataset contient déjà une colonne de segments." />
            <ModeCard value="new"      current={mode} onChange={e => setMode(e.target.value)} icon="🧠" title="Générer des clusters" description="Lance un pipeline K-Means sur vos données RFM." />
          </div>
        </div>

        {/* ── EXISTING ─────────────────────────────────────────────────────── */}
        {mode === 'existing' && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease both' }}>
            <div style={{ padding: '16px 20px', background: 'rgba(27,75,154,0.04)', border: '1px solid rgba(44,123,229,0.12)', borderRadius: '12px', marginBottom: '16px' }}>
              <span style={labelStyle}>Colonne contenant les segments</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                  <select
                    value={segmentColumn}
                    onChange={e => setSegmentColumn(e.target.value)}
                    style={{ ...selectStyle, width: '100%', borderColor: segmentColumn ? 'rgba(232,119,34,0.5)' : 'rgba(239,68,68,0.3)', color: segmentColumn ? '#e2e8f0' : '#fca5a5' }}
                    onFocus={e => e.target.style.borderColor = '#E87722'}
                    onBlur={e => e.target.style.borderColor = segmentColumn ? 'rgba(232,119,34,0.5)' : 'rgba(239,68,68,0.3)'}
                  >
                    <option value="">— Choisir une colonne —</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                  {segmentColumn && (
                    <span style={{ position: 'absolute', right: '28px', top: '50%', transform: 'translateY(-50%)', color: '#E87722', fontSize: '11px', pointerEvents: 'none' }}>✓</span>
                  )}
                </div>
                {segmentColumn && (
                  <div style={{ padding: '6px 12px', background: 'rgba(232,119,34,0.08)', border: '1px solid rgba(232,119,34,0.2)', borderRadius: '7px', fontSize: '11.5px', color: '#FFA94D', whiteSpace: 'nowrap' }}>
                    ★ <code style={{ fontFamily: 'monospace' }}>{segmentColumn}</code> sélectionnée
                  </div>
                )}
              </div>
            </div>

            {/* Coordonnées géographiques */}
            <GeoSelector
              columns={columns}
              latCol={latCol} lngCol={lngCol}
              onChangeLat={setLatCol} onChangeLng={setLngCol}
            />
          </div>
        )}

        {/* ── NEW : Features + k + geo ─────────────────────────────────────── */}
        {mode === 'new' && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease both', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Feature selection */}
            <div style={{ padding: '16px 20px', background: 'rgba(27,75,154,0.04)', border: '1px solid rgba(44,123,229,0.12)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={labelStyle}>Variables pour K-Means</span>
                <span style={{ fontSize: '11px', color: '#E87722', background: 'rgba(232,119,34,0.1)', padding: '2px 10px', borderRadius: '20px', fontWeight: '600' }}>
                  {selectedFeatures.length} sélectionnée{selectedFeatures.length > 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#4A6A96', marginBottom: '12px', lineHeight: '1.5' }}>💡 Minimum 2 variables numériques. Préférez Récence, Fréquence, Montant pour un profiling RFM optimal.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '7px' }}>
                {columns.map(col => {
                  const checked = selectedFeatures.includes(col);
                  return (
                    <label key={col} onClick={() => handleFeatureToggle(col)} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 11px', background: checked ? 'rgba(232,119,34,0.08)' : 'rgba(27,75,154,0.04)', border: `1px solid ${checked ? 'rgba(232,119,34,0.4)' : 'rgba(44,123,229,0.1)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' }}>
                      <div style={{ width: '15px', height: '15px', borderRadius: '4px', flexShrink: 0, background: checked ? 'linear-gradient(135deg,#E87722,#D4620D)' : 'rgba(44,123,229,0.08)', border: `1px solid ${checked ? 'transparent' : 'rgba(44,123,229,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white' }}>{checked ? '✓' : ''}</div>
                      <span style={{ fontSize: '12px', color: checked ? '#FFA94D' : '#607CA8', fontWeight: checked ? '600' : '400', wordBreak: 'break-word' }}>{col}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* K selector */}
            <div style={{ padding: '14px 20px', background: 'rgba(27,75,154,0.04)', border: '1px solid rgba(44,123,229,0.12)', borderRadius: '12px' }}>
              <span style={labelStyle}>Nombre de clusters (k)</span>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                <button onClick={() => setNClusters('auto')} style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${nClusters === 'auto' ? 'rgba(232,119,34,0.5)' : 'rgba(44,123,229,0.12)'}`, background: nClusters === 'auto' ? 'rgba(232,119,34,0.12)' : 'transparent', color: nClusters === 'auto' ? '#FFA94D' : '#607CA8', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  ✨ Auto
                </button>
                {[2,3,4,5,6].map(k => (
                  <button key={k} onClick={() => setNClusters(String(k))} style={{ padding: '7px 16px', borderRadius: '8px', border: `1px solid ${nClusters === String(k) ? 'rgba(232,119,34,0.5)' : 'rgba(44,123,229,0.12)'}`, background: nClusters === String(k) ? 'rgba(232,119,34,0.12)' : 'transparent', color: nClusters === String(k) ? '#FFA94D' : '#607CA8', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}>
                    k = {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Coordonnées géographiques */}
            <GeoSelector
              columns={columns}
              latCol={latCol} lngCol={lngCol}
              onChangeLat={setLatCol} onChangeLng={setLngCol}
            />
          </div>
        )}

        {/* ── Bouton submit ─────────────────────────────────────────────────── */}
        {!kmeansResults && (
          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            marginTop: '18px', width: '100%', padding: '13px',
            background: canSubmit ? 'linear-gradient(135deg,#E87722,#D4620D)' : 'rgba(232,119,34,0.08)',
            border: 'none', borderRadius: '10px',
            color: canSubmit ? 'white' : '#4A6A96',
            fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
            cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: canSubmit ? '0 4px 20px rgba(232,119,34,0.35)' : 'none',
          }}
            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isProcessing
              ? <><span style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />En cours…</>
              : mode === 'new' ? '🧠 Lancer le pipeline K-Means' : '✦ Valider la configuration'
            }
          </button>
        )}

        {/* Log SSE */}
        {(isProcessing || progressSteps.length > 0) && mode === 'new' && (
          <div style={{ marginTop: '14px', animation: 'fadeSlideUp 0.3s ease both' }}>
            <span style={{ ...labelStyle, marginBottom: '7px' }}>Journal d'exécution</span>
            <ProgressLog steps={progressSteps} />
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{ marginTop: '14px', padding: '11px 14px', borderRadius: '8px', background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: message.type === 'success' ? '#6ee7b7' : '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeSlideUp 0.3s ease both' }}>
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}
      </div>

      {/* ── Résultats K-Means ─────────────────────────────────────────────── */}
      {kmeansResults && metricsAvailable && (
        <div style={{ ...card, padding: '24px 28px', marginTop: '14px', animation: 'fadeSlideUp 0.5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white' }}>✓</div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f0f4ff' }}>Résultats K-Means</h3>
              <p style={{ fontSize: '11px', color: '#607CA8' }}>{kmeansResults.n_clusters} clusters · {kmeansResults.cluster_names?.join(', ')}</p>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <SilhouetteGauge value={metricsAvailable.silhouette} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '9px', marginBottom: '16px' }}>
            <MetricCard label="Davies-Bouldin"    value={metricsAvailable.davies_bouldin.toFixed(3)}    description="Plus bas = meilleure séparation" color="#2C7BE5" />
            <MetricCard label="Calinski-Harabász" value={metricsAvailable.calinski_harabasz.toFixed(0)} description="Plus haut = clusters plus denses"  color="#1B4B9A" />
            <MetricCard label="k optimal"         value={metricsAvailable.optimal_k}                    description="Elbow + Silhouette"               color="#10b981" />
          </div>

          {curveData.length >= 2 && (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ ...labelStyle, marginBottom: '8px' }}>Courbes Elbow + Silhouette</span>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '9px', padding: '14px', border: '1px solid rgba(44,123,229,0.08)' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={curveData} margin={{ top: 5, right: 28, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,123,229,0.05)" />
                    <XAxis dataKey="k" tick={{ fill: '#607CA8', fontSize: 10 }} label={{ value: 'k', position: 'insideBottom', offset: -2, fill: '#607CA8', fontSize: 10 }} />
                    <YAxis yAxisId="left"  tick={{ fill: '#607CA8', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0,1]} tick={{ fill: '#607CA8', fontSize: 10 }} tickFormatter={v => v.toFixed(1)} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend formatter={v => <span style={{ fontSize: '11px', color: '#94a3b8' }}>{v}</span>} />
                    <ReferenceLine yAxisId="left" x={metricsAvailable.optimal_k} stroke="#E87722" strokeDasharray="6 3" strokeWidth={2} label={{ value: `k=${metricsAvailable.optimal_k}`, position: 'top', fill: '#FFA94D', fontSize: 10 }} />
                    <Line yAxisId="left"  type="monotone" dataKey="inertia"    name="Inertie (Elbow)"  stroke="#2C7BE5" strokeWidth={2} dot={{ r: 3, fill: '#2C7BE5', strokeWidth: 0 }} />
                    <Line yAxisId="right" type="monotone" dataKey="silhouette" name="Silhouette"        stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <button onClick={onComplete} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#2C7BE5,#1A6BC5)', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(44,123,229,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Voir le Dashboard →
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        select option{background:#060E22;color:#e2e8f0}
      `}</style>
    </div>
  );
}

export default ClusteringConfig;