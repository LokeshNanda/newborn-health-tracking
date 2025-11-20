# Newborn Health Tracking Platform

Production-ready backend services for logging newborn growth, medication, and vaccination data, plus a forthcoming Next.js frontend (currently work in progress). The backend is built for real deployments—Google OAuth, JWT sessions, async MySQL access, Alembic migrations, Dockerized workflow, and pytest coverage scaffolding.

---

## Repository Structure

| Path | Status | Description |
|------|--------|-------------|
| `backend/` | ✅ Production-ready | FastAPI service, SQLAlchemy models, Alembic migrations, Docker stack, detailed README. |
| `frontend/` | 🚧 In progress | Planned Next.js 14 app; code will be published in this repository once ready. |

> **Need the backend docs?** See [`backend/README.md`](backend/README.md) for schema diagrams, API endpoints, environment variables, Docker instructions, and deployment checklists.

---

## Backend Highlights

- **FastAPI + Async SQLAlchemy** with aiomysql driver for MySQL 8.0+
- **Authentication**: Google ID token verification + optional email/password login (bcrypt via Passlib) issuing HS256 JWT sessions
- **Domain Models**: Users, children, growth logs, medication logs, vaccine schedules (UUID primary keys for distributed safety)
- **Validation & Settings**: Pydantic v2 + `pydantic-settings`
- **Migrations**: Alembic configured for async engines
- **Testing**: pytest + httpx scaffolding (ready for integration tests)
- **Dev Experience**: [`uv`](https://github.com/astral-sh/uv) for dependency management & virtualenvs
- **Ops Ready**: Dockerfile + docker-compose, CORS for `http://localhost:3000`, global JSON error handler, structured README

---

## Quick Start (Backend)

```bash
cd backend
cp .env.example .env        # update secrets & NB_DATABASE_URL as needed
uv sync                     # creates .venv and installs deps
uv run alembic upgrade head # create database schema
uv run uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for interactive API docs. The `.env.example` defaults assume you’re using the provided `docker-compose.yml` (MySQL exposed on `localhost:3307`).

---

## Docker Workflow

```bash
cd backend
cp .env.example .env
docker compose up --build -d     # launches API + MySQL (with live code volume)
docker compose run --rm api alembic upgrade head
docker compose logs -f api       # tail logs
docker compose down -v           # tear down stack
```

- The API container overrides `NB_DATABASE_URL` to point at the `db` service.
- MySQL data persists via the `mysql_data` named volume; remove with `docker volume rm`.

---

## Frontend Status

- The Next.js client is being designed in parallel and will land under `frontend/` soon.
- Until then, backend endpoints are documented and stable, so other clients (mobile, 3rd party integrations) can safely integrate using the published OpenAPI schema.

---

## Contributing & Next Steps

1. Fork/branch from the desired base (e.g., `feature/init`).
2. Use `uv run pytest` before opening a PR; add tests for new routes.
3. Keep secrets out of git—`.env`, `.venv`, and Docker artifacts are gitignored.
4. Planned roadmap:
   - Publish the Next.js frontend
   - Add background reminders (vaccines/medications)
   - Build health analytics dashboards

Feel free to open issues for feedback or feature requests while the frontend is under development.

---

## License

See [LICENSE](LICENSE) for details.
