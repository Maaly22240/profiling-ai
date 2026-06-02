const express    = require('express');
const cors       = require('cors');
const multer     = require('multer');
const fs         = require('fs');
const csv        = require('csv-parser');
const xlsx       = require('xlsx');
const axios      = require('axios');
const { spawn }  = require('child_process');
const { Pool }   = require('pg');
const os         = require('os');
const path       = require('path');
require('dotenv').config();

const { router: authRouter, requireAuth } = require('./auth');

const app  = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// ── Routes publiques (sans JWT) ───────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── Toutes les routes /api/* suivantes nécessitent un token valide ────────────
app.use('/api', requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// STORE EN MÉMOIRE
// ─────────────────────────────────────────────────────────────────────────────
const store = {
  rows: [], columns: [], segmentColumn: '', mode: '',
  features: [], detected: {}, kmeansResults: null,
  latCol: null, lngCol: null,   // coordonnées géographiques
};

// ── Détection intelligente des colonnes RFM ───────────────────────────────────
function detectColumns(columns) {
  const find = (kws) => columns.find(c => kws.some(k => c.toLowerCase().includes(k))) || null;
  return {
    amount:    find(['montant','amount','solde','balance','ca','revenue','dette','facture']),
    frequency: find(['frequence','frequency','freq','nb_','count','nombre','transactions','paiement']),
    recency:   find(['recence','recency','dernier','last','jours','days','anciennete','delai']),
  };
}

// ── Stats agrégées par segment ────────────────────────────────────────────────
function computeSegmentStats(rows, segCol, detected) {
  const map = {};
  rows.forEach(r => {
    const seg = String(r[segCol] ?? 'N/A').trim();
    if (!map[seg]) map[seg] = { name:seg, count:0, sumAmt:0, sumFreq:0, sumRec:0 };
    const g = map[seg]; g.count++;
    if (detected.amount)    g.sumAmt  += parseFloat(r[detected.amount])    || 0;
    if (detected.frequency) g.sumFreq += parseFloat(r[detected.frequency]) || 0;
    if (detected.recency)   g.sumRec  += parseFloat(r[detected.recency])   || 0;
  });
  const total = rows.length || 1;
  return Object.values(map).map(g => ({
    name:         g.name,
    count:        g.count,
    pct:          +((g.count/total*100).toFixed(1)),
    totalAmount:  Math.round(g.sumAmt),
    avgAmount:    detected.amount    ? Math.round(g.sumAmt/g.count)      : null,
    avgFrequency: detected.frequency ? +(g.sumFreq/g.count).toFixed(1)  : null,
    avgRecency:   detected.recency   ? Math.round(g.sumRec/g.count)     : null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-LOAD FICHIER FIXE — backend/data/
// ─────────────────────────────────────────────────────────────────────────────
const DATA_DIR       = path.resolve(__dirname, 'data');
const FIXED_FILE_EXT = ['.xlsx', '.csv', '.txt'];

function autoLoadFixedFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁  Dossier data/ créé. Placez votre fichier dans backend/data/');
    return;
  }

  const files = fs.readdirSync(DATA_DIR).filter(f =>
    FIXED_FILE_EXT.some(ext => f.toLowerCase().endsWith(ext))
  );

  if (!files.length) {
    console.log('⚠️   Aucun fichier trouvé dans backend/data/ — dashboard vide au démarrage.');
    return;
  }

  const filePath = path.join(DATA_DIR, files[0]);
  console.log(`📂  Chargement automatique : ${files[0]}`);

  try {
    let rows, columns;

    if (filePath.toLowerCase().endsWith('.xlsx')) {
      const wb = xlsx.readFile(filePath);
      rows     = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      columns  = Object.keys(rows[0] || {});
    } else {
      const raw   = fs.readFileSync(filePath, 'utf-8');
      const lines = raw.split('\n').filter(Boolean);
      const sep   = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
      columns     = lines[0].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
      rows        = lines.slice(1).map(line => {
        const vals = line.split(sep);
        return Object.fromEntries(columns.map((c, i) => [c, (vals[i] || '').trim().replace(/^"|"$/g, '')]));
      }).filter(r => Object.values(r).some(v => v !== ''));
    }

    if (rows.length) {
      Object.assign(store, { rows, columns, detected: detectColumns(columns) });
      console.log(`✅  Fichier fixe chargé : ${rows.length} lignes · ${columns.length} colonnes`);
    }
  } catch (err) {
    console.error(`❌  Erreur chargement fichier fixe : ${err.message}`);
  }
}

// ── Route reload manuel ───────────────────────────────────────────────────────
app.get('/api/data/reload', (req, res) => {
  autoLoadFixedFile();
  if (store.rows.length) {
    res.json({ message: `Fichier fixe rechargé : ${store.rows.length} lignes.`, columns: store.columns });
  } else {
    res.status(404).json({ error: 'Aucun fichier trouvé dans backend/data/' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────
function makePgPool({ host, port, database, user, password }) {
  return new Pool({
    host, port: parseInt(port) || 5432, database, user, password,
    ssl: false, connectionTimeoutMillis: 8000, max: 3,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS Databricks
// ─────────────────────────────────────────────────────────────────────────────
async function getDatabricksClient({ hostname, httpPath, token }) {
  const { DBSQLClient } = require('@databricks/sql');
  const client = new DBSQLClient();
  await client.connect({ host: hostname, path: httpPath, token });
  return client;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. IMPORT FICHIER
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/data/import', upload.single('dataset'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  const filePath = req.file.path;
  const ext      = req.file.originalname.toLowerCase();
  const sep      = req.body.separator || ';';

  if (ext.endsWith('.xlsx')) {
    try {
      const wb   = xlsx.readFile(filePath);
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      fs.unlinkSync(filePath);
      if (!rows.length) return res.status(400).json({ error: 'Fichier vide.' });
      const columns = Object.keys(rows[0]);
      Object.assign(store, { rows, columns, detected: detectColumns(columns) });
      return res.json({ message: `Excel importé (${rows.length} lignes, ${columns.length} colonnes).`, columns, previewData: rows.slice(0,10), totalRows: rows.length });
    } catch (err) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ error: err.message });
    }
  }

  const rows = [];
  fs.createReadStream(filePath).pipe(csv({ separator: sep }))
    .on('data', r => rows.push(r))
    .on('end', () => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (!rows.length) return res.status(400).json({ error: 'Fichier vide ou séparateur incorrect.' });
      const columns = Object.keys(rows[0]);
      Object.assign(store, { rows, columns, detected: detectColumns(columns) });
      return res.json({ message: `CSV importé (${rows.length} lignes, ${columns.length} colonnes).`, columns, previewData: rows.slice(0,10), totalRows: rows.length });
    })
    .on('error', err => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); res.status(500).json({ error: err.message }); });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2a. CONNEXION BDD — PostgreSQL ou Databricks → liste des tables
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/data/connect', async (req, res) => {
  const { dbType = 'postgresql' } = req.body;

  // ── PostgreSQL ─────────────────────────────────────────────────────────────
  if (dbType === 'postgresql') {
    const { host, port, database, user, password } = req.body;
    if (!host || !database || !user || !password)
      return res.status(400).json({ error: 'Paramètres requis : host, database, user, password.' });

    const pool = makePgPool({ host, port, database, user, password });
    let client;
    try {
      client = await pool.connect();
      const result = await client.query(`
        SELECT table_schema, table_name,
          pg_size_pretty(pg_total_relation_size(
            quote_ident(table_schema)||'.'||quote_ident(table_name)
          )) AS size
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog','information_schema')
        ORDER BY table_schema, table_name
      `);
      const tables = result.rows.map(r => ({
        schema: r.table_schema, name: r.table_name,
        full: `${r.table_schema}.${r.table_name}`, size: r.size,
      }));
      return res.json({
        message: `PostgreSQL "${database}" connecté. ${tables.length} table(s) disponible(s).`,
        tables, dbConfig: { dbType, host, port, database, user, password },
      });
    } catch (err) {
      return res.status(500).json({ error: `Connexion PostgreSQL échouée : ${err.message}` });
    } finally {
      if (client) client.release();
      await pool.end().catch(() => {});
    }
  }

  // ── Databricks ─────────────────────────────────────────────────────────────
  if (dbType === 'databricks') {
    const { hostname, httpPath, token, catalog, schema } = req.body;
    if (!hostname || !httpPath || !token)
      return res.status(400).json({ error: 'Paramètres requis : hostname, httpPath, token.' });

    let client, session;
    try {
      client  = await getDatabricksClient({ hostname, httpPath, token });
      session = await client.openSession({ initialCatalog: catalog || undefined, initialSchema: schema || undefined });
      const schemaFilter = schema ? `IN SCHEMA \`${catalog || 'hive_metastore'}\`.\`${schema}\`` : '';
      const op     = await session.executeStatement(`SHOW TABLES ${schemaFilter}`, { runAsync: false });
      const result = await op.fetchAll();
      await op.close();
      const tables = (Array.isArray(result) ? result : []).map(r => {
        const name = r.tableName || r[1] || '';
        const db   = r.database  || r[0] || schema || 'default';
        return { schema: db, name, full: `${db}.${name}`, size: '—' };
      }).filter(t => t.name);
      await session.close(); await client.close();
      return res.json({
        message: `Databricks connecté. ${tables.length} table(s) trouvée(s).`,
        tables, dbConfig: { dbType, hostname, httpPath, token, catalog, schema },
      });
    } catch (err) {
      try { await session?.close(); await client?.close(); } catch (_) {}
      return res.status(500).json({ error: `Connexion Databricks échouée : ${err.message}` });
    }
  }

  return res.status(400).json({ error: `dbType non supporté : "${dbType}".` });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2b. APERÇU TABLE — colonnes + 10 lignes
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/data/preview', async (req, res) => {
  const { dbConfig, tableName } = req.body;
  if (!dbConfig || !tableName) return res.status(400).json({ error: 'dbConfig et tableName requis.' });

  if (dbConfig.dbType === 'postgresql') {
    const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['public', tableName];
    const pool = makePgPool(dbConfig);
    let client;
    try {
      client = await pool.connect();
      const colResult   = await client.query(`SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`, [schema, table]);
      const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
      const dataResult  = await client.query(`SELECT * FROM ${tableName} LIMIT 10`);
      const columns     = colResult.rows.map(r => r.column_name);
      const columnInfo  = colResult.rows.map(r => ({ name: r.column_name, type: r.data_type, nullable: r.is_nullable === 'YES' }));
      const previewData = dataResult.rows.map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, v?.toString() ?? ''])));
      return res.json({ columns, columnInfo, totalRows: parseInt(countResult.rows[0].count), previewData, tableName });
    } catch (err) {
      return res.status(500).json({ error: `Aperçu PostgreSQL échoué : ${err.message}` });
    } finally {
      if (client) client.release();
      await pool.end().catch(() => {});
    }
  }

  if (dbConfig.dbType === 'databricks') {
    let client, session;
    try {
      client  = await getDatabricksClient(dbConfig);
      session = await client.openSession();
      const countOp  = await session.executeStatement(`SELECT COUNT(*) FROM ${tableName}`, { runAsync: false });
      const countRes = await countOp.fetchAll(); await countOp.close();
      const dataOp   = await session.executeStatement(`SELECT * FROM ${tableName} LIMIT 10`, { runAsync: false });
      const schema   = await dataOp.getSchema();
      const rawRows  = await dataOp.fetchAll(); await dataOp.close();
      const fields    = schema?.columns || [];
      const columns   = fields.map(f => f.name || f.columnName || String(f));
      const columnInfo = fields.map(f => ({ name: f.name || f.columnName, type: f.typeDesc?.types?.[0]?.primitiveEntry?.type || 'string', nullable: true }));
      const previewData = rawRows.map(r => Array.isArray(r) ? Object.fromEntries(columns.map((c,i) => [c, r[i]?.toString() ?? ''])) : Object.fromEntries(Object.entries(r).map(([k,v]) => [k, v?.toString() ?? ''])));
      await session.close(); await client.close();
      return res.json({ columns, columnInfo, totalRows: parseInt(countRes[0]?.[0] || 0), previewData, tableName });
    } catch (err) {
      try { await session?.close(); await client?.close(); } catch (_) {}
      return res.status(500).json({ error: `Aperçu Databricks échoué : ${err.message}` });
    }
  }

  return res.status(400).json({ error: 'dbType non supporté.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2c. CHARGEMENT COMPLET D'UNE TABLE → store
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/data/load', async (req, res) => {
  const { dbConfig, tableName, limit } = req.body;
  if (!dbConfig || !tableName) return res.status(400).json({ error: 'dbConfig et tableName requis.' });
  const maxRows = parseInt(limit) || 100000;

  if (dbConfig.dbType === 'postgresql') {
    const pool = makePgPool(dbConfig);
    let client;
    try {
      client = await pool.connect();
      const result  = await client.query(`SELECT * FROM ${tableName} LIMIT $1`, [maxRows]);
      const columns = result.fields.map(f => f.name);
      const rows    = result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, v?.toString() ?? ''])));
      Object.assign(store, { rows, columns, detected: detectColumns(columns) });
      return res.json({ message: `Table "${tableName}" chargée : ${rows.length} lignes.`, columns, previewData: rows.slice(0,10), totalRows: rows.length });
    } catch (err) {
      return res.status(500).json({ error: `Chargement PostgreSQL échoué : ${err.message}` });
    } finally {
      if (client) client.release();
      await pool.end().catch(() => {});
    }
  }

  if (dbConfig.dbType === 'databricks') {
    let client, session;
    try {
      client  = await getDatabricksClient(dbConfig);
      session = await client.openSession();
      const op      = await session.executeStatement(`SELECT * FROM ${tableName} LIMIT ${maxRows}`, { runAsync: false });
      const schema  = await op.getSchema();
      const rawRows = await op.fetchAll(); await op.close();
      const fields  = schema?.columns || [];
      const columns = fields.map(f => f.name || f.columnName || String(f));
      const rows    = rawRows.map(r => Array.isArray(r) ? Object.fromEntries(columns.map((c,i) => [c, r[i]?.toString() ?? ''])) : Object.fromEntries(Object.entries(r).map(([k,v]) => [k, v?.toString() ?? ''])));
      Object.assign(store, { rows, columns, detected: detectColumns(columns) });
      await session.close(); await client.close();
      return res.json({ message: `Table Databricks "${tableName}" chargée : ${rows.length} lignes.`, columns, previewData: rows.slice(0,10), totalRows: rows.length });
    } catch (err) {
      try { await session?.close(); await client?.close(); } catch (_) {}
      return res.status(500).json({ error: `Chargement Databricks échoué : ${err.message}` });
    }
  }

  return res.status(400).json({ error: 'dbType non supporté.' });
});


