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
