# Feature Specification Index

**Repository**: ACME Salary Management System  
**Last Updated**: 2026-07-20  
**Total Features**: 5  
**Total Tests**: 109  
**Status**: ✅ Production Ready

## Quick Navigation

| Feature | Status | Tests | Endpoints | Spec File |
|---------|--------|-------|-----------|-----------|
| **Authentication** | ✅ Complete | 9 | 2 | [FEATURE-AUTHENTICATION.md](FEATURE-AUTHENTICATION.md) |
| **Employee Management** | ✅ Complete | 20+ | 5 | [FEATURE-EMPLOYEE-MANAGEMENT.md](FEATURE-EMPLOYEE-MANAGEMENT.md) |
| **Salary Management** | ✅ Complete | 20+ | 4 | [FEATURE-SALARY-MANAGEMENT.md](FEATURE-SALARY-MANAGEMENT.md) |
| **Analytics & Reporting** | ✅ Complete | 30+ | 8 | [FEATURE-ANALYTICS.md](FEATURE-ANALYTICS.md) |
| **Department Management** | ✅ Complete | 15+ | 4 | [FEATURE-DEPARTMENT-MANAGEMENT.md](FEATURE-DEPARTMENT-MANAGEMENT.md) |

---

## Feature Summaries

### 1. Authentication ([FEATURE-AUTHENTICATION.md](FEATURE-AUTHENTICATION.md))
User login with JWT tokens and role-based access control.
- **Key Endpoints**: POST /auth/login, POST /auth/register
- **Roles**: HR_ADMIN (full access), HR_MANAGER (read-only)
- **Security**: Bcryptjs hashing, 8-hour token expiry
- **Tests**: 9

### 2. Employee Management ([FEATURE-EMPLOYEE-MANAGEMENT.md](FEATURE-EMPLOYEE-MANAGEMENT.md))
CRUD operations for employee records with search and filtering.
- **Key Endpoints**: GET /api/employees (list/search/filter), GET /api/employees/:id, POST/PUT/DELETE
- **Filters**: By department, job level, search by name/email
- **Relations**: Manager hierarchies, department assignment
- **Tests**: 20+

### 3. Salary Management ([FEATURE-SALARY-MANAGEMENT.md](FEATURE-SALARY-MANAGEMENT.md))
Track salary history and salary changes over time.
- **Key Endpoints**: GET /api/salary (list), GET /api/salary/:employeeId (history), POST/DELETE
- **Features**: Salary records with effective dates, change tracking, non-overlapping validation
- **Data**: Stored in cents, multi-currency support
- **Tests**: 20+

### 4. Analytics & Reporting ([FEATURE-ANALYTICS.md](FEATURE-ANALYTICS.md))
Generate insights from salary and HR data.
- **Key Endpoints**: 8 endpoints for aggregations, distributions, equity analysis, trends
- **Queries**: By department, by level, salary ranges, pay equity gaps, top earners
- **Calculations**: Statistics (mean, median, stddev), percentiles, equity scores
- **Tests**: 30+

### 5. Department Management ([FEATURE-DEPARTMENT-MANAGEMENT.md](FEATURE-DEPARTMENT-MANAGEMENT.md))
Manage organizational departments and teams.
- **Key Endpoints**: GET /api/departments (list), GET /api/departments/:id, POST/PUT/DELETE
- **Features**: Department statistics, employee listings, salary aggregations
- **Constraints**: Unique names, no deletion with assigned employees
- **Tests**: 15+

---

## Common Patterns Across Features

### Authentication
- All endpoints (except /health, /auth/*) require JWT token
- Protected routes use `requireAuth` middleware
- Role-restricted routes use `requireRole('HR_ADMIN')` or `requireRole('HR_MANAGER')`

### Request Validation
- Zod schemas validate all inputs
- Shared validation in `backend/src/schemas.ts`
- Error messages include validation details

### Response Format
All success responses:
```json
{
  "data": { ... } or [ ... ]
}
```

All error responses:
```json
{
  "error": "Human-readable error message"
}
```

### Pagination
- Optional `page` and `limit` query parameters
- Default limit: 20, max limit: 100
- Response includes `total`, `page`, `limit`

### Filtering & Search
- Case-insensitive substring matching for search
- Exact matching for categorical filters
- Filters combined with AND logic by default

### Testing
- All tests use auth token via `getAuthToken()` helper
- All tests verify both success and error cases
- Setup in `beforeAll()` creates auth context
- Teardown in `afterAll()` cleans up test data (optional)

---

## Data Model Overview

```
Employee
├── jobLevel (FK → JobLevel)
├── department (FK → Department)
├── manager (FK → Employee, self-referencing)
└── directReports (Employee[])

SalaryRecord
├── employee (FK → Employee)
├── salary (BigInt, in cents)
├── currency (String, default USD)
├── startDate (DateTime)
└── endDate (DateTime?, null = current)

Department
├── name (String, unique)
├── location (String?)
└── employees (Employee[])

JobLevel
├── code (String, unique)
├── name (String)
├── rank (Int, unique)
└── employees (Employee[])

User
├── email (String, unique)
├── passwordHash (String)
└── role (UserRole enum: HR_ADMIN | HR_MANAGER)
```

---

## API Base

**Base URL**: `http://localhost:3000` (development)

**Headers Required** (for protected routes):
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Environment Variables**:
```
JWT_SECRET=your-secret-key-min-32-chars
DATABASE_URL=postgresql://user:pass@localhost:5432/acme_salary_db
```

---

## Testing

### Run All Tests
```bash
yarn workspace backend test:run
```

### Run Specific Feature Tests
```bash
yarn workspace backend test -- auth.test.ts
yarn workspace backend test -- employees.test.ts
yarn workspace backend test -- salary.test.ts
yarn workspace backend test -- analytics.test.ts
yarn workspace backend test -- departments.test.ts
```

### Test Coverage by Feature
- Authentication: 9/109 tests (8%)
- Employee Management: 20+/109 tests (18%)
- Salary Management: 20+/109 tests (18%)
- Analytics: 30+/109 tests (27%)
- Departments: 15+/109 tests (14%)
- Health/Other: 15+/109 tests (15%)

---

## Performance Baselines

| Operation | Time |
|-----------|------|
| List 100 employees | ~50ms |
| Search across 10k employees | ~100ms |
| Get employee with relations | ~30ms |
| Salary history query | ~40ms |
| Analytics aggregation (10k rows) | ~200ms |
| All 109 tests complete | ~5 seconds |

---

## Known Limitations & Future Roadmap

This section has been moved to a dedicated [SCOPE.md](../SCOPE.md) file that clearly separates:

- **Out of Scope** - Features intentionally not building (SSO, ML, payroll processing, etc.)
- **Future Enhancements (v1.1)** - Improvements to existing features (caching, 2FA, audit trails, etc.)
- **Future Features (v2.0)** - Major new modules (recruitment, time tracking, L&D, etc.)
- **Roadmap** - Prioritized timeline by quarter and year

**→ See [SCOPE.md](../SCOPE.md) for complete roadmap and decision framework**

---

### Before Production
- [ ] Branch protection enabled on main
- [ ] All 109 tests passing
- [ ] ESLint and Prettier checks pass
- [ ] Environment variables configured
- [ ] Database backups configured
- [ ] Error monitoring set up (Sentry/Rollbar)
- [ ] Logging configured (ELK stack or similar)
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting configured
- [ ] Secrets stored securely (AWS Secrets Manager)

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring dashboards active
- [ ] On-call rotations configured
- [ ] Runbooks created for common issues
- [ ] Documentation updated

---

## Project Roadmap

See [SCOPE.md](../SCOPE.md) for:
- What's out of scope (intentionally not building)
- What's planned for v1.1 (future enhancements)
- What's planned for v2.0 (major features)
- Complete feature roadmap by priority

---

## Contact & Questions

For questions about specific features, refer to the individual spec files. Each contains:
- Complete requirements
- API endpoint documentation
- Data models
- Implementation details
- Test coverage
- Future enhancements

For general architecture questions, see [docs/architecture.md](../docs/architecture.md)

---

**Last Updated**: 2026-07-20  
**Created By**: ACME Development Team  
**Version**: 1.0
