# PhishGuard: An Explainable Machine Learning System for Phishing Detection

## Abstract

PhishGuard is a full-stack phishing detection system that classifies URLs and
email content using an ensemble of four supervised learning models, and
exposes the reasoning behind each classification through a SHAP-based
explainability layer. The system is designed around a simple premise: a
phishing detector that cannot explain its verdicts is a tool people learn to
either blindly trust or ignore, and neither is acceptable in a security
context. This document describes the system's architecture, feature
engineering, model training methodology, explainability layer, and
deployment.

---

## 1. Problem Statement

Phishing detection is typically framed as a binary classification problem:
given a URL or a piece of email content, predict whether it is malicious.
Most tools that solve this well stop at the prediction. PhishGuard treats the
prediction as the first half of the problem — the second half is answering
"why," and "what would need to change for this verdict to flip."

---

## 2. System Architecture

```
phishguard/
├── training/           # Offline training pipeline (run once, not at runtime)
│   ├── train.py         — dataset generation, model fitting, evaluation
│   └── requirements.txt
├── backend/             # Flask inference API
│   ├── app.py            — REST API, loads pre-trained artefacts at startup
│   ├── feature_extraction.py — URL/email → feature vector
│   ├── xai.py             — SHAP explainer layer
│   ├── models/            — committed .pkl artefacts (models + scalers)
│   └── requirements.txt
├── app/                  # React / TypeScript / Vite frontend
│   └── src/
│       ├── pages/          — Dashboard, ModelComparison, About, AdminPanel
│       ├── components/     — ExplainPanel, Sidebar, ui primitives
│       └── services/       — typed API client
└── render.yaml            # Deployment config
```

**Design constraint:** the backend never trains models at request time.
Training is a separate, offline step (`training/train.py`); the deployed API
only loads pre-trained `.pkl` files at process startup, which keeps cold-start
time bounded to the cost of a handful of `joblib.load()` calls (~1–2s) rather
than a training run.

### 2.1 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Recharts |
| Backend | Python 3.11, Flask 3, Gunicorn |
| ML | scikit-learn (Logistic Regression, Random Forest, MLP, SVM) |
| Explainability | SHAP (TreeExplainer, KernelExplainer) |
| Deployment | Render.com (backend as a web service, frontend as a static site) |

---

## 3. Data and Feature Engineering

### 3.1 Dataset

The training set is **synthetically generated**, not scraped from a live
phishing feed. `training/train.py` procedurally constructs legitimate and
phishing URLs from two generator functions, each shaped to reflect known
structural signals of phishing (IP-address hosts, brand names embedded in
subdomains, suspicious TLDs, excessive subdomains, credential-masking `@`
symbols, and so on) versus legitimate URL conventions.

This is a deliberate simplification with a real limitation worth stating
plainly: because the two classes are generated from distinguishable rules
rather than sampled from the messy, overlapping distribution of real-world
traffic, the resulting classification problem is close to linearly
separable. All four models report accuracy, precision, recall, F1, and
ROC-AUC of 1.0 on the held-out synthetic test set — a result that reflects
how cleanly the synthetic classes are separated, not real-world
generalization performance. Treat these numbers as a sanity check that the
training pipeline works end-to-end, not as a benchmark. The natural next step
is retraining against a real labeled corpus (e.g. PhishTank, OpenPhish, or a
Kaggle phishing-URL dataset) to get a meaningful accuracy figure.

### 3.2 Feature extraction (`feature_extraction.py`)

Two input types are supported, each mapped to its own feature set:

**URL features (19):**

| Feature | Description |
|---|---|
| `url_length`, `domain_length`, `path_length` | Character counts |
| `has_https` | Whether the URL uses HTTPS |
| `num_dots`, `num_hyphens`, `num_underscores`, `num_slashes`, `num_digits`, `num_special_chars` | Structural character counts |
| `has_ip_address` | Domain is a raw IP rather than a resolved name |
| `has_at_symbol` | `@` in the URL (credential-masking trick) |
| `has_double_slash` | Double slash in the path (redirection trick) |
| `suspicious_keywords_count` | Count of known phishing-associated keywords |
| `is_shortened` | Uses a URL-shortening service |
| `subdomain_count` | Number of subdomains |
| `has_suspicious_tld` | Uses a TLD associated with abuse |
| `brand_in_subdomain` | A known brand name embedded in the subdomain (spoofing) |
| `entropy` | Shannon entropy of the domain string (flags randomly generated domains) |

**Email features (17):** word count, link count, HTML presence, phishing
keyword count, urgency-language score, exclamation count, suspicious
pattern matches, spelling-error heuristics, sender/reply-to mismatch,
attachment references, and related structural counts.

### 3.3 Models

Four classifiers are trained on the same feature set: Logistic Regression,
Random Forest, a Multi-Layer Perceptron, and an SVM. Each gets its own
fitted `StandardScaler`. Keeping four architecturally different models
serves the explainability layer directly — a single model's SHAP values can
look "correct" by coincidence; agreement (or disagreement) across four
different model families is a much stronger signal, and disagreement between
them is itself informative to surface to a user.

---

## 4. Explainability Layer (XAI)

`backend/xai.py` implements a `XAIEngine` that wraps each trained model with
a SHAP explainer and normalizes all output to a single unit: **probability
points toward the "Phishing" class**, so contributions are directly
comparable across models regardless of each model's native output scale.

### 4.1 Explainer selection per model

- **Random Forest** → `shap.TreeExplainer`, run with `model_output='probability'`
  against a background sample, using the fast, exact tree-based algorithm.
- **Logistic Regression, MLP, SVM** → `shap.KernelExplainer`, model-agnostic,
  run against a `shap.kmeans`-summarized background (10 clusters from a
  200-row background sample) to keep inference cost bounded, since Kernel
  SHAP scales with background size.

### 4.2 What the layer produces, per prediction

1. **Feature contributions** — every input feature's SHAP value, signed and
   directional (`phishing` vs `legitimate`), sortable by magnitude.
2. **Plain-English summary** — a generated one-paragraph explanation built
   from the top contributing features in the direction of the verdict (e.g.
   *"This input was flagged as phishing (91.4% confidence), primarily driven
   by: uses an IP address instead of a domain name and a domain name that is
   41 characters long."*).
3. **Model agreement** — the same input scored by all four loaded models
   (`_model_comparison` in `app.py`), so a user can see whether the verdict
   is a strong ensemble consensus or one model's outlier call.
4. **What-if counterfactuals** — for inputs classified as phishing, a greedy,
   single-feature-at-a-time search: for each of the top features currently
   pushing toward "phishing," try substituting the median value observed
   among legitimate examples and re-run inference, to answer *"what single
   change would most plausibly flip this verdict?"* This is intentionally
   a greedy approximation, not a minimal-change search — it surfaces *a*
   flip-inducing change, not necessarily the smallest one.

### 4.3 API surface

`POST /api/explain` ties this together: given an `input`, `type`, and
`model`, it returns the verdict, confidence, base value, top feature
contributions, the plain-English summary, what-if suggestions, and the
cross-model comparison in a single response.

---

## 5. API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check + which models are loaded |
| GET | `/api/models` | List available models |
| POST | `/api/predict` | Single-model prediction |
| POST | `/api/predict/all` | All four models' verdicts (ensemble view) |
| POST | `/api/explain` | SHAP explanation, summary, what-if, model agreement |
| POST | `/api/analyze` | Feature extraction + risk indicators, no ML inference |
| GET | `/api/metrics` | Stored evaluation metrics per model |
| GET | `/api/features/importance` | Global feature importance for a given model |
| GET | `/api/sample/urls`, `/api/sample/emails` | Example inputs for the UI |

---

## 6. Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
# API at http://localhost:5000 — loads pre-trained artefacts from models/
```

**Frontend:**
```bash
cd app
npm install
cp .env.example .env       # set VITE_API_URL=http://localhost:5000/api
npm run dev
```

**Retraining models** (only needed if you change the feature set or dataset):
```bash
cd training
pip install -r requirements.txt
python train.py            # writes artefacts to ../backend/models/
```

---

## 7. Deployment

Deployed on Render: the backend as a Python web service, the frontend as a
static site, connected via `VITE_API_URL`. Full step-by-step instructions
are in `DEPLOY.md`.

### 7.1 A dependency-pinning lesson worth documenting

The backend's explainability stack (`shap`, `numba`, `llvmlite`) has narrow,
interlocking version constraints tied to the Python interpreter version.
Locally on Python 3.12, `pip install` silently resolves to whichever
versions happen to work; Render's build runs Python 3.11 (pinned via
`PYTHON_VERSION`), which surfaced two separate issues before a build
succeeded:

1. `shap==0.52.0` has no Python 3.11 wheel at all — it requires 3.12+.
2. After pinning `shap==0.51.0` (which does ship a `cp311` wheel), the
   transitive constraint chain still had to resolve: `numba` caps the
   compatible `numpy` range, and `llvmlite` caps the compatible `numba`
   range — a single patch-version mismatch (`numba==0.61.0` vs
   `numba==0.61.2`) was enough to make the whole resolution fail, because
   `0.61.0` caps `numpy<2.2` while `0.61.2` allows `numpy<2.3`.

The takeaway: when a dependency chain includes compiled/JIT libraries like
`shap`, `numba`, and `llvmlite`, "works locally" only proves compatibility
with your local Python version — verify the actual target interpreter
version resolves the full dependency graph (e.g. `pip download <pkgs>
--python-version 3.11 --only-binary=:all:`) before assuming a requirements.txt
change is correct.

---

## 8. Limitations and Future Work

- **Synthetic training data.** The most impactful next step is retraining
  against a real-world labeled dataset to get a meaningful accuracy figure,
  rather than the near-perfect scores produced by the current synthetic,
  rule-generated classes.
- **Kernel SHAP cost.** `KernelExplainer` is used for three of the four
  models and is more computationally expensive than `TreeExplainer`;
  background summarization (`shap.kmeans`) keeps this bounded but it's worth
  monitoring under load, particularly on constrained deployment tiers.
- **Greedy what-if search.** The counterfactual suggestions are single-
  feature, greedy approximations — a proper minimal-change counterfactual
  search (e.g. via optimization over the feature space) is a natural
  extension.
- **Email feature set** has less coverage in the explainability layer
  currently than the URL feature set.

---

## 9. License / Author

Built by Jerry (Oluwashiji). See repository for license details.
