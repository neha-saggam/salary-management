import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getAuthToken } from './helpers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = createApp();

let authToken: string;

let testDepartmentId: string;
let testDepartmentName: string;

describe('Department Management API', () => {
  beforeAll(async () => {
    authToken = await getAuthToken(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /departments', () => {
    it('should list all departments with statistics', async () => {
      const response = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should include employee count for each department', async () => {
      const response = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((dept: any) => {
        expect(dept).toHaveProperty('employeeCount');
        expect(typeof dept.employeeCount).toBe('number');
        expect(dept.employeeCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include average salary USD', async () => {
      const response = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((dept: any) => {
        expect(dept).toHaveProperty('averageSalaryUsd');
        if (dept.employeeCount > 0) {
          expect(dept.averageSalaryUsd).not.toBeNull();
          expect(Number(dept.averageSalaryUsd)).toBeGreaterThan(0);
        }
      });
    });

    it('should be ordered alphabetically by name', async () => {
      const response = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const departments = response.body;
      for (let i = 0; i < departments.length - 1; i++) {
        expect(departments[i].name.localeCompare(departments[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('GET /departments/:id', () => {
    beforeAll(async () => {
      // Get first existing department
      const dept = await prisma.department.findFirst();
      if (dept) {
        testDepartmentId = dept.id;
        testDepartmentName = dept.name;
      }
    });

    it('should get department by id with team details', async () => {
      if (!testDepartmentId) {
        throw new Error('No test department found');
      }

      const response = await request(app)
        .get(`/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testDepartmentId);
      expect(response.body.name).toBe(testDepartmentName);
    });

    it('should include employees array', async () => {
      if (!testDepartmentId) {
        throw new Error('No test department found');
      }

      const response = await request(app)
        .get(`/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employees');
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    it('should include statistics', async () => {
      if (!testDepartmentId) {
        throw new Error('No test department found');
      }

      const response = await request(app)
        .get(`/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employeeCount');
      expect(response.body).toHaveProperty('averageSalaryUsd');
      expect(response.body.employeeCount).toBeGreaterThan(0);
    });

    it('should include current salary for each employee', async () => {
      if (!testDepartmentId) {
        throw new Error('No test department found');
      }

      const response = await request(app)
        .get(`/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      if (response.body.employees.length > 0) {
        response.body.employees.forEach((emp: any) => {
          expect(emp).toHaveProperty('currentSalary');
          if (emp.currentSalary) {
            expect(emp.currentSalary).toHaveProperty('amountUsd');
          }
        });
      }
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .get(`/departments/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should order employees by first name', async () => {
      if (!testDepartmentId) {
        throw new Error('No test department found');
      }

      const response = await request(app)
        .get(`/departments/${testDepartmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const employees = response.body.employees;
      if (employees.length > 1) {
        for (let i = 0; i < employees.length - 1; i++) {
          expect(
            employees[i].firstName.localeCompare(employees[i + 1].firstName)
          ).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('POST /departments', () => {
    it('should create a new department', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Test Department ${timestamp}`,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(`Test Department ${timestamp}`);
      testDepartmentId = response.body.id;
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate department name', async () => {
      const timestamp = Date.now();
      const name = `Duplicate Test ${timestamp}`;

      // Create first department
      await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name });

      // Try to create duplicate
      const response = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should accept department name with spaces', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Research and Development ${timestamp}`,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toContain('Research and Development');
    });
  });

  describe('PATCH /departments/:id', () => {
    let updateTestDeptId: string;

    beforeAll(async () => {
      // Create a department to update
      const resp = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Update Test ${Date.now()}` });
      updateTestDeptId = resp.body.id;
    });

    it('should update department name', async () => {
      const newName = `Updated Name ${Date.now()}`;
      const response = await request(app)
        .patch(`/departments/${updateTestDeptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: newName });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(newName);
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .patch(`/departments/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .patch(`/departments/${updateTestDeptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
    });

    it('should return 409 for duplicate name', async () => {
      // Get an existing department
      const existing = await prisma.department.findFirst({
        where: { NOT: { id: updateTestDeptId } },
      });

      if (!existing) {
        throw new Error('No existing department found for conflict test');
      }

      // Try to rename to existing department's name
      const response = await request(app)
        .patch(`/departments/${updateTestDeptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: existing.name });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already in use');
    });

    it('should allow updating to same name', async () => {
      // Get current department
      const current = await prisma.department.findUnique({ where: { id: updateTestDeptId } });
      if (!current) throw new Error('Department not found');

      // Update to same name should work
      const response = await request(app)
        .patch(`/departments/${updateTestDeptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: current.name });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(current.name);
    });
  });

  describe('DELETE /departments/:id', () => {
    it('should delete empty department', async () => {
      // Create a new department with no employees
      const createResp = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Delete Test ${Date.now()}` });

      const deptId = createResp.body.id;

      // Delete it
      const response = await request(app)
        .delete(`/departments/${deptId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(deptId);
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .delete(`/departments/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 409 when department has employees', async () => {
      // Get a department with employees
      const dept = await prisma.department.findFirst({
        include: { _count: { select: { employees: true } } },
      });

      if (!dept || dept._count.employees === 0) {
        throw new Error('No department with employees found');
      }

      // Try to delete it
      const response = await request(app)
        .delete(`/departments/${dept.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Cannot delete');
    });

    it('should not be able to delete twice', async () => {
      // Create a department
      const createResp = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Double Delete Test ${Date.now()}` });

      const deptId = createResp.body.id;

      // Delete it once
      const firstDelete = await request(app)
        .delete(`/departments/${deptId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(firstDelete.status).toBe(200);

      // Try to delete again
      const secondDelete = await request(app)
        .delete(`/departments/${deptId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(secondDelete.status).toBe(404);
    });
  });
});
