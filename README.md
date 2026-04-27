# ProjectFlow — SaaS Project Management System

A full-stack, multi-tenant project management system built with React + Node.js. Features real-time Kanban boards, JWT auth with refresh token rotation, org-scoped RBAC, and activity logging.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Zustand, Axios, TypeScript |
| Backend | Node.js, Express, PostgreSQL, raw SQL (`pg`) |
| Auth | JWT access tokens + SHA-256 hashed refresh tokens |
| Styling | Tailwind CSS |

## Features

- **Multi-tenant architecture** — all data scoped by organization
- **JWT auth with refresh token rotation** — silent token renewal, token reuse detection
- **Org-scoped RBAC** — real-time DB role checks (admin / member / viewer)
- **Kanban board** — drag-drop with optimistic updates + API persistence
- **Activity logging** — non-blocking, fire-and-forget audit trail
- **Rate limiting** — on auth endpoints (10 req / 15 min per IP)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Clone & install

```bash
git clone <your-repo-url>
cd project-manager
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your PostgreSQL credentials and JWT secret
```

Create the database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE project_manager;"
psql -U postgres -d project_manager -f db/schema.sql
psql -U postgres -d project_manager -f db/seed.sql   # optional — creates demo users
```

### Demo Credentials (after seeding)

| Email | Password | Role | Can Do |
|---|---|---|---|
| `admin@acme.com` | `Password123` | **Admin** | Everything — create/delete projects, manage tasks, invite members |
| `member@acme.com` | `Password123` | **Member** | Create/edit projects and tasks, move tasks on board |
| `viewer@acme.com` | `Password123` | **Viewer** | Read-only — can view projects and tasks, cannot create/edit/move |

Start the backend:

```bash
npm run dev
# → http://localhost:5000
```

### 3. Frontend

```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
# → http://localhost:5173
```

## Monitoring with Prometheus

The backend now exposes Prometheus metrics at:

- `http://localhost:5000/metrics`

### Run Prometheus via Docker

From the project root:

```bash
docker compose up -d prometheus
```

Then open:

- Prometheus UI: `http://localhost:9090`
- Target status: `http://localhost:9090/targets`

The preconfigured scrape job (`project-manager-api`) uses `monitoring/prometheus.yml` and scrapes the backend metrics endpoint every 15 seconds.

To stop Prometheus:

```bash
docker compose stop prometheus
```

> Note: Make sure Docker Desktop / Docker daemon is running before using compose commands.

### Useful metric names

- `project_manager_http_requests_total`
- `project_manager_http_request_duration_seconds`
- `project_manager_process_cpu_user_seconds_total`
- `project_manager_process_resident_memory_bytes`

## API Endpoints

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account + organization |
| POST | `/api/auth/login` | Login, returns JWT + refresh token |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/auth/me` | Current user + orgs |

### Organizations
| Method | Route | Description |
|---|---|---|
| GET | `/api/orgs/:orgId/members` | List org members |
| POST | `/api/orgs/:orgId/members/invite` | Invite member (admin) |
| GET | `/api/orgs/:orgId/workspaces` | List workspaces |
| POST | `/api/orgs/:orgId/workspaces` | Create workspace (admin) |
| GET | `/api/orgs/:orgId/activity` | Activity feed |

### Projects
| Method | Route | Description |
|---|---|---|
| GET | `/api/workspaces/:wsId/projects` | List projects |
| POST | `/api/workspaces/:wsId/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Soft delete project |

### Tasks
| Method | Route | Description |
|---|---|---|
| GET | `/api/projects/:id/tasks` | List tasks (filterable) |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PATCH | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/move` | Move task (status + position) |
| DELETE | `/api/tasks/:id` | Soft delete task |

## Project Structure

```
├── frontend/
│   ├── src/               # React frontend
│   │   ├── api/           # Axios client + API modules
│   │   ├── components/    # Reusable UI components
│   │   ├── layouts/       # Auth + Dashboard layouts
│   │   ├── pages/         # Route pages
│   │   ├── store/         # Zustand stores
│   │   └── utils/         # Token helpers
│   ├── public/            # Static assets
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/        # DB pool, env validation
│   │   ├── controllers/   # Thin request handlers
│   │   ├── middlewares/    # Auth, RBAC, error handler
│   │   ├── models/        # Raw SQL query functions
│   │   ├── routes/        # Express routers
│   │   ├── services/      # Business logic
│   │   └── utils/         # Logger, response helpers
│   └── db/                # Schema + seed SQL
```

## License

MIT

## Testing

Use the repo-specific checklist in [TESTING.md](./TESTING.md) before pushing changes.
