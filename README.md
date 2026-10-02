# MobiServe Uganda

MobiServe connects households and businesses with trusted local service professionals. Sign-in is the first screen; after authentication, customers, providers, and administrators land in separate workspaces with role-specific tools.

## Workspaces
- Customer: browse verified providers and shared map pins, submit service requests, review request status, and receive booking notifications.
- Provider: manage offered services, review matching open requests, accept work, and set a service-area pin. Precise coordinates stay private unless the provider explicitly shares them.
- Administrator: review and verify provider applications and monitor marketplace/request totals.

Provider request alerts are stored in the notification inbox and refreshed in the dashboard every 30 seconds. The provider inbox is available only after verification. Customer map tiles use OpenStreetMap; providers can click to place a pin or ask the browser for their location. No paid maps API key is required.

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
- `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{id}/read`
- `GET/PATCH /api/v1/provider/profile`, `PUT /api/v1/provider/services`
- `GET /api/v1/admin/overview`, `GET /api/v1/admin/providers`, `PATCH /api/v1/admin/providers/{id}/verification` (administrators only)

Run backend tests with `python -m pytest -q` from `backend`. Build the frontend with `npm run build` from `frontend`.

## Security
Production startup requires separate `SECRET_KEY` and `JWT_SECRET_KEY` values, each at least 32 characters long. Apply schema changes with `flask --app run db upgrade`; production never creates tables implicitly. Keep `.env` and all production credentials out of version control.

## License
MIT
