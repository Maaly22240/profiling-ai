#!/usr/bin/env python3
"""
Pipeline K-Means — Plateforme Profiling (SNDE)
Usage : python kmeans_pipeline.py --input /tmp/data.json --features f1,f2,f3 --output /tmp/results.json [--n_clusters 3]
"""

import sys, json, argparse, warnings
warnings.filterwarnings('ignore')

try:
    import numpy as np
    import pandas as pd
    from sklearn.preprocessing import StandardScaler
    from sklearn.cluster import KMeans
    from sklearn.decomposition import PCA
    from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
except ImportError as e:
    print(json.dumps({"error": f"Dépendance manquante : {e}. Exécutez : pip install pandas scikit-learn numpy"}))
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENTS
# ─────────────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument('--input',      required=True,  help='Chemin vers le fichier JSON des données')
parser.add_argument('--features',   required=True,  help='Features séparées par virgule')
parser.add_argument('--output',     required=True,  help='Chemin vers le fichier JSON de sortie')
parser.add_argument('--n_clusters', default='auto', help='Nombre de clusters (entier ou "auto")')
args = parser.parse_args()

def progress(msg):
    """Envoie un message de progression vers stderr (lu par Node.js)."""
    print(json.dumps({"progress": msg}), file=sys.stderr, flush=True)

# ─────────────────────────────────────────────────────────────────────────────
# 1. CHARGEMENT
# ─────────────────────────────────────────────────────────────────────────────
progress("Chargement des données…")
with open(args.input, 'r', encoding='utf-8') as f:
    rows = json.load(f)

df = pd.DataFrame(rows)
features = [f.strip() for f in args.features.split(',') if f.strip()]

# Garde uniquement les colonnes features, force conversion numérique
df_feat = df[features].copy()
for col in features:
    df_feat[col] = pd.to_numeric(df_feat[col], errors='coerce')

# Imputation des valeurs manquantes par la médiane
df_feat = df_feat.fillna(df_feat.median())

n_samples = len(df_feat)
progress(f"{n_samples} lignes · {len(features)} features chargées")

# ─────────────────────────────────────────────────────────────────────────────
# 2. NORMALISATION
# ─────────────────────────────────────────────────────────────────────────────
progress("Normalisation (StandardScaler)…")
scaler = StandardScaler()
X = scaler.fit_transform(df_feat.values)

# ─────────────────────────────────────────────────────────────────────────────
# 3. CHOIX OPTIMAL DE K (Elbow + Silhouette)
# ─────────────────────────────────────────────────────────────────────────────
max_k    = min(8, max(2, int(np.sqrt(n_samples / 2))))
k_range  = range(2, max_k + 1)
inertias = []
silhouettes = []

# Sous-échantillonnage pour accélérer si dataset > 5000 lignes
sample_size = min(n_samples, 5000)
idx_sample  = np.random.choice(n_samples, sample_size, replace=False) if n_samples > sample_size else np.arange(n_samples)
X_sample    = X[idx_sample]

n_clusters_arg = args.n_clusters.strip()

if n_clusters_arg == 'auto':
    progress("Recherche du k optimal (Elbow + Silhouette)…")
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
        km.fit(X_sample)
        inertias.append(float(km.inertia_))
        if k > 1:
            sil = silhouette_score(X_sample, km.labels_, sample_size=min(2000, sample_size))
            silhouettes.append(float(sil))
        else:
            silhouettes.append(0.0)

    # Elbow : plus grande variation de dérivée seconde
    if len(inertias) >= 3:
        diffs  = np.diff(inertias)
        diffs2 = np.diff(diffs)
        elbow_k = int(np.argmax(np.abs(diffs2)) + 3)  # +3 car k_range commence à 2, et on perd 2 éléments
    else:
        elbow_k = 3

    # Silhouette : k avec le meilleur score
    sil_k = int(list(k_range)[np.argmax(silhouettes)])

    # Compromis : préférer silhouette si accord, sinon elbow
    optimal_k = sil_k if sil_k == elbow_k else sil_k
    optimal_k = max(2, min(optimal_k, max_k))
    progress(f"k optimal = {optimal_k} (Silhouette={silhouettes[optimal_k-2]:.3f})")
else:
    try:
        optimal_k = int(n_clusters_arg)
        optimal_k = max(2, min(optimal_k, max_k))
    except ValueError:
        optimal_k = 3
    # Calcule quand même les métriques pour affichage
    for k in k_range:
        km_tmp = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
        km_tmp.fit(X_sample)
        inertias.append(float(km_tmp.inertia_))
        sil = silhouette_score(X_sample, km_tmp.labels_, sample_size=min(2000, sample_size)) if k > 1 else 0.0
        silhouettes.append(float(sil))

# ─────────────────────────────────────────────────────────────────────────────
# 4. K-MEANS FINAL
# ─────────────────────────────────────────────────────────────────────────────
progress(f"Entraînement K-Means (k={optimal_k})…")
km_final = KMeans(n_clusters=optimal_k, random_state=42, n_init=15, max_iter=500)
labels   = km_final.fit_predict(X)

