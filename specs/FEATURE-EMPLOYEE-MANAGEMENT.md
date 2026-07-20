# Feature Spec: Employee Management

**Status**: ✅ Complete  
**Last Updated**: 2026-07-18  
**Test Coverage**: 20+ tests  
**Endpoints**: 5 (GET list, GET by id, POST create, PUT update, DELETE)

## Overview
Core HR functionality for managing employee records. Supports CRUD operations, filtering by department/job level, search by name/email, and retrieving employee details with manager relationships.

## Requirements

### Functional
- ✅ List all employees with pagination support
- ✅ Search employees by name or email
- ✅ Filter employees by department
- ✅ Filter employees by job level
- ✅ Get single employee with all details
- ✅ Get employee's manager (if assigned)
- ✅ Get employee's direct reports
- ✅ Create new employee record
- ✅ Update employee details
- ✅ Delete employee record
- ✅ Track start date and employment duration

### Non-Functional
- ✅ All endpoints require authentication
- ✅ List returns max 100 employees per page
- ✅ Search is case-insensitive
- ✅ Filters are combined (AND logic)
- ✅ Response includes timestamps (createdAt, updatedAt)

## API Endpoints

### GET /api/employees
**Description**: List all employees with filters and search

**Query Parameters**:
- `search` (string): Filter by firstName, lastName, or email
- `department` (string): Filter by department name
- `jobLevel` (number): Filter by job level rank
- `page` (number): Page number (default 1)
- `limit` (number): Items per page (default 20, max 100)

**Response (200 OK)**:
```json
{
  "employees": [
    {
      "id": "emp-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@acme.com",
      "salary": 100000,
      "startDate": "2020-01-15",
      "department": {
        "id": "dept-uuid",
        "name": "Engineering"
      },
      "jobLevel": {
        "id": "jl-uuid",
        "code": "L4",
        "name": "Senior Engineer",
        "rank": 4
      },
      "manager": {
        "id": "mgr-uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "title": null
      },
      "title": null,
      "createdAt": "2020-01-15T00:00:00Z",
      "updatedAt": "2026-07-18T14:30:00Z"
    }
  ],
  "total": 10000,
  "page": 1,
  "limit": 20
}
```

**Auth Required**: Yes

---

### GET /api/employees/:id
**Description**: Get single employee with full details

**Path Parameters**:
- `id` (string, required): Employee UUID

**Response (200 OK)**:
```json
{
  "id": "emp-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@acme.com",
  "salary": 100000,
  "startDate": "2020-01-15",
  "department": { ... },
  "jobLevel": { ... },
  "manager": { ... },
  "directReports": [
    { "id": "emp2-uuid", "firstName": "Alice", "lastName": "Johnson" }
  ],
  "title": null,
  "createdAt": "2020-01-15T00:00:00Z",
  "updatedAt": "2026-07-18T14:30:00Z"
}
```

**Error (404)**:
```json
{
  "error": "Employee not found"
}
```

**Auth Required**: Yes

---

### POST /api/employees
**Description**: Create new employee record

