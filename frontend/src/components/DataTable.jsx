import { useState, useMemo } from 'react';

const inputBase = {
  padding: '8px 12px',
  background: 'rgba(27,75,154,0.08)',
  border: '1px solid rgba(232,119,34,0.2)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '12.5px',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const PAGE_OPTIONS = [10, 25, 50, 100, 250, 'Tout'];

// ── Highlight matching text ───────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const str = String(text ?? '');
  const q   = query.toLowerCase();
  const idx = str.toLowerCase().indexOf(q);
  if (idx < 0) return <>{str}</>;
  return (
    <>
      {str.slice(0, idx)}
      <mark style={{ background: 'rgba(232,119,34,0.35)', color: '#FFD0A0', borderRadius: '2px', padding: '0 1px' }}>
        {str.slice(idx, idx + q.length)}
      </mark>
      {str.slice(idx + q.length)}
    </>
  );
}

function NavBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '5px 10px', borderRadius: '6px', minWidth: '30px',
      border: '1px solid rgba(44,123,229,0.12)',
      background: disabled ? 'transparent' : 'rgba(27,75,154,0.06)',
      color: disabled ? '#162140' : '#607CA8',
      fontFamily: 'inherit', fontSize: '13px',
      cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s',
    }}>{children}</button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DataTable({ columns = [], allRows = [], title = 'Données importées', compact = false }) {
  const [search,      setSearch]      = useState('');
  const [colFilters,  setColFilters]  = useState({});
  const [pageSize,    setPageSize]    = useState(25);
  const [page,        setPage]        = useState(1);
  const [sortCol,     setSortCol]     = useState(null);
  const [sortDir,     setSortDir]     = useState('asc');
  const [showFilters, setShowFilters] = useState(false);

  const setColFilter = (col, val) => { setColFilters(p => ({ ...p, [col]: val })); setPage(1); };
  const clearAll     = () => { setColFilters({}); setSearch(''); setPage(1); };
  const activeCount  = Object.values(colFilters).filter(Boolean).length + (search ? 1 : 0);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r => columns.some(c => String(r[c] ?? '').toLowerCase().includes(q)));
    }
    Object.entries(colFilters).forEach(([col, val]) => {
      if (val?.trim()) {
        const q = val.trim().toLowerCase();
        rows = rows.filter(r => String(r[col] ?? '').toLowerCase().includes(q));
      }
    });
    return rows;
  }, [allRows, search, colFilters, columns]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? ''; const bv = b[sortCol] ?? '';
      const an = parseFloat(av);   const bn = parseFloat(bv);
      if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortCol, sortDir]);

  // ── Paginate ──────────────────────────────────────────────────────────────
  const effSize   = pageSize === 'Tout' ? sorted.length || 1 : pageSize;
  const totalPgs  = Math.max(1, Math.ceil(sorted.length / effSize));
  const curPage   = Math.min(page, totalPgs);
  const pageRows  = sorted.slice((curPage - 1) * effSize, curPage * effSize);
  const fmt       = n => n.toLocaleString('fr-FR');

  // Highlight query per cell
  const getHighlight = (col) => (colFilters[col] || search) || '';

  return (
    <div>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#4A6A96', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text" placeholder="Recherche globale…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inputBase, width: '100%', paddingLeft: '30px', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#E87722'}
            onBlur={e => e.target.style.borderColor = 'rgba(232,119,34,0.2)'}
          />
          {search && <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4A6A96', cursor: 'pointer', fontSize: '12px' }}>✕</button>}
        </div>

        {/* Filtres colonnes toggle */}
        <button onClick={() => setShowFilters(f => !f)} style={{
          ...inputBase, cursor: 'pointer', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: '6px',
          borderColor: showFilters ? 'rgba(232,119,34,0.5)' : 'rgba(232,119,34,0.2)',
          background: showFilters ? 'rgba(232,119,34,0.1)' : 'rgba(27,75,154,0.08)',
          color: showFilters ? '#FFA94D' : '#607CA8',
        }}>
          ⚙ Filtres
          {activeCount > 0 && <span style={{ background: '#E87722', color: 'white', borderRadius: '10px', fontSize: '10px', padding: '1px 6px', fontWeight: '700' }}>{activeCount}</span>}
        </button>

        {/* Lignes par page — liste déroulante */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '11px', color: '#4A6A96', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Lignes</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(e.target.value === 'Tout' ? 'Tout' : Number(e.target.value)); setPage(1); }}
            style={{
              ...inputBase, padding: '7px 10px', cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none',
              paddingRight: '28px', minWidth: '70px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
            }}
          >
            {PAGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {activeCount > 0 && (
          <button onClick={clearAll} style={{ ...inputBase, cursor: 'pointer', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', fontSize: '12px', whiteSpace: 'nowrap' }}>✕ Réinitialiser</button>
        )}
      </div>

      {/* ── Filtres par colonne ───────────────────────────────────────────── */}
      {showFilters && (
        <div style={{ background: 'rgba(4,9,26,0.4)', border: '1px solid rgba(232,119,34,0.1)', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px', animation: 'fadeSlideUp 0.2s ease both' }}>
          <p style={{ fontSize: '10px', fontWeight: '600', color: '#4A6A96', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Filtrer par colonne</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {columns.map(col => (
              <div key={col}>
                <p style={{ fontSize: '10px', color: '#2E4A72', fontWeight: '500', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col}>{col}</p>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Filtrer…" value={colFilters[col] || ''}
                    onChange={e => setColFilter(col, e.target.value)}
                    style={{ ...inputBase, width: '100%', boxSizing: 'border-box', fontSize: '11.5px', padding: '6px 24px 6px 9px' }}
                    onFocus={e => e.target.style.borderColor = '#E87722'}
                    onBlur={e => e.target.style.borderColor = 'rgba(232,119,34,0.2)'}
                  />
                  {colFilters[col] && <button onClick={() => setColFilter(col, '')} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4A6A96', cursor: 'pointer', fontSize: '10px' }}>✕</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats ligne */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <p style={{ fontSize: '11.5px', color: '#4A6A96' }}>
          {activeCount > 0
            ? <><span style={{ color: '#E87722' }}>{fmt(filtered.length)}</span> résultat{filtered.length > 1 ? 's' : ''} sur {fmt(allRows.length)} lignes</>
            : <>{fmt(allRows.length)} ligne{allRows.length > 1 ? 's' : ''} · {columns.length} colonnes</>
          }
        </p>
        {totalPgs > 1 && (
          <p style={{ fontSize: '11px', color: '#2E4A72' }}>
            Page {curPage} / {totalPgs}
          </p>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(232,119,34,0.12)', marginBottom: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? '11.5px' : '12.5px' }}>
          <thead>
            <tr style={{ background: 'rgba(232,119,34,0.08)' }}>
              {columns.map(col => (
                <th key={col} onClick={() => handleSort(col)} style={{
                  padding: compact ? '8px 12px' : '10px 14px', textAlign: 'left',
                  color: sortCol === col ? '#FFA94D' : '#607CA8',
                  fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px',
                  whiteSpace: 'nowrap', borderBottom: '1px solid rgba(232,119,34,0.15)',
                  cursor: 'pointer', userSelect: 'none', transition: 'color 0.15s',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {col}
                    <span style={{ opacity: sortCol === col ? 1 : 0.3, fontSize: '9px' }}>
                      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                    {colFilters[col] && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E87722', flexShrink: 0 }} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0
              ? <tr><td colSpan={columns.length} style={{ padding: '36px', textAlign: 'center', color: '#4A6A96', fontSize: '13px' }}>Aucun résultat</td></tr>
              : pageRows.map((row, i) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid rgba(27,75,154,0.08)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,119,34,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  {columns.map(col => (
                    <td key={col} title={String(row[col] ?? '')} style={{ padding: compact ? '7px 12px' : '9px 14px', color: '#94a3b8', whiteSpace: 'nowrap', fontFamily: "'DM Mono',monospace", maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Highlight text={row[col] ?? '—'} query={getHighlight(col)} />
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPgs > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '11px', color: '#2E4A72' }}>
            {fmt((curPage - 1) * effSize + 1)}–{fmt(Math.min(curPage * effSize, sorted.length))} sur {fmt(sorted.length)}
          </p>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
            <NavBtn onClick={() => setPage(1)} disabled={curPage === 1}>«</NavBtn>
            <NavBtn onClick={() => setPage(p => p - 1)} disabled={curPage === 1}>‹</NavBtn>
            {Array.from({ length: totalPgs }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPgs || Math.abs(p - curPage) <= 2)
              .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
              .map((p, i) => p === '…'
                ? <span key={'e' + i} style={{ color: '#2E4A72', padding: '0 3px', fontSize: '12px' }}>…</span>
                : <button key={p} onClick={() => setPage(p)} style={{
                    padding: '5px 9px', borderRadius: '6px', border: `1px solid ${p === curPage ? 'rgba(232,119,34,0.4)' : 'rgba(44,123,229,0.12)'}`,
                    background: p === curPage ? 'rgba(232,119,34,0.2)' : 'rgba(27,75,154,0.06)',
                    color: p === curPage ? '#FFA94D' : '#607CA8',
                    fontFamily: 'inherit', fontSize: '12px', cursor: 'pointer', transition: 'all 0.1s',
                  }}>{p}</button>
              )}
            <NavBtn onClick={() => setPage(p => p + 1)} disabled={curPage === totalPgs}>›</NavBtn>
            <NavBtn onClick={() => setPage(totalPgs)} disabled={curPage === totalPgs}>»</NavBtn>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        select option{background:#060E22;color:#e2e8f0}
      `}</style>
    </div>
  );
}