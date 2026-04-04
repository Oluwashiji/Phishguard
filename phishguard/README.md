# PhishGuard — ML Phishing Detection

A full-stack phishing detection platform using Machine Learning. Analyzes URLs and email content using 4 ML algorithms and provides real-time classification with confidence scores and risk indicators.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Recharts |
| Backend | Python 3.11, Flask 3, Gunicorn |
| ML | scikit-learn (LR, RF, MLP, SVM) |
| Deployment | Render.com |

## Project Structure

```
phishguard/
├── backend/          # Flask API
│   ├── app.py        # Main API (auto-trains models on first boot)
│   ├── model_training.py
│   ├── feature_extraction.py
│   └── requirements.txt
├── app/              # React frontend
│   ├── src/
│   │   ├── pages/    # Dashboard, ModelComparison, About, AdminPanel
│   │   ├── services/ # API client (uses VITE_API_URL env var)
│   │   └── components/
│   └── package.json
└── render.yaml       # Render deployment config
```

## Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
# API runs at http://localhost:5000
# Models auto-train on first run (~2 min)
```

**Frontend:**
```bash
cd app
npm install
# Create .env from .env.example and set VITE_API_URL=http://localhost:5000/api
cp .env.example .env
npm run dev
```

## Render Deployment

See DEPLOY.md for step-by-step instructions.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Health check |
| GET | /api/models | Available models |
| POST | /api/predict | Single model prediction |
| POST | /api/predict/all | All models consensus |
| GET | /api/metrics | Model performance metrics |
| POST | /api/analyze | Feature extraction only |
| POST | /api/train | Retrain models |

## Features Extracted

**URL (18 features):** length, domain, HTTPS, IP address, @ symbol, URL shortener, suspicious TLD, brand in subdomain, subdomains, entropy, special chars, digits, keywords, double slash, hyphens, dots, slashes, path length.

**Email (17 features):** word count, link count, HTML presence, phishing keywords, urgency score, exclamations, suspicious patterns, spelling errors, sender mismatch, reply-to mismatch, grammar score, attachment references, digits, lines, capitals, text length, question marks.
