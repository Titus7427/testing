# Architecture overview

MobiServe Uganda is structured as a modular, multi-tier platform with a React frontend, Flask API backend, PostgreSQL database, and Redis-based background job support.

## Layers
- Presentation layer: customer, provider, and admin web applications
- API layer: versioned REST endpoints under `/api/v1`
- Business services: authentication, requests, matching, payments, notifications, disputes
- Data layer: PostgreSQL with SQLAlchemy and Alembic migrations
- Integration layer: AI, payment providers, messaging, maps, and notifications

## Design principles
- Secure role-based access control
- Human review for consequential actions
- Provider verification before trust signals are exposed
- Explainable matching recommendations
- Provider abstraction for external services
