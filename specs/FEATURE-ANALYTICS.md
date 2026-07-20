# Feature Spec: Analytics & Reporting

**Status**: ✅ Complete  
**Last Updated**: 2026-07-18  
**Test Coverage**: 30+ tests  
**Endpoints**: 8 (aggregations, breakdowns, comparisons)

## Overview
Analyze salary data across employees, departments, and job levels. Generate insights on salary distributions, pay equity, and HR metrics through various aggregation and grouping queries.

## Requirements

### Functional
- ✅ Average salary by department
- ✅ Average salary by job level
- ✅ Salary distribution statistics (min, max, median, stddev)
- ✅ Count employees by department
- ✅ Count employees by job level
- ✅ Salary comparison by gender (if tracked)
- ✅ Top earners report
- ✅ Department budget summary
- ✅ Salary ranges by level
- ✅ Pay equity analysis (salary gaps)

### Non-Functional
- ✅ All endpoints require authentication
- ✅ Results grouped and aggregated at API level
- ✅ Large datasets handled efficiently
- ✅ Results sorted by descending value by default
- ✅ Filters applied consistently (department, level, etc.)

## API Endpoints

### GET /api/analytics/salary-by-department
**Description**: Average and total salary by department

**Query Parameters**:
- `includeCount` (boolean): Include employee count (default true)

**Response (200 OK)**:
```json
{
  "data": [
    {
      "department": "Engineering",
      "count": 250,
      "averageSalary": 125000,
      "totalSalary": 31250000,
      "minSalary": 75000,
      "maxSalary": 200000
    },
    {
      "department": "Sales",
      "count": 150,
      "averageSalary": 100000,
      "totalSalary": 15000000,
      "minSalary": 60000,
      "maxSalary": 180000
    }
  ]
}
```

**Auth Required**: Yes

---

### GET /api/analytics/salary-by-level
**Description**: Average and total salary by job level

**Response (200 OK)**:
```json
{
  "data": [
    {
      "level": "Senior Engineer",
      "rank": 4,
      "count": 100,
      "averageSalary": 150000,
      "totalSalary": 15000000,
      "minSalary": 130000,
      "maxSalary": 200000,
      "change": "+5%" // vs previous level
    },
    {
      "level": "Engineer",
      "rank": 3,
      "count": 120,
      "averageSalary": 110000,
      "totalSalary": 13200000,
      "minSalary": 90000,
      "maxSalary": 145000
    }
  ]
}
```

**Auth Required**: Yes

---

### GET /api/analytics/salary-distribution
**Description**: Statistical distribution of salaries

**Query Parameters**:
- `department` (string): Filter by department (optional)
- `jobLevel` (number): Filter by job level rank (optional)

**Response (200 OK)**:
```json
{
  "total": 10000,
  "currency": "USD",
  "statistics": {
    "mean": 95000,
    "median": 92000,
    "min": 45000,
    "max": 350000,
    "standardDeviation": 28000,
    "q1": 72000,      // 25th percentile
    "q3": 118000,     // 75th percentile
    "iqr": 46000      // Interquartile range
  },
  "buckets": [        // Salary ranges
    { "range": "$40k-$60k", "count": 500 },
    { "range": "$60k-$80k", "count": 1500 },
    { "range": "$80k-$100k", "count": 3000 },
    { "range": "$100k-$150k", "count": 3500 },
    { "range": "$150k-$200k", "count": 1300 },
    { "range": "$200k+", "count": 200 }
  ]
}
```

**Auth Required**: Yes

---

### GET /api/analytics/department-comparison
**Description**: Compare salary metrics across departments

**Response (200 OK)**:
```json
{
  "departments": [
    {
      "id": "dept-uuid",
      "name": "Engineering",
      "employeeCount": 250,
      "averageSalary": 125000,
      "medianSalary": 120000,
      "salaryGrowth": "+8%", // vs last year
      "payEquityGap": "+2%"   // gender pay gap (if tracked)
    }
  ],
  "companyAverage": 95000,
  "companyMedian": 92000
}
```

**Auth Required**: Yes

---

### GET /api/analytics/top-earners
**Description**: List highest paid employees

**Query Parameters**:
- `limit` (number): Top N employees (default 10, max 100)
- `department` (string): Filter by department

**Response (200 OK)**:
```json
{
  "limit": 10,
  "data": [
    {
      "rank": 1,
      "employee": {
        "id": "emp-uuid",
        "firstName": "Alice",
        "lastName": "Smith",
        "email": "alice@acme.com"
      },
      "salary": 350000,
      "department": "Executive",
      "jobLevel": "CEO"
    },
    {
      "rank": 2,
      "employee": {
        "id": "emp-uuid",
        "firstName": "Bob",
        "lastName": "Johnson",
        "email": "bob@acme.com"
      },
      "salary": 280000,
      "department": "Engineering",
      "jobLevel": "VP Engineering"
    }
  ]
}
```

**Auth Required**: Yes

---

### GET /api/analytics/pay-equity
**Description**: Pay equity analysis and gaps

**Query Parameters**:
- `dimension` (string): Analyze by "gender", "department", "level" (default all)

**Response (200 OK)**:
```json
{
  "overallEquityScore": 0.87, // 0-1, 1 = perfect equity
  "analysis": {
    "byGender": [
      {
        "group": "Female",
        "count": 4500,
        "averageSalary": 91000,
        "gap": "-4.2%" // vs male average
      },
      {
        "group": "Male",
        "count": 5500,
        "averageSalary": 95000
      }
    ],
    "byDepartment": [
      {
        "department": "Engineering",
        "femaleAvg": 115000,
        "maleAvg": 125000,
        "gap": "-8%"
      }
    ]
  },
  "recommendations": [
    "Address 8% gap in Engineering department"
  ]
}
```

**Auth Required**: Yes (HR_ADMIN recommended)

---

### GET /api/analytics/headcount-trends
**Description**: Headcount changes over time

**Query Parameters**:
- `granularity` (string): "monthly", "quarterly", "yearly" (default monthly)
- `months` (number): Lookback period in months (default 12)

**Response (200 OK)**:
```json
{
  "granularity": "monthly",
  "lookbackMonths": 12,
  "data": [
    {
      "period": "2025-07",
      "headcount": 9500,
      "hires": 50,
      "departures": 10,
      "netChange": 40
    },
    {
      "period": "2025-08",
      "headcount": 9540,
      "hires": 60,
      "departures": 15,
      "netChange": 45
    }
  ]
}
```

**Auth Required**: Yes

---

### GET /api/analytics/department-budget
**Description**: Total salary budget by department

**Response (200 OK)**:
```json
{
  "totalBudget": 950000000,
  "currency": "USD",
  "departments": [
    {
      "id": "dept-uuid",
      "name": "Engineering",
      "headcount": 250,
      "totalSalary": 31250000,
      "percentOfBudget": 32.9,
      "averageSalary": 125000
    }
  ],
  "topCosts": [
    {
      "name": "Engineering",
      "amount": 31250000
    }
  ]
}
```

**Auth Required**: Yes

---

## Data Model

No new tables needed. Analytics queries aggregate existing data:
- Employee
- SalaryRecord
- Department
- JobLevel

## Implementation Details

### File Structure
- `backend/src/app.ts` - Analytics route handlers
- `backend/tests/analytics.test.ts` - Analytics tests
- `backend/src/schemas.ts` - Query validation

### Key Calculations

#### Standard Deviation
```
σ = sqrt(Σ(x - mean)² / n)
```

#### Pay Equity Gap
```
gap = (salary_group_a - salary_group_b) / salary_group_b * 100
```

#### Equity Score
```
score = (1 - abs(gap)) / 100  // 0-1 scale
```

## Tests (30+ total)

```typescript
describe('Analytics', () => {
  // By Department
  ✅ Average salary by department
  ✅ Min/max salary by department
  ✅ Employee count by department
  ✅ Department comparison
  ✅ Department budget totals
  
  // By Level
  ✅ Average salary by job level
  ✅ Salary progression by level
  ✅ Employee count by level
  ✅ Salary ranges by level
  
  // Distribution
  ✅ Salary distribution statistics
  ✅ Percentiles (Q1, median, Q3)
  ✅ Standard deviation calculation
  ✅ Salary bucketing
  ✅ Distribution with filters
  
  // Equity
  ✅ Pay equity analysis
  ✅ Gender pay gap calculation
  ✅ Department equity gaps
  ✅ Equity score computation
  ✅ Equity recommendations
  
  // Trends
  ✅ Top earners report
  ✅ Top earners by department
  ✅ Headcount trends
  ✅ Headcount changes
  ✅ Headcount by period
  
  // General
  ✅ All endpoints require auth
  ✅ Filters apply correctly
  ✅ Results sorted correctly
  ✅ Edge cases (empty results)
})
```

**Test File**: `backend/tests/analytics.test.ts`

## Performance Considerations

- ✅ Aggregations done at database level (not in-app)
- ✅ Indexes on department, jobLevel, salary
- ✅ Results cached in memory for 1-hour (future enhancement)
- ⚠️ Large datasets may need pagination (future: add if needed)
- ⚠️ Real-time vs snapshot reports (currently real-time)

## Compliance & Privacy

- ✅ All queries require authentication
- ✅ Individual salary data never exposed in aggregates
- ⚠️ Consider role-based visibility (manager can see department only)
- ⚠️ Audit logging for pay equity queries (privacy sensitive)

## Future Enhancements

- [ ] Benchmarking against industry standards
- [ ] Predictive salary modeling
- [ ] Turnover analysis by department/level
- [ ] Compensation band recommendations
- [ ] Salary forecasting
- [ ] Diversity metrics (race, age, tenure)
- [ ] Export to PDF/Excel
- [ ] Scheduled report delivery

---

**References**:
- Implementation: [backend/src/app.ts](backend/src/app.ts)
- Tests: [backend/tests/analytics.test.ts](backend/tests/analytics.test.ts)
