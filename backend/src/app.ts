import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateEmployeeSchema, UpdateEmployeeSchema } from './schemas.js';

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

  return app;
}
