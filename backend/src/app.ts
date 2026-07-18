import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CreateEmployeeSchema, UpdateEmployeeSchema, CreateDepartmentSchema, UpdateDepartmentSchema } from './schemas.js';
import { requireAuth, signToken } from './auth.js';

const prisma = new PrismaClient();

export function createApp() {
  const app = express();

  app.use(express.json());

  // Support both '/employees' and '/api/employees' paths.
  app.use((req, _res, next) => {
    if (req.url.startsWith('/api/')) {
      req.url = req.url.slice(4) || '/';
    }
    next();
  });

  // Health check endpoint — public
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // === Auth Endpoints (public) ===

  // POST /auth/login
  app.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      const token = signToken({ userId: user.id, email: user.email, role: user.role });
      res.json({ token, role: user.role });
    } catch {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // POST /auth/register — HR_ADMIN only (or open during initial setup)
  app.post('/auth/register', requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'HR_ADMIN') {
        res.status(403).json({ error: 'Only HR_ADMIN can create users' });
        return;
      }
      const { email, password, role } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, passwordHash, role: role ?? 'HR_MANAGER' },
        select: { id: true, email: true, role: true, createdAt: true }
      });
      res.status(201).json(user);
    } catch {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // All routes below require authentication
  app.use(requireAuth);

  // === Employee CRUD Endpoints ===

  // GET /employees - List all employees with pagination + optional title/status filter
  app.get('/employees', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;
      const titleFilter = req.query.title as string | undefined;
      const statusFilter = req.query.status as string | undefined;

      const where: Record<string, unknown> = {};
      if (titleFilter) where.title = { equals: titleFilter, mode: 'insensitive' };
      if (statusFilter) where.status = statusFilter;

      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          where,
          skip,
          take: limit,
          include: {
            country: { select: { id: true, name: true, currencyCode: true } },
            department: { select: { id: true, name: true } },
            jobLevel: { select: { id: true, code: true, name: true, rank: true } },
            manager: true,
            salaryRecords: {
              orderBy: { effectiveDate: 'desc' },
              take: 1,
              select: {
                amount: true,
                currency: true,
                amountUsd: true,
                effectiveDate: true,
                reason: true
              }
            }
          }
        }),
        prisma.employee.count({ where })
      ]);

      const employeesWithSalary = employees.map((emp) => ({
        ...emp,
        currentSalary: emp.salaryRecords[0] || null
      }));

      res.json({
        data: employeesWithSalary,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });

  // GET /employees/:id - Get single employee
  app.get('/employees/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
          country: { select: { id: true, name: true, currencyCode: true } },
          department: { select: { id: true, name: true } },
          jobLevel: { select: { id: true, code: true, name: true, rank: true } },
          manager: true,
          salaryRecords: {
            orderBy: { effectiveDate: 'desc' },
            take: 1,
            select: {
              amount: true,
              currency: true,
              amountUsd: true,
              effectiveDate: true,
              reason: true
            }
          }
        }
      });

      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      res.json({
        ...employee,
        currentSalary: employee.salaryRecords[0] || null
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch employee' });
    }
  });

  // POST /employees - Create new employee
  app.post('/employees', async (req: Request, res: Response) => {
    try {
      const parsed = CreateEmployeeSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
        return;
      }

      const { data } = parsed;

      // Check if email already exists
      const existing = await prisma.employee.findUnique({
        where: { email: data.email }
      });

      if (existing) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }

      const employee = await prisma.employee.create({
        data: {
          employeeCode: data.employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          countryId: data.countryId,
          departmentId: data.departmentId,
          jobLevelId: data.jobLevelId,
          title: data.title || null,
          managerId: data.managerId || null,
          hireDate: new Date(data.hireDate),
          status: data.status || 'ACTIVE'
        },
        include: {
          country: { select: { id: true, name: true, currencyCode: true } },
          department: { select: { id: true, name: true } },
          jobLevel: { select: { id: true, code: true, name: true, rank: true } },
          manager: true
        }
      });

      res.status(201).json(employee);
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  });

  // PATCH /employees/:id - Update employee
  app.patch('/employees/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = UpdateEmployeeSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
        return;
      }

      const { data } = parsed;

      // Check if employee exists
      const existing = await prisma.employee.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      // Check if email is being changed and conflicts
      if (data.email && data.email !== existing.email) {
        const emailExists = await prisma.employee.findUnique({
          where: { email: data.email }
        });
        if (emailExists) {
          res.status(409).json({ error: 'Email already in use' });
          return;
        }
      }

      const updateData: Record<string, any> = {};
      if (data.employeeCode !== undefined) updateData.employeeCode = data.employeeCode;
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.countryId !== undefined) updateData.countryId = data.countryId;
      if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
      if (data.jobLevelId !== undefined) updateData.jobLevelId = data.jobLevelId;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.managerId !== undefined) updateData.managerId = data.managerId;
      if (data.hireDate !== undefined) updateData.hireDate = new Date(data.hireDate);
      if (data.status !== undefined) updateData.status = data.status;

      const employee = await prisma.employee.update({
        where: { id },
        data: updateData,
        include: {
          country: { select: { id: true, name: true, currencyCode: true } },
          department: { select: { id: true, name: true } },
          jobLevel: { select: { id: true, code: true, name: true, rank: true } },
          manager: true,
          salaryRecords: {
            orderBy: { effectiveDate: 'desc' },
            take: 1,
            select: {
              amount: true,
              currency: true,
              amountUsd: true,
              effectiveDate: true,
              reason: true
            }
          }
        }
      });

      res.json({
        ...employee,
        currentSalary: employee.salaryRecords[0] || null
      });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });

  // DELETE /employees/:id - Soft delete employee
  app.delete('/employees/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await prisma.employee.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const employee = await prisma.employee.update({
        where: { id },
        data: { status: 'TERMINATED' },
        include: {
          country: { select: { id: true, name: true, currencyCode: true } },
          department: { select: { id: true, name: true } },
          manager: true
        }
      });

      res.json(employee);
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  });

  // === Salary History Endpoints ===

  // GET /employees/:id/salary-history - Get all salary records for an employee
  app.get('/employees/:id/salary-history', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
          country: { select: { id: true, name: true, currencyCode: true } },
          department: { select: { id: true, name: true } },
          manager: true
        }
      });

      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const records = await prisma.salaryRecord.findMany({
        where: { employeeId: id },
        orderBy: { effectiveDate: 'desc' }
      });

      res.json({
        employee,
        records
      });
    } catch (error) {
      console.error('Salary history error:', error);
      res.status(500).json({ error: 'Failed to fetch salary history' });
    }
  });

  // GET /salary-records - List all salary records with filters
  app.get('/salary-records', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;
      const employeeId = req.query.employeeId as string | undefined;
      const reason = req.query.reason as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;

      const where: any = {};

      if (employeeId) {
        where.employeeId = employeeId;
      }

      if (reason) {
        where.reason = reason;
      }

      if (dateFrom || dateTo) {
        where.effectiveDate = {};
        if (dateFrom) where.effectiveDate.gte = new Date(dateFrom);
        if (dateTo) where.effectiveDate.lte = new Date(dateTo);
      }

      const [records, total] = await Promise.all([
        prisma.salaryRecord.findMany({
          where,
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobLevel: true,
                country: { select: { id: true, name: true, currencyCode: true } },
                department: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { effectiveDate: 'desc' },
          skip,
          take: limit
        }),
        prisma.salaryRecord.count({ where })
      ]);

      res.json({
        data: records,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('Salary records error:', error);
      res.status(500).json({ error: 'Failed to fetch salary records' });
    }
  });

  // === Department Management Endpoints ===

  // GET /departments - List all departments with statistics
  app.get('/departments', async (_req: Request, res: Response) => {
    try {
      const departments = await prisma.department.findMany({
        include: {
          employees: {
            select: { id: true, jobLevel: true, salaryRecords: { take: 1, orderBy: { effectiveDate: 'desc' } } }
          }
        },
        orderBy: { name: 'asc' }
      });

      const departmentsWithStats = departments.map((dept) => ({
        ...dept,
        employeeCount: dept.employees.length,
        averageSalaryUsd:
          dept.employees.length > 0
            ? dept.employees.reduce((sum, emp) => {
                const salary = emp.salaryRecords[0]?.amountUsd || 0;
                return sum + Number(salary);
              }, 0) / dept.employees.length
            : null,
        managers: []
      }));

      res.json(departmentsWithStats);
    } catch (error) {
      console.error('Departments error:', error);
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  });

  // GET /departments/:id - Get single department with team details
  app.get('/departments/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          employees: {
            include: {
              country: { select: { id: true, name: true, currencyCode: true } },
              manager: true,
              salaryRecords: {
                orderBy: { effectiveDate: 'desc' },
                take: 1,
                select: {
                  amount: true,
                  currency: true,
                  amountUsd: true,
                  effectiveDate: true,
                  reason: true
                }
              }
            },
            orderBy: { firstName: 'asc' }
          }
        }
      });

      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const employeesWithSalary = department.employees.map((emp) => ({
        ...emp,
        currentSalary: emp.salaryRecords[0] || null
      }));

      const stats = {
        id: department.id,
        name: department.name,
        employeeCount: employeesWithSalary.length,
        averageSalaryUsd:
          employeesWithSalary.length > 0
            ? employeesWithSalary.reduce((sum, emp) => sum + Number(emp.currentSalary?.amountUsd || 0), 0) /
              employeesWithSalary.length
            : null,
        employees: employeesWithSalary
      };

      res.json(stats);
    } catch (error) {
      console.error('Department details error:', error);
      res.status(500).json({ error: 'Failed to fetch department' });
    }
  });

  // POST /departments - Create new department
  app.post('/departments', async (req: Request, res: Response) => {
    try {
      const parsed = CreateDepartmentSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
        return;
      }

      const { data } = parsed;

      // Check if department already exists
      const existing = await prisma.department.findUnique({
        where: { name: data.name }
      });

      if (existing) {
        res.status(409).json({ error: 'Department already exists' });
        return;
      }

      const department = await prisma.department.create({
        data: { name: data.name }
      });

      res.status(201).json(department);
    } catch (error) {
      console.error('Create department error:', error);
      res.status(500).json({ error: 'Failed to create department' });
    }
  });

  // PATCH /departments/:id - Update department
  app.patch('/departments/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = UpdateDepartmentSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
        return;
      }

      const { data } = parsed;

      // Check if department exists
      const existing = await prisma.department.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      // Check if new name conflicts with another department
      if (data.name && data.name !== existing.name) {
        const conflict = await prisma.department.findUnique({
          where: { name: data.name }
        });
        if (conflict) {
          res.status(409).json({ error: 'Department name already in use' });
          return;
        }
      }

      const department = await prisma.department.update({
        where: { id },
        data
      });

      res.json(department);
    } catch (error) {
      console.error('Update department error:', error);
      res.status(500).json({ error: 'Failed to update department' });
    }
  });

  // DELETE /departments/:id - Delete department (only if no employees)
  app.delete('/departments/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await prisma.department.findUnique({
        where: { id },
        include: { _count: { select: { employees: true } } }
      });

      if (!existing) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      if (existing._count.employees > 0) {
        res.status(409).json({ error: 'Cannot delete department with active employees' });
        return;
      }

      const department = await prisma.department.delete({
        where: { id }
      });

      res.json(department);
    } catch (error) {
      console.error('Delete department error:', error);
      res.status(500).json({ error: 'Failed to delete department' });
    }
  });

  // === Salary Analytics Endpoints ===

  // Helper function to calculate percentile
  function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  // Helper function to calculate standard deviation
  function stdDev(arr: number[]): number {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  // GET /salary-analytics/summary - Overall salary statistics
  app.get('/salary-analytics/summary', async (_req: Request, res: Response) => {
    try {
      const records = await prisma.salaryRecord.findMany({
        where: { reason: 'HIRE' }, // Only latest HIRE records
        select: { amountUsd: true, employee: { select: { id: true } } }
      });

      const salaries = records.map((r) => Number(r.amountUsd));
      const stats = {
        count: salaries.length,
        min: Math.min(...salaries),
        max: Math.max(...salaries),
        avg: salaries.reduce((a, b) => a + b, 0) / salaries.length,
        median: percentile(salaries, 50),
        p25: percentile(salaries, 25),
        p75: percentile(salaries, 75),
        stdDev: stdDev(salaries)
      };

      const employees = await prisma.employee.findMany({
        select: { countryId: true, departmentId: true }
      });

      const departments = new Set(employees.map((e) => e.departmentId)).size;
      const countries = new Set(employees.map((e) => e.countryId)).size;

      res.json({
        totalEmployees: salaries.length,
        averageSalaryUsd: stats.avg,
        medianSalaryUsd: stats.median,
        minSalaryUsd: stats.min,
        maxSalaryUsd: stats.max,
        totalPayrollUsd: salaries.reduce((a, b) => a + b, 0),
        departmentCount: departments,
        countryCount: countries,
        statistics: stats
      });
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  // GET /salary-analytics/by-department - Breakdown by department
  app.get('/salary-analytics/by-department', async (_req: Request, res: Response) => {
    try {
      const departments = await prisma.department.findMany({
        include: {
          employees: {
            include: {
              salaryRecords: {
                where: { reason: 'HIRE' },
                orderBy: { effectiveDate: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      const analytics = departments.map((dept) => {
        const employeesWithSalaries = dept.employees.filter((emp) => emp.salaryRecords.length > 0);
        const salaries = employeesWithSalaries
          .map((emp) => Number(emp.salaryRecords[0]!.amountUsd))
          .filter((s) => s > 0);

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          employeeCount: employeesWithSalaries.length,
          averageSalaryUsd: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0,
          medianSalaryUsd: salaries.length > 0 ? percentile(salaries, 50) : 0,
          minSalaryUsd: salaries.length > 0 ? Math.min(...salaries) : 0,
          maxSalaryUsd: salaries.length > 0 ? Math.max(...salaries) : 0,
          totalPayrollUsd: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) : 0
        };
      });

      res.json(analytics.sort((a, b) => a.departmentName.localeCompare(b.departmentName)));
    } catch (error) {
      console.error('Department analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch department analytics' });
    }
  });

  // GET /salary-analytics/by-country - Breakdown by country
  app.get('/salary-analytics/by-country', async (_req: Request, res: Response) => {
    try {
      const countries = await prisma.country.findMany({
        include: {
          employees: {
            include: {
              salaryRecords: {
                where: { reason: 'HIRE' },
                orderBy: { effectiveDate: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      const analytics = countries.map((country) => {
        const employeesWithSalaries = country.employees.filter((emp) => emp.salaryRecords.length > 0);
        const salaries = employeesWithSalaries
          .map((emp) => Number(emp.salaryRecords[0]!.amountUsd))
          .filter((s) => s > 0);

        return {
          countryId: country.id,
          countryName: country.name,
          currencyCode: country.currencyCode,
          employeeCount: employeesWithSalaries.length,
          averageSalaryUsd: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0,
          medianSalaryUsd: salaries.length > 0 ? percentile(salaries, 50) : 0,
          minSalaryUsd: salaries.length > 0 ? Math.min(...salaries) : 0,
          maxSalaryUsd: salaries.length > 0 ? Math.max(...salaries) : 0,
          totalPayrollUsd: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) : 0
        };
      });

      res.json(analytics.sort((a, b) => a.countryName.localeCompare(b.countryName)));
    } catch (error) {
      console.error('Country analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch country analytics' });
    }
  });

  // GET /salary-analytics/by-level - Breakdown by job level
  app.get('/salary-analytics/by-level', async (_req: Request, res: Response) => {
    try {
      // Fetch all job levels ordered by rank
      const jobLevels = await prisma.jobLevel.findMany({ orderBy: { rank: 'asc' } });

      const analytics = await Promise.all(
        jobLevels.map(async (jl) => {
          const employees = await prisma.employee.findMany({
            where: { jobLevelId: jl.id },
            include: {
              salaryRecords: {
                where: { reason: 'HIRE' },
                orderBy: { effectiveDate: 'desc' },
                take: 1
              }
            }
          });

          const employeesWithSalaries = employees.filter((emp) => emp.salaryRecords.length > 0);
          const salaries = employeesWithSalaries
            .map((emp) => Number(emp.salaryRecords[0]!.amountUsd))
            .filter((s) => s > 0);

          return {
            jobLevel: jl.code,
            jobLevelName: jl.name,
            rank: jl.rank,
            employeeCount: employeesWithSalaries.length,
            averageSalaryUsd: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0,
            medianSalaryUsd: salaries.length > 0 ? percentile(salaries, 50) : 0,
            minSalaryUsd: salaries.length > 0 ? Math.min(...salaries) : 0,
            maxSalaryUsd: salaries.length > 0 ? Math.max(...salaries) : 0,
            totalPayrollUsd: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) : 0
          };
        })
      );

      res.json(analytics.filter((a) => a.employeeCount > 0));
    } catch (error) {
      console.error('Level analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch level analytics' });
    }
  });

  // GET /salary-analytics/outliers - Detect salary outliers
  app.get('/salary-analytics/outliers', async (req: Request, res: Response) => {
    try {
      const deviationThreshold = parseFloat(req.query.threshold as string) || 2; // Standard deviations

      // Get all salaries by level
      const employees = await prisma.employee.findMany({
        include: {
          jobLevel: { select: { code: true } },
          department: { select: { name: true } },
          salaryRecords: {
            where: { reason: 'HIRE' },
            orderBy: { effectiveDate: 'desc' },
            take: 1
          }
        }
      });

      // Calculate stats per level code
      const salariesByLevel: Record<string, number[]> = {};
      const statsByLevel: Record<string, { avg: number; stdDev: number }> = {};

      employees.forEach((emp) => {
        const code = emp.jobLevel.code;
        if (!salariesByLevel[code]) salariesByLevel[code] = [];
        const salary = emp.salaryRecords[0]?.amountUsd
          ? Number(emp.salaryRecords[0].amountUsd)
          : 0;
        if (salary > 0) salariesByLevel[code].push(salary);
      });

      Object.entries(salariesByLevel).forEach(([level, salaries]) => {
        const avg = salaries.reduce((a, b) => a + b, 0) / salaries.length;
        const std = stdDev(salaries);
        statsByLevel[level] = { avg, stdDev: std };
      });

      // Find outliers
      const outliers = employees
        .map((emp) => {
          const salary = emp.salaryRecords[0]?.amountUsd
            ? Number(emp.salaryRecords[0].amountUsd)
            : 0;
          if (salary === 0) return null;

          const levelCode = emp.jobLevel.code;
          const stats = statsByLevel[levelCode];
          if (!stats) return null;

          const deviation = Math.abs(salary - stats.avg) / stats.stdDev;
          const deviationPercent = ((salary - stats.avg) / stats.avg) * 100;

          if (deviation > deviationThreshold) {
            return {
              employeeId: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              email: emp.email,
              jobLevel: levelCode,
              departmentName: emp.department.name,
              currentSalaryUsd: salary,
              expectedRangeMin: stats.avg - deviationThreshold * stats.stdDev,
              expectedRangeMax: stats.avg + deviationThreshold * stats.stdDev,
              deviation: deviation,
              deviationPercent: deviationPercent
            };
          }
          return null;
        })
        .filter((o) => o !== null)
        .sort((a, b) => (b?.deviation || 0) - (a?.deviation || 0));

      res.json({
        threshold: deviationThreshold,
        outlierCount: outliers.length,
        outliers
      });
    } catch (error) {
      console.error('Outliers error:', error);
      res.status(500).json({ error: 'Failed to fetch outliers' });
    }
  });

  return app;
}