**Request**:
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@acme.com",
  "salary": 95000,
  "startDate": "2026-01-01",
  "departmentId": "dept-uuid",
  "jobLevelId": "jl-uuid",
  "managerId": "emp-uuid"
}
```

**Response (201 Created)**:
```json
{
  "id": "emp-new-uuid",
  "firstName": "Alice",
  "lastName": "Johnson",
  ...
}
```

**Error (400)**:
```json
{
  "error": "Validation failed: email already exists"
}
```

**Auth Required**: Yes (HR_ADMIN)

---

### PUT /api/employees/:id
**Description**: Update employee details

**Request**: Same as POST, partial updates allowed

**Response (200 OK)**: Updated employee object

**Auth Required**: Yes (HR_ADMIN)

---

### DELETE /api/employees/:id
**Description**: Delete employee record

**Response (204 No Content)**

**Error (404)**:
```json
{
  "error": "Employee not found"
}
```

**Auth Required**: Yes (HR_ADMIN)

---

## Data Model

### Employee Table
```prisma
model Employee {
  id              String      @id @default(cuid())
  firstName       String
  lastName        String
  email           String      @unique
  salary          BigInt
  startDate       DateTime
  title           String?     // For special roles like CEO
  
  departmentId    String
  department      Department  @relation(fields: [departmentId], references: [id])
  
  jobLevelId      String
  jobLevel        JobLevel    @relation(fields: [jobLevelId], references: [id])
  
  managerId       String?
  manager         Employee?   @relation("Management", fields: [managerId], references: [id])
  directReports   Employee[]  @relation("Management")
  
  salaryRecords   SalaryRecord[]
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Department {
  id              String      @id @default(cuid())
  name            String
  location        String?
  employees       Employee[]
}

model JobLevel {
  id              String      @id @default(cuid())
  code            String      @unique
  name            String
  rank            Int         @unique
  employees       Employee[]
}
```

## Implementation Details

### File Structure
- `backend/src/app.ts` - Employee route handlers
- `backend/src/schemas.ts` - Zod validation schemas
- `backend/tests/employees.test.ts` - Employee tests
- `backend/prisma/schema.prisma` - Data model

### Validation

**CreateEmployeeSchema**:
- firstName: string, 1-100 chars
- lastName: string, 1-100 chars
- email: valid email format, unique
- salary: integer > 0
- startDate: valid date
- departmentId: existing department FK
- jobLevelId: existing job level FK
- managerId: existing employee FK (optional)

**UpdateEmployeeSchema**: All fields optional

## Tests (20+ total)

```typescript
describe('Employees', () => {
  // List
  ✅ GET /api/employees returns all employees
  ✅ GET /api/employees filters by department
  ✅ GET /api/employees filters by jobLevel
  ✅ GET /api/employees searches by name
  ✅ GET /api/employees searches by email
  ✅ GET /api/employees returns paginated results
  ✅ GET /api/employees requires authentication
  
  // Get Single
  ✅ GET /api/employees/:id returns employee details
  ✅ GET /api/employees/:id includes manager info
  ✅ GET /api/employees/:id includes direct reports
  ✅ GET /api/employees/:id returns 404 for invalid id
  ✅ GET /api/employees/:id requires authentication
  
  // Create
  ✅ POST /api/employees creates new employee
  ✅ POST /api/employees validates required fields
  ✅ POST /api/employees rejects duplicate email
  ✅ POST /api/employees requires HR_ADMIN role
  
  // Update
  ✅ PUT /api/employees/:id updates employee
  ✅ PUT /api/employees/:id partial updates allowed
  
  // Delete
  ✅ DELETE /api/employees/:id removes employee
  ✅ DELETE /api/employees/:id returns 404 for invalid id
})
```

**Test File**: `backend/tests/employees.test.ts`

## Search & Filter Behavior

### Search (name + email)
- Case-insensitive substring match
- Searches: firstName, lastName, email
- Combined with OR logic

### Filters (department, jobLevel)
- Exact match
- Combined with AND logic
- Multiple values can be comma-separated for OR within field

### Example Query
```
GET /api/employees?search=john&department=engineering&jobLevel=4&page=1&limit=20
```

## Performance Considerations

- ✅ Indexes on email (unique), department, jobLevel
- ✅ Pagination prevents large result sets
- ✅ Manager/department relations eagerly loaded
- ⚠️ Large result sets may need caching (future: Redis)
- ⚠️ Full-text search not implemented (future: PostgreSQL FTS)

## Future Enhancements

- [ ] Full-text search with ranking
- [ ] Bulk import/export (CSV)
- [ ] Salary adjustment history
- [ ] Performance reviews/ratings
- [ ] Org chart visualization
- [ ] Headcount reporting
- [ ] Compensation bands by level

---

**References**:
- Implementation: [backend/src/app.ts](backend/src/app.ts)
- Tests: [backend/tests/employees.test.ts](backend/tests/employees.test.ts)
- Schemas: [backend/src/schemas.ts](backend/src/schemas.ts)
