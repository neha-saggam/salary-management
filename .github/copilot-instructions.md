---
description: "ACME Salary Management System - Project-wide development guidelines for token efficiency and code quality"
---

# ACME Salary Management System - Copilot Instructions

## Project Context

**System**: Monorepo with React frontend (Vite) and Express backend (TypeScript)  
**Database**: PostgreSQL 15 with Prisma ORM  
**Authentication**: JWT (8h expiry) + bcryptjs (cost 12)  
**Production Status**: Ready for deployment with full CI/CD

## Token Efficiency Rules

### Prompt Guidelines
- **Be direct**: Use concise requests without preamble; avoid asking for suggestions
- **Batch operations**: Use `multi_replace_string_in_file` for multiple edits instead of sequential calls
- **Parallel reads**: Read large file sections (50+ lines) in one call, not many small reads
- **Reuse context**: Check MAINTENANCE.md and prior commits before asking for explanations
- **Reference docs**: Link to docs/ for decisions already made (architecture, schema design)

### Tool Efficiency
- Use `explore_subagent` for codebase searches instead of multiple grep/semantic calls
- Combine independent read operations in parallel function calls
- Never call `run_in_terminal` in parallel; run one command, wait for output
- Use `vscode_listCodeUsages` to find symbol references instead of grep patterns

### Session Planning
- Use `manage_todo_list` for multi-step work to maintain focus and avoid context duplication
- Break complex requests into 3-5 actionable items with clear status tracking
- Reference completed todos when asking for follow-up work

## Code Quality Standards

### Linting & Formatting
- **ESLint**: Flat config (v10+) in `backend/eslint.config.js`
- **Prettier**: Config in `.prettierrc.json` (2 spaces, 100 width, single quotes)
- **Pre-commit**: Always run `yarn workspace backend lint && yarn workspace backend format` before pushing
- **CI Enforcement**: Both lint and format:check are required status checks on PRs

### Testing Strategy
- **Backend**: Vitest + Supertest (109 tests total)
- **Auth pattern**: All tests must include auth token via `getAuthToken(app)` helper
- **Frontend**: React Testing Library with behavioral focus (search, filters, counters)
- **Coverage**: Aim for 80%+ on critical paths (auth, API, calculations)

### Commit Message Format
```
feat|fix|chore|docs: <description>

- Bullet point 1
- Bullet point 2

Closes #<issue-number>
```

Examples:
- `chore: add branch protection rules` ✅
- `feat: add HR_ADMIN role validation` ✅
- `fix: jwt token not validating on protected routes` ✅

## Backend Architecture Patterns

### Auth Protection
All new routes must include `requireAuth` middleware:
```typescript
app.get('/api/route', requireAuth, (req, res) => {
  // req.user contains decoded JWT payload
  // Optional: add requireRole for role-based access
});
```

### New Endpoints
1. Define input schema in `backend/src/schemas.ts` using Zod
2. Implement route handler in `backend/src/app.ts`
3. Add auth/role middleware
4. Add tests in `backend/tests/` with getAuthToken helper
5. Run `yarn workspace backend format` and `yarn workspace backend lint`

### Database Migrations
1. Modify `backend/prisma/schema.prisma`
2. Run `yarn workspace backend prisma migrate dev --name <description>`
3. Commit migration files
4. Update `backend/prisma/seed.ts` if adding new tables
5. Test with `yarn workspace backend prisma:seed`

## Data Model Reference

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| Employee | Core HR data | id, firstName, lastName, salary, jobLevel (FK), manager (FK) |
| JobLevel | Normalized job levels | id, code (unique), name, rank (unique) |
| SalaryRecord | Salary history | employeeId (FK), startDate, endDate, salary |
| Department | Org structure | id, name, location |
| User | Authentication | id, email (unique), passwordHash, role (HR_ADMIN\|HR_MANAGER) |

**10,000 employees seeded** with manager relationships for testing/demo.

## Common Tasks

### Running Tests
```bash
# Single run (CI mode)
yarn workspace backend test:run

# Watch mode (development)
yarn workspace backend test

# Watch + clear cache + rerun all
yarn workspace backend test -- --clearCache
```

### Local Development
```bash
# Terminal 1: Backend server (port 3000)
yarn workspace backend dev

# Terminal 2: Frontend dev server (port 5173)
yarn workspace frontend dev

# Terminal 3: Monitor database
yarn workspace backend prisma studio

# New terminal: Run tests
yarn workspace backend test
```

### Quality Checks Before Push
```bash
yarn workspace backend format
yarn workspace backend lint:fix
yarn workspace backend test:run
```

## CI/CD Pipeline

### GitHub Actions Workflows
- **ci.yml**: Triggered on push/PR to main
  - Linting (ESLint)
  - Format validation (Prettier)
  - Database migrations
  - Full test suite (109 tests)
  - Frontend build

- **deploy.yml**: Triggered on main branch push
  - SSH deployment to production server
  - Runs migrations on production DB
  - Restarts Docker containers

### Branch Protection Rules
✅ All PRs must pass: lint, format:check, test:run, build  
✅ Require PR review before merge  
✅ Dismiss stale reviews when new commits added

## Default Users (for Development)

| Email | Role | Password |
|-------|------|----------|
| admin@acme.com | HR_ADMIN | password123 |
| hr@acme.com | HR_MANAGER | password123 |

## Documentation Files

- **MAINTENANCE.md**: Setup guide, troubleshooting, deployment checklist
- **docs/architecture.md**: System flow diagrams, ER schema, tech stack rationale
- **backend/src/auth.ts**: JWT implementation, middleware, role-based access
- **backend/prisma/schema.prisma**: Complete data model definition

## When to Reach Out

Use multi-step planning (`manage_todo_list`) when:
- Request involves 3+ independent changes
- Requires testing/validation between steps
- Spans multiple files or packages

Batch file edits when:
- Updating same pattern across 2+ files
- No dependencies between edits
- All edits share common context

Parallelize reads when:
- Exploring multiple files for context
- Searching for related code patterns
- Gathering requirements before implementation
