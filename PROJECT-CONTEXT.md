# Project Context & Status

**Last Updated**: 2026-07-18  
**Status**: Production-Ready ✅  
**Tests Passing**: 109/109 ✅

## Quick Facts

- **Monorepo**: Backend (Express + TS) | Frontend (React 18 + Vite)
- **Database**: PostgreSQL 15, seeded with 10k employees
- **Auth**: JWT (8h expiry) + bcryptjs hashing
- **Deployed**: Not yet (awaiting branch protection + production secrets)
- **CI/CD**: GitHub Actions (ci.yml on PR, deploy.yml on main merge)

## Key Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /auth/login | ❌ | Get JWT token |
| POST | /auth/register | HR_ADMIN | Create new user |
| GET | /health | ❌ | Health check |
| GET | /api/employees | ✅ | List all employees |
| GET | /api/employees/:id | ✅ | Get employee details |

## Default Users (for testing)

```
Email: admin@acme.com | Role: HR_ADMIN | Password: password123
Email: hr@acme.com | Role: HR_MANAGER | Password: password123
```

## Development Commands

```bash
# Start everything
yarn dev                           # Both backend + frontend

# Or individually
yarn workspace backend dev         # Express on :3000
yarn workspace frontend dev        # Vite on :5173

# Testing
yarn workspace backend test:run    # All 109 tests
yarn workspace backend test        # Watch mode

# Quality
yarn workspace backend lint        # ESLint check
yarn workspace backend format      # Prettier format
yarn workspace backend format:check # Validate formatting

# Database
yarn workspace backend prisma:seed # Populate 10k employees
yarn db:up                         # Start PostgreSQL Docker container
```

## Recent Work (Session 2026-07-18)

### Completed
1. ✅ Added ESLint v10 + Prettier for code quality
2. ✅ Integrated lint/format checks into CI pipeline
3. ✅ Created steering files for token efficiency
4. ✅ All 109 tests passing with auth
5. ✅ GitHub Actions workflows (ci.yml + deploy.yml)
6. ✅ Branch protection guide (docs/BRANCH-PROTECTION-SETUP.md)

### Files Changed
- `backend/eslint.config.js` (new)
- `backend/package.json` (added lint/format scripts)
- `.github/workflows/ci.yml` (added lint + format checks)
- `.prettierrc.json` (new)
- `.github/copilot-instructions.md` (new - steering guide)
- `MAINTENANCE.md` (new - setup & troubleshooting)
- `docs/BRANCH-PROTECTION-SETUP.md` (new)

## What's Left

1. **Enable branch protection** on main branch via GitHub UI
   - Settings → Branches → Add rule for main
   - Require: lint, format:check, test:run status checks
   - Require: 1 PR review approval

2. **Configure production deployment secrets** in GitHub
   - `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`
   - `DATABASE_URL` (RDS endpoint)

3. **Test CI/CD pipeline** with test PR to verify all checks work

## Architecture Overview

```
User Browser
    ↓
React SPA (localhost:5173)
    ↓
Express API (localhost:3000)
    ├─ Auth routes (POST /auth/login, /auth/register)
    ├─ Protected API routes (requireAuth middleware)
    └─ Health endpoint (public)
    ↓
PostgreSQL 15 (localhost:5432)
    └─ 10k employees + reference data
```

## Data Model

| Table | Rows | Key Fields |
|-------|------|-----------|
| Employee | 10,000 | id, firstName, lastName, email, jobLevel (FK), manager (FK), salary |
| JobLevel | 5+ | id, code, name, rank |
| SalaryRecord | 10,000+ | employeeId (FK), salary, startDate, endDate |
| User | 2 | id, email (unique), passwordHash, role |
| Department | 5+ | id, name, location |
| Country | 2+ | id, code, name |

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Tests fail | `yarn workspace backend prisma:seed` |
| Port 3000/5173 in use | Change PORT env var or kill process |
| Lint errors | `yarn workspace backend lint:fix` |
| Format errors | `yarn workspace backend format` |
| DB connection fails | Check DATABASE_URL env var, ensure Docker running |
| Auth not working | Verify JWT_SECRET set, check token in logs |
| CI workflow not running | Wait 1-2 min after push, check .github/workflows/ci.yml syntax |

## File Structure Reference

```
acme-salary-mgmt/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Server entry
│   │   ├── app.ts            # Express app + routes
│   │   ├── auth.ts           # JWT + middleware
│   │   └── schemas.ts        # Zod validation
│   ├── tests/
│   │   ├── helpers.ts        # getAuthToken() helper
│   │   └── *.test.ts         # All 109 tests
│   ├── prisma/
│   │   ├── schema.prisma     # Data model
│   │   ├── seed.ts           # Seed script
│   │   └── migrations/       # Schema versions
│   ├── eslint.config.js      # ESLint rules
│   └── package.json          # Dependencies + scripts
├── frontend/
│   ├── src/
│   │   ├── pages/            # React pages
│   │   ├── components/       # React components
│   │   └── App.tsx
│   └── package.json
├── docs/
│   ├── architecture.md       # System design (Mermaid diagrams)
│   ├── BRANCH-PROTECTION-SETUP.md
│   └── ...
├── .github/
│   ├── workflows/
│   │   ├── ci.yml           # PR/push validation
│   │   └── deploy.yml       # Production deployment
│   ├── copilot-instructions.md      # Steering guide
│   └── instructions/        # File-specific guidelines
├── .prettierrc.json         # Format config
├── MAINTENANCE.md           # Setup guide
└── package.json             # Root workspace
```

## Next Session Checklist

- [ ] Enable branch protection on main
- [ ] Create test PR to verify CI checks
- [ ] Set up production secrets
- [ ] Test deployment workflow (deploy.yml)
- [ ] Document any new features/changes

## Contact / Decisions Made

**Authentication Approach**: JWT with 8-hour expiry + bcryptjs hashing (cost 12)  
**Database**: PostgreSQL 15 Docker (dev) + RDS (production)  
**ORM**: Prisma 5.22.0 with migrations  
**Package Manager**: Yarn v1 classic (monorepo workspaces)  
**CI/CD**: GitHub Actions (free tier sufficient for current scale)  
**Code Quality**: ESLint v10 flat config + Prettier (enforced in CI)

---

**For detailed setup**: See [MAINTENANCE.md](MAINTENANCE.md)  
**For architecture**: See [docs/architecture.md](docs/architecture.md)  
**For branch protection**: See [docs/BRANCH-PROTECTION-SETUP.md](docs/BRANCH-PROTECTION-SETUP.md)
