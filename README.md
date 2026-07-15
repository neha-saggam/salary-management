# ACME Salary Management System

Employee salary management software for ACME's HR team. Supports salary record tracking, analytics, and pay-equity analysis across multiple countries and departments.

## Tech Stack

- **Backend**: Express + TypeScript + PostgreSQL + Prisma + Zod
- **Frontend**: React + Vite + TypeScript + MUI
- **Testing**: Vitest + Supertest (backend), Vitest + React Testing Library (frontend)
- **Package Manager**: Yarn (Classic v1) with workspaces
- **Local DB**: PostgreSQL via Docker Compose

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

## Architecture

See [docs/architecture.md](docs/architecture.md) for full stack rationale and design decisions.

## Database

See [requirements.md](requirements.md) for data model documentation and scope.

## API Endpoints

Backend runs on `http://localhost:3000`

- `GET /health` - Health check

## Frontend

Frontend runs on `http://localhost:5173`
