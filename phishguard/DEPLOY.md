# Render Deployment Guide

## Prerequisites
- GitHub account with this project pushed
- Render.com account (free tier works)

---

## Step 1 — Push to GitHub

```bash
# In the phishguard root folder:
git init
git add .
git commit -m "Initial commit — PhishGuard v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/phishguard.git
git push -u origin main
```

---

## Step 2 — Deploy the Backend (Flask API)

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub account and select the `phishguard` repo
3. Fill in these settings:

   | Field | Value |
   |---|---|
   | Name | `phishguard-api` |
   | Root Directory | `backend` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `gunicorn app:app --workers 1 --bind 0.0.0.0:$PORT --timeout 180` |
   | Instance Type | Free |

4. Click **Create Web Service**
5. Wait for the build to complete (~3–5 min)
6. **On first boot**, the API will auto-train all 4 ML models (~2 min) — this is normal
7. Copy your backend URL: `https://phishguard-api.onrender.com`

> ⚠️ **Free tier note:** The service spins down after 15 min of inactivity. First request after sleep takes ~30s. Upgrade to Starter ($7/mo) to keep it always-on.

---

## Step 3 — Deploy the Frontend (React Static Site)

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

   *(Replace with your actual backend URL from Step 2)*

5. Click **Create Static Site**
6. Wait for the build (~2–3 min)
7. Your site is live at `https://phishguard-app.onrender.com`

---

## Step 4 — Verify Everything Works

1. Open your frontend URL
2. Go to **Admin** → check API Status shows "Online"
3. Go to **Scanner** → paste `http://secure-paypal.verify-account.net/login` → click Analyze
4. Should return "PHISHING DETECTED" with red indicators

---

## Updating the App

Any `git push` to `main` will trigger automatic redeployment on Render.

```bash
git add .
git commit -m "Update: your change description"
git push
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Backend shows "offline" on Admin page | Free tier is sleeping — open backend URL directly to wake it |
| "No models available" error | Models are still training on first boot — wait 2 min and retry |
| CORS error in browser console | Make sure `VITE_API_URL` ends with `/api`, not a trailing slash |
| Build fails on frontend | Check `VITE_API_URL` env var is set in Render static site settings |
| `gunicorn: command not found` | Check `requirements.txt` includes `gunicorn==22.0.0` |
