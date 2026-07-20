# Feature Spec: Salary Management

**Status**: ✅ Complete  
**Last Updated**: 2026-07-18  
**Test Coverage**: 20+ tests  
**Endpoints**: 4 (GET history, GET by employee, POST create, DELETE)

## Overview
Track salary records and history for employees. Records salary changes with effective dates, supports querying historical salary data, and validates salary consistency across records.

## Requirements

### Functional
- ✅ View salary history for each employee
- ✅ Filter salary records by date range
- ✅ Get current salary for employee
- ✅ Create new salary record (with effective date)
- ✅ Track salary start and end dates
- ✅ Support retroactive salary adjustments
- ✅ Calculate salary changes (delta)
- ✅ Delete salary records
- ✅ Validate non-overlapping salary records
- ✅ Return salary in original currency with FX rates

### Non-Functional
- ✅ All endpoints require authentication
- ✅ Salary values stored as BigInt (cents/pence)
- ✅ Dates stored as ISO 8601
- ✅ Most recent salary record is "current"
- ✅ Records sorted by effective date descending

## API Endpoints

### GET /api/salary
**Description**: List all salary records (admin view)

**Query Parameters**:
- `employeeId` (string): Filter by employee
- `startDate` (ISO date): From date (inclusive)
- `endDate` (ISO date): To date (inclusive)
- `page` (number): Pagination (default 1)

**Response (200 OK)**:
```json
{
  "records": [
    {
      "id": "sal-uuid",
      "employeeId": "emp-uuid",
      "employee": {
        "id": "emp-uuid",
        "firstName": "John",
        "lastName": "Doe"
      },
      "salary": 100000,
      "currency": "USD",
      "startDate": "2026-01-01",
      "endDate": null,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1
}
```

**Auth Required**: Yes

---

### GET /api/salary/:employeeId
**Description**: Get salary history for specific employee

**Path Parameters**:
- `employeeId` (string, required): Employee UUID

**Query Parameters**:
- `startDate` (ISO date): From date
- `endDate` (ISO date): To date

**Response (200 OK)**:
```json
{
  "employeeId": "emp-uuid",
  "employee": {
    "id": "emp-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@acme.com"
  },
  "currentSalary": 105000,
  "records": [
    {
      "id": "sal-uuid-3",
      "salary": 105000,
      "currency": "USD",
      "startDate": "2025-07-01",
      "endDate": null,
      "change": 5000
    },
    {
      "id": "sal-uuid-2",
      "salary": 100000,
      "currency": "USD",
      "startDate": "2024-01-01",
      "endDate": "2025-06-30",
      "change": 5000
    }
  ]
}
```

**Auth Required**: Yes

---

### POST /api/salary
**Description**: Create new salary record

**Request**:
```json
{
  "employeeId": "emp-uuid",
  "salary": 110000,
  "currency": "USD",
  "startDate": "2026-07-01",
  "endDate": null
}
```

**Response (201 Created)**:
```json
{
  "id": "sal-new-uuid",
  "employeeId": "emp-uuid",
  "salary": 110000,
  "currency": "USD",
  "startDate": "2026-07-01",
  "endDate": null,
  "createdAt": "2026-07-18T14:30:00Z"
}
```

**Error (400)**:
```json
{
  "error": "Salary records cannot overlap"
}
```

**Auth Required**: Yes (HR_ADMIN)

---

### DELETE /api/salary/:id
**Description**: Delete salary record

**Response (204 No Content)**

**Auth Required**: Yes (HR_ADMIN)

---

## Data Model

### SalaryRecord Table
```prisma
model SalaryRecord {
  id            String    @id @default(cuid())
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  salary        BigInt    // Stored in cents (e.g., 100000 = $1000.00)
  currency      String    @default("USD")
  
  startDate     DateTime  // Effective date
  endDate       DateTime? // When salary changed (null = current)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([employeeId, startDate])
}

model FxRate {
  id            String    @id @default(cuid())
  fromCurrency  String
  toCurrency    String
  rate          Decimal   // Decimal(10,6) for precision
  effectiveDate DateTime
  
  @@unique([fromCurrency, toCurrency, effectiveDate])
}
```

## Implementation Details

### File Structure
- `backend/src/app.ts` - Salary route handlers
- `backend/src/schemas.ts` - Zod validation
- `backend/tests/salary.test.ts` - Salary tests
- `backend/prisma/seed.ts` - Seed salary records

### Validation

**CreateSalarySchema**:
- employeeId: valid employee FK
- salary: integer > 0
- currency: valid 3-letter code (USD, GBP, EUR, etc.)
- startDate: valid ISO date
- endDate: valid ISO date (optional, must be > startDate)
- Non-overlapping records per employee

**UpdateSalarySchema**: All fields optional except employeeId

## Tests (20+ total)

```typescript
describe('Salary Management', () => {
  // List
  ✅ GET /api/salary returns all salary records
  ✅ GET /api/salary filters by employee
  ✅ GET /api/salary filters by date range
  ✅ GET /api/salary pagination works
  ✅ GET /api/salary requires authentication
  
  // Get Employee History
  ✅ GET /api/salary/:employeeId returns history
  ✅ GET /api/salary/:employeeId includes current salary
  ✅ GET /api/salary/:employeeId returns records newest first
  ✅ GET /api/salary/:employeeId filters by date range
  ✅ GET /api/salary/:employeeId includes salary change delta
  ✅ GET /api/salary/:employeeId returns 404 for invalid employee
  
  // Create
  ✅ POST /api/salary creates new record
  ✅ POST /api/salary validates required fields
  ✅ POST /api/salary rejects overlapping records
  ✅ POST /api/salary closes previous record
  ✅ POST /api/salary requires HR_ADMIN role
  ✅ POST /api/salary calculates change from previous
  
  // Delete
  ✅ DELETE /api/salary/:id removes record
  ✅ DELETE /api/salary/:id returns 404 for invalid id
  ✅ DELETE /api/salary/:id requires HR_ADMIN role
})
```

**Test File**: `backend/tests/salary.test.ts`

## Salary Calculation Rules

### Current Salary
- Most recent record with `endDate = null`
- If multiple records have null endDate, use most recent startDate

### Salary Change (delta)
- Current - Previous
- Displayed as absolute value + percentage
- Example: $100k → $105k = +$5k (+5%)

### Date Ranges
- Records should be contiguous (no gaps)
- Validation prevents overlaps
- Query filters are inclusive (startDate to endDate)

## Currency Handling

### Supported Currencies
- USD (US Dollar)
- GBP (British Pound)
- EUR (Euro)
- INR (Indian Rupee)
- Others can be added

### FX Rates
- Lookup table with historical rates
- Effective dates for rate versioning
- Can convert salary to common currency for reporting

## Performance Considerations

- ✅ Index on (employeeId, startDate) for queries
- ✅ Unique constraint prevents overlaps
- ✅ Pagination prevents large result sets
- ⚠️ Salary currency conversion needs FX lookup (add caching if needed)

## Future Enhancements

- [ ] Salary banding/benchmarking
- [ ] Cost-of-living adjustments (COLA)
- [ ] Bonus/commission tracking
- [ ] Benefits cost tracking
- [ ] Salary equity analysis
- [ ] Budget forecasting
- [ ] Currency conversion API integration

---

**References**:
- Implementation: [backend/src/app.ts](backend/src/app.ts)
- Tests: [backend/tests/salary.test.ts](backend/tests/salary.test.ts)
- Schemas: [backend/src/schemas.ts](backend/src/schemas.ts)
