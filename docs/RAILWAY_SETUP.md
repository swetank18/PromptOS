# Railway Deployment Setup

This guide deploys PromptOS using Railway free trial credits.

## 1) Create Railway Project

1. Open Railway dashboard and create a new project from GitHub repo `swetank18/PromptOS`.
2. Add these services:
- Postgres plugin
- Redis plugin
- Backend service (Python)
- Worker service (Python)
- Frontend service (Node)

## 2) Backend Service

Service settings:
- Root Directory: `/`
- Build Command: `pip install -r backend/requirements.txt`
- Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Environment variables:
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `REDIS_URL` = `${{Redis.REDIS_URL}}`
- `CELERY_BROKER_URL` = `${{Redis.REDIS_URL}}`
- `CELERY_RESULT_BACKEND` = `${{Redis.REDIS_URL}}`
- `JWT_SECRET` = strong random secret
- `DEBUG` = `false`
- `CORS_ORIGINS` = `["https://<frontend-domain>","chrome-extension://*"]`

## 3) Worker Service

Service settings:
- Root Directory: `/`
- Build Command: `pip install -r backend/requirements.txt`
- Start Command: `cd backend && celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2`

Environment variables:
- same as backend (`DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `DEBUG=false`)

## 4) Frontend Service

Service settings:
- Root Directory: `/`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start -- -p $PORT`

Environment variables:
- `NEXT_PUBLIC_API_URL` = `https://<backend-domain>`

## 5) Initialize Database Schema (one-time)

Run in Backend service shell:

```bash
python scripts/init-db-railway.py
```

## 6) Verify

- Backend health: `https://<backend-domain>/health`
- API docs: `https://<backend-domain>/api/docs`
- Frontend: `https://<frontend-domain>`

## 7) Build Extension for Production API

From local repo:

```powershell
./scripts/package-extension.ps1 -ApiUrl "https://<backend-domain>" -OutputZip "promptos-extension.zip"
```

Upload `promptos-extension.zip` to Chrome Web Store.

## 8) Common Failure Checks

- 502/503 on backend: check `DATABASE_URL` and schema init step.
- Embeddings not processing: verify worker is running and `REDIS_URL`/Celery vars are present.
- Extension login/capture fails: verify popup API URL points to deployed backend.
