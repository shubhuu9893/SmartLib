# SmartLib

Personalized digital library: React/Vite frontend + FastAPI/PostgreSQL backend, Firebase Authentication, Open Library catalog and TF-IDF/cosine recommendations.

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL and FIREBASE_PROJECT_ID
uvicorn app.main:app --reload --port 8000
```

Tables are created/migrated automatically on startup.

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

## Demo account

```bash
cd backend && python -m app.seed_demo   # uses the same FIREBASE_* env as the backend
```

Creates (or resets) a Firebase user plus an onboarded SmartLib profile:

| Email | Password |
| --- | --- |
| `demo@smartlib.dev` | `Demo@1234` |

Override with `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD`. Set `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` in the frontend env to show a
"Use demo account" button on the login page. With the Auth emulator (`firebase.json` is in the repo root), re-run the seed after each
emulator restart. Against a real Firebase project, set `FIREBASE_SERVICE_ACCOUNT_PATH` and enable Email/Password sign-in.
