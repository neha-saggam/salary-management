---
description: "When working on backend authentication features - use JWT patterns, auth middleware, role-based checks"
applyTo: "backend/src/auth.ts, backend/src/app.ts, backend/tests/auth.test.ts"
---

# Backend Authentication Pattern Guide

## Quick Reference

### Protecting Routes
```typescript
// Public route
app.get('/health', (req, res) => res.json({ ok: true }));

// Protected route (all authenticated users)
app.get('/api/employees', requireAuth, (req, res) => {
  // req.user.email, req.user.role available
});

// Role-specific route (HR_ADMIN only)
app.post('/api/users', requireAuth, requireRole('HR_ADMIN'), (req, res) => {
  // Only HR_ADMIN can access
});
```

### Testing Auth Endpoints
```typescript
import { getAuthToken } from './helpers.ts';

describe('Auth', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await getAuthToken(app);
  });

  test('protected route requires token', async () => {
    const res = await supertest(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  test('protected route works with token', async () => {
    const res = await supertest(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
  });
});
```

## Auth File Organization

| File | Purpose |
|------|---------|
| `backend/src/auth.ts` | JWT creation, token validation, middleware |
| `backend/src/app.ts` | Route definitions with auth middleware |
| `backend/tests/helpers.ts` | `getAuthToken()` helper for test setup |
| `backend/tests/auth.test.ts` | Auth endpoint tests (login, register, roles) |

## Adding New Auth Checks

### Step 1: Update Schema (if needed)
File: `backend/src/schemas.ts`
```typescript
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['HR_MANAGER', 'HR_ADMIN']),
});
```

### Step 2: Add Route Handler
File: `backend/src/app.ts`
```typescript
app.post('/auth/register', requireAuth, requireRole('HR_ADMIN'), async (req, res) => {
  // Validate input with schema
  // Create user with hashed password
  // Return success/error
});
```

### Step 3: Add Tests
File: `backend/tests/auth.test.ts`
```typescript
test('register endpoint creates new user', async () => {
  const res = await supertest(app)
    .post('/auth/register')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      email: 'newuser@acme.com',
      password: 'securepass123',
      role: 'HR_MANAGER',
    });

  expect(res.status).toBe(201);
  expect(res.body.email).toBe('newuser@acme.com');
});
```

### Step 4: Validate
```bash
yarn workspace backend lint
yarn workspace backend format
yarn workspace backend test:run
```

## Common Patterns

### Extracting User from Request
```typescript
const user = req.user; // Already available after requireAuth
// user.email, user.role, user.iat, user.exp
```

### Checking Roles
```typescript
// Multiple allowed roles
app.get('/api/reports', requireAuth, requireRole('HR_MANAGER', 'HR_ADMIN'), handler);

// Single role
app.post('/api/settings', requireAuth, requireRole('HR_ADMIN'), handler);
```

### Error Responses
```typescript
// 401: Missing or invalid token
res.status(401).json({ error: 'Unauthorized: missing or invalid token' });

// 403: Valid token but insufficient permissions
res.status(403).json({ error: 'Forbidden: insufficient permissions' });

// 400: Invalid input
res.status(400).json({ error: 'Bad request: invalid email format' });
```

## Migration Checklist

When adding auth to new features:
- [ ] Route has `requireAuth` middleware
- [ ] Add `requireRole()` if role-restricted
- [ ] Input validated with Zod schema
- [ ] Tests include token in Authorization header
- [ ] Tests verify both auth success and failure cases
- [ ] Ran `yarn workspace backend lint && yarn workspace backend format`
- [ ] All tests pass: `yarn workspace backend test:run`
- [ ] Commit includes auth details in message
