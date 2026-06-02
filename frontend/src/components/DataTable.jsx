import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../api';

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

// ─────────────────────────────────────────────────────────────────────────────
// MODE SERVEUR — appelle /api/data/rows avec pagination
// MODE CLIENT  — pagine localement si allRows fourni directement
// ─────────────────────────────────────────────────────────────────────────────
function DataTable({ columns = [], allRows = [], compact = false, serverMode = false }) {
  const [page,        setPage]        = useState(0);
  const [pageSize,    setPageSize]    = useState(compact ? 50 : 100);
  const [search,      setSearch]      = useState('');
  const [filterCol,   setFilterCol]   = useState('');
  const [filterVal,   setFilterVal]   = useState('');
  const [sortCol,     setSortCol]     = useState('');
  const [sortDir,     setSortDir]     = useState('asc');
  const [serverRows,  setServerRows]  = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const searchDebounce = useRef(null);

  // ── Mode serveur : fetch paginé ──────────────────────────────────────────
  const fetchServer = useCallback(async (pg, lim, srch, col, val) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page:pg, limit:lim, search:srch, col:col||'', val:val||'' });
      const r = await api.get(`/api/data/rows?${params}`);
      setServerRows(r.data.rows);
      setServerTotal(r.data.total);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!serverMode) return;
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(0);
      fetchServer(0, pageSize, search, filterCol, filterVal);
    }, 300);
  }, [search, filterCol, filterVal, pageSize, serverMode]);

  useEffect(() => {
    if (serverMode) fetchServer(page, pageSize, search, filterCol, filterVal);
  }, [page, serverMode]);

  // ── Mode client : filtre + tri + pagination localement ──────────────────
  const clientFiltered = useMemo(() => {
    if (serverMode) return serverRows;
    let rows = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
    }
    if (filterCol && filterVal.trim()) {
      const q = filterVal.trim().toLowerCase();
      rows = rows.filter(r => String(r[filterCol] ?? '').toLowerCase().includes(q));
    }
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
        const an = parseFloat(av), bn = parseFloat(bv);
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [allRows, search, filterCol, filterVal, sortCol, sortDir, serverMode, serverRows]);

  const total      = serverMode ? serverTotal : clientFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const displayRows = serverMode
    ? serverRows
    : clientFiltered.slice(page * pageSize, page * pageSize + pageSize);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  const handleSearch = (val) => {
    setSearch(val); setPage(0);
    if (serverMode) {
      clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(() => fetchServer(0, pageSize, val, filterCol, filterVal), 300);
    }
  };

  // ── Colonnes à afficher (max 20 pour la lisibilité) ───────────────────────
  const visibleCols = columns.slice(0, 20);
  const hasMore     = columns.length > 20;

  const cell = {
    padding: compact ? '6px 10px' : '9px 12px',
    borderBottom: '1px solid rgba(44,123,229,0.06)',
    fontSize: compact ? '11.5px' : '12.5px',
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '180px',
  };

  return (
    <div>
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap', alignItems:'center' }}>
        {/* Search global */}
        <div style={{ position:'relative', flex:'1', minWidth:'180px' }}>
          <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#4A6A96', pointerEvents:'none' }}>🔍</span>
          <input
            type="text" placeholder="Recherche globale…" value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ ...inputSt, paddingLeft:'30px', width:'100%', boxSizing:'border-box' }}
          />
        </div>

        {/* Filtre colonne */}
        {columns.length > 0 && (
          <>
            <select value={filterCol} onChange={e=>{ setFilterCol(e.target.value); setFilterVal(''); setPage(0); }}
              style={{ ...inputSt, maxWidth:'160px' }}>
              <option value="">— Colonne —</option>
              {visibleCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {filterCol && (
              <input type="text" placeholder={`Filtrer ${filterCol}…`} value={filterVal}
                onChange={e=>{ setFilterVal(e.target.value); setPage(0); if(serverMode){ clearTimeout(searchDebounce.current); searchDebounce.current=setTimeout(()=>fetchServer(0,pageSize,search,filterCol,e.target.value),300); } }}
                style={{ ...inputSt, maxWidth:'140px' }}
              />
            )}
          </>
        )}

        {/* Page size */}
        <select value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(0); }}
          style={{ ...inputSt, maxWidth:'110px' }}>
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} lignes</option>)}
        </select>

        {/* Info */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginLeft:'auto' }}>
          {loading && <div style={{ width:'14px', height:'14px', border:'2px solid rgba(232,119,34,0.2)', borderTopColor:'#E87722', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }}/>}
          <span style={{ fontSize:'11px', color:'#4A6A96', whiteSpace:'nowrap' }}>
            {total.toLocaleString('fr-FR')} ligne{total > 1 ? 's' : ''}
            {!serverMode && allRows.length > 0 && total < allRows.length && ` / ${allRows.length.toLocaleString('fr-FR')}`}
          </span>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{ overflowX:'auto', overflowY:'auto', maxHeight: compact ? '300px' : '460px', borderRadius:'10px', border:'1px solid rgba(44,123,229,0.1)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize: compact?'11.5px':'12.5px' }}>
          <thead style={{ position:'sticky', top:0, zIndex:10, background:'rgba(4,9,26,0.97)', backdropFilter:'blur(8px)' }}>
            <tr>
              {visibleCols.map(col => (
                <th key={col} onClick={() => { handleSort(col); }}
                  style={{ ...cell, color:'#607CA8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px', cursor:'pointer', background:'transparent', textAlign:'left', userSelect:'none', transition:'color 0.15s', whiteSpace:'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.color='#FFA94D'}
                  onMouseLeave={e => e.currentTarget.style.color='#607CA8'}
                >
                  {col}
                  {sortCol === col && <span style={{ marginLeft:'4px', color:'#E87722', fontSize:'10px' }}>{sortDir==='asc'?'▲':'▼'}</span>}
                </th>
              ))}
              {hasMore && <th style={{ ...cell, color:'#2E4A72', fontSize:'10px' }}>+{columns.length - 20} col.</th>}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && !loading && (
              <tr><td colSpan={visibleCols.length + (hasMore?1:0)} style={{ ...cell, textAlign:'center', color:'#2E4A72', padding:'24px' }}>Aucune donnée</td></tr>
            )}
            {displayRows.map((row, i) => (
              <tr key={i}
                style={{ background: i%2===0?'transparent':'rgba(27,75,154,0.03)', transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(232,119,34,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background=i%2===0?'transparent':'rgba(27,75,154,0.03)'}
              >
                {visibleCols.map(col => (
                  <td key={col} style={cell} title={String(row[col] ?? '')}>
                    {String(row[col] ?? '')}
                  </td>
                ))}
                {hasMore && <td style={{ ...cell, color:'#2E4A72' }}>…</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', marginTop:'12px', flexWrap:'wrap' }}>
          <PagBtn onClick={()=>setPage(0)}    disabled={page===0}          label="«" />
          <PagBtn onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} label="‹" />

          {/* Pages visibles */}
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pg;
            if (totalPages <= 7) pg = i;
            else if (page < 4)   pg = i;
            else if (page > totalPages - 5) pg = totalPages - 7 + i;
            else pg = page - 3 + i;
            return (
              <button key={pg} onClick={() => setPage(pg)} style={{
                width:'30px', height:'30px', borderRadius:'7px', border:'none',
                background: pg===page ? 'linear-gradient(135deg,#E87722,#D4620D)' : 'rgba(44,123,229,0.08)',
                color: pg===page ? 'white' : '#607CA8',
                fontSize:'12px', fontWeight: pg===page?'700':'400',
                cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit',
              }}>{pg + 1}</button>
            );
          })}

          <PagBtn onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} label="›" />
          <PagBtn onClick={()=>setPage(totalPages-1)} disabled={page===totalPages-1} label="»" />

          <span style={{ fontSize:'11px', color:'#4A6A96', marginLeft:'8px' }}>
            Page {page+1} / {totalPages.toLocaleString('fr-FR')}
          </span>
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        select option{background:#060E22;color:#e2e8f0}
      `}</style>
    </div>
  );
}

function PagBtn({ onClick, disabled, label }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'30px', height:'30px', borderRadius:'7px',
      border:'1px solid rgba(44,123,229,0.12)',
      background: disabled ? 'transparent' : 'rgba(44,123,229,0.08)',
      color: disabled ? '#162140' : '#607CA8',
      fontSize:'14px', cursor: disabled?'default':'pointer',
      transition:'all 0.15s', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center',
    }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.background='rgba(44,123,229,0.15)'; }}
      onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.background='rgba(44,123,229,0.08)'; }}
    >{label}</button>
  );
}

const inputSt = {
  padding:'7px 12px', background:'rgba(27,75,154,0.08)',
  border:'1px solid rgba(44,123,229,0.2)', borderRadius:'8px',
  color:'#e2e8f0', fontFamily:'inherit', fontSize:'12.5px',
  outline:'none', transition:'border-color 0.2s',
};

export default DataTable;