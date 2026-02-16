# Production Rollout (PromptOS)

This is the shortest path to make PromptOS usable by external users.

## 1. Deploy Backend + Worker + DB + Redis + Frontend on Render

1. Push current `main` branch to GitHub.
2. In Render, create a Blueprint deployment from this repo.
3. Render will read `render.yaml` and create:
   - `promptos-api` (FastAPI)
   - `promptos-worker` (Celery)
   - `promptos-web` (Next.js)
   - `promptos-db` (Postgres)
   - `promptos-redis` (Redis)
4. After services are created, set required env vars manually:
   - On `promptos-api`:
     - `CORS_ORIGINS` = `["https://<your-frontend-domain>","chrome-extension://*"]`
   - On `promptos-web`:
     - `NEXT_PUBLIC_API_URL` = `https://<your-api-domain>`
5. Run DB schema init one time (Render shell on API service):
   - `psql "$DATABASE_URL" -f backend/db/schema.sql`

## 2. Verify Production Services

1. API health:
   - `https://<your-api-domain>/health`
2. API docs:
   - `https://<your-api-domain>/api/docs`
3. Frontend:
   - `https://<your-frontend-domain>`

## 3. Prepare Extension for Production API

Set extension default API URL before release:

```powershell
./scripts/package-extension.ps1 -ApiUrl "https://<your-api-domain>" -OutputZip "promptos-extension.zip"
```

This updates `extension/utils/constants.js` and creates a release zip.

## 4. Publish Extension

1. Go to Chrome Web Store Developer Dashboard.
2. Upload `promptos-extension.zip`.
3. Fill listing, privacy policy, screenshots.
4. Submit for review.

## 5. Post-Launch Checklist

1. Create one real user account and test:
   - Login from extension popup
   - Capture on ChatGPT/Claude/Gemini
   - Search and compare in web dashboard
2. Monitor:
   - API logs (`promptos-api`)
   - Worker logs (`promptos-worker`)
   - DB/Redis health

## Notes

- Keep `DEFAULT_API_URL` in `extension/utils/constants.js` set to production for Web Store users.
- Keep local dev by overriding API URL in extension settings when needed.
- Do not use `CORS_ORIGINS=["*"]` in production.

