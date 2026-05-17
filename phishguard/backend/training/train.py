"""
PhishGuard — Offline Training Script
=====================================
Run this script ONCE to train all models and save them to disk.
The web API never trains; it only loads these artifacts at startup.

Usage:
    python train.py                   # default 5 000 samples
    python train.py --samples 10000   # larger synthetic dataset
    python train.py --out ../backend/models

Output (written to --out directory):
    logistic_regression.pkl / _scaler.pkl
    random_forest.pkl       / _scaler.pkl
    neural_network.pkl      / _scaler.pkl
    svm.pkl                 / _scaler.pkl
    feature_names.pkl
    metrics.json
"""

import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, confusion_matrix, f1_score,
    precision_score, recall_score, roc_auc_score, roc_curve,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

# ── Make the training script importable from any working directory ──────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from feature_extraction import URLFeatureExtractor  # noqa: E402  (path added above)


# ── Dataset generation ───────────────────────────────────────────────────────

def _generate_legitimate_url() -> str:
    domains = [
        'google.com', 'facebook.com', 'amazon.com', 'microsoft.com',
        'apple.com', 'github.com', 'linkedin.com', 'twitter.com',
        'youtube.com', 'wikipedia.org', 'reddit.com', 'netflix.com',
    ]
    paths = ['', '/login', '/products', '/about', '/contact', '/home', '/dashboard']
    protocol = np.random.choice(['https://', 'http://'], p=[0.8, 0.2])
    domain = np.random.choice(domains)
    path = np.random.choice(paths, p=[0.4, 0.15, 0.15, 0.1, 0.1, 0.05, 0.05])
    return f"{protocol}{domain}{path}"


def _generate_phishing_url() -> str:
    patterns = [
        lambda: (
            f"http://{np.random.randint(1,256)}.{np.random.randint(1,256)}"
            f".{np.random.randint(1,256)}.{np.random.randint(1,256)}/login"
        ),
        lambda: (
            f"http://{'sub'.join([str(i)+'.' for i in range(np.random.randint(3,6))])}"
            f"paypal.com.signin-verify.net/secure/login"
        ),
        lambda: (
            f"http://legitimate-looking-url@"
            f"{np.random.choice(['evil.com','phish.net','scam.org'])}/login"
        ),
        lambda: (
            f"http://{np.random.choice(['secure-bank','verify-account','login-paypal'])}"
            f".{np.random.choice(['tk','ml','ga','cf','xyz'])}/"
        ),
        lambda: (
            f"http://{np.random.choice(['paypa1','amaz0n','g00gle','faceb00k'])}.com/login"
        ),
        lambda: (
            f"http://secure.login.account.verify."
            f"{'user'+str(np.random.randint(1000,9999))}.com/"
        ),
    ]
    return np.random.choice(patterns)()


def generate_dataset(n_samples: int) -> tuple[pd.DataFrame, pd.Series]:
    """Generate a balanced synthetic dataset of URL features."""
    np.random.seed(42)
    data, labels = [], []

    n_legit = n_samples // 2
    for _ in range(n_legit):
        feats = URLFeatureExtractor(_generate_legitimate_url()).extract_all_features()
        data.append(feats)
        labels.append(0)

    for _ in range(n_samples - n_legit):
        feats = URLFeatureExtractor(_generate_phishing_url()).extract_all_features()
        data.append(feats)
        labels.append(1)

    df = pd.DataFrame(data)
    for col in df.select_dtypes(include='bool').columns:
        df[col] = df[col].astype(int)

    return df, pd.Series(labels)


# ── Model definitions ────────────────────────────────────────────────────────

def _build_models() -> dict:
    return {
        'logistic_regression': LogisticRegression(
            max_iter=1000, random_state=42, class_weight='balanced'
        ),
        'random_forest': RandomForestClassifier(
            n_estimators=100, max_depth=10, min_samples_split=5,
            random_state=42, class_weight='balanced'
        ),
        'neural_network': MLPClassifier(
            hidden_layer_sizes=(128, 64, 32), activation='relu', solver='adam',
            max_iter=500, random_state=42,
            early_stopping=True, validation_fraction=0.1,
        ),
        'svm': SVC(
            kernel='rbf', probability=True, random_state=42, class_weight='balanced'
        ),
    }


# ── Evaluation ───────────────────────────────────────────────────────────────

def evaluate(model, X_test: np.ndarray, y_test: np.ndarray, name: str) -> dict:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None

    metrics: dict = {
        'model_name': name,
        'accuracy':   float(accuracy_score(y_test, y_pred)),
        'precision':  float(precision_score(y_test, y_pred, zero_division=0)),
        'recall':     float(recall_score(y_test, y_pred, zero_division=0)),
        'f1_score':   float(f1_score(y_test, y_pred, zero_division=0)),
        'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
    }

    if y_prob is not None:
        metrics['roc_auc'] = float(roc_auc_score(y_test, y_prob))
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        metrics['roc_curve'] = {'fpr': fpr.tolist(), 'tpr': tpr.tolist()}

    cv = cross_val_score(model, X_test, y_test, cv=5)
    metrics['cv_mean'] = float(cv.mean())
    metrics['cv_std']  = float(cv.std())

    return metrics


# ── Main training pipeline ───────────────────────────────────────────────────

def train(n_samples: int, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)

    print(f"[1/4] Generating synthetic dataset ({n_samples:,} samples)…")
    X, y = generate_dataset(n_samples)
    print(f"      Features: {X.shape[1]}  |  Phishing: {y.sum()}  |  Legit: {(y==0).sum()}")

    print("[2/4] Splitting and scaling data…")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    # Each model gets its own scaler so inference is self-contained per model
    scalers = {name: StandardScaler() for name in _build_models()}

    print("[3/4] Training models…")
    all_metrics = []
    for name, model in _build_models().items():
        print(f"      → {name}")
        scaler = scalers[name]
        X_tr = scaler.fit_transform(X_train)
        X_te = scaler.transform(X_test)

        model.fit(X_tr, y_train)
        metrics = evaluate(model, X_te, y_test, name)
        all_metrics.append(metrics)

        joblib.dump(model,  os.path.join(out_dir, f'{name}.pkl'))
        joblib.dump(scaler, os.path.join(out_dir, f'{name}_scaler.pkl'))
        print(f"         accuracy={metrics['accuracy']:.4f}  f1={metrics['f1_score']:.4f}")

    print("[4/4] Saving artefacts…")
    joblib.dump(X.columns.tolist(), os.path.join(out_dir, 'feature_names.pkl'))
    with open(os.path.join(out_dir, 'metrics.json'), 'w') as fh:
        json.dump(all_metrics, fh, indent=2)

    best = max(all_metrics, key=lambda m: m['f1_score'])
    print(f"\n✓  Training complete. Best model: {best['model_name']} (F1={best['f1_score']:.4f})")
    print(f"   Artefacts saved to: {os.path.abspath(out_dir)}")


# ── CLI entry point ──────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train PhishGuard ML models')
    parser.add_argument('--samples', type=int, default=5000,
                        help='Number of synthetic training samples (default: 5000)')
    parser.add_argument('--out', default=os.path.join('..', 'backend', 'models'),
                        help='Directory to write model artefacts (default: ../backend/models)')
    args = parser.parse_args()
    train(args.samples, args.out)