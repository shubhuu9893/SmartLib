# SmartLib

Personalized digital library: React/Vite frontend + FastAPI backend on Cloudflare D1 (or PostgreSQL), Firebase Authentication, Open Library catalog and TF-IDF/cosine recommendations.

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set CLOUDFLARE_* (or DATABASE_URL) and FIREBASE_PROJECT_ID
uvicorn app.main:app --reload --port 8000
```

Tables are created/migrated automatically on startup.

### Cloudflare D1

```bash
npx wrangler d1 create smartlib                     # prints the database_id
npx wrangler d1 execute smartlib --remote --file backend/d1/schema.sql   # optional, startup also creates tables
```

Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID` and `CLOUDFLARE_API_TOKEN` (custom token with
`Account → D1 → Edit`) in `backend/.env`. The backend talks to D1 through the D1 REST API via the
`sqlalchemy-cloudflare-d1` dialect; if they are unset it falls back to `DATABASE_URL`.

### Firebase

In the Firebase console: create a project, add a Web app, and enable **Email/Password** and **Google** under
Authentication → Sign-in method (add your deployed domain under Authorized domains). Put the web app config in
`frontend/.env` (`VITE_FIREBASE_*`) and the project ID in `backend/.env` (`FIREBASE_PROJECT_ID`).

## Frontend

```bash
cd frontend
npm install
cp .env.example .env   # Firebase web app config (VITE_*)
npm run dev            # http://localhost:5173, /api is proxied to the backend
npm run lint
npm run build
```

## Local auth without a Firebase project

Use the Firebase Auth emulator (`firebase emulators:start --only auth --project demo-smartlib`), then set
`FIREBASE_PROJECT_ID=demo-smartlib` + `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` for the backend and
`VITE_FIREBASE_PROJECT_ID=demo-smartlib`, `VITE_FIREBASE_API_KEY=demo-api-key`,
`VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` for the frontend.
