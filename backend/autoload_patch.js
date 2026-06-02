// ─────────────────────────────────────────────────────────────────────────────
// AUTO-LOAD FICHIER FIXE
// Ajoutez ce bloc dans votre server.js, juste APRÈS la définition du store
// et AVANT les routes app.post('/api/...')
// ─────────────────────────────────────────────────────────────────────────────

// ── Dossier contenant le fichier fixe ────────────────────────────────────────
const DATA_DIR       = path.resolve(__dirname, 'data');
const FIXED_FILE_EXT = ['.xlsx', '.csv', '.txt'];   // extensions acceptées

// ── Chargement automatique au démarrage ──────────────────────────────────────
function autoLoadFixedFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁  Dossier data/ créé. Placez votre fichier dans backend/data/');
    return;
  }

  // Cherche le premier fichier valide dans backend/data/
  const files = fs.readdirSync(DATA_DIR).filter(f =>
    FIXED_FILE_EXT.some(ext => f.toLowerCase().endsWith(ext))
  );

  if (files.length === 0) {
    console.log('⚠️  Aucun fichier trouvé dans backend/data/ — dashboard vide au démarrage.');
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
      // CSV / TXT — lecture synchrone avec un séparateur auto-détecté
      const raw    = fs.readFileSync(filePath, 'utf-8');
      const lines  = raw.split('\n').filter(Boolean);
      const sep    = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
      columns      = lines[0].split(sep).map(c => c.trim().replace(/^"|"$/g,''));
      rows         = lines.slice(1).map(line => {
        const vals = line.split(sep);
        return Object.fromEntries(columns.map((c, i) => [c, (vals[i]||'').trim().replace(/^"|"$/g,'')]));
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

// ── Route pour recharger le fichier fixe manuellement (utile en dev) ─────────
// GET /api/data/reload
app.get('/api/data/reload', (req, res) => {
  autoLoadFixedFile();
  if (store.rows.length) {
    res.json({ message: `Fichier fixe rechargé : ${store.rows.length} lignes.`, columns: store.columns });
  } else {
    res.status(404).json({ error: 'Aucun fichier trouvé dans backend/data/' });
  }
});