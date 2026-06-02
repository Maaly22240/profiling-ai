import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api';

const PALETTE = ['#E87722','#2C7BE5','#10b981','#f59e0b','#ef4444','#1B4B9A','#E84393','#14b8a6'];
const getColor = i => PALETTE[i % PALETTE.length];

export function detectLatLng(columns) {
  const find = (kws) =>
    columns.find(c => kws.some(k => c.toLowerCase().replace(/[_\s-]/g,'').includes(k))) || null;
  return {
    lat: find(['latitude','lat','ycoord','coordlat','ylat','coordy','gps_lat','position_lat']),
    lng: find(['longitude','lng','lon','long','xcoord','coordlon','xlon','coordx','gps_lon','gps_lng']),
  };
}

// ── Sélecteur de colonne ──────────────────────────────────────────────────────
function ColSelect({ label, value, onChange, columns, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'4px', flex:1, minWidth:'160px' }}>
      <span style={{ fontSize:'10px', fontWeight:'600', color:'#607CA8', textTransform:'uppercase', letterSpacing:'0.6px' }}>{label}</span>
      <select value={value||''} onChange={e => onChange(e.target.value||null)} style={{
        width:'100%', padding:'8px 28px 8px 10px',
        background: value ? 'rgba(27,75,154,0.1)' : 'rgba(239,68,68,0.06)',
        border:`1px solid ${value ? `${color}60` : 'rgba(239,68,68,0.3)'}`,
        borderRadius:'8px', color:value?'#e2e8f0':'#fca5a5',
        fontFamily:'inherit', fontSize:'12.5px',
        outline:'none', cursor:'pointer', appearance:'none',
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23607CA8'/%3E%3C/svg%3E")`,
        backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center',
        transition:'border-color 0.2s',
      }}>
        <option value="">— Sélectionner —</option>
        {columns.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function MapChart({ columns = [], segmentCol = '', latCol = null, lngCol = null }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const layerRef   = useRef(null);
  const batchRef   = useRef(null);

  // Colonnes — props serveur en priorité, sinon auto-détection
  const auto = detectLatLng(columns);
  const [lc,  setLc]  = useState(latCol || auto.lat || null);
  const [lgn, setLgn] = useState(lngCol || auto.lng || null);

  const [mapReady,  setMapReady]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [selSeg,    setSelSeg]    = useState('all');
  const [stats,     setStats]     = useState({ total:0, shown:0, segments:[], segColors:{} });
  const [error,     setError]     = useState('');
  const [noGeo,     setNoGeo]     = useState(false);

  // Sync props externes
  useEffect(() => { if (latCol) setLc(latCol); }, [latCol]);
  useEffect(() => { if (lngCol) setLgn(lngCol); }, [lngCol]);

  // ── Charge Leaflet ────────────────────────────────────────────────────────
  const loadLeaflet = useCallback(() => new Promise((res, rej) => {
    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link');
      l.id='lf-css'; l.rel='stylesheet';
      l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(l);
    }
    if (window.L) { res(); return; }
    const s = document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  }), []);

  // ── Initialise la carte ───────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || leafletRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      center:[30, -7], zoom:5,
      minZoom:4, maxZoom:14,
      fadeAnimation:false, markerZoomAnimation:false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:'© OSM © CARTO', subdomains:'abcd', maxZoom:19,
    }).addTo(map);
    layerRef.current   = L.layerGroup().addTo(map);
    leafletRef.current = map;
    setMapReady(true);
  }, []);

  // ── Rendu par lots asynchrones ────────────────────────────────────────────
  const renderBatch = useCallback((points, segColors) => {
    if (!leafletRef.current || !layerRef.current) return;
    const L = window.L;
    layerRef.current.clearLayers();

    if (!points.length) { setLoading(false); setProgress(100); return; }

    const BATCH = 400;
    let idx = 0;

    const addBatch = () => {
      const slice = points.slice(idx, idx + BATCH);
      slice.forEach(pt => {
        const color = segColors[pt.seg] || '#E87722';
        L.circleMarker([pt.lat, pt.lng], {
          radius: 4, fillColor: color, color: color,
          weight: 0, fillOpacity: 0.8,
          bubblingMouseEvents: false,
        }).bindTooltip(
          `<span style="font-size:11px;font-family:sans-serif"><b style="color:${color}">${pt.seg}</b><br/>${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}</span>`,
          { permanent:false, direction:'top', offset:[0,-4], opacity:0.95 }
        ).addTo(layerRef.current);
      });
      idx += BATCH;
      const pct = Math.round(Math.min(100, (idx / points.length) * 100));
      setProgress(pct);
      if (idx < points.length) {
        batchRef.current = setTimeout(addBatch, 8);
      } else {
        setLoading(false); setProgress(100);
      }
    };
    setLoading(true); setProgress(0);
    batchRef.current = setTimeout(addBatch, 10);
  }, []);

  // ── Fetch + render ────────────────────────────────────────────────────────
  const fetchAndRender = useCallback(async () => {
    if (!leafletRef.current) return;
    if (batchRef.current) { clearTimeout(batchRef.current); batchRef.current = null; }

    setLoading(true); setProgress(0);

    try {
      const r = await api.get('/api/data/geo-points');
      const { points: allPoints, latCol: detLat, lngCol: detLng, columns: serverCols } = r.data;

      // Met à jour les colonnes si le serveur les a auto-détectées
      if (detLat && !lc) setLc(detLat);
      if (detLng && !lgn) setLgn(detLng);

      if (!allPoints || allPoints.length === 0) {
        setNoGeo(true); setLoading(false);
        setStats({ total:0, shown:0, segments:[], segColors:{} });
        return;
      }

      setNoGeo(false);

      // Segments + couleurs
      const segsAll   = [...new Set(allPoints.map(p => p.seg))].sort();
      const segColors = {};
      segsAll.forEach((s, i) => { segColors[s] = getColor(i); });

      // Filtre segment
      const filtered = selSeg === 'all' ? allPoints : allPoints.filter(p => p.seg === selSeg);

      // Échantillonnage max 5000
      const MAX = 5000;
      const step = Math.max(1, Math.floor(filtered.length / MAX));
      const sample = filtered.filter((_, i) => i % step === 0);

      setStats({ total:allPoints.length, shown:sample.length, segments:segsAll, segColors });

      // Centre la carte sur les données
      if (sample.length > 0 && leafletRef.current) {
        const lats = sample.map(p => p.lat);
        const lngs = sample.map(p => p.lng);
        const bounds = window.L.latLngBounds(
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        );
        leafletRef.current.fitBounds(bounds.pad(0.1), { animate:false });
      }

      renderBatch(sample, segColors);
    } catch(e) {
      setError('Erreur chargement carte : ' + e.message);
      setLoading(false);
    }
  }, [lc, lgn, selSeg, renderBatch]);

  // ── Charge Leaflet au montage ─────────────────────────────────────────────
  useEffect(() => {
    loadLeaflet()
      .then(initMap)
      .catch(() => setError('Impossible de charger Leaflet.'));
    return () => {
      if (batchRef.current) clearTimeout(batchRef.current);
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // ── Lance le rendu quand la carte est prête ───────────────────────────────
  useEffect(() => {
    if (mapReady) fetchAndRender();
  }, [mapReady]);

  // ── Relance si filtre segment change ─────────────────────────────────────
  useEffect(() => {
    if (mapReady) fetchAndRender();
  }, [selSeg]);

  // ── Bouton "configurer manuellement" si colonnes manuelles ───────────────
  const handleManualConfig = async () => {
    if (!lc || !lgn) return;
    try {
      await api.post('/api/data/geo', { latCol: lc, lngCol: lgn });
      fetchAndRender();
    } catch {}
  };

  return (
    <div>
      {/* ── Sélecteurs colonnes ───────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:'10px', alignItems:'flex-end', marginBottom:'12px', flexWrap:'wrap' }}>
        <ColSelect label="Latitude"  value={lc}  onChange={v => setLc(v)}  columns={columns} color="#10b981"/>
        <ColSelect label="Longitude" value={lgn} onChange={v => setLgn(v)} columns={columns} color="#2C7BE5"/>

        {/* Bouton appliquer si sélection manuelle */}
        {(lc || lgn) && (
          <button onClick={handleManualConfig} style={{
            padding:'8px 16px', alignSelf:'flex-end',
            background:'linear-gradient(135deg,#10b981,#059669)',
            border:'none', borderRadius:'8px', color:'white',
            fontFamily:'inherit', fontSize:'12.5px', fontWeight:'600',
            cursor:'pointer', boxShadow:'0 4px 12px rgba(16,185,129,0.3)',
            transition:'all 0.2s', whiteSpace:'nowrap',
          }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
          >✓ Appliquer</button>
        )}

        {/* Filtre segment */}
        {stats.segments.length > 0 && (
          <div style={{ flex:1, minWidth:'160px' }}>
            <span style={{ fontSize:'10px', fontWeight:'600', color:'#607CA8', textTransform:'uppercase', letterSpacing:'0.6px', display:'block', marginBottom:'4px' }}>Segment</span>
            <select value={selSeg} onChange={e => setSelSeg(e.target.value)} style={{
              width:'100%', padding:'8px 28px 8px 10px',
              background:'rgba(27,75,154,0.08)', border:'1px solid rgba(44,123,229,0.2)',
              borderRadius:'8px', color:'#e2e8f0', fontFamily:'inherit', fontSize:'12.5px',
              outline:'none', cursor:'pointer', appearance:'none',
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23607CA8'/%3E%3C/svg%3E")`,
              backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center',
            }}>
              <option value="all">Tous les segments</option>
              {stats.segments.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* Stats */}
        {stats.total > 0 && (
          <div style={{ padding:'6px 12px', background:'rgba(27,75,154,0.06)', border:'1px solid rgba(44,123,229,0.1)', borderRadius:'8px', alignSelf:'flex-end' }}>
            <span style={{ fontSize:'11px', color:'#607CA8' }}>
              <strong style={{ color:'#FFA94D' }}>{stats.total.toLocaleString('fr-FR')}</strong> pts
              {stats.shown < stats.total && <span> · {stats.shown.toLocaleString('fr-FR')} affichés</span>}
            </span>
          </div>
        )}
      </div>

      {/* ── Barre de progression ──────────────────────────────────────────── */}
      {loading && (
        <div style={{ marginBottom:'8px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
            <span style={{ fontSize:'11px', color:'#607CA8' }}>Rendu en cours…</span>
            <span style={{ fontSize:'11px', color:'#FFA94D', fontWeight:'600' }}>{progress}%</span>
          </div>
          <div style={{ height:'3px', background:'rgba(44,123,229,0.1)', borderRadius:'2px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#E87722,#2C7BE5)', borderRadius:'2px', transition:'width 0.1s' }}/>
          </div>
        </div>
      )}

      {/* ── Message pas de données géo ────────────────────────────────────── */}
      {noGeo && !loading && (
        <div style={{ padding:'14px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:'9px', marginBottom:'10px', fontSize:'12.5px', color:'#fca5a5', textAlign:'center' }}>
          ⚠️ Aucun point géographique valide trouvé dans la zone Maroc.<br/>
          <span style={{ fontSize:'11px', color:'#4A6A96' }}>Vérifiez que les colonnes lat/lng contiennent des coordonnées valides (lat: 19–37°N, lng: -18–0°E).</span>
        </div>
      )}

      {/* ── Carte ─────────────────────────────────────────────────────────── */}
      <div style={{ position:'relative', borderRadius:'12px', overflow:'hidden', border:'1px solid rgba(44,123,229,0.15)' }}>
        {!mapReady && (
          <div style={{ position:'absolute', inset:0, background:'rgba(4,9,26,0.8)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', zIndex:500 }}>
            <div style={{ width:'32px', height:'32px', border:'3px solid rgba(232,119,34,0.2)', borderTopColor:'#E87722', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            <span style={{ fontSize:'12px', color:'#607CA8' }}>Chargement de la carte…</span>
          </div>
        )}
        {error && (
          <div style={{ position:'absolute', inset:0, background:'rgba(4,9,26,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:'20px' }}>
            <p style={{ color:'#fca5a5', fontSize:'12px', textAlign:'center' }}>✕ {error}</p>
          </div>
        )}
        <div ref={mapRef} style={{ width:'100%', height:'460px' }}/>
      </div>

      {/* ── Légende segments ──────────────────────────────────────────────── */}
      {stats.segments.length > 0 && (
        <div style={{ marginTop:'12px', padding:'12px 14px', background:'rgba(6,14,36,0.6)', border:'1px solid rgba(44,123,229,0.1)', borderRadius:'10px' }}>
          <p style={{ fontSize:'10px', fontWeight:'600', color:'#607CA8', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'8px' }}>Segments</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
            {stats.segments.map((seg, i) => {
              const color = stats.segColors[seg] || getColor(i);
              const active = selSeg === seg;
              return (
                <button key={seg} onClick={() => setSelSeg(active ? 'all' : seg)} style={{
                  display:'flex', alignItems:'center', gap:'7px', padding:'5px 13px',
                  borderRadius:'20px', border:`1px solid ${active ? `${color}60` : 'rgba(44,123,229,0.12)'}`,
                  background: active ? `${color}18` : 'rgba(27,75,154,0.05)',
                  cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                }}>
                  <span style={{ width:'9px', height:'9px', borderRadius:'50%', background:color, flexShrink:0, boxShadow:`0 0 5px ${color}` }}/>
                  <span style={{ fontSize:'12px', color: active ? color : '#94a3b8', fontWeight: active ? '600' : '400' }}>{seg}</span>
                </button>
              );
            })}
            {selSeg !== 'all' && (
              <button onClick={() => setSelSeg('all')} style={{ padding:'5px 13px', borderRadius:'20px', background:'transparent', border:'1px solid rgba(44,123,229,0.1)', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', color:'#4A6A96' }}>
                ✕ Voir tout
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .leaflet-container{background:#04091A !important}
        .leaflet-tile{filter:brightness(0.85) saturate(0.7)}
        .leaflet-tooltip{background:rgba(4,9,26,0.95)!important;border:1px solid rgba(44,123,229,0.2)!important;border-radius:7px!important;color:#e2e8f0!important;box-shadow:0 4px 12px rgba(0,0,0,0.5)!important;padding:5px 9px!important}
        .leaflet-control-zoom a{background:rgba(4,9,26,0.9)!important;color:#607CA8!important;border-color:rgba(44,123,229,0.2)!important}
        .leaflet-control-zoom a:hover{background:rgba(27,75,154,0.3)!important;color:#e2e8f0!important}
        .leaflet-control-attribution{display:none}
        select option{background:#060E22;color:#e2e8f0}
      `}</style>
    </div>
  );
}

export default MapChart;