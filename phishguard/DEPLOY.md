# PhishGuard — Deployment Guide

## Architecture overview

```
phishguard/
├── training/       ← run ONCE locally / in CI to produce model artefacts
│   ├── train.py
│   └── requirements.txt
├── backend/        ← Flask inference API (no training code)
│   ├── app.py
│   ├── feature_extraction.py
│   ├── requirements.txt
│   └── models/     ← committed .pkl files produced by training/train.py
└── app/            ← React / Vite static frontend
```

**Models are trained offline and committed to the repo.**
The live server only loads pre-trained `.pkl` files — no training happens at runtime.

---

## Step 0 — Train the models (required before first deploy)

```bash
# From the project root:
cd training
pip install -r requirements.txt
python train.py                         # writes artefacts to ../backend/models/

# Commit the generated artefacts
cd ..
git add backend/models/
git commit -m "Add pre-trained model artefacts"
```

> To retrain later, repeat the above and push the updated artefacts.
> You can also pass `--samples 10000` for a larger dataset, or
> `--out /path/to/custom/dir` to write elsewhere.

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — PhishGuard v2.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/phishguard.git
git push -u origin main
```

---

## Step 2 — Deploy the backend (Flask inference API)

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub account and select the `phishguard` repo
3. Fill in these settings:

   | Field | Value |
   |---|---|
   | Name | `phishguard-api` |
   | Root Directory | `backend` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `gunicorn app:app --workers 2 --bind 0.0.0.0:$PORT --timeout 60` |
   | Instance Type | Free |

4. Click **Create Web Service**
5. Wait for the build (~1–2 min — no training, just loading `.pkl` files)
6. Copy your backend URL: `https://phishguard-api.onrender.com`

> **Cold start:** The service loads pre-trained models from disk in ~1–2 s.
> No training on boot means a predictable, fast startup every time.

> **Free tier:** The service spins down after 15 min of inactivity. First request
> after sleep takes ~10–15 s to reload. Upgrade to Starter ($7/mo) for always-on.

---

## Step 3 — Deploy the frontend (React static site)

1. Go to Render → **New** → **Static Site**
2. Select the same `phishguard` repo
3. Fill in these settings:

   | Field | Value |
   |---|---|
   | Name | `phishguard-app` |
   | Root Directory | `app` |
   | Build Command | `npm install && npm run build` |
   | Publish Directory | `dist` |

4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://phishguard-api.onrender.com/api` |

5. Click **Create Static Site** (~2–3 min build)

---

## Step 4 — Verify

1. Open the frontend URL
2. Go to **Admin** → confirm API Status shows "Online" and 4 models are loaded
3. Go to **Scanner** → paste `http://secure-paypal.verify-account.net/login` → Analyze
4. Should return **PHISHING DETECTED**

---

## Updating the app

```bash
git add .
git commit -m "Update: description"
git push
```

Render auto-redeploys on push. If you retrained models, push the new `.pkl` files too.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| "No model files found" on startup | Run `training/train.py` and commit the `backend/models/` artefacts |
| Backend shows "offline" in Admin | Free tier is sleeping — open the backend URL directly to wake it |
| CORS error in browser console | Ensure `VITE_API_URL` ends with `/api` (no trailing slash) |
| Build fails on frontend | Check `VITE_API_URL` env var is set in Render static site settings |
| `gunicorn: command not found` | Confirm `gunicorn==22.0.0` is in `backend/requirements.txt` |