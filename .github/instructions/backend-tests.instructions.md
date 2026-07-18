---
description: "When writing backend tests - use Vitest/Supertest patterns, auth helpers, test structure"
applyTo: "backend/tests/**/*.test.ts"
---

# Backend Testing Pattern Guide

## Test Structure Template

```typescript
import { describe, test, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import app from '../src/app';
import { getAuthToken } from './helpers';

describe('Feature Name', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await getAuthToken(app);
  });

  test('should perform action successfully', async () => {
    const res = await supertest(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  test('should require authentication', async () => {
    const res = await supertest(app).get('/api/endpoint');

    expect(res.status).toBe(401);
  });
});
```

## Auth Token Helper

Always use the centralized helper in `backend/tests/helpers.ts`:

```typescript
import { getAuthToken } from './helpers';

beforeAll(async () => {
  authToken = await getAuthToken(app);
});
```

This helper:
- Logs in as admin@acme.com (HR_ADMIN role)
- Returns valid JWT token
- Used consistently across all test files
- Reduces duplication and token management complexity

## Common Test Patterns

### Testing Protected Routes
```typescript
test('protected route returns 401 without token', async () => {
  const res = await supertest(app).get('/api/employees');
  expect(res.status).toBe(401);
});

test('protected route returns 200 with valid token', async () => {
  const res = await supertest(app)
    .get('/api/employees')
    .set('Authorization', `Bearer ${authToken}`);
  expect(res.status).toBe(200);
});
```

### Testing Role-Based Access
```typescript
test('hr_admin can register new user', async () => {
  const res = await supertest(app)
    .post('/auth/register')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: 'newuser@acme.com',
      password: 'password123',
      role: 'HR_MANAGER',
    });

  expect(res.status).toBe(201);
});

test('hr_manager cannot register new user', async () => {
  const res = await supertest(app)
    .post('/auth/register')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      email: 'newuser@acme.com',
      password: 'password123',
      role: 'HR_MANAGER',
    });

  expect(res.status).toBe(403);
});
```

### Testing Query Parameters
```typescript
test('should filter employees by department', async () => {
  const res = await supertest(app)
    .get('/api/employees?department=engineering')
    .set('Authorization', `Bearer ${authToken}`);

  expect(res.status).toBe(200);
  expect(res.body.every((emp) => emp.department === 'engineering')).toBe(true);
});
```

### Testing POST/PUT with Body
```typescript
test('should update employee salary', async () => {
  const res = await supertest(app)
    .put('/api/employees/1')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ salary: 150000 });

  expect(res.status).toBe(200);
  expect(res.body.salary).toBe(150000);
});
```

### Testing Error Cases
```typescript
test('should return 400 for invalid input', async () => {
  const res = await supertest(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ firstName: '', lastName: '' });

  expect(res.status).toBe(400);
  expect(res.body.error).toBeDefined();
});

test('should return 404 for non-existent resource', async () => {
  const res = await supertest(app)
    .get('/api/employees/999999')
    .set('Authorization', `Bearer ${authToken}`);

  expect(res.status).toBe(404);
});
```

## Running Tests

```bash
# Single run (CI mode)
yarn workspace backend test:run

# Watch mode (auto-rerun on file changes)
yarn workspace backend test

# Run specific test file
yarn workspace backend test auth.test.ts

# Run with coverage
yarn workspace backend test:run --coverage
```

## Database State

Tests assume database is seeded with:
- 10,000 employees
- Salary records for each employee
- Manager relationships
- Default users: admin@acme.com (HR_ADMIN), hr@acme.com (HR_MANAGER)

If tests fail due to data:
```bash
yarn workspace backend prisma:seed
```

## HTTP Status Code Reference

| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no content) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (valid token, insufficient permissions) |
| 404 | Not found (resource doesn't exist) |
| 500 | Server error (uncaught exception) |

## Quality Checklist

- [ ] All routes tested with and without auth token
- [ ] Role-based routes tested with insufficient permissions
- [ ] Input validation tested (missing fields, wrong types)
- [ ] Success responses verified (status code + data shape)
- [ ] Error responses verified (status code + error message)
- [ ] No hardcoded credentials (use helpers)
- [ ] Uses `getAuthToken()` helper from `backend/tests/helpers.ts`
- [ ] Ran `yarn workspace backend test:run` and all pass
- [ ] Ran `yarn workspace backend lint` with no errors
