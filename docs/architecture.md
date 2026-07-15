# Architecture & Design Rationale

## Why This Stack?

Every choice is driven by **developer familiarity under assessment time pressure**. See requirements.md for full scope context.

### Backend: Express + TypeScript + PostgreSQL + Prisma + Zod

**Express over NestJS**: Express is lightweight, familiar, and sufficient for this 10k-row dataset. NestJS adds structure and opinionation that's overkill for a small HR team's internal tool. Express + manual routing is simpler to understand and test.

**TypeScript**: Type safety reduces bugs in data manipulation code (critical for salary data). Developer familiar with TS.

**PostgreSQL over SQLite**: SQLite lacks proper indexes, multi-level transactions, and concurrent write handling. Postgres is production-grade and supports Docker Compose for local dev. (SQLite would be tempting for simplicity, but the requirements specifically ask for analytics and multi-user access patterns.)

**Prisma over Drizzle**: Prisma's schema-first approach and auto-migrations are faster to iterate than Drizzle's manual SQL. Developer knows Prisma. Seeding support is cleaner in Prisma.

**Zod over Yup/Joi**: Zod is lightweight, TypeScript-first, and integrates cleanly with Prisma (client generation). Developer prefers Zod's API.

### Frontend: React + Vite + TypeScript + MUI

**React over Vue/Svelte**: React is the most familiar framework for this developer.

**Vite over Next.js**: Vite is fast, minimal, and sufficient. Next.js adds file-based routing, server components, and API routes—unnecessary for an internal HR tool that's a SPA with a separate backend API. Vite + React is cleaner and faster to develop.

**MUI over shadcn**: MUI is a full component library with built-in theming and accessibility. shadcn is great for design-system flexibility, but MUI's pre-built components (Table, Autocomplete, etc.) accelerate HR dashboard development. Developer prefers MUI's "batteries included" approach for admin UIs.

### Testing: Vitest + Supertest (backend), Vitest + React Testing Library (frontend)

**Vitest**: Faster than Jest, ESM-native, Vite-aligned. Good for unit + integration tests.

**Supertest**: Standard for Express HTTP endpoint testing.

**React Testing Library**: Standard for React component testing. Encourages testing behavior, not implementation.

### Package Manager: Yarn Classic v1 + Workspaces

**Yarn over npm**: Workspaces support is cleaner in Yarn (mono-repo management is built-in). Yarn Classic (v1) is stable and familiar.

**Monorepo (workspaces)** over separate repos: Single repo keeps backend + frontend aligned. Shared scripts (`yarn dev`, `yarn test`) simplify local development. Easier to evolve schema and API in lockstep.

### Local DB: PostgreSQL via Docker Compose

**Docker Compose over system Postgres**: Isolated, reproducible, one-command start (`yarn db:up`). No version conflicts with other projects. Easy reset (`yarn db:reset`).

**Dev-only setup**: Backend and frontend run directly (hot reload via `yarn dev`), not in containers. Only Postgres is containerized. This trades a tiny bit of prod/dev parity for faster feedback loops in development.

### Prod: Fully Containerized

**Single backend container** serving **Express + built Vite frontend**: Deliberate choice to avoid Nginx. The HR team is small and internal; no high-concurrency load balancing needed. Express is fast enough for static file serving. Simpler ops—fewer moving parts.

**postgres + backend** in Docker Compose (`docker-compose.prod.yml`): Standard containerized stack.

## Data Model: Why Salary Is a History Table

A single `salary` field on Employee would work, but salary changes (raises, promotions, hire date) are valuable signal:
- Promotion analysis: "Who got promoted?" (PROMOTION reason)
- Raise patterns: "What's the average annual raise?" (ANNUAL_RAISE)
- Outlier detection: "Who got a big adjustment?" (ADJUSTMENT, MARKET_CORRECTION)
- Historical trends: "How has this employee's salary evolved?"

**SalaryRecord** as a history table unlocks these questions. Trade-off: more queries, but Prisma makes it clean, and the composite index on `(employeeId, effectiveDate)` makes "current salary" lookup fast.

## Multi-Currency: Denormalized USD at Write Time

**Why denormalize?**
- Reproducibility: rates are static (seeded, not live); no runtime surprises
- Performance: no USD conversion at query time (fast analytics)
- Simplicity: no need for a live FX API or rate-cache service

**Trade-off**: if rates change (e.g., monthly), the old records stay in the original currency. For a historical dataset, that's actually correct (preserves what the employee earned in local currency at that time). If live rates were required, we'd use `currency + amountLocalCurrency` and fetch `FxRate` at query time—slower analytics but more flexible.

## Indexing Strategy

- **`(employeeId, effectiveDate)` on SalaryRecord**: composite index. Enables fast lookup of "latest salary record for employee X" (`ORDER BY effectiveDate DESC LIMIT 1`).
- **`departmentId`, `countryId`, `managerId` on Employee**: low cardinality but frequently filtered in analytics queries.
- **Deliberately omitted**: `jobLevel`, `status` (low cardinality, full scans are acceptable at 10k rows). No full-text or trigram indexes (out of scope).

For a dataset 10x larger, we'd reconsider full-text search on names and consider partitioning by date range on SalaryRecord.

## Manager Hierarchy: Shallow by Design

A shallow manager structure (top-level managers per country/dept, everyone else reports to one) is deliberately kept simple:
- Easier to seed and reason about
- Sufficient for "who reports to whom" and org chart views
- Avoids complex recursive queries (not needed for 10k employees)
- If deep hierarchies become critical later, we can add a `path` materialized column or use recursive CTEs.

## Why Not Features Like Search, Auth, or Normalization?

- **Full-text name search**: Out of scope. Autocomplete on pre-loaded lists or simple substring filters suffice for 10k employees.
- **Authentication/authorization**: HR team is trusted and small. No multi-tenant isolation required.
- **Further normalization** (e.g., job level as a lookup table): Unnecessary; `jobLevel` is a free string, low cardinality, and that's fine.

These can be added later if requirements change.
