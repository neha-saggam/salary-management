# Project Maintenance Guide

## Quick Reference Commands
```bash
# Development
yarn workspace backend dev          # Start Express server
yarn workspace frontend dev         # Start Vite dev server

# Testing & Quality
yarn workspace backend test:run     # Run all tests (109 total)
yarn workspace backend lint        # Check for linting issues
yarn workspace backend lint:fix    # Auto-fix linting issues
yarn workspace backend format      # Format code with Prettier
yarn workspace backend format:check # Validate formatting (used in CI)

# Database
yarn workspace backend prisma:seed  # Populate 10k employees + users
yarn workspace backend prisma migrate dev --name <description>  # Create migration
```

## Architecture Overview

### System Flow
```
React SPA (Vite) → Express API (TypeScript) → PostgreSQL 15
```

### Authentication
- **Endpoint**: POST /auth/login → JWT response
- **Header**: `Authorization: Bearer <token>`
- **Expiry**: 8 hours
- **Hashing**: bcryptjs (cost 12)
- **Default Users**: 
  - admin@acme.com (HR_ADMIN)
  - hr@acme.com (HR_MANAGER)
  - Password: password123

### Key Models
- **Employee**: 10k seeded with manager relationships
- **JobLevel**: Normalized table with rank (replaces string jobLevel)
- **User**: Authentication with roles (HR_ADMIN, HR_MANAGER)
- **SalaryRecord**: Salary history tracking

## CI/CD Pipeline

### GitHub Actions Workflows
1. **ci.yml** (on push/PR to main):
   - Linting: `yarn workspace backend lint`
   - Format check: `yarn workspace backend format:check`
   - Database: migrate & seed
   - Tests: Run full suite (109 tests)
   - Build: Compile frontend

2. **deploy.yml** (on main merge):
   - SSH into production server
   - Pull latest Docker image
   - Run migrations
   - Start containers

### Required Status Checks
All PRs must pass before merge:
- ✅ Linting (ESLint)
- ✅ Formatting (Prettier)
- ✅ Testing (Vitest + React Testing Library)
- ✅ Building (TypeScript + Vite)

## Code Quality Standards

### ESLint Configuration
- File: `backend/eslint.config.js` (flat config, ESLint v10+)
- Rules: TypeScript strict mode, no unused variables, no explicit any
- Auto-fix: `yarn workspace backend lint:fix`

### Prettier Configuration
- File: `.prettierrc.json`
- Settings: 2 spaces, 100 char width, single quotes, trailing commas
- Auto-format: `yarn workspace backend format`

## Database Seeding

The seed script (`backend/prisma/seed.ts`) populates:
- 10,000 employees with manager relationships
- Salary history for each employee
- Default HR users (admin and manager)

Run after schema changes:
```bash
yarn workspace backend prisma:seed
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests fail | Run `yarn workspace backend prisma:seed` to populate DB |
| Lint errors | Run `yarn workspace backend lint:fix` for auto-fixes |
| Format errors | Run `yarn workspace backend format` to auto-format |
| Auth failing | Check JWT_SECRET env var; verify token in logs |
| CI stuck | Check GitHub Actions logs for specific step failures |

## Production Deployment

### Environment Variables Required
```
JWT_SECRET=<your-secret>
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/acme_salary_db
DEPLOY_HOST=<server-ip>
DEPLOY_USER=<ssh-user>
DEPLOY_SSH_KEY=<private-key>
```

### Deployment Process
1. Push to main branch
2. CI pipeline validates all checks
3. On success, deploy.yml triggers
4. Server pulls latest image and runs migrations

## Making Changes

### Adding a New Endpoint
1. Define schema in `backend/src/schemas.ts` (Zod)
2. Implement route in `backend/src/app.ts`
3. Add requireAuth/requireRole middleware as needed
4. Add tests in `backend/tests/`
5. Run `yarn workspace backend format && yarn workspace backend lint`
6. Commit and push (CI will validate)

### Modifying Database Schema
1. Update `backend/prisma/schema.prisma`
2. Run `yarn workspace backend prisma migrate dev --name <description>`
3. Commit migration files
4. Update seed.ts if needed
5. Run `yarn workspace backend prisma:seed`

### Adding Frontend Features
1. Build component in `frontend/src/`
2. Add tests with React Testing Library
3. Run frontend dev server to validate
4. CI will build and test on push

## Recent Changes
- Added ESLint + Prettier for code quality
- Integrated lint/format checks into CI pipeline
- Created branch protection rules on main
- All 109 tests passing with auth implemented
