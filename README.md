# MobiServe Uganda

MobiServe connects households and businesses with trusted local service professionals. The current MVP includes a live service catalog, provider directory, password-based customer accounts, service requests, and provider acceptance with customer notifications.

## Stack
- Frontend: React 19, TypeScript, Vite, Lucide
- Backend: Flask, SQLAlchemy, Flask-Migrate, JWT
- Database: PostgreSQL in Docker; SQLite can be used for local backend development
- Local orchestration: Docker Compose

## Run With Docker
1. Copy `.env.example` to `.env` and replace both signing secrets with unique random values of at least 32 characters.
2. From the repository root, run:

```bash
docker compose up --build
```

Open the marketplace at http://localhost:5173. The backend health check is at http://localhost:5000/api/v1/health. Docker waits for PostgreSQL, applies the database migrations, and loads local demo data before starting the API.

## Local Development
Start PostgreSQL, then set `DATABASE_URL` to its host address in `.env`. The Docker Compose file uses the container hostname `db`; a backend process running directly on your computer needs `localhost`.

Backend, from the repository root in PowerShell:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:APP_ENV = "development"
$env:DATABASE_URL = "sqlite:///app.db"
.\.venv\Scripts\python.exe -m flask --app run db upgrade
.\.venv\Scripts\python.exe -m flask --app run seed-demo
.\.venv\Scripts\python.exe run.py
```

Frontend, in a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev -- --host 0.0.0.0
```

Vite proxies `/api` to `http://127.0.0.1:5000` by default. Set `VITE_API_PROXY_TARGET` when the backend is at a different address.

## Demo Accounts
These accounts are created only by the development/test seed command. Do not seed demo accounts in a production environment.

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@mobiserve.ug` | `MobiServeDemo2026!` |
| Provider | `provider@mobiserve.ug` | `MobiServeProvider2026!` |
| Electrical provider | `daniel@mobiserve.ug` | `MobiServeProvider2026!` |
| Admin | `admin@mobiserve.ug` | `MobiServeAdmin2026!` |

All seeded passwords are stored as Werkzeug password hashes. Seeded identities and marketplace statistics are illustrative development data, not real people or verified service claims.

## API
- `GET /api/v1/health`
- `GET /api/v1/categories`, `/api/v1/services`, `/api/v1/providers`
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `POST /api/v1/service-requests`, `GET /api/v1/service-requests`
- `GET /api/v1/providers/service-requests` (verified providers only)
- `POST /api/v1/service-requests/{id}/bookings` (verified providers only)

Run backend tests with `python -m pytest -q` from `backend`. Build the frontend with `npm run build` from `frontend`.

## Security
Production startup requires separate `SECRET_KEY` and `JWT_SECRET_KEY` values, each at least 32 characters long. Apply schema changes with `flask --app run db upgrade`; production never creates tables implicitly. Keep `.env` and all production credentials out of version control.

## License
MIT