# ─────────────────────────────────────────────────────────────────────────────
# 5. MÉTRIQUES DE VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
progress("Calcul des métriques de validation…")
eval_sample = min(n_samples, 10000)
idx_eval    = np.random.choice(n_samples, eval_sample, replace=False) if n_samples > eval_sample else np.arange(n_samples)

sil_final = float(silhouette_score(X[idx_eval], labels[idx_eval], sample_size=min(3000, eval_sample)))
db_final  = float(davies_bouldin_score(X[idx_eval], labels[idx_eval]))
ch_final  = float(calinski_harabasz_score(X[idx_eval], labels[idx_eval]))

# ─────────────────────────────────────────────────────────────────────────────
# 6. NOMMAGE HEURISTIQUE DES CLUSTERS
# ─────────────────────────────────────────────────────────────────────────────
progress("Nommage des clusters…")
centroids_scaled = km_final.cluster_centers_                        # (k, n_features)
centroids_orig   = scaler.inverse_transform(centroids_scaled)       # retour aux valeurs réelles

# Détecte les colonnes "valeur" et "récence" pour scoring
def col_score(fname, centroid_val, col_max):
    """Score 0→100 pour 'qualité' du centroïde sur cette feature."""
    f = fname.lower()
    norm = centroid_val / col_max if col_max != 0 else 0
    if any(k in f for k in ['recenc','recency','dernier','last','jours','days']):
        return 1 - norm   # récence : moins = mieux
    return norm            # sinon : plus = mieux

col_maxs = df_feat.max().values
cluster_scores = []
for c_idx in range(optimal_k):
    score = sum(col_score(features[i], centroids_orig[c_idx, i], col_maxs[i]) for i in range(len(features)))
    cluster_scores.append(score)

# Classement par score décroissant → noms
name_map_4  = {0: 'Champions', 1: 'Actifs', 2: 'À risque', 3: 'Inactifs'}
name_map_3  = {0: 'Haute valeur', 1: 'Valeur moyenne', 2: 'Faible valeur'}
name_map_2  = {0: 'Actifs', 1: 'Inactifs'}
name_map_def = {i: f'Cluster {chr(65+i)}' for i in range(optimal_k)}

name_map = {optimal_k: name_map_def}.get(optimal_k, name_map_def)
if optimal_k == 4: name_map = name_map_4
elif optimal_k == 3: name_map = name_map_3
elif optimal_k == 2: name_map = name_map_2

rank_sorted = sorted(range(optimal_k), key=lambda i: cluster_scores[i], reverse=True)
cluster_names = {rank_sorted[rank]: name_map[rank] for rank in range(optimal_k)}
label_names   = [cluster_names[int(l)] for l in labels]

# ─────────────────────────────────────────────────────────────────────────────
# 7. PCA 2D (pour visualisation)
# ─────────────────────────────────────────────────────────────────────────────
progress("Réduction PCA (2D)…")
pca        = PCA(n_components=min(2, len(features)), random_state=42)
X_pca      = pca.fit_transform(X)
explained  = [float(v) for v in pca.explained_variance_ratio_]

# Échantillon 500 pts max pour le scatter
scatter_n   = min(n_samples, 500)
scatter_idx = np.random.choice(n_samples, scatter_n, replace=False)
pca_coords  = [
    {
        "x": float(X_pca[i, 0]),
        "y": float(X_pca[i, 1]) if X_pca.shape[1] > 1 else 0.0,
        "cluster": label_names[i],
    }
    for i in scatter_idx
]

# ─────────────────────────────────────────────────────────────────────────────
# 8. CENTROIDES (valeurs réelles, par nom de cluster)
# ─────────────────────────────────────────────────────────────────────────────
centroids_dict = {}
for c_idx in range(optimal_k):
    name = cluster_names[c_idx]
    centroids_dict[name] = {features[i]: round(float(centroids_orig[c_idx, i]), 2) for i in range(len(features))}

# ─────────────────────────────────────────────────────────────────────────────
# 9. SORTIE JSON
# ─────────────────────────────────────────────────────────────────────────────
progress("Finalisation…")

results = {
    "labels":        label_names,          # liste de noms par ligne
    "n_clusters":    optimal_k,
    "cluster_names": list(set(label_names)),
    "centroids":     centroids_dict,
    "metrics": {
        "silhouette":          round(sil_final, 4),
        "davies_bouldin":      round(db_final, 4),
        "calinski_harabasz":   round(ch_final, 2),
        "optimal_k":           optimal_k,
        "inertia_curve":       [{"k": int(k), "inertia": round(inertias[i], 2)} for i, k in enumerate(k_range)],
        "silhouette_curve":    [{"k": int(k), "silhouette": round(silhouettes[i], 4)} for i, k in enumerate(k_range)],
    },
    "pca": {
        "coords":    pca_coords,
        "explained": explained,
    },
    "features": features,
}

with open(args.output, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False)

progress(f"Pipeline terminé — {optimal_k} clusters · Silhouette={sil_final:.3f}")
print(json.dumps({"success": True, "output": args.output}), flush=True)