# SmartLib – Personalized Digital Library

**SmartLib** is a full‑stack web application that lets users create a personal library of books from the Open Library catalogue.  The backend runs on **FastAPI** and stores data in Cloudflare D1 (or PostgreSQL) while Firebase Authentication handles user identity.  On top of this stack we provide:

* Search & filtering of books by title, author, subjects and categories.
* *Trending*, *popular*, *new* and *recently added* views powered by the Open Library API.
* User‑specific actions – favourites, ratings, reading progress and notifications.
* Contextual book recommendations based on TF‑IDF + cosine similarity of book titles/subjects.

The frontend is built with **React** (Vite) and uses a lightweight component library that follows the same design language as the backend.  It communicates with the API via `/api` proxy during development.

## Features
- ✅ Book search, filter & sort
- 🔎 Trending / Popular / New / Recent listings
- 📚 User favourites, ratings & reading progress
- 🎯 Recommendations using TF‑IDF + cosine similarity (on book title/subject)
- 👤 Firebase Authentication – Email/Password + Google OAuth
- ⚙️ Cloudflare D1 database support (auto migrations) **or** PostgreSQL fallback
  
## Architecture Overview

```
┌───────────────────────┐   ┌───────────────────────┐
│     Frontend          │◄──►│      Cloudflare D1     │
│ (React/Vite)          │    │  (SQL‑lite compatible) │
└───────────▲───────────┘   └───────────────────────┘
            │                         ▲
            │                         │ REST
            ▼                         │
      ┌───────────────────────────────┐
      │          FastAPI (Python)       │
      │  (Auth, DB access, Business logic)
      └───────────────────────────────┘

The backend exposes a JSON‑REST API.  During development the Vite dev server proxies `/api/*` to `localhost:8000`.  In production you can host the FastAPI app as a Cloudflare Worker (via wrangler) and the frontend on Cloudflare Pages.
```

## Folder Structure

```
backend/                 # Python FastAPI server
├─ app/                   # Application package
│  ├─ api/                # API routers
│  ├─ core/               # Config, firebase wrapper, logging
│  ├─ database/           # SQLAlchemy models & schema migration helpers
│  └─ main.py             # FastAPI app factory
├─ d1/                    # Cloudflare D1 schema
├─ migrations/            # Historical schema scripts
└─ requirements.txt      # Dependencies

frontend/                # React front‑end (Vite)
├─ public/                # Static assets & favicon
├─ src/
│  ├─ api/               # API client wrappers
│  ├─ components/        # UI components
│  ├─ context/           # React context providers
│  ├─ pages/             # Route components (React Router)
│  └─ utils/             # Helpers (date formatting, etc.)
└─ vite.config.js         # Vite config & dev proxy setup

.env.example            # Shared example for both frontend & backend

## Backend

The original instructions are now superseded by the detailed setup section below.  If you need quick steps, refer to the *Local Development Setup* section.

Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID` and `CLOUDFLARE_API_TOKEN` (custom token with
`Account → D1 → Edit`) in `backend/.env`. The backend talks to D1 through the D1 REST API via the
`sqlalchemy-cloudflare-d1` dialect; if they are unset it falls back to `DATABASE_URL`.

### Firebase

In the Firebase console: create a project, add a Web app, and enable **Email/Password** and **Google** under
Authentication → Sign-in method (add your deployed domain under Authorized domains). Put the web app config in
`frontend/.env` (`VITE_FIREBASE_*`) and the project ID in `backend/.env` (`FIREBASE_PROJECT_ID`).
## Frontend

The original instructions are now superseded by the detailed setup section below.  If you need quick steps, refer to the *Local Development Setup* section.

## Local auth without a Firebase project

Use the Firebase Auth emulator (`firebase emulators:start --only auth --project demo-smartlib`) and set the appropriate environment variables as shown in the **Environment Variables** section above.

## Environment Variables

Both the **backend** and **frontend** load configuration from `.env` files that are copied from the provided `.env.example`.  Below is a concise list of the variables you need to set.

### Backend (.env)
| Variable | Purpose | Example |
|----------|---------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (used when talking to D1) | `abc123...` |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 database identifier | `smartlib` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with **D1** permissions | `eyJhbGci...` |
| `DATABASE_URL` | Optional PostgreSQL connection string (falls back to this if D1 envs are missing) | `postgresql://user:pass@host/db` |
| `FIREBASE_PROJECT_ID` | Firebase project ID used by the admin SDK | `my-smartlib-project` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase service‑account JSON (optional, disables auth if missing) | `../service-account.json` |

### Frontend (.env)
| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID for the web SDK | `my-smartlib-project` |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (auto‑derived) | `my-smartlib-project.firebaseapp.com` |
| `VITE_FIREBASE_EMULATOR_HOST` | Local auth emulator address, when using the emulator | `127.0.0.1:9099` |

## Local Development Setup

### 1. Clone and enter the repository

```bash
git clone https://github.com/<user>/dbms-smartlib.git
cd dbms-smartlib
```

### 2. Backend

```bash
# Create and activate a Python venv (Python 3.12+ required)
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Copy example env and fill in your Cloudflare / Firebase values
cp backend/.env.example backend/.env

# Run database migrations (creates tables if they don't exist)
python -c "from app.database.schema import ensure_schema; ensure_schema()"

# Start the FastAPI server with auto‑reload for dev
uvicorn app.main:app --reload --port 8000
```

If you prefer to use PostgreSQL, set `DATABASE_URL` in the `.env` and skip the Cloudflare D1 steps.

### 3. Frontend

```bash
npm install   # from the root (installs both frontend and backend deps if package.json is present)
```

The Vite proxy forwards `/api` requests to `http://localhost:8000`.  When you open the browser at `http://localhost:5173` you should see the app running.

### 4. Firebase Auth Emulator (Optional)

If you don't have a Firebase project yet, you can test locally with the auth emulator:

```bash
firebase emulators:start --only auth --project demo-smartlib
```

Then set the environment variables as shown in the *Environment Variables* section above.

## Production Deployment (Optional)

The project is designed to run on Cloudflare Workers / Pages.  You can deploy the FastAPI app with **wrangler**:

```bash
npm i -g wrangler   # if you don't have it yet
cd backend
npx wrangler publish --name=smartlib-api
```

Configure your `wrangler.toml` (not included in this repo) to expose the `/api/*` route and set the same env variables as above.  The frontend can be deployed with Cloudflare Pages pointing to the `frontend/dist` folder after a `npm run build`.

## Contributing

Pull requests are welcome! Please follow the established code style:

- Python: [Black](https://github.com/psf/black) formatting, type hints with `mypy` (no errors).
- JavaScript/TypeScript: Prettier + ESLint.
- All new features should come with unit tests and documentation.
