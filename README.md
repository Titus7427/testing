# MobiServe Uganda

MobiServe Uganda is a trusted local service marketplace for customers and vetted providers across Uganda. The project is designed to grow from a secure MVP into a broader East and Central African platform.

## Vision
Find trusted services. Get things done.

## Project structure
- backend/ - Flask API and business logic
- frontend/ - React + TypeScript + Vite application
- docs/ - architecture and product documentation
- deployment/ - deployment and infrastructure scripts
- .github/workflows/ - CI workflows

## Initial tech stack
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Flask, SQLAlchemy, JWT, Alembic
- Database: PostgreSQL
- Cache and background jobs: Redis
- Containerization: Docker Compose

## Quick start
### 1) Environment
Copy `.env.example` to `.env` and configure secret values.

### 2) Start the stack
```bash
docker compose up --build
```

### 3) Access the app
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/v1/health

## Backend local setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

## Frontend local setup
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Milestone approach
This repository starts with a production-appropriate foundation and architecture before adding the marketplace features in sequence.

## Security note
Do not commit secrets. Keep production API credentials and private keys in local environment files or deployment secret stores only.

## License
MIT
