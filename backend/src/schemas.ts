import { z } from 'zod';

// Enums
export const EmployeeStatus = z.enum(['ACTIVE', 'TERMINATED']);
export const JobLevel = z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);

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

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type EmployeeResponse = z.infer<typeof EmployeeResponseSchema>;
export type EmployeeWithDetails = z.infer<typeof EmployeeWithDetailsSchema>;