// ─────────────────────────────────────────────────────────────────────────────
// 2d. SAUVEGARDE COLONNES GÉO — POST /api/data/geo
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/data/geo', (req, res) => {
  const { latCol, lngCol } = req.body;
  if (latCol) store.latCol = latCol;
  if (lngCol) store.lngCol = lngCol;
  console.log('[geo] Colonnes définies — Lat:', store.latCol, '· Lng:', store.lngCol);
  res.json({ message: `Coordonnées configurées — Lat: ${store.latCol} · Lng: ${store.lngCol}` });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2f. POINTS GÉOGRAPHIQUES — GET /api/data/geo-points
// Retourne UNIQUEMENT lat, lng, segment — payload minimal pour la carte
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/data/geo-points', (req, res) => {
  const { rows, segmentColumn, columns } = store;

  if (!rows.length) return res.json({ points: [], total: 0 });

  // Auto-détection si pas configuré
  const detectGeo = (kws) =>
    columns.find(c => kws.some(k => c.toLowerCase().replace(/[_\s-]/g,'').includes(k))) || null;

  const latCol = store.latCol || detectGeo(['latitude','lat','ycoord','coordlat','ylat','coordy','gps_lat','position_lat']);
  const lngCol = store.lngCol || detectGeo(['longitude','lng','lon','long','xcoord','coordlon','xlon','coordx','gps_lon','gps_lng']);

  if (!latCol || !lngCol) return res.json({ points: [], total: 0, latCol: null, lngCol: null, columns });

  // Filtre les lignes avec coordonnées valides dans la zone Maroc
  const points = [];
  for (const r of rows) {
    const la = parseFloat(r[latCol]);
    const ln = parseFloat(r[lngCol]);
    if (isNaN(la) || isNaN(ln) || la < 19 || la > 37 || ln < -18 || ln > 0) continue;
    points.push({
      lat: la,
      lng: ln,
      seg: segmentColumn ? String(r[segmentColumn] ?? 'N/A').trim() : 'N/A',
    });
  }

  // Sauvegarde pour les prochains appels
  store.latCol = latCol;
  store.lngCol = lngCol;

  res.json({ points, total: rows.length, latCol, lngCol, segmentColumn });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2e. DONNÉES PAGINÉES — pour la DataTable front (évite d'envoyer 100k lignes)
//     GET /api/data/rows?page=0&limit=200&search=&col=&val=
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/data/rows', (req, res) => {
  const { page=0, limit=200, search='', col='', val='' } = req.query;
  const pg   = parseInt(page)  || 0;
  const lim  = Math.min(parseInt(limit) || 200, 500);  // max 500 par page
  const { rows, columns } = store;

  let filtered = rows;

  // Filtre global search
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }

  // Filtre colonne spécifique
  if (col && val) {
    const q = val.toLowerCase();
    filtered = filtered.filter(r => String(r[col] ?? '').toLowerCase().includes(q));
  }

  const total = filtered.length;
  const slice = filtered.slice(pg * lim, pg * lim + lim);

  res.json({ rows: slice, total, page: pg, limit: lim, columns });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONFIG CLUSTERING — mode existant
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/clustering/config', (req, res) => {
  const { mode, targetColumn } = req.body;
  if (!mode) return res.status(400).json({ error: '"mode" requis.' });
  if (mode === 'existing') {
    if (!targetColumn) return res.status(400).json({ error: 'Colonne cible requise.' });
    store.segmentColumn = targetColumn; store.mode = 'existing';
    return res.json({ message: `Colonne "${targetColumn}" configurée.`, segmentColumn: targetColumn, mode });
  }
  return res.status(400).json({ error: 'Utilisez /api/clustering/run pour K-Means.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PIPELINE K-MEANS — SSE
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/clustering/run', (req, res) => {
  const { features: featParam, n_clusters = 'auto' } = req.query;
  if (!store.rows.length) return res.status(400).json({ error: "Aucune donnée. Importez d'abord." });
  if (!featParam)         return res.status(400).json({ error: 'Paramètre "features" requis.' });

  res.setHeader('Content-Type',                'text/event-stream');
  res.setHeader('Cache-Control',               'no-cache');
  res.setHeader('Connection',                  'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering',           'no');
  res.flushHeaders();

  const send = (type, payload) => { try { res.write('data: ' + JSON.stringify({ type, ...payload }) + '\n\n'); } catch (_) {} };

  const ts     = Date.now();
  const tmpIn  = path.join(os.tmpdir(), 'profiling_in_' + ts + '.json');
  const tmpOut = path.join(os.tmpdir(), 'profiling_out_' + ts + '.json');

  try { fs.writeFileSync(tmpIn, JSON.stringify(store.rows), 'utf-8'); }
  catch (e) { send('error', { message: 'Écriture temp: ' + e.message }); return res.end(); }

  const scriptPath = path.resolve(__dirname, 'kmeans_pipeline.py');
  if (!fs.existsSync(scriptPath)) { send('error', { message: 'Script introuvable: ' + scriptPath }); return res.end(); }

  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
  send('progress', { message: 'Lancement pipeline Python (' + pythonBin + ')…' });

  const py = spawn(pythonBin, [scriptPath, '--input', tmpIn, '--features', featParam, '--output', tmpOut, '--n_clusters', String(n_clusters)]);

  let stderrBuf = '', stdoutBuf = '';
  py.stderr.on('data', chunk => {
    stderrBuf += chunk.toString();
    const lines = stderrBuf.split('\n'); stderrBuf = lines.pop();
    for (const line of lines) {
      const t = line.trim(); if (!t) continue;
      try { const o = JSON.parse(t); if (o.progress) send('progress', { message: o.progress }); }
      catch (_) { if (t.length < 200) send('progress', { message: t }); }
    }
  });
  py.stdout.on('data', c => { stdoutBuf += c.toString(); });

  py.on('close', code => {
    try { fs.unlinkSync(tmpIn); } catch (_) {}
    if (code !== 0) { send('error', { message: 'Code sortie ' + code + '. ' + stderrBuf.slice(0, 300) }); return res.end(); }
    try {
      const out = JSON.parse(stdoutBuf.trim());
      if (!out.success) throw new Error('success!=true');
      const results = JSON.parse(fs.readFileSync(tmpOut, 'utf-8'));
      try { fs.unlinkSync(tmpOut); } catch (_) {}
      store.rows = store.rows.map((r, i) => ({ ...r, segment_kmeans: results.labels[i] || 'Inconnu' }));
      store.segmentColumn = 'segment_kmeans'; store.mode = 'new';
      store.features = featParam.split(','); store.kmeansResults = results;
      send('done', {
        message:       `K-Means terminé — ${results.n_clusters} clusters · Silhouette=${results.metrics.silhouette}`,
        segmentColumn: 'segment_kmeans', n_clusters: results.n_clusters,
        cluster_names: results.cluster_names, metrics: results.metrics,
        pca: results.pca, centroids: results.centroids, features: results.features,
      });
    } catch (e) { send('error', { message: 'Lecture résultats: ' + e.message }); }
    res.end();
  });

  py.on('error', err => {
    send('error', { message: err.code === 'ENOENT' ? '"python3" introuvable.' : 'Spawn: ' + err.message });
    res.end();
  });

  const kv = setInterval(() => res.write(': keepalive\n\n'), 15000);
  res.on('close', () => clearInterval(kv));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ANALYTICS — DASHBOARD GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/analytics/global', (_req, res) => {
  const { rows, segmentColumn, detected, columns } = store;

  // Pas de données — retourne un état vide (pas d'erreur 400)
  if (!rows.length) return res.json({ empty: true, reason: 'no_data' });

  // Données chargées mais segment pas encore configuré
  // → on tente de détecter une colonne segment automatiquement
  let segCol = segmentColumn;
  if (!segCol) {
    // Priorité 1 : colonne dont le nom EST exactement "segment" (casse insensible)
    // Priorité 2 : commence par "segment"
    // Priorité 3 : contient un des mots-clés
    const cols = columns;
    const auto =
      cols.find(c => c.toLowerCase() === 'segment') ||
      cols.find(c => c.toLowerCase().startsWith('segment')) ||
      cols.find(c => ['cluster','classe','categorie','category','type_client','profil','groupe','group','label']
        .some(k => c.toLowerCase().replace(/[_\s-]/g,'').includes(k)));
    if (auto) {
      store.segmentColumn = auto;
      segCol = auto;
      console.log('[analytics] Colonne segment auto-détectée :', auto);
    } else {
      return res.json({ empty: true, reason: 'no_segment', columns });
    }
  }

  let sumAmt=0, sumFreq=0, sumRec=0, nAmt=0, nFreq=0, nRec=0;
  rows.forEach(r => {
    if (detected.amount    && r[detected.amount])    { sumAmt  += parseFloat(r[detected.amount])    || 0; nAmt++; }
    if (detected.frequency && r[detected.frequency]) { sumFreq += parseFloat(r[detected.frequency]) || 0; nFreq++; }
    if (detected.recency   && r[detected.recency])   { sumRec  += parseFloat(r[detected.recency])   || 0; nRec++; }
  });

  const kpis = {
    totalClients:  rows.length,
    totalAmount:   nAmt  ? Math.round(sumAmt)           : null,
    avgAmount:     nAmt  ? Math.round(sumAmt/nAmt)      : null,
    avgFrequency:  nFreq ? +(sumFreq/nFreq).toFixed(1)  : null,
    avgRecency:    nRec  ? Math.round(sumRec/nRec)      : null,
    segmentCount:  new Set(rows.map(r => r[segCol])).size,
  };

  const segments = computeSegmentStats(rows, segCol, detected);
  // Scatter — 2000 pts max (recharts/Plotly ne gèrent pas plus sans freeze)
  const SCATTER_MAX = 2000;
  const scatterStep = Math.max(1, Math.floor(rows.length / SCATTER_MAX));
  const scatter = rows.filter((_, i) => i % scatterStep === 0).map(r => {
    // Inclut toutes les valeurs numériques → frontend choisit l'axe X
    const numericVals = {};
    columns.forEach(col => {
      const v = parseFloat(r[col]);
      if (!isNaN(v)) numericVals[col] = v;
    });
    return {
      y:       parseFloat(r[detected.amount])    || 0,   // Y toujours = montant
      z:       parseFloat(r[detected.frequency]) || 1,   // Z toujours = fréquence
      segment: String(r[segCol] ?? 'N/A').trim(),
      ...numericVals,   // toutes les colonnes numériques disponibles pour X
    };
  });

  // Liste des colonnes numériques disponibles pour l'axe X
  // Détection colonnes numériques (échantillon 50 lignes)
  const sample50 = rows.slice(0, 50);
  const numericColumns = columns.filter(col =>
    sample50.filter(r => !isNaN(parseFloat(r[col]))).length >= 25
  );

  res.json({ kpis, segments, scatter, detected, segmentColumn: segCol, columns, numericColumns, latCol: store.latCol, lngCol: store.lngCol });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ANALYTICS — PARETO + RADAR
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/analytics/clusters', (_req, res) => {
  const { rows, columns, detected } = store;
  let segmentColumn = store.segmentColumn;
  if (!rows.length)     return res.json({ empty: true, reason: 'no_data' });
  if (!segmentColumn) {
    // Priorité 1 : colonne dont le nom EST exactement "segment" (casse insensible)
    // Priorité 2 : commence par "segment"
    // Priorité 3 : contient un des mots-clés
    const cols = columns;
    const auto =
      cols.find(c => c.toLowerCase() === 'segment') ||
      cols.find(c => c.toLowerCase().startsWith('segment')) ||
      cols.find(c => ['cluster','classe','categorie','category','type_client','profil','groupe','group','label']
        .some(k => c.toLowerCase().replace(/[_\s-]/g,'').includes(k)));
    if (auto) { store.segmentColumn = auto; segmentColumn = auto; }
    else return res.json({ empty: true, reason: 'no_segment', columns });
  }

  const segments   = computeSegmentStats(rows, segmentColumn, detected);
  const sortKey    = detected.amount ? 'totalAmount' : 'count';
  const sorted     = [...segments].sort((a, b) => b[sortKey] - a[sortKey]);
  const grandTotal = sorted.reduce((s, g) => s + (g[sortKey] || 0), 0) || 1;
  let cumul = 0;
  const pareto = sorted.map(g => {
    cumul += g[sortKey] || 0;
    return { ...g, cumulPct: +((cumul / grandTotal) * 100).toFixed(1), isVital: cumul / grandTotal <= 0.80 };
  });

  const maxAmt  = Math.max(...segments.map(s => s.avgAmount    || 0)) || 1;
  const maxFreq = Math.max(...segments.map(s => s.avgFrequency || 0)) || 1;
  const maxRec  = Math.max(...segments.map(s => s.avgRecency   || 0)) || 1;
  const maxCnt  = Math.max(...segments.map(s => s.count))             || 1;
  const maxTot  = Math.max(...segments.map(s => s.totalAmount  || 0)) || 1;

  const radars = segments.map(s => ({
    name: s.name,
    radar: [
      { metric: 'Valeur moy.',  value: s.avgAmount    ? Math.round(s.avgAmount    / maxAmt  * 100) : 0 },
      { metric: 'Fréquence',    value: s.avgFrequency ? Math.round(s.avgFrequency / maxFreq * 100) : 0 },
      { metric: 'Récence',      value: s.avgRecency   ? Math.round((1 - s.avgRecency / maxRec) * 100) : 0 },
      { metric: 'Volume',       value: Math.round(s.count / maxCnt * 100) },
      { metric: 'CA total',     value: s.totalAmount  ? Math.round(s.totalAmount  / maxTot  * 100) : 0 },
    ],
  }));

  res.json({ pareto, radars, segments, detected, segmentColumn });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. LLM INSIGHT — Claude Sonnet
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/analytics/insight', async (req, res) => {
  const { clusterName, stats, allSegments } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const isBad = (stats.avgRecency || 0) > 60;
    return res.json({
      profil:          `Segment "${clusterName}" : ${stats.count} clients (${stats.pct}%), moy. ${stats.avgAmount ?? 'N/A'} MAD.`,
      caracteristique: isBad ? 'Clients à faible activité récente.' : 'Clients actifs à fort potentiel.',
      action:          "Ajoutez ANTHROPIC_API_KEY dans .env pour des insights IA personnalisés.",
      risque:          isBad ? 'élevé' : (stats.avgRecency || 0) > 30 ? 'moyen' : 'faible',
      priorite:        (stats.avgAmount || 0) > 200 ? 'haute' : 'normale',
      source:          'fallback',
    });
  }

  try {
    const prompt = `Tu es expert en analyse de portefeuille clients pour une société de distribution d'eau (Mauritanie, SNDE).

Contexte global :
${(allSegments||[]).map(s => `• ${s.name} : ${s.count} clients (${s.pct}%), moy. ${s.avgAmount ?? 'N/A'} MAD`).join('\n')}

Segment : "${clusterName}" — ${stats.count} clients (${stats.pct}%), moy. ${stats.avgAmount ?? 'N/A'} MAD, récence ${stats.avgRecency ?? 'N/A'}j, fréquence ${stats.avgFrequency ?? 'N/A'}tx.
${stats.isVital ? '⚠️ Segment VITAL Pareto (80% CA).' : ''}

Réponds UNIQUEMENT avec un JSON valide sans backticks :
{"profil":"...","caracteristique":"...","action":"...","risque":"faible|moyen|élevé","priorite":"haute|normale|basse"}`;

    const r = await axios.post('https://api.anthropic.com/v1/messages',
      { model: 'claude-sonnet-4-20250514', max_tokens: 400, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } }
    );
    res.json({ ...JSON.parse(r.data.content[0]?.text.replace(/```json|```/g, '').trim()), source: 'claude' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. EXPORT CSV
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/export/csv', (_req, res) => {
  const { rows, columns, segmentColumn } = store;
  if (!rows.length) return res.status(400).json({ error: 'Aucune donnée à exporter.' });
  const allCols = [...new Set([...columns, ...(segmentColumn ? [segmentColumn] : [])])];
  const esc     = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s; };
  res.setHeader('Content-Type',        'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="profiling_export_${Date.now()}.csv"`);
  res.send('\uFEFF' + allCols.map(esc).join(',') + '\n' + rows.map(r => allCols.map(c => esc(r[c] ?? '')).join(',')).join('\n'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. EXPORT EXCEL
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/export/xlsx', (_req, res) => {
  const { rows, columns, segmentColumn, kmeansResults } = store;
  if (!rows.length) return res.status(400).json({ error: 'Aucune donnée à exporter.' });

  const allCols = [...new Set([...columns, ...(segmentColumn ? [segmentColumn] : [])])];
  const wsData  = xlsx.utils.json_to_sheet(rows.map(r => Object.fromEntries(allCols.map(c => [c, r[c] ?? '']))));
  wsData['!cols'] = allCols.map(c => ({ wch: Math.max(c.length, ...rows.slice(0,100).map(r => String(r[c] ?? '').length), 8) }));

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, wsData, 'Données & Segments');

  if (segmentColumn) {
    const { rows: r2, detected } = store;
    const map = {};
    r2.forEach(r => {
      const seg = String(r[segmentColumn] ?? 'N/A').trim();
      if (!map[seg]) map[seg] = { Segment:seg, Clients:0, s:0, re:0, fr:0 };
      map[seg].Clients++;
      if (detected.amount)    map[seg].s  += parseFloat(r[detected.amount])    || 0;
      if (detected.recency)   map[seg].re += parseFloat(r[detected.recency])   || 0;
      if (detected.frequency) map[seg].fr += parseFloat(r[detected.frequency]) || 0;
    });
    const sRows = Object.values(map).map(s => ({
      Segment:          s.Segment,
      Clients:          s.Clients,
      '% Portefeuille': +((s.Clients / r2.length * 100).toFixed(1)),
      'Montant total':  Math.round(s.s),
      'Montant moyen':  detected.amount    ? Math.round(s.s / s.Clients) : 'N/A',
      'Récence moy.':   detected.recency   ? Math.round(s.re / s.Clients) : 'N/A',
      'Fréquence moy.': detected.frequency ? +(s.fr / s.Clients).toFixed(1) : 'N/A',
    })).sort((a, b) => b['Montant total'] - a['Montant total']);
    const wsStat = xlsx.utils.json_to_sheet(sRows);
    wsStat['!cols'] = Object.keys(sRows[0] || {}).map(k => ({ wch: Math.max(k.length, 12) }));
    xlsx.utils.book_append_sheet(wb, wsStat, 'Statistiques Segments');
  }

  if (kmeansResults?.metrics) {
    const m = kmeansResults.metrics;
    const wsMet = xlsx.utils.json_to_sheet([
      { Métrique: 'Silhouette Score',        Valeur: m.silhouette,         Interprétation: m.silhouette >= 0.5 ? 'Excellent' : m.silhouette >= 0.3 ? 'Acceptable' : 'Faible' },
      { Métrique: 'Davies-Bouldin Index',    Valeur: m.davies_bouldin,     Interprétation: 'Plus bas = meilleure séparation' },
      { Métrique: 'Calinski-Harabász Score', Valeur: m.calinski_harabasz,  Interprétation: 'Plus haut = clusters plus denses' },
      { Métrique: 'Nombre de clusters (k)',  Valeur: m.optimal_k,          Interprétation: 'Déterminé par Elbow + Silhouette' },
    ]);
    wsMet['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 34 }];
    xlsx.utils.book_append_sheet(wb, wsMet, 'Métriques K-Means');
  }

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="profiling_export_${Date.now()}.xlsx"`);
  res.send(buf);
});

// ─────────────────────────────────────────────────────────────────────────────
// DÉMARRAGE
// ─────────────────────────────────────────────────────────────────────────────
autoLoadFixedFile();   // ← charge le fichier fixe au démarrage

app.listen(PORT, () => console.log(`✅  Serveur prêt sur le port ${PORT}`));