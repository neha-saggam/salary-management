import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = createApp();

let testCountryId: string;
let testDepartmentId: string;
let testManagerId: string;
let testEmployeeId: string;

describe('Employee CRUD API', () => {
  beforeAll(async () => {
    // Create test data
    const country = await prisma.country.findFirst({
      select: { id: true }
    });
    const department = await prisma.department.findFirst({
      select: { id: true }
    });
    const manager = await prisma.employee.findFirst({
      where: { managerId: null },
      select: { id: true }
    });

    if (!country || !department || !manager) {
      throw new Error('Test data not found. Please run seed first.');
    }

    testCountryId = country.id;
    testDepartmentId = department.id;
    testManagerId = manager.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /employees', () => {
    it('should create a new employee with valid data', async () => {
      const response = await request(app)
        .post('/employees')
        .send({
          employeeCode: 'TEST001',
          firstName: 'John',
          lastName: 'Doe',
          email: `test-${Date.now()}@example.com`,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevel: 'L3',
          managerId: testManagerId,
          hireDate: new Date().toISOString(),
          status: 'ACTIVE'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe('John');
      expect(response.body.lastName).toBe('Doe');
      testEmployeeId = response.body.id;
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/employees')
        .send({
          employeeCode: 'TEST002',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'invalid-email',
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevel: 'L2',
          hireDate: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      // Create first employee
      await request(app)
        .post('/employees')
        .send({
          employeeCode: 'TEST003',
          firstName: 'First',
          lastName: 'User',
          email,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevel: 'L1',
          hireDate: new Date().toISOString()
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/employees')
        .send({
          employeeCode: 'TEST004',
          firstName: 'Second',
          lastName: 'User',
          email,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevel: 'L1',
          hireDate: new Date().toISOString()
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Email already in use');
    });

    it('should use default status ACTIVE', async () => {
      const response = await request(app)
        .post('/employees')
        .send({
          employeeCode: 'TEST005',
          firstName: 'Default',
          lastName: 'Status',
          email: `default-${Date.now()}@example.com`,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevel: 'L4',
          hireDate: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ACTIVE');
    });
  });

  describe('GET /employees', () => {
    it('should list employees with pagination', async () => {
      const response = await request(app)
        .get('/employees')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should return 10 employees by default', async () => {
      const response = await request(app).get('/employees');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
    });

    it('should include current salary in response', async () => {
      const response = await request(app)
        .get('/employees')
        .query({ limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty('currentSalary');
    });

    it('should include country and department', async () => {
      const response = await request(app)
        .get('/employees')
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
      const response = await request(app).get(`/employees/${testEmployeeId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testEmployeeId);
      expect(response.body.firstName).toBe('John');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app).get(
        `/employees/00000000-0000-0000-0000-000000000000`
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should include related data', async () => {
      const response = await request(app).get(`/employees/${testEmployeeId}`);

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
        .send({
          firstName: 'Jonathan',
          jobLevel: 'L4'
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe('Jonathan');
      expect(response.body.jobLevel).toBe('L4');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .patch(`/employees/00000000-0000-0000-0000-000000000000`)
        .send({ firstName: 'Update' });

      expect(response.status).toBe(404);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .patch(`/employees/${testEmployeeId}`)
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate email on update', async () => {
      // Create another employee
      const email1 = `update-${Date.now()}@example.com`;
      const employee1 = await request(app)
        .post('/employees')
        .send({
          employeeCode: 'TEST006',
          firstName: 'Emp1',
          lastName: 'One',
          email: email1,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevel: 'L1',
          hireDate: new Date().toISOString()
        });

      const email2 = `update2-${Date.now()}@example.com`;
      const employee2 = await request(app)
        .post('/employees')
        .send({
          employeeCode: 'TEST007',
          firstName: 'Emp2',
          lastName: 'Two',
          email: email2,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevel: 'L1',
          hireDate: new Date().toISOString()
        });

      // Try to update employee2 with employee1's email
      const response = await request(app)
        .patch(`/employees/${employee2.body.id}`)
        .send({ email: email1 });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /employees/:id', () => {
    it('should soft delete employee (set status to TERMINATED)', async () => {
      const response = await request(app).delete(`/employees/${testEmployeeId}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('TERMINATED');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app).delete(
        `/employees/00000000-0000-0000-0000-000000000000`
      );

      expect(response.status).toBe(404);
    });

    it('should keep employee in database after deletion', async () => {
      // Create an employee
      const email = `delete-${Date.now()}@example.com`;
      const createResp = await request(app)
        .post('/employees')
        .send({
          employeeCode: 'TEST008',
          firstName: 'Delete',
          lastName: 'Me',
          email,
          countryId: testCountryId,
          departmentId: testDepartmentId,
          jobLevel: 'L1',
          hireDate: new Date().toISOString()
        });

      const empId = createResp.body.id;

      // Delete it
      const deleteResp = await request(app).delete(`/employees/${empId}`);
      expect(deleteResp.status).toBe(200);

      // Should still be retrievable but terminated
      const getResp = await request(app).get(`/employees/${empId}`);
      expect(getResp.status).toBe(200);
      expect(getResp.body.status).toBe('TERMINATED');
    });
  });
});
