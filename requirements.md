# Requirements & Scope — ACME Salary Management

## Goal

Build employee salary management software for ACME's HR team (10,000 employees across multiple countries) to manage salary records and answer analytical questions about organizational pay structure (averages, medians, distributions, pay-equity flags).

## Core Features

### In Scope
- Manage salary records (create, read, update) with full history (HIRE, ANNUAL_RAISE, PROMOTION, ADJUSTMENT, MARKET_CORRECTION)
- Employees organized by country, department, and job level
- Analytics: average/median salary by department, country, level, and status
- Pay-equity flag detection (outliers, compression checks)
- Multi-currency support (normalized to USD at write time via static FxRate table)
- Manager hierarchy (shallow—top-level managers per country/dept, everyone else reports to one)
- Frontend: employee list, search, filter, detail view, analytics dashboard

### Out of Scope
- Live FX API integration (static seed rates)
- Deep multi-level org charts (intentionally flat)
- Full-text or fuzzy name search
- Performance optimization beyond basic indexing (10k rows is small)
- Authentication/authorization (HR team is trusted, small group)
- Third-party integrations (ADP, Workday, etc.)

## Data Model

### Entities

- **Employee**: id, employeeCode, firstName, lastName, email, country, department, jobLevel, manager, hireDate, status (ACTIVE/TERMINATED)
- **SalaryRecord**: id, employeeId, amount, currency, amountUsd, effectiveDate, reason (enum)
- **Department**: id, name (6–7 departments)
- **Country**: id, name, currencyCode (6 countries)
- **FxRate**: id, currencyCode, rateToUsd, asOfDate (static seed, one per currency)

### Key Decisions

- **Salary is a history table**, not a single field — supports trend analysis
- **Multi-currency, normalized at write**: original currency + amountUsd (computed once)
- **Denormalized amountUsd** to avoid runtime conversion overhead and ensure reproducibility
- **Department and Country are lookup tables** — ensures consistent grouping
- **Minimal indexing**: only on `(employeeId, effectiveDate)` for SalaryRecord, `departmentId`/`countryId`/`managerId` on Employee. No full-text search, no trigram indexes.

## Indexing Rationale

- `(employeeId, effectiveDate)` on SalaryRecord: **load-bearing** — enables fast current salary lookup
- `departmentId`, `countryId`, `managerId` on Employee: **useful** for common filters
- `jobLevel`, `status` on Employee: **deliberately skipped** (low cardinality, not worth overhead at 10k rows)
- Full-text/trigram name search: **out of scope** for now

## Seed Data

- **6 countries**: US, India, UK, Germany, Canada, Singapore (each with currency code)
- **7 departments**: Engineering, Sales, Marketing, HR, Finance, Operations, Product
- **6 job levels** (L1–L6): each mapped to base salary band per country
- **~50–100 top-level managers**: no manager (one per country/dept)
- **~9,900 regular employees**: weighted by level, assigned a manager within their country/dept
- **10,000 salary records**: HIRE at hire date (base ± 15%), then 0–3 additional records (ANNUAL_RAISE ~3–8% every 12–18 months, occasional PROMOTION ~10–15%)

## Tech Stack (Locked)

- **Backend**: Express + TypeScript + PostgreSQL + Prisma (ORM) + Zod (validation)
- **Frontend**: React + Vite + TypeScript + MUI (component library)
- **Testing**: Vitest + Supertest (backend), Vitest + React Testing Library (frontend)
- **Package manager**: Yarn (Classic v1), Yarn workspaces
- **Node**: managed via nvm-windows, LTS version
- **Local DB**: PostgreSQL via Docker Compose (dev only)
- **Prod**: fully containerized (Postgres + backend container serving built frontend as static files)

No alternatives considered — these choices are locked and driven by existing developer familiarity.

## Assumptions

- HR team is small, trusted (no auth required)
- 10,000 employees is the target size (small enough that basic indexing suffices)
- Org structure is shallow (intentional scope cut)
- All rates are static as of seeding time (no live FX API)
- PostgreSQL 15+
