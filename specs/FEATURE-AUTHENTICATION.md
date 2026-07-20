# Feature Spec: Authentication

**Status**: ✅ Complete  
**Last Updated**: 2026-07-18  
**Test Coverage**: 9 tests  

## Overview
JWT-based authentication with role-based access control. Users authenticate with email/password, receive a JWT token, and include it in subsequent requests to access protected resources.

## Requirements

### Functional
- ✅ User can login with email and password
- ✅ User receives JWT token valid for 8 hours
- ✅ HR_ADMIN can register new users
- ✅ HR_ADMIN can assign roles (HR_ADMIN, HR_MANAGER)
- ✅ Protected routes require valid JWT token
- ✅ Role-based access: HR_ADMIN has full access, HR_MANAGER has read-only access
- ✅ Invalid/expired tokens return 401 Unauthorized
- ✅ Insufficient permissions return 403 Forbidden

### Non-Functional
- ✅ Passwords hashed with bcryptjs (cost 12)
- ✅ JWTs signed with HS256 algorithm
- ✅ No passwords stored in plaintext
- ✅ Token expiration enforced server-side on validation

## API Endpoints

### POST /auth/login
**Description**: Authenticate user and receive JWT token

**Request**:
```json
{
  "email": "admin@acme.com",
  "password": "password123"
}
```

**Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "HR_ADMIN"
}
```

**Error (401)**:
```json
{
  "error": "Invalid credentials"
}
```

**Auth Required**: No

---

### POST /auth/register
**Description**: Create new user (HR_ADMIN only)

**Request**:
```json
{
  "email": "newuser@acme.com",
  "password": "securepass123",
  "role": "HR_MANAGER"
}
```

**Response (201 Created)**:
```json
{
  "id": "user-uuid",
  "email": "newuser@acme.com",
  "role": "HR_MANAGER"
}
```

**Error (403)**:
```json
{
  "error": "Forbidden: insufficient permissions"
}
```

**Auth Required**: Yes (HR_ADMIN only)

---

## Data Model

### User Table
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  role          UserRole
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum UserRole {
  HR_MANAGER
  HR_ADMIN
}
```

### JWT Payload
```json
{
  "email": "admin@acme.com",
  "role": "HR_ADMIN",
  "iat": 1626700000,
  "exp": 1626728000
}
```

## Implementation Details

### File Structure
- `backend/src/auth.ts` - JWT creation, validation, middleware
- `backend/src/app.ts` - Auth route handlers
- `backend/prisma/schema.prisma` - User model
- `backend/tests/auth.test.ts` - Auth endpoint tests
- `backend/tests/helpers.ts` - getAuthToken() test helper

### Key Functions

#### signToken(payload: object): string
- Creates signed JWT with 8-hour expiry
- Uses JWT_SECRET environment variable
- Returns token string

#### requireAuth middleware
- Extracts token from Authorization header
- Validates signature and expiration
- Attaches decoded user to request.user
- Returns 401 if invalid/missing

#### requireRole(...roles: UserRole[])
- Factory function returning middleware
- Checks request.user.role is in allowed roles
- Returns 403 if insufficient permissions

### Default Users (Seeded)
```
admin@acme.com  | HR_ADMIN    | password123
hr@acme.com     | HR_MANAGER  | password123
```

## Tests (9 total)

```typescript
describe('Authentication', () => {
  ✅ Login with valid credentials returns JWT
  ✅ Login with invalid credentials returns 401
  ✅ Register creates new user (HR_ADMIN only)
  ✅ Register requires HR_ADMIN role
  ✅ Protected route requires token
  ✅ Protected route returns 401 without token
  ✅ Protected route returns 401 with expired token
  ✅ Role-restricted route enforces permissions
  ✅ Valid token with insufficient role returns 403
})
```

**Test File**: `backend/tests/auth.test.ts`

## Middleware Integration

All protected routes automatically include `requireAuth`:

```typescript
app.get('/api/employees', requireAuth, handler)
app.post('/api/employees', requireAuth, requireRole('HR_ADMIN'), handler)
```

## Environment Variables

```
JWT_SECRET=your-secret-key-min-32-chars
```

## Security Considerations

- ✅ Passwords never logged or transmitted in plaintext
- ✅ Bcryptjs cost 12 deliberately slow (security > speed)
- ✅ JWTs signed with secure secret
- ✅ 8-hour expiry limits token compromise window
- ⚠️ No rate limiting on login (add express-rate-limit if scaling)
- ⚠️ No IP whitelisting (add if sensitive environment)

## Future Enhancements

- [ ] Add 2FA/MFA support
- [ ] Add password reset flow
- [ ] Add refresh token rotation
- [ ] Add account lockout after failed attempts
- [ ] Add audit logging for auth events
- [ ] Add IP whitelisting for HR_ADMIN accounts

---

**References**: 
- Implementation: [backend/src/auth.ts](backend/src/auth.ts)
- Tests: [backend/tests/auth.test.ts](backend/tests/auth.test.ts)
- Helper: [backend/tests/helpers.ts](backend/tests/helpers.ts)
