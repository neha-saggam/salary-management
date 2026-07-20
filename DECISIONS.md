# Development Decisions & Rationale

**Created**: 2026-07-18  
**Last Updated**: 2026-07-18

This document records architectural and implementation decisions made during development to avoid repeating explanations and maintain consistency.

## Authentication & Security

### Decision: JWT with 8-hour expiry
**Why**: 
- Stateless, scalable (no server-side session storage)
- Token expiration reduces window of compromise
- 8 hours balances security vs. user friction

**Alternative Considered**: Sessions with Redis store (rejected: adds operational complexity for this scale)

**Implementation**:
- File: `backend/src/auth.ts`
- Library: `jsonwebtoken`
- Hashing: `bcryptjs` with cost 12 (deliberate slowness for security)
- Endpoint: `POST /auth/login` returns JWT in response

### Decision: Role-based access control (HR_ADMIN, HR_MANAGER)
**Why**:
- HR_ADMIN: Can create users, modify policies
- HR_MANAGER: Can view and analyze data
- Scales if more roles added later

**Middleware**:
- `requireAuth`: Validates JWT on all protected routes
- `requireRole(...roles)`: Enforces role checks

## Database Design

### Decision: Normalize JobLevel to separate table
**Why**:
- Original design: `jobLevel` as string on Employee (denormalized)
- Problem: Can't easily identify CEOs, analyze by level
- Solution: Create JobLevel table with rank field, maintain unique constraint

**Migration**: `backend/prisma/migrations/20260718142616_add_user_auth_table/`

**Result**:
- Employee.jobLevel is now foreign key
- Employee.title added for special roles (CEO, etc.)
- Analytics can group/sort by rank

### Decision: Seed 10,000 employees with realistic manager relationships
**Why**:
- Needed realistic data for testing analytics, reporting
- 10k = large enough to test performance, small enough to run in CI

**File**: `backend/prisma/seed.ts`

### Decision: PostgreSQL 15 Docker (dev) + RDS (production)
**Why**:
- PostgreSQL: Mature, robust, good TypeScript ORM support (Prisma)
- Docker: Reproducible local development
- RDS: Managed service reduces ops overhead

**Connection String Format**:
```
postgresql://user:password@host:port/database
```

## Testing Strategy

### Decision: Keep getAuthToken() helper centralized
**Why**:
- All tests need auth tokens for protected routes
- Centralized in `backend/tests/helpers.ts` prevents duplication
- Single source of truth for test credentials

**Usage**:
```typescript
beforeAll(async () => {
  authToken = await getAuthToken(app);
});
```

### Decision: 109 tests across 5 files (auth, employees, salary, departments, analytics, health)
**Why**:
- Auth: 9 tests (login, register, token validation, roles)
- Employees: 20+ tests (CRUD, filters, searches)
- Salary: 20+ tests (history, calculations)
- Departments: 15+ tests (grouping, hierarchies)
- Analytics: 30+ tests (aggregations, comparisons)
- Health: 1 test (public endpoint)

**Coverage Target**: 80%+ on critical paths (auth, calculations, aggregations)

## CI/CD Pipeline

### Decision: GitHub Actions with PostgreSQL service container
**Why**:
- Free tier sufficient for current scale
- Service containers handle DB setup automatically
- Can scale to paid runners if needed

**File**: `.github/workflows/ci.yml`

**Pipeline Steps**:
1. Lint (ESLint check)
2. Format check (Prettier validation)
3. Migrate (Prisma migrate deploy)
4. Seed (Populate test data)
5. Test (Run 109 tests)
6. Build (Frontend TypeScript + Vite)

### Decision: Deploy workflow triggers on main push only
**Why**:
- Production should only deploy from main
- Prevents accidental deployments from feature branches
- Requires all CI checks to pass first

**File**: `.github/workflows/deploy.yml`

**Deployment Method**: SSH + Docker compose

### Decision: Linting and formatting as required status checks
**Why**:
- Enforces code quality before merge
- Prevents style inconsistencies
- Automated fixes available locally (`lint:fix`, `format`)

**Enforced via**: `.github/workflows/ci.yml` + branch protection rules

## Code Organization

### Decision: ESLint v10 flat config (not legacy .eslintrc)
**Why**:
- ESLint v10 is current stable
- Flat config is simpler than cascading .eslintrc files
- Easier to maintain and extend

**File**: `backend/eslint.config.js`

### Decision: Prettier with 2 spaces, single quotes, 100-char width
**Why**:
- 2 spaces: Fits more code on screen, easier to read
- Single quotes: Consistency with JavaScript conventions
- 100 chars: Readable on most screens without horizontal scroll

**File**: `.prettierrc.json`

## Monorepo Structure

### Decision: Yarn Classic v1 with workspaces (not npm, not Yarn v3/v4)
**Why**:
- Yarn v1: Mature, stable, widely used
- Workspaces: Share dependencies, single lock file
- npm v7+ workspaces: Less tested, more breaking changes
- Yarn v3+: Berry is overkill for this scale

**Workspaces**:
- `backend` workspace
- `frontend` workspace

**Commands**: 
```bash
yarn workspace backend dev
yarn workspace frontend dev
yarn # Install all workspaces
```

## Documentation Strategy

### Decision: Comprehensive steering files + MAINTENANCE.md
**Why**:
- Guides future development without repeating explanations
- Reduces tokens in AI conversations
- Centralizes tribal knowledge

**Files**:
- `.github/copilot-instructions.md` - AI guidelines
- `MAINTENANCE.md` - Setup, troubleshooting, common tasks
- `docs/architecture.md` - System design diagrams
- `PROJECT-CONTEXT.md` (this file) - Decisions and rationale
- `DECISIONS.md` (this file) - Implementation details

## Future Considerations

### If Adding More Roles
- Extend UserRole enum in `prisma/schema.prisma`
- Update `requireRole()` middleware in `auth.ts`
- Add tests for new role permissions

### If Scaling Beyond 10k Employees
- Add database indexing on frequent queries (email, jobLevel, department)
- Consider caching layer (Redis) for analytics
- Profile slow queries with `EXPLAIN ANALYZE`

### If Adding 2FA/MFA
- Use library like `speakeasy` or `passport-authenticator`
- Extend User model with `mfaSecret`, `mfaEnabled` fields
- Update login flow to require second factor

### If Moving to Production
- Use RDS for PostgreSQL (managed)
- Use Secrets Manager for JWT_SECRET, DB credentials
- Enable SSL/TLS for all connections
- Add request logging and monitoring
- Set up automated backups

---

**Next Update**: Whenever a significant decision is made (auth changes, schema refactors, deployment strategy shifts)
