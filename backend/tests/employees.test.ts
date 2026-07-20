import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getAuthToken } from './helpers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = createApp();

let authToken: string;

let testCountryId: string;
let testDepartmentId: string;
let testManagerId: string;
let testJobLevelId: string;
let testEmployeeId: string;

describe('Employee CRUD API', () => {
  beforeAll(async () => {
    const country = await prisma.country.findFirst({ select: { id: true } });
    const department = await prisma.department.findFirst({ select: { id: true } });
    const manager = await prisma.employee.findFirst({
      where: { managerId: null },
      select: { id: true },
    });
    const jobLevel = await prisma.jobLevel.findFirst({
      where: { code: 'L3' },
      select: { id: true },
    });

    if (!country || !department || !manager || !jobLevel) {
      throw new Error('Test data not found. Please run seed first.');
    }

    testCountryId = country.id;
    testDepartmentId = department.id;
    testManagerId = manager.id;
    testJobLevelId = jobLevel.id;
  });

  beforeAll(async () => {
    authToken = await getAuthToken(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /employees', () => {
    it('should create a new employee with valid data', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeCode: `TEST${timestamp}`,
          firstName: 'John',
          lastName: 'Doe',
          email: `test-${timestamp}@example.com`,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevelId: testJobLevelId,
          managerId: testManagerId,
          hireDate: new Date().toISOString(),
          status: 'ACTIVE',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe('John');
      expect(response.body.lastName).toBe('Doe');
      testEmployeeId = response.body.id;
    });

    it('should return 400 for invalid email', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeCode: `INVALID${timestamp}`,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'invalid-email',
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevelId: testJobLevelId,
          hireDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate email', async () => {
      const timestamp = Date.now();
      const email = `duplicate-${timestamp}@example.com`;

      // Create first employee
      await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeCode: `DUP1${timestamp}`,
          firstName: 'First',
          lastName: 'User',
          email,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevelId: testJobLevelId,
          hireDate: new Date().toISOString(),
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeCode: `DUP2${timestamp}`,
          firstName: 'Second',
          lastName: 'User',
          email,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevelId: testJobLevelId,
          hireDate: new Date().toISOString(),
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Email already in use');
    });

    it('should use default status ACTIVE', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeCode: `DEFAULT${timestamp}`,
          firstName: 'Default',
          lastName: 'Status',
          email: `default-${timestamp}@example.com`,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevelId: testJobLevelId,
          hireDate: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ACTIVE');
    });
  });

  describe('GET /employees', () => {
    it('should list employees with pagination', async () => {
      const response = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should return 10 employees by default', async () => {
      const response = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
    });

    it('should include jobLevel object with code, name, rank', async () => {
      const response = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      expect(response.status).toBe(200);
      const emp = response.body.data[0];
      expect(emp.jobLevel).toHaveProperty('code');
      expect(emp.jobLevel).toHaveProperty('name');
      expect(emp.jobLevel).toHaveProperty('rank');
    });

    it('should filter by title (CEO)', async () => {
      const response = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ title: 'CEO' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      response.body.data.forEach((emp: any) => {
        expect(emp.title.toLowerCase()).toBe('ceo');
      });
    });

    it('should include current salary in response', async () => {
      const response = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty('currentSalary');
    });

    it('should include country and department', async () => {
      const response = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      expect(response.status).toBe(200);
      const emp = response.body.data[0];
      expect(emp).toHaveProperty('country');
      expect(emp.country).toHaveProperty('name');
      expect(emp.country).toHaveProperty('currencyCode');
      expect(emp).toHaveProperty('department');
      expect(emp.department).toHaveProperty('name');
    });
  });

  describe('GET /employees/:id', () => {
    it('should get employee by id', async () => {
      const response = await request(app)
        .get(`/employees/${testEmployeeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testEmployeeId);
      expect(response.body.firstName).toBe('John');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .get(`/employees/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should include related data', async () => {
      const response = await request(app)
        .get(`/employees/${testEmployeeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('country');
      expect(response.body).toHaveProperty('department');
      expect(response.body).toHaveProperty('currentSalary');
    });
  });

  describe('PATCH /employees/:id', () => {
    it('should update employee details', async () => {
      const response = await request(app)
        .patch(`/employees/${testEmployeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jonathan',
          jobLevelId: testJobLevelId,
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe('Jonathan');
      expect(response.body.jobLevel).toHaveProperty('code');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .patch(`/employees/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Update' });

      expect(response.status).toBe(404);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .patch(`/employees/${testEmployeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate email on update', async () => {
      const timestamp = Date.now();
      // Create another employee
      const email1 = `update-${timestamp}@example.com`;
      const employee1 = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeCode: `UPD1${timestamp}`,
          firstName: 'Emp1',
          lastName: 'One',
          email: email1,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevelId: testJobLevelId,
          hireDate: new Date().toISOString(),
        });

      const email2 = `update2-${timestamp}@example.com`;
      const employee2 = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeCode: `UPD2${timestamp}`,
          firstName: 'Emp2',
          lastName: 'Two',
          email: email2,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevelId: testJobLevelId,
          hireDate: new Date().toISOString(),
        });

      // Try to update employee2 with employee1's email
      const response = await request(app)
        .patch(`/employees/${employee2.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: email1 });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /employees/:id', () => {
    it('should soft delete employee (set status to TERMINATED)', async () => {
      const response = await request(app)
        .delete(`/employees/${testEmployeeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('TERMINATED');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .delete(`/employees/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should keep employee in database after deletion', async () => {
      // Create an employee
      const timestamp = Date.now();
      const email = `delete-${timestamp}@example.com`;
      const createResp = await request(app)
        .post('/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeCode: `DEL${timestamp}`,
          firstName: 'Delete',
          lastName: 'Me',
          email,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevelId: testJobLevelId,
          hireDate: new Date().toISOString(),
        });

      const empId = createResp.body.id;

      // Delete it
      const deleteResp = await request(app)
        .delete(`/employees/${empId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(deleteResp.status).toBe(200);

      // Should still be retrievable but terminated
      const getResp = await request(app)
        .get(`/employees/${empId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getResp.status).toBe(200);
      expect(getResp.body.status).toBe('TERMINATED');
    });
  });
});
