# Newborn Health Tracking API (Backend)

FastAPI-based backend that powers the Newborn Health Tracking platform. It delivers Google OAuth sign-in, parent/child management, and health log endpoints (growth, medication, vaccine) backed by async SQLAlchemy/MySQL and JWT-based sessions.

---

## Tech Stack

- **Language**: Python 3.10+
- **Framework**: FastAPI
- **Async ORM**: SQLAlchemy 2.x + `aiomysql`
- **Database**: MySQL 8.0+
- **Migrations**: Alembic (manual init required, see below)
- **Validation**: Pydantic v2 + `pydantic-settings`
- **Auth**: Google ID token verification (`google-auth`) + server-issued JWT (python-jose) + optional email/password login (`passlib[bcrypt]`)
- **Package Manager**: [`uv`](https://github.com/astral-sh/uv)
- **Testing**: `pytest`, `httpx` (async client)

---

## Project Layout

```
backend/
├── app/
│   ├── api/                  # FastAPI routers + dependencies
│   ├── core/                 # Settings, security utilities
│   ├── db/                   # Async session factory
│   ├── models/               # SQLAlchemy models
│   ├── schemas/              # Pydantic DTOs
│   └── main.py               # App factory + CORS/error handling
├── README.md                 # You are here
└── (uv project files)        # pyproject.toml, uv.lock, etc.
```

---

## Prerequisites

1. Python 3.10+
2. MySQL 8.0+ instance (local or managed)
3. Google Cloud OAuth Client (Web) to retrieve Client ID / audience
4. [`uv`](https://github.com/astral-sh/uv) installed globally

---

## Bootstrap Commands

Inside `backend/`:

```bash
# Initialize the uv project (creates pyproject, etc.)
uv init --python 3.10 .

# Install runtime + tooling dependencies
uv add fastapi uvicorn sqlalchemy aiomysql pydantic-settings google-auth "python-jose[cryptography]" "passlib[bcrypt]" pytest httpx
```

These commands generate `pyproject.toml`/`uv.lock` with the locked dependency set. Commit both files.

---

## Environment Configuration

The app uses `pydantic-settings` (`app/core/config.py`). Create a `.env` file in `backend/` with:

```
PROJECT_NAME=Newborn Health Tracking API
API_V1_PREFIX=/api/v1

NB_DATABASE_URL=mysql+aiomysql://app_user:app_pass@127.0.0.1:3307/newborn_health
DATABASE_ECHO=false
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10

JWT_SECRET_KEY=super-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRES_MINUTES=1440

GOOGLE_AUDIENCE=<google-client-id>.apps.googleusercontent.com
CORS_ORIGINS=http://localhost:3000
```

Notes:
- `NB_DATABASE_URL` points to the Docker Compose MySQL service (forwarded to host port `3307`). When running inside Compose we override it to `mysql+aiomysql://app_user:app_pass@db:3306/newborn_health`.
- `GOOGLE_AUDIENCE` accepts comma-separated values if you serve multiple frontends.
- `CORS_ORIGINS` is normalized from comma-separated strings; `http://localhost:3000` is required for the Next.js frontend.

---

## Database & Migrations

1. **Create database & user**:
   ```sql
   CREATE DATABASE newborn_health CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'nb_user'@'%' IDENTIFIED BY 'strong-password';
   GRANT ALL ON newborn_health.* TO 'nb_user'@'%';
   ```

2. **Alembic setup** (run once):
   ```bash
   uv add alembic
   alembic init migrations
   ```
   - Set `script.py.mako` to use `async` SQLAlchemy metadata (see SQLAlchemy docs).
   - Update `env.py` to import `app.models.base.Base`.
   - Place revisions under `migrations/versions/`.

3. **Create migration**:
   ```bash
   alembic revision --autogenerate -m "Initial schema"
   alembic upgrade head
   ```

---

## Running the App

### Development

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- FastAPI docs available at `http://localhost:8000/docs`.
- Ensure the frontend points to `http://localhost:8000`.

### Production

1. **Build artifact** (optional):
   ```bash
   uv pip install --target build/ .
   ```
2. **Use a process manager** (systemd, supervisord) or container orchestrator.
3. **Recommended command** (example):
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```
4. Place Uvicorn behind a reverse proxy (NGINX) with TLS termination.

---

## Docker Usage

1. **Copy environment file** (if you haven't already):
   ```bash
   cp .env.example .env
   ```
2. **Start MySQL + API stack** (code volume is mounted for live edits):
   ```bash
   docker compose up --build
   ```
3. **Apply migrations** (run once per environment):
   ```bash
   docker compose run --rm api alembic upgrade head
   ```
4. Visit `http://localhost:8000/docs` for the API docs. MySQL is exposed on `localhost:3307` if you want to connect with a GUI.
5. **Shut down**:
   ```bash
   docker compose down -v
   ```

Notes:
- `docker-compose.yml` overrides `NB_DATABASE_URL` to `mysql+aiomysql://app_user:app_pass@db:3306/newborn_health` for the API container. The `.env` copy continues to point to `127.0.0.1:3307` for local tooling.
- Use `docker compose logs -f api` to tail server output or `docker compose run --rm api uv run pytest` to execute tests inside the containerized environment.

---

## Authentication Flow

### Google Sign-In

1. Frontend obtains Google ID token via Google OAuth JS SDK.
2. Frontend calls `POST /api/v1/auth/google` with `{ "id_token": "<token>" }`.
3. Backend verifies the token against Google, creates the user if needed, and returns an `AuthResponse`.

### Email/Password

1. Frontend calls `POST /api/v1/auth/register` with `{ "email": "...", "password": "...", "full_name": "..." }`.
2. Passwords are hashed with bcrypt via Passlib before storage.
3. To login, call `POST /api/v1/auth/login` with `{ "email": "...", "password": "..." }`.

For both flows the backend issues a JWT in the `access_token` field:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { ... }
}
```

Clients store the JWT securely (HTTP-only cookie or secure storage) and attach it as `Authorization: Bearer <token>` on subsequent calls.

JWTs encode the user UUID in the `sub` claim and use HS256 with the configured secret.

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Create a local user account with email/password. |
| `/api/v1/auth/login` | POST | Obtain a JWT via email/password credentials. |
| `/api/v1/auth/google` | POST | Exchange Google ID token for session JWT. |
| `/api/v1/children` | GET/POST | List or create children for the authenticated parent. |
| `/api/v1/children/{child_id}` | GET/PUT/DELETE | Retrieve, update, or delete a child (ownership enforced). |
| `/api/v1/health/growth` | GET/POST | Growth log listing/filtering + creation. |
| `/api/v1/health/medications` | GET/POST | Medication log listing/filtering + creation. |
| `/api/v1/health/vaccines` | GET/POST | Vaccine schedule listing/filtering + creation. |

All non-auth routes require `Authorization: Bearer <token>`. Ownership is enforced via parent-child relationships.

---

## Error Handling

- Global exception handler returns JSON payloads (`{"detail": "message"}`) to keep responses consistent.
- Validation errors are handled by FastAPI/Pydantic automatically.
- Authentication failures emit `401` with `{"detail": "Invalid token"}` or similar.

---

## Testing

```bash
uv run pytest
```

Suggested fixtures:
- `httpx.AsyncClient` with `app=app.main.app`.
- Database sandbox using transaction rollbacks or test schema.

Focus on:
- Google login exchange (mock Google verification).
- CRUD for children and health logs.
- Authorization edge cases (cross-parent data access).

---

## Deployment Checklist

1. Set strong `JWT_SECRET_KEY` and restrict file permissions.
2. Configure `.env` or environment variables via secrets manager (e.g., AWS SSM, GCP Secret Manager).
3. Enable HTTPS at the proxy/load balancer.
4. Ensure MySQL network access is restricted to the app + migration runners.
5. Configure structured logging and monitoring (e.g., GCP Cloud Logging, Datadog).
6. Schedule Alembic migrations as part of release pipeline.
7. Rotate Google OAuth credentials and JWT secrets periodically.

---

## Future Enhancements

- Add PATCH/DELETE for health logs, plus bulk import/export.
- Implement role-based access for caregivers/pediatricians.
- Add background jobs (e.g., vaccine reminders) using Celery or FastAPI background tasks.
- Integrate metrics/observability stack (Prometheus, OpenTelemetry).
