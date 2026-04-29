import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Instance axios centralisée — injecte le token JWT sur chaque requête
// ─────────────────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
});

// ── Request interceptor : ajoute Authorization header ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('profiling_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor : gère l'expiration du token ─────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide → nettoyage et redirection login
      localStorage.removeItem('profiling_token');
      localStorage.removeItem('profiling_user');
      // Déclenche un événement custom pour que App.jsx réagisse
      window.dispatchEvent(new CustomEvent('auth:logout', {
        detail: { reason: error.response.data?.error || 'Session expirée.' }
      }));
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers d'authentification
// ─────────────────────────────────────────────────────────────────────────────

/** Login — stocke le token et retourne les infos user */
export async function login(username, password) {
  const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
  const { token, user, expiresAt } = res.data;
  localStorage.setItem('profiling_token', token);
  localStorage.setItem('profiling_user',  JSON.stringify({ ...user, expiresAt }));
  return { token, user, expiresAt };
}

/** Logout — supprime le token */
export function logout() {
  localStorage.removeItem('profiling_token');
  localStorage.removeItem('profiling_user');
}

/** Vérifie si un token est présent et non expiré côté client */
export function getStoredAuth() {
  const token = localStorage.getItem('profiling_token');
  const raw   = localStorage.getItem('profiling_user');
  if (!token || !raw) return null;

  try {
    const user      = JSON.parse(raw);
    const expiresAt = new Date(user.expiresAt);
    // Marge de 30 secondes avant expiration réelle
    if (expiresAt <= new Date(Date.now() + 30_000)) {
      logout();
      return null;
    }
    return { token, user };
  } catch {
    logout();
    return null;
  }
}

/** Vérifie le token auprès du serveur (utilisé au chargement de l'app) */
export async function verifyToken() {
  const token = localStorage.getItem('profiling_token');
  if (!token) return null;
  try {
    const res = await axios.post(
      'http://localhost:5000/api/auth/verify',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.valid ? res.data.user : null;
  } catch {
    logout();
    return null;
  }
}

export default api;