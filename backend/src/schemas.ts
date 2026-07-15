import { z } from 'zod';

// Enums
export const EmployeeStatus = z.enum(['ACTIVE', 'TERMINATED']);
export const JobLevel = z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
export const SalaryChangeReason = z.enum(['HIRE', 'ANNUAL_RAISE', 'PROMOTION', 'ADJUSTMENT', 'MARKET_CORRECTION']);

// Employee request/response schemas
export const CreateEmployeeSchema = z.object({
  employeeCode: z.string().min(1).max(20),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  countryId: z.string().uuid(),
  departmentId: z.string().uuid(),
  jobLevel: JobLevel,
  managerId: z.string().uuid().nullable().optional(),
  hireDate: z.string().datetime().or(z.date()),
  status: EmployeeStatus.default('ACTIVE')
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export const EmployeeResponseSchema = z.object({
  id: z.string().uuid(),
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  countryId: z.string(),
  departmentId: z.string(),
  jobLevel: z.string(),
  managerId: z.string().nullable(),
  hireDate: z.date(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const EmployeeWithDetailsSchema = EmployeeResponseSchema.extend({
  country: z.object({
    id: z.string(),
    name: z.string(),
    currencyCode: z.string()
  }),
  department: z.object({
    id: z.string(),
    name: z.string()
  }),
  manager: EmployeeResponseSchema.nullable(),
  currentSalary: z.object({
    amount: z.any(),
    currency: z.string(),
    amountUsd: z.any(),
    effectiveDate: z.date(),
    reason: z.string()
  }).nullable()
});

export const EmployeeListSchema = z.array(EmployeeWithDetailsSchema);

// Salary Record schemas
export const SalaryRecordResponseSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  amount: z.any(),
  currency: z.string(),
  amountUsd: z.any(),
  effectiveDate: z.date(),
  reason: SalaryChangeReason,
  createdAt: z.date(),
  updatedAt: z.date()
});

export const SalaryRecordWithEmployeeSchema = SalaryRecordResponseSchema.extend({
  employee: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    jobLevel: z.string(),
    country: z.object({
      id: z.string(),
      name: z.string(),
      currencyCode: z.string()
    }),
    department: z.object({
      id: z.string(),
      name: z.string()
    })
  })
});

export const SalaryRecordsQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  reason: SalaryChangeReason.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional()
});

export const SalaryHistoryResponseSchema = z.object({
  employee: EmployeeWithDetailsSchema,
  records: z.array(SalaryRecordResponseSchema)
});

// Department schemas
export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(100)
});

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial();

export const DepartmentResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const DepartmentWithStatsSchema = DepartmentResponseSchema.extend({
  employeeCount: z.number(),
  averageSalaryUsd: z.any().nullable(),
  managers: z.array(EmployeeResponseSchema)
});

// Salary Analytics schemas
export const SalaryStatsSchema = z.object({
  count: z.number(),
  min: z.any(),
  max: z.any(),
  avg: z.any(),
  median: z.any(),
  p25: z.any(),
  p75: z.any(),
  stdDev: z.any()
});

export const SalaryAnalyticsSummarySchema = z.object({
  totalEmployees: z.number(),
  averageSalaryUsd: z.any(),
  medianSalaryUsd: z.any(),
  minSalaryUsd: z.any(),
  maxSalaryUsd: z.any(),
  totalPayrollUsd: z.any(),
  departmentCount: z.number(),
  countryCount: z.number(),
  statistics: SalaryStatsSchema
});

export const DepartmentAnalyticsSchema = z.object({
  departmentId: z.string().uuid(),
  departmentName: z.string(),
  employeeCount: z.number(),
  averageSalaryUsd: z.any(),
  medianSalaryUsd: z.any(),
  minSalaryUsd: z.any(),
  maxSalaryUsd: z.any(),
  totalPayrollUsd: z.any()
});

export const CountryAnalyticsSchema = z.object({
  countryId: z.string().uuid(),
  countryName: z.string(),
  currencyCode: z.string(),
  employeeCount: z.number(),
  averageSalaryUsd: z.any(),
  medianSalaryUsd: z.any(),
  minSalaryUsd: z.any(),
  maxSalaryUsd: z.any(),
  totalPayrollUsd: z.any()
});

export const LevelAnalyticsSchema = z.object({
  jobLevel: z.string(),
  employeeCount: z.number(),
  averageSalaryUsd: z.any(),
  medianSalaryUsd: z.any(),
  minSalaryUsd: z.any(),
  maxSalaryUsd: z.any(),
  totalPayrollUsd: z.any()
});

export const SalaryOutlierSchema = z.object({
  employeeId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  jobLevel: z.string(),
  departmentName: z.string(),
  currentSalaryUsd: z.any(),
  expectedRangeMin: z.any(),
  expectedRangeMax: z.any(),
  deviation: z.any(),
  deviationPercent: z.any()
});

export type SalaryStats = z.infer<typeof SalaryStatsSchema>;
export type SalaryAnalyticsSummary = z.infer<typeof SalaryAnalyticsSummarySchema>;
export type DepartmentAnalytics = z.infer<typeof DepartmentAnalyticsSchema>;
export type CountryAnalytics = z.infer<typeof CountryAnalyticsSchema>;
export type LevelAnalytics = z.infer<typeof LevelAnalyticsSchema>;
export type SalaryOutlier = z.infer<typeof SalaryOutlierSchema>;
export type SalaryRecordResponse = z.infer<typeof SalaryRecordResponseSchema>;
export type SalaryRecordWithEmployee = z.infer<typeof SalaryRecordWithEmployeeSchema>;
export type SalaryHistoryResponse = z.infer<typeof SalaryHistoryResponseSchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type EmployeeResponse = z.infer<typeof EmployeeResponseSchema>;
export type EmployeeWithDetails = z.infer<typeof EmployeeWithDetailsSchema>;
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;
export type DepartmentResponse = z.infer<typeof DepartmentResponseSchema>;
export type DepartmentWithStats = z.infer<typeof DepartmentWithStatsSchema>;
