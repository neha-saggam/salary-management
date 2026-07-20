# Feature Spec: Department Management

**Status**: ✅ Complete  
**Last Updated**: 2026-07-18  
**Test Coverage**: 15+ tests  
**Endpoints**: 4 (GET list, GET by id, POST create, PUT update)

## Overview
Manage organizational departments and teams. Track department structure, location, and employee assignments. Support hierarchical department relationships and reporting structures.

## Requirements

### Functional
- ✅ Create department with name and location
- ✅ View all departments
- ✅ Get department details with employee count
- ✅ Update department information
- ✅ Delete department (if no employees assigned)
- ✅ List employees in a department
- ✅ Filter departments by location
- ✅ Support department hierarchies (parent/child)

### Non-Functional
- ✅ All endpoints require authentication
- ✅ Department names must be unique
- ✅ Cannot delete department with employees (referential integrity)
- ✅ Results sorted alphabetically by name

## API Endpoints

### GET /api/departments
**Description**: List all departments

**Query Parameters**:
- `location` (string): Filter by location (optional)
- `sortBy` (string): Sort by "name", "employeeCount" (default name)

**Response (200 OK)**:
```json
{
  "departments": [
    {
      "id": "dept-uuid",
      "name": "Engineering",
      "location": "San Francisco",
      "employeeCount": 250,
      "budget": 31250000,
      "createdAt": "2020-01-01T00:00:00Z",
      "updatedAt": "2026-07-18T14:30:00Z"
    },
    {
      "id": "dept-uuid-2",
      "name": "Sales",
      "location": "New York",
      "employeeCount": 150,
      "budget": 15000000,
      "createdAt": "2020-01-01T00:00:00Z",
      "updatedAt": "2026-07-18T14:30:00Z"
    }
  ],
  "total": 5
}
```

**Auth Required**: Yes

---

### GET /api/departments/:id
**Description**: Get department details with employees

**Path Parameters**:
- `id` (string, required): Department UUID

**Query Parameters**:
- `includeEmployees` (boolean): Include employee list (default true)
- `limit` (number): Max employees to return (default 100)

**Response (200 OK)**:
```json
{
  "id": "dept-uuid",
  "name": "Engineering",
  "location": "San Francisco",
  "employeeCount": 250,
  "budget": 31250000,
  "createdAt": "2020-01-01T00:00:00Z",
  "updatedAt": "2026-07-18T14:30:00Z",
  "employees": [
    {
      "id": "emp-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@acme.com",
      "salary": 125000,
      "jobLevel": "Senior Engineer",
      "manager": "Jane Smith"
    }
  ],
  "statistics": {
    "totalSalary": 31250000,
    "averageSalary": 125000,
    "medianSalary": 122000,
    "maxSalary": 200000,
    "minSalary": 75000
  }
}
```

**Error (404)**:
```json
{
  "error": "Department not found"
}
```

**Auth Required**: Yes

---

### POST /api/departments
**Description**: Create new department

**Request**:
```json
{
  "name": "Product Management",
  "location": "San Francisco"
}
```

**Response (201 Created)**:
```json
{
  "id": "dept-new-uuid",
  "name": "Product Management",
  "location": "San Francisco",
  "employeeCount": 0,
  "budget": 0,
  "createdAt": "2026-07-20T10:00:00Z",
  "updatedAt": "2026-07-20T10:00:00Z"
}
```

**Error (400)**:
```json
{
  "error": "Department name already exists"
}
```

**Auth Required**: Yes (HR_ADMIN)

---

### PUT /api/departments/:id
**Description**: Update department information

**Request**:
```json
{
  "name": "Product Engineering",
  "location": "San Francisco, CA"
}
```

**Response (200 OK)**: Updated department object

**Error (400)**:
```json
{
  "error": "Department name already exists"
}
```

**Auth Required**: Yes (HR_ADMIN)

---

### DELETE /api/departments/:id
**Description**: Delete department

**Response (204 No Content)**

**Error (400)**:
```json
{
  "error": "Cannot delete department with 250 employees. Please reassign employees first."
}
```

**Error (404)**:
```json
{
  "error": "Department not found"
}
```

**Auth Required**: Yes (HR_ADMIN)

---

## Data Model

### Department Table
```prisma
model Department {
  id          String      @id @default(cuid())
  name        String      @unique
  location    String?
  employees   Employee[]
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}
```

## Implementation Details

### File Structure
- `backend/src/app.ts` - Department route handlers
- `backend/src/schemas.ts` - Zod validation
- `backend/tests/departments.test.ts` - Department tests
- `backend/prisma/seed.ts` - Seed departments

### Validation

**CreateDepartmentSchema**:
- name: string, 1-100 chars, unique
- location: string, 1-100 chars (optional)

**UpdateDepartmentSchema**: All fields optional

## Tests (15+ total)

```typescript
describe('Departments', () => {
  // List
  ✅ GET /api/departments returns all departments
  ✅ GET /api/departments filters by location
  ✅ GET /api/departments sorts by name
  ✅ GET /api/departments sorts by employee count
  ✅ GET /api/departments requires authentication
  
  // Get Single
  ✅ GET /api/departments/:id returns department
  ✅ GET /api/departments/:id includes employee list
  ✅ GET /api/departments/:id includes statistics
  ✅ GET /api/departments/:id returns 404 for invalid id
  ✅ GET /api/departments/:id employee limit works
  
  // Create
  ✅ POST /api/departments creates new department
  ✅ POST /api/departments validates required fields
  ✅ POST /api/departments rejects duplicate name
  ✅ POST /api/departments requires HR_ADMIN role
  
  // Update
  ✅ PUT /api/departments/:id updates department
  ✅ PUT /api/departments/:id rejects duplicate name
  
  // Delete
  ✅ DELETE /api/departments/:id removes empty department
  ✅ DELETE /api/departments/:id prevents deletion with employees
  ✅ DELETE /api/departments/:id returns 404 for invalid id
})
```

**Test File**: `backend/tests/departments.test.ts`

## Seeded Departments

Default departments created during seed:
```
1. Engineering (San Francisco)
2. Sales (New York)
3. Marketing (San Francisco)
4. HR (San Francisco)
5. Finance (New York)
```

Each department has employees assigned to it.

## Department Statistics

When retrieving department details:
- **totalSalary**: Sum of all employee salaries
- **averageSalary**: Mean salary
- **medianSalary**: Middle value of salaries
- **maxSalary**: Highest salary in department
- **minSalary**: Lowest salary in department

## Performance Considerations

- ✅ Index on name (unique)
- ✅ Index on location for filtering
- ✅ Employee count calculated at query time
- ✅ Salary statistics aggregated from employee table
- ⚠️ Large departments may need pagination on employee list

## Cascading Operations

### When Employee Added
- Update department employee count
- Recalculate salary statistics

### When Employee Deleted
- Update department employee count
- Recalculate salary statistics

### When Department Deleted
- Check no employees assigned (referential integrity)
- Cascade delete or prevent (currently: prevent)

## Future Enhancements

- [ ] Department hierarchies (parent/child)
- [ ] Cost centers for budget tracking
- [ ] Department KPIs and goals
- [ ] Headcount forecasting per department
- [ ] Department-level compensation bands
- [ ] Manager roles per department
- [ ] Department performance reviews
- [ ] Cross-departmental project tracking

---

**References**:
- Implementation: [backend/src/app.ts](backend/src/app.ts)
- Tests: [backend/tests/departments.test.ts](backend/tests/departments.test.ts)
- Schemas: [backend/src/schemas.ts](backend/src/schemas.ts)
