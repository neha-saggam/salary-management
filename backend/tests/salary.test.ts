import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getAuthToken } from './helpers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = createApp();

let authToken: string;

let testEmployeeId: string;
let testEmployeeEmail: string;
let salaryRecordIds: string[] = [];

describe('Salary History API', () => {
  beforeAll(async () => {
    // Get an employee with salary history
    const employee = await prisma.employee.findFirst({
      where: { salaryRecords: { some: {} } },
      select: { id: true, email: true, salaryRecords: { take: 1 } },
    });

    if (!employee || employee.salaryRecords.length === 0) {
      throw new Error('No employee with salary history found. Please run seed first.');
    }

    testEmployeeId = employee.id;
    testEmployeeEmail = employee.email;

    // Get salary record IDs for this employee
    const records = await prisma.salaryRecord.findMany({
      where: { employeeId: testEmployeeId },
      select: { id: true },
    });
    salaryRecordIds = records.map((r) => r.id);
  });

  beforeAll(async () => {
    authToken = await getAuthToken(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /employees/:id/salary-history', () => {
    it('should get salary history for an employee', async () => {
      const response = await request(app)
        .get(`/employees/${testEmployeeId}/salary-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employee');
      expect(response.body).toHaveProperty('records');
      expect(Array.isArray(response.body.records)).toBe(true);
      expect(response.body.records.length).toBeGreaterThan(0);
    });

    it('should return employee details with country and department', async () => {
      const response = await request(app)
        .get(`/employees/${testEmployeeId}/salary-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.employee.id).toBe(testEmployeeId);
      expect(response.body.employee).toHaveProperty('country');
      expect(response.body.employee).toHaveProperty('department');
      expect(response.body.employee.country).toHaveProperty('currencyCode');
    });

    it('should order records by effectiveDate descending', async () => {
      const response = await request(app)
        .get(`/employees/${testEmployeeId}/salary-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const records = response.body.records;
      for (let i = 0; i < records.length - 1; i++) {
        const date1 = new Date(records[i].effectiveDate);
        const date2 = new Date(records[i + 1].effectiveDate);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    it('should include salary record details', async () => {
      const response = await request(app)
        .get(`/employees/${testEmployeeId}/salary-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const record = response.body.records[0];
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('amount');
      expect(record).toHaveProperty('currency');
      expect(record).toHaveProperty('amountUsd');
      expect(record).toHaveProperty('effectiveDate');
      expect(record).toHaveProperty('reason');
    });

    it('should have HIRE as first record (oldest)', async () => {
      const response = await request(app)
        .get(`/employees/${testEmployeeId}/salary-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const records = response.body.records;
      const lastRecord = records[records.length - 1];
      expect(lastRecord.reason).toBe('HIRE');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .get(`/employees/00000000-0000-0000-0000-000000000000/salary-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /salary-records', () => {
    it('should list all salary records with pagination', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should include pagination metadata', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.total).toBeGreaterThan(0);
      expect(response.body.pagination.pages).toBeGreaterThan(0);
    });

    it('should include employee details in records', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      expect(response.status).toBe(200);
      const record = response.body.data[0];
      expect(record).toHaveProperty('employee');
      expect(record.employee).toHaveProperty('firstName');
      expect(record.employee).toHaveProperty('lastName');
      expect(record.employee).toHaveProperty('email');
      expect(record.employee).toHaveProperty('country');
      expect(record.employee).toHaveProperty('department');
    });

    it('should filter by employeeId', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ employeeId: testEmployeeId });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every((r: any) => r.employeeId === testEmployeeId)).toBe(true);
    });

    it('should filter by reason (HIRE)', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ reason: 'HIRE', limit: 100 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every((r: any) => r.reason === 'HIRE')).toBe(true);
    });

    it('should filter by reason (PROMOTION)', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ reason: 'PROMOTION', limit: 100 });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        expect(response.body.data.every((r: any) => r.reason === 'PROMOTION')).toBe(true);
      }
    });

    it('should filter by reason (ANNUAL_RAISE)', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ reason: 'ANNUAL_RAISE', limit: 100 });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        expect(response.body.data.every((r: any) => r.reason === 'ANNUAL_RAISE')).toBe(true);
      }
    });

    it('should filter by employeeId and reason combined', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ employeeId: testEmployeeId, reason: 'HIRE' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.data.every((r: any) => r.employeeId === testEmployeeId && r.reason === 'HIRE')
      ).toBe(true);
    });

    it('should filter by dateFrom', async () => {
      // Get records from the last year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ dateFrom: oneYearAgo.toISOString(), limit: 100 });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((r: any) => {
          const recordDate = new Date(r.effectiveDate);
          expect(recordDate.getTime()).toBeGreaterThanOrEqual(oneYearAgo.getTime());
        });
      }
    });

    it('should filter by dateTo', async () => {
      // Get records until today
      const today = new Date();

      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ dateTo: today.toISOString(), limit: 100 });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((r: any) => {
          const recordDate = new Date(r.effectiveDate);
          expect(recordDate.getTime()).toBeLessThanOrEqual(today.getTime());
        });
      }
    });

    it('should filter by dateFrom and dateTo range', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const today = new Date();

      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: twoYearsAgo.toISOString(),
          dateTo: today.toISOString(),
          limit: 100,
        });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((r: any) => {
          const recordDate = new Date(r.effectiveDate);
          expect(recordDate.getTime()).toBeGreaterThanOrEqual(twoYearsAgo.getTime());
          expect(recordDate.getTime()).toBeLessThanOrEqual(today.getTime());
        });
      }
    });

    it('should order by effectiveDate descending', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 20 });

      expect(response.status).toBe(200);
      const records = response.body.data;
      if (records.length > 1) {
        for (let i = 0; i < records.length - 1; i++) {
          const date1 = new Date(records[i].effectiveDate);
          const date2 = new Date(records[i + 1].effectiveDate);
          expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
        }
      }
    });

    it('should handle pagination correctly', async () => {
      const page1 = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 5 });

      const page2 = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 2, limit: 5 });

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      // Records should be different
      if (page1.body.pagination.total > 5) {
        expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
      }
    });
  });

  describe('Salary Record Validation', () => {
    it('should have valid salary amounts', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ employeeId: testEmployeeId });

      expect(response.status).toBe(200);
      response.body.data.forEach((record: any) => {
        expect(Number(record.amount)).toBeGreaterThan(0);
        expect(Number(record.amountUsd)).toBeGreaterThan(0);
        expect(record.currency).toMatch(/^[A-Z]{3}$/);
      });
    });

    it('should have valid reason enums', async () => {
      const validReasons = ['HIRE', 'ANNUAL_RAISE', 'PROMOTION', 'ADJUSTMENT', 'MARKET_CORRECTION'];

      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 100 });

      expect(response.status).toBe(200);
      response.body.data.forEach((record: any) => {
        expect(validReasons).toContain(record.reason);
      });
    });

    it('should have consistent USD conversion', async () => {
      const response = await request(app)
        .get('/salary-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ employeeId: testEmployeeId });

      expect(response.status).toBe(200);
      // All records should have amountUsd calculated
      response.body.data.forEach((record: any) => {
        expect(Number(record.amountUsd)).toBeGreaterThan(0);
        // USD conversion should be reasonable (not 0 or null)
        expect(Number.isNaN(Number(record.amountUsd))).toBe(false);
      });
    });
  });
});
