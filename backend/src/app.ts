import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateEmployeeSchema, UpdateEmployeeSchema, CreateDepartmentSchema, UpdateDepartmentSchema } from './schemas.js';

const prisma = new PrismaClient();

export function createApp() {
  const app = express();

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // === Employee CRUD Endpoints ===

  // GET /employees - List all employees with pagination
  app.get('/employees', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          skip,
          take: limit,
          include: {
            country: { select: { id: true, name: true, currencyCode: true } },
            department: { select: { id: true, name: true } },
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
        prisma.employee.count()
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
          jobLevel: data.jobLevel,
          managerId: data.managerId || null,
          hireDate: new Date(data.hireDate),
          status: data.status || 'ACTIVE'
        },
        include: {
          country: { select: { id: true, name: true, currencyCode: true } },
          department: { select: { id: true, name: true } },
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
      if (data.jobLevel !== undefined) updateData.jobLevel = data.jobLevel;
      if (data.managerId !== undefined) updateData.managerId = data.managerId;
      if (data.hireDate !== undefined) updateData.hireDate = new Date(data.hireDate);
      if (data.status !== undefined) updateData.status = data.status;

      const employee = await prisma.employee.update({
        where: { id },
        data: updateData,
        include: {
          country: { select: { id: true, name: true, currencyCode: true } },
          department: { select: { id: true, name: true } },
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
  app.get('/departments', async (req: Request, res: Response) => {
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
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
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

  return app;
}
