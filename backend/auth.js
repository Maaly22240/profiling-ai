const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const express  = require('express');
const router   = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION  (valeurs depuis .env)
// ─────────────────────────────────────────────────────────────────────────────
const JWT_SECRET  = process.env.JWT_SECRET  || 'profiling_secret_change_me_in_prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// Mot de passe hashé au démarrage (depuis .env, ou valeur par défaut)
const ADMIN_USER     = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Hash bcrypt du mot de passe (généré une seule fois au démarrage du serveur)
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE  POST /api/auth/login
// Body : { username, password }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  // Vérifie identifiant
  if (username !== ADMIN_USER) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  // Vérifie mot de passe
  const valid = await bcrypt.compare(password, ADMIN_HASH);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  // Génère le token
  const token = jwt.sign(
    { username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  // Calcule la date d'expiration pour le frontend
  const decoded  = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000).toISOString();

  console.log(`[auth] Login réussi : ${username}`);

  return res.json({
    message:   `Bienvenue, ${username}.`,
    token,
    expiresAt,
    user: { username, role: 'admin' },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE  POST /api/auth/verify
// Vérifie si un token est encore valide (utilisé au refresh de page)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant.' });
  }
  try {
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    return res.json({ valid: true, user: { username: payload.username, role: payload.role } });
  } catch {
    return res.status(401).json({ valid: false, error: 'Token expiré ou invalide.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE  requireAuth
// À utiliser sur toutes les routes qui nécessitent une authentification
// ─────────────────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  // Priorité 1 : Authorization header (toutes les routes normales)
  // Priorité 2 : query param ?token= (pour EventSource SSE qui ne supporte pas les headers)
  const auth       = req.headers.authorization;
  const queryToken = req.query.token;

  const rawToken = auth?.startsWith('Bearer ')
    ? auth.split(' ')[1]
    : queryToken || null;

  if (!rawToken) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    const payload = jwt.verify(rawToken, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expirée. Veuillez vous reconnecter.'
      : 'Token invalide.';
    return res.status(401).json({ error: msg });
  }
}

module.exports = { router, requireAuth };