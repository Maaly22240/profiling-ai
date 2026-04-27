# Profiling.ai

Plateforme de segmentation client par K-Means.

---

## Prérequis

- [Node.js](https://nodejs.org/) ≥ 18
- [Python](https://www.python.org/) ≥ 3.9
- npm ≥ 9

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Maaly22240/profiling-ai.git
cd profiling-ai
```

### 2. Backend

```bash
cd backend
npm install
```

Créer un fichier `.env` dans `backend/` :

```env
PORT=5000
ANTHROPIC_API_KEY=sk-ant-xxxx   # optionnel
```

### 3. Dépendances Python

```bash
pip install pandas scikit-learn numpy
```

### 4. Frontend

```bash
cd ../frontend
npm install
```

---

## Lancer l'application

Ouvrir **deux terminaux** :

**Terminal 1 — Backend**
```bash
cd backend
node server.js
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Ouvrir **http://localhost:5173** dans le navigateur.

---

## Connexion

| Identifiant | Mot de passe |
|-------------|-------------|
| `admin`     | `admin123`  |
