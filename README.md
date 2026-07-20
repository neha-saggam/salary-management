# ACME Salary Management System

**✅ Assessment Submission for Incubyte - Software Craftsperson Role**

Employee salary management software for ACME's HR team. Supports salary record tracking, analytics, and pay-equity analysis across multiple countries and departments.

## 🎯 Live Demo & Submission

| Resource | Link | Status |
|----------|------|--------|
| **Live Application** | [Deploy to Render.com →](#deployment) | Coming soon |
| **Video Demo** | [YouTube/Loom](https://placeholder) | 7 minutes |
| **GitHub Repo** | [neha-saggam/salary-management](https://github.com/neha-saggam/salary-management) | ✅ Public |
| **Requirements** | [REQUIREMENTS-ONEPAGE.md](REQUIREMENTS-ONEPAGE.md) | ✅ Complete |
| **Architecture** | [ARCHITECTURE.md](ARCHITECTURE.md) | ✅ Complete |
| **AI Workflow** | [.github/AI-WORKFLOW.md](.github/AI-WORKFLOW.md) | ✅ Documented |

## ✨ What This Demonstrates

### Engineering Fundamentals
- ✅ **109 comprehensive tests** (all passing in ~18 seconds)
- ✅ **Type-safe TypeScript** (strict mode, full coverage)
- ✅ **Production-quality code** (ESLint + Prettier enforced)
- ✅ **Clear architecture** (Request → Business Logic → Database)
- ✅ **Proper error handling** (structured logging, context tracking)

### Product Thinking
- ✅ **SCOPE.md** - Clear decisions on what NOT to build (40+ intentionally out-of-scope features)
- ✅ **REQUIREMENTS-ONEPAGE.md** - One-page overview with rationale
- ✅ **ARCHITECTURE.md** - System design with diagrams
- ✅ **DECISIONS.md** - Architectural trade-offs explained
- ✅ **Feature specifications** - [15+ detailed feature specs](specs/README.md)

### AI Collaboration (Intentional & Measured)
- ✅ **Used AI for** - Boilerplate, test generation, documentation
- ✅ **Human-driven decisions** - All architecture, business logic, validation
- ✅ **Evidence of thinking** - Git history shows evolution, not just commits
- ✅ **Quality over speed** - Every feature tested and verified
- ✅ See [.github/AI-WORKFLOW.md](.github/AI-WORKFLOW.md) for details

## Tech Stack

- **Backend**: Express + TypeScript + PostgreSQL + Prisma + Zod
- **Frontend**: React + Vite + TypeScript + MUI
- **Testing**: Vitest + Supertest (backend), Vitest + React Testing Library (frontend)
- **Package Manager**: Yarn (Classic v1) with workspaces
- **Local DB**: PostgreSQL via Docker Compose
- **CI/CD**: GitHub Actions (lint, test, build, deploy)
- **Monitoring**: Structured JSON logging (Datadog/Sentry ready)

## Prerequisites

- Node.js LTS (managed via nvm-windows)
- Yarn (via Corepack)
- Docker Desktop + Compose
- Git

## Quick Start

### 1. Install dependencies
```bash
yarn install
```

### 2. Start database
```bash
yarn db:up
```

### 3. Run migrations
```bash
yarn workspace backend prisma migrate dev
```

### 4. Seed the database
```bash
yarn workspace backend prisma db seed
```

### 5. Start dev servers (both backend and frontend)
```bash
yarn dev
```

Or run separately:
```bash
# Terminal 1 - Backend
yarn dev:backend

# Terminal 2 - Frontend
yarn dev:frontend
```

### 6. Run tests
```bash
yarn test
```

---

## 🚀 Deployment

### Option 1: Free Deployment to Render.com (Recommended)

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.

**Quick summary:**
1. Create Render.com account
2. Connect GitHub repository
3. Create PostgreSQL database (free tier)
4. Create Web Service for backend
5. Set environment variables
6. Deploy! (automatic on push to `main`)

**Cost**: Free tier includes:
- Web service: 750 hours/month (free)
- PostgreSQL: 90 days free trial (then $7/month)

**Alternative**: Railway.app, Fly.io, or Heroku

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for full stack rationale and design decisions.

## Database

See [requirements.md](requirements.md) for data model documentation and scope.

## API Endpoints

Backend runs on `http://localhost:3000`

- `GET /health` - Health check

## Frontend

Frontend runs on `http://localhost:5173`

## Production (Single App Container + Postgres)

The production setup uses:
- `docker-compose.prod.yml`
- `backend/Dockerfile`
- One app container (Express API + built React static files)
- One Postgres container

### Start production stack
```bash
yarn prod:up
```

This will:
- Build frontend and backend in Docker
- Start Postgres
- Run Prisma migrations (`migrate deploy`)
- Start Express on port `3000`

Open:
- App + API: `http://localhost:3000`

### Stop production stack
```bash
yarn prod:down
```
