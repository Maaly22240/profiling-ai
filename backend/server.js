const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const fs       = require('fs');
const csv      = require('csv-parser');
const xlsx     = require('xlsx');
const axios    = require('axios');
const { spawn } = require('child_process');
const os       = require('os');
const path     = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// ─────────────────────────────────────────────────────────────────────────────
// STORE EN MÉMOIRE (réinitialisé à chaque import)
// ─────────────────────────────────────────────────────────────────────────────
const store = {
  rows: [], columns: [], segmentColumn: '', mode: '', features: [], detected: {},
};

// ── Détection intelligente des colonnes RFM ──────────────────────────────────
function detectColumns(columns) {
  const find = (kws) => columns.find(c => kws.some(k => c.toLowerCase().includes(k))) || null;
  return {
    amount:    find(['montant','amount','solde','balance','ca','revenue','dette','facture']),
    frequency: find(['frequence','frequency','freq','nb_','count','nombre','transactions','paiement']),
    recency:   find(['recence','recency','dernier','last','jours','days','anciennete','delai']),
  };
}

// ── Stats agrégées par segment ───────────────────────────────────────────────
function computeSegmentStats(rows, segCol, detected) {
  const map = {};
  rows.forEach(r => {
    const seg = String(r[segCol] ?? 'N/A').trim();
    if (!map[seg]) map[seg] = { name: seg, count: 0, sumAmt: 0, sumFreq: 0, sumRec: 0 };
    const g = map[seg];
    g.count++;
    if (detected.amount)    g.sumAmt  += parseFloat(r[detected.amount])    || 0;
    if (detected.frequency) g.sumFreq += parseFloat(r[detected.frequency]) || 0;
    if (detected.recency)   g.sumRec  += parseFloat(r[detected.recency])   || 0;
  });
  const total = rows.length || 1;
  return Object.values(map).map(g => ({
    name:         g.name,
    count:        g.count,
    pct:          +((g.count / total * 100).toFixed(1)),
    totalAmount:  Math.round(g.sumAmt),
    avgAmount:    detected.amount    ? Math.round(g.sumAmt / g.count)        : null,
    avgFrequency: detected.frequency ? +(g.sumFreq / g.count).toFixed(1)     : null,
    avgRecency:   detected.recency   ? Math.round(g.sumRec / g.count)        : null,
  }));
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
      return res.json({ message: `Excel importé (${rows.length} lignes, ${columns.length} colonnes).`, columns, previewData: rows.slice(0,5), allRows: rows });
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
      if (!rows.length) return res.status(400).json({ error: 'Fichier vide ou mauvais séparateur.' });
      const columns = Object.keys(rows[0]);
      Object.assign(store, { rows, columns, detected: detectColumns(columns) });
      return res.json({ message: `CSV importé (${rows.length} lignes, ${columns.length} colonnes).`, columns, previewData: rows.slice(0,5), allRows: rows });
    })
    .on('error', err => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); res.status(500).json({ error: err.message }); });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONNEXION BASE DE DONNÉES
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/data/connect', (req, res) => {
  const { type, host, user, password } = req.body;
  if (!host || !user || !password) return res.status(400).json({ error: 'Paramètres incomplets.' });
  setTimeout(() => {
    const segs  = ['Champion','Actif','À risque','Inactif'];
    const rows  = Array.from({ length: 350 }, (_, i) => ({
      id_client: String(1000 + i),
      montant:   String(+(20 + Math.random() * 580).toFixed(0)),
      frequence: String(+(1  + Math.random() * 9).toFixed(0)),
      recence:   String(+(1  + Math.random() * 120).toFixed(0)),
      segment_actuel: segs[Math.floor(Math.random() * segs.length)],
    }));
    const columns = Object.keys(rows[0]);
    Object.assign(store, { rows, columns, detected: detectColumns(columns) });
    res.json({ message: `Connexion à ${type||'BDD'} (${host}) réussie.`, columns, previewData: rows.slice(0,5), allRows: rows });
  }, 1000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONFIGURATION CLUSTERING
// ─────────────────────────────────────────────────────────────────────────────
// ── Mode existant : réponse immédiate ────────────────────────────────────────
app.post('/api/clustering/config', (req, res) => {
  const { mode, targetColumn, features } = req.body;
  if (!mode) return res.status(400).json({ error: '"mode" requis.' });

  if (mode === 'existing') {
    if (!targetColumn) return res.status(400).json({ error: 'Colonne cible requise.' });
    store.segmentColumn = targetColumn; store.mode = 'existing';
    return res.json({ message: `Colonne "${targetColumn}" configurée.`, segmentColumn: targetColumn, mode });
  }
  return res.status(400).json({ error: `Mode inconnu : "${mode}". Utilisez /api/clustering/run pour K-Means.` });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3b. PIPELINE K-MEANS — Server-Sent Events (progression en temps réel)
//     GET  /api/clustering/run?features=f1,f2&n_clusters=auto
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/clustering/run', (req, res) => {
  const { features: featParam, n_clusters = 'auto' } = req.query;

  if (!store.rows.length)
    return res.status(400).json({ error: "Aucune donnée en mémoire. Importez d'abord un fichier." });
  if (!featParam)
    return res.status(400).json({ error: 'Paramètre "features" requis.' });

  // ── SSE headers (CORS + no-buffer) ────────────────────────────────────────
  res.setHeader('Content-Type',                'text/event-stream');
  res.setHeader('Cache-Control',               'no-cache');
  res.setHeader('Connection',                  'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering',           'no');
  res.flushHeaders();

  const send = (type, payload) => {
    try { res.write('data: ' + JSON.stringify({ type, ...payload }) + '\n\n'); } catch(_){}
  };

  // ── Fichiers temporaires ───────────────────────────────────────────────────
  const ts        = Date.now();
  const tmpInput  = path.join(os.tmpdir(), 'profiling_in_'  + ts + '.json');
  const tmpOutput = path.join(os.tmpdir(), 'profiling_out_' + ts + '.json');

  try {
    fs.writeFileSync(tmpInput, JSON.stringify(store.rows), 'utf-8');
  } catch (e) {
    send('error', { message: 'Impossible écrire données temp : ' + e.message });
    return res.end();
  }

  // ── Vérifie que le script existe ──────────────────────────────────────────
  const scriptPath = path.resolve(__dirname, 'kmeans_pipeline.py');
  if (!fs.existsSync(scriptPath)) {
    send('error', { message: 'Script introuvable : ' + scriptPath + '. Placez kmeans_pipeline.py dans le même dossier que server.js.' });
    return res.end();
  }

  // ── Choix de l'exécutable Python ──────────────────────────────────────────
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';

  send('progress', { message: 'Lancement du pipeline Python (' + pythonBin + ')…' });
  console.log('[kmeans] spawn:', pythonBin, scriptPath);

  const py = spawn(pythonBin, [
    scriptPath,
    '--input',      tmpInput,
    '--features',   featParam,
    '--output',     tmpOutput,
    '--n_clusters', String(n_clusters),
  ]);

  // ── Progression via stderr ────────────────────────────────────────────────
  let stderrBuf = '';
  py.stderr.on('data', (chunk) => {
    stderrBuf += chunk.toString();
    const lines = stderrBuf.split('\n');
    stderrBuf = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      console.log('[kmeans stderr]', t);
      try {
        const obj = JSON.parse(t);
        if (obj.progress) send('progress', { message: obj.progress });
      } catch(_) {
        // warnings Python non-JSON — envoyés quand même comme info
        if (t.length < 200) send('progress', { message: t });
      }
    }
  });

  // ── Résultat via stdout ───────────────────────────────────────────────────
  let stdoutBuf = '';
  py.stdout.on('data', (chunk) => { stdoutBuf += chunk.toString(); });

  py.on('close', (code) => {
    try { fs.unlinkSync(tmpInput); } catch(_){}
    console.log('[kmeans] exit code:', code, '| stdout:', stdoutBuf.slice(0,200));

    if (code !== 0) {
      send('error', { message: 'Code de sortie Python : ' + code + '. Stderr : ' + stderrBuf.slice(0, 400) });
      return res.end();
    }

    try {
      const stdoutObj = JSON.parse(stdoutBuf.trim());
      if (!stdoutObj.success) throw new Error('success != true');

      const results = JSON.parse(fs.readFileSync(tmpOutput, 'utf-8'));
      try { fs.unlinkSync(tmpOutput); } catch(_){}

      store.rows = store.rows.map((r, i) => ({
        ...r,
        segment_kmeans: results.labels[i] || 'Inconnu',
      }));
      store.segmentColumn = 'segment_kmeans';
      store.mode          = 'new';
      store.features      = featParam.split(',');
      store.kmeansResults = results;

      send('done', {
        message:       'K-Means terminé — ' + results.n_clusters + ' clusters · Silhouette = ' + results.metrics.silhouette,
        segmentColumn: 'segment_kmeans',
        n_clusters:    results.n_clusters,
        cluster_names: results.cluster_names,
        metrics:       results.metrics,
        pca:           results.pca,
        centroids:     results.centroids,
        features:      results.features,
      });

    } catch (e) {
      send('error', { message: 'Erreur lecture résultats : ' + e.message + ' | stdout: ' + stdoutBuf.slice(0,300) });
    }

    res.end();
  });

  py.on('error', (err) => {
    console.error('[kmeans] spawn error:', err);
    // Fallback python si python3 échoue sur Windows
    if (err.code === 'ENOENT' && pythonBin === 'python3') {
      send('error', { message: '"python3" introuvable. Renommez votre exécutable ou ajoutez python3 au PATH. Sur Windows, essayez "python".' });
    } else {
      send('error', { message: 'Impossible de lancer Python : ' + err.message });
    }
    res.end();
  });

  // ── Keepalive toutes les 15s (évite timeout nginx/proxy) ─────────────────
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 15000);
  res.on('close', () => clearInterval(keepalive));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ANALYTICS — DASHBOARD GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/analytics/global', (_req, res) => {
  const { rows, segmentColumn, detected, columns } = store;
  if (!rows.length)   return res.status(400).json({ error: 'Aucune donnée.' });
  if (!segmentColumn) return res.status(400).json({ error: 'Segment non configuré.' });

  let sumAmt = 0, sumFreq = 0, sumRec = 0, nAmt = 0, nFreq = 0, nRec = 0;
  rows.forEach(r => {
    if (detected.amount    && r[detected.amount])    { sumAmt  += parseFloat(r[detected.amount])    || 0; nAmt++; }
    if (detected.frequency && r[detected.frequency]) { sumFreq += parseFloat(r[detected.frequency]) || 0; nFreq++; }
    if (detected.recency   && r[detected.recency])   { sumRec  += parseFloat(r[detected.recency])   || 0; nRec++; }
  });

  const kpis = {
    totalClients:  rows.length,
    totalAmount:   nAmt  ? Math.round(sumAmt)             : null,
    avgAmount:     nAmt  ? Math.round(sumAmt / nAmt)      : null,
    avgFrequency:  nFreq ? +(sumFreq / nFreq).toFixed(1)  : null,
    avgRecency:    nRec  ? Math.round(sumRec / nRec)      : null,
    segmentCount:  new Set(rows.map(r => r[segmentColumn])).size,
  };

  const segments = computeSegmentStats(rows, segmentColumn, detected);

  // Scatter — échantillon 300 pts max
  const step    = Math.max(1, Math.floor(rows.length / 300));
  const scatter = rows
    .filter((_, i) => i % step === 0)
    .map(r => ({
      x:       parseFloat(r[detected.recency])   || 0,
      y:       parseFloat(r[detected.amount])    || 0,
      z:       parseFloat(r[detected.frequency]) || 1,
      segment: String(r[segmentColumn] ?? 'N/A').trim(),
    }));

  res.json({ kpis, segments, scatter, detected, segmentColumn, columns });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ANALYTICS — PARETO + RADAR PAR CLUSTER
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/analytics/clusters', (_req, res) => {
  const { rows, segmentColumn, detected } = store;
  if (!rows.length)   return res.status(400).json({ error: 'Aucune donnée.' });
  if (!segmentColumn) return res.status(400).json({ error: 'Segment non configuré.' });

  const segments = computeSegmentStats(rows, segmentColumn, detected);

  // Pareto
  const sortKey    = detected.amount ? 'totalAmount' : 'count';
  const sorted     = [...segments].sort((a, b) => b[sortKey] - a[sortKey]);
  const grandTotal = sorted.reduce((s, g) => s + (g[sortKey] || 0), 0) || 1;
  let cumul = 0;
  const pareto = sorted.map(g => {
    cumul += g[sortKey] || 0;
    return { ...g, cumulPct: +((cumul / grandTotal) * 100).toFixed(1), isVital: cumul / grandTotal <= 0.80 };
  });

  // Radar normalisé (0→100)
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
      { metric: 'Volume',       value: Math.round(s.count         / maxCnt  * 100) },
      { metric: 'CA total',     value: s.totalAmount  ? Math.round(s.totalAmount  / maxTot  * 100) : 0 },
    ],
  }));

  res.json({ pareto, radars, segments, detected, segmentColumn });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. LLM INSIGHT — Claude Sonnet
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/analytics/insight', async (req, res) => {
  const { clusterName, stats, allSegments } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const isBad = (stats.avgRecency || 0) > 60;
    return res.json({
      profil:          `Segment "${clusterName}" : ${stats.count} clients (${stats.pct}%), montant moyen ${stats.avgAmount ?? 'N/A'} MAD.`,
      caracteristique: isBad ? 'Clients à faible activité récente — risque de décrochage.' : 'Clients actifs à fort potentiel de recouvrement.',
      action:          '💡 Ajoutez ANTHROPIC_API_KEY dans backend/.env pour des insights personnalisés par l\'IA.',
      risque:          isBad ? 'élevé' : (stats.avgRecency || 0) > 30 ? 'moyen' : 'faible',
      priorite:        (stats.avgAmount || 0) > 200 ? 'haute' : 'normale',
      source:          'fallback',
    });
  }

  try {
    const prompt = `Tu es expert en analyse de portefeuille clients pour une société de distribution d'eau (Mauritanie, SNDE). Analyse ce segment et fournis un insight opérationnel.

Contexte global :
${(allSegments||[]).map(s => `• ${s.name} : ${s.count} clients (${s.pct}%), moy. ${s.avgAmount??'N/A'} MAD`).join('\n')}

Segment analysé : "${clusterName}"
• Clients : ${stats.count} (${stats.pct}%)
• Montant moyen : ${stats.avgAmount ?? 'N/A'} MAD
• Montant total : ${stats.totalAmount ?? 'N/A'} MAD
• Récence moy. : ${stats.avgRecency ?? 'N/A'} jours depuis dernier paiement
• Fréquence moy. : ${stats.avgFrequency ?? 'N/A'} transactions
${stats.isVital ? '⚠️ Segment VITAL Pareto (contribue aux 80% du CA).' : ''}

Réponds UNIQUEMENT avec un JSON valide sans backticks :
{"profil":"...","caracteristique":"...","action":"...","risque":"faible|moyen|élevé","priorite":"haute|normale|basse"}`;

    const r = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514', max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });

    const text   = r.data.content[0]?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
    res.json({ ...parsed, source: 'claude' });
  } catch (err) {
    console.error('LLM error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅  Serveur prêt sur le port ${PORT}`));