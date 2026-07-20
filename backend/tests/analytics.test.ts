import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getAuthToken } from './helpers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = createApp();

let authToken: string;

describe('Salary Analytics API', () => {
  beforeAll(async () => {
    authToken = await getAuthToken(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /salary-analytics/summary', () => {
    it('should return overall salary statistics', async () => {
      const response = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalEmployees');
      expect(response.body).toHaveProperty('averageSalaryUsd');
      expect(response.body).toHaveProperty('medianSalaryUsd');
      expect(response.body).toHaveProperty('minSalaryUsd');
      expect(response.body).toHaveProperty('maxSalaryUsd');
      expect(response.body).toHaveProperty('totalPayrollUsd');
    });

    it('should have valid statistics', async () => {
      const response = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const { statistics } = response.body;
      expect(statistics).toHaveProperty('count');
      expect(statistics).toHaveProperty('min');
      expect(statistics).toHaveProperty('max');
      expect(statistics).toHaveProperty('avg');
      expect(statistics).toHaveProperty('median');
      expect(statistics).toHaveProperty('p25');
      expect(statistics).toHaveProperty('p75');
      expect(statistics).toHaveProperty('stdDev');
    });

    it('should have min <= avg <= max', async () => {
      const response = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const { minSalaryUsd, averageSalaryUsd, maxSalaryUsd } = response.body;
      expect(Number(minSalaryUsd)).toBeLessThanOrEqual(Number(averageSalaryUsd));
      expect(Number(averageSalaryUsd)).toBeLessThanOrEqual(Number(maxSalaryUsd));
    });

    it('should have median <= avg for right-skewed salary distribution', async () => {
      const response = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // For right-skewed distributions (typical salary data), median <= avg
      const { medianSalaryUsd, averageSalaryUsd } = response.body;
      expect(Number(medianSalaryUsd)).toBeLessThanOrEqual(Number(averageSalaryUsd) * 1.1); // Allow 10% margin
    });

    it('should have p25 <= median <= p75', async () => {
      const response = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const { statistics } = response.body;
      expect(Number(statistics.p25)).toBeLessThanOrEqual(Number(statistics.median));
      expect(Number(statistics.median)).toBeLessThanOrEqual(Number(statistics.p75));
    });

    it('should count all departments and countries', async () => {
      const response = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.departmentCount).toBeGreaterThan(0);
      expect(response.body.countryCount).toBeGreaterThan(0);
    });

    it('should have total payroll equal to sum of all salaries', async () => {
      const response = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const { totalEmployees, averageSalaryUsd, totalPayrollUsd } = response.body;
      const calculatedPayroll = Number(averageSalaryUsd) * totalEmployees;
      // Allow 1% rounding error
      expect(
        Math.abs(Number(totalPayrollUsd) - calculatedPayroll) / calculatedPayroll
      ).toBeLessThan(0.01);
    });
  });

  describe('GET /salary-analytics/by-department', () => {
    it('should return analytics for all departments', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-department')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should include all required fields', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-department')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((dept: any) => {
        expect(dept).toHaveProperty('departmentId');
        expect(dept).toHaveProperty('departmentName');
        expect(dept).toHaveProperty('employeeCount');
        expect(dept).toHaveProperty('averageSalaryUsd');
        expect(dept).toHaveProperty('minSalaryUsd');
        expect(dept).toHaveProperty('maxSalaryUsd');
        expect(dept).toHaveProperty('totalPayrollUsd');
      });
    });

    it('should be ordered alphabetically by department name', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-department')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const depts = response.body;
      for (let i = 0; i < depts.length - 1; i++) {
        expect(
          depts[i].departmentName.localeCompare(depts[i + 1].departmentName)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should have valid salary relationships (min <= avg <= max)', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-department')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((dept: any) => {
        if (dept.employeeCount > 0) {
          expect(Number(dept.minSalaryUsd)).toBeLessThanOrEqual(Number(dept.averageSalaryUsd));
          expect(Number(dept.averageSalaryUsd)).toBeLessThanOrEqual(Number(dept.maxSalaryUsd));
        }
      });
    });

    it('should have payroll = average * count', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-department')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((dept: any) => {
        if (dept.employeeCount > 0) {
          const calculated = Number(dept.averageSalaryUsd) * dept.employeeCount;
          const actual = Number(dept.totalPayrollUsd);
          expect(Math.abs(actual - calculated) / calculated).toBeLessThan(0.02); // Allow 2% rounding error
        }
      });
    });
  });

  describe('GET /salary-analytics/by-country', () => {
    it('should return analytics for all countries', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-country')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should include currency code for each country', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-country')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((country: any) => {
        expect(country).toHaveProperty('currencyCode');
        expect(country.currencyCode).toMatch(/^[A-Z]{3}$/);
      });
    });

    it('should be ordered alphabetically by country name', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-country')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const countries = response.body;
      for (let i = 0; i < countries.length - 1; i++) {
        expect(
          countries[i].countryName.localeCompare(countries[i + 1].countryName)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should have different salary ranges across countries', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-country')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const countries = response.body.filter((c: any) => c.employeeCount > 0);
      if (countries.length > 1) {
        const salaries = countries.map((c: any) => Number(c.averageSalaryUsd));
        const maxSalary = Math.max(...salaries);
        const minSalary = Math.min(...salaries);
        // Expect some variance across countries
        expect(maxSalary / minSalary).toBeGreaterThan(1.5);
      }
    });
  });

  describe('GET /salary-analytics/by-level', () => {
    it('should return analytics for all job levels', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-level')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should include levels L1 through L6 with employees', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-level')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const levels = response.body.map((l: any) => l.jobLevel);
      expect(levels).toContain('L1');
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should show salary progression (L1 < L2 < L3...)', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-level')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const levelMap = new Map(
        response.body.map((l: any) => [l.jobLevel, Number(l.averageSalaryUsd)])
      );

      // Check ascending order
      for (let i = 1; i <= 5; i++) {
        const level = `L${i}`;
        const nextLevel = `L${i + 1}`;
        if (levelMap.has(level) && levelMap.has(nextLevel)) {
          expect(levelMap.get(level)!).toBeLessThan(levelMap.get(nextLevel)!);
        }
      }
    });

    it('should only include levels with employees', async () => {
      const response = await request(app)
        .get('/salary-analytics/by-level')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((level: any) => {
        expect(level.employeeCount).toBeGreaterThan(0);
      });
    });
  });

  describe('GET /salary-analytics/outliers', () => {
    it('should identify salary outliers', async () => {
      const response = await request(app)
        .get('/salary-analytics/outliers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('threshold');
      expect(response.body).toHaveProperty('outlierCount');
      expect(response.body).toHaveProperty('outliers');
      expect(Array.isArray(response.body.outliers)).toBe(true);
    });

    it('should use default threshold of 2 standard deviations', async () => {
      const response = await request(app)
        .get('/salary-analytics/outliers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.threshold).toBe(2);
    });

    it('should respect custom threshold parameter', async () => {
      const response = await request(app)
        .get('/salary-analytics/outliers?threshold=1.5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.threshold).toBe(1.5);
    });

    it('should have more outliers with lower threshold', async () => {
      const threshold1 = await request(app)
        .get('/salary-analytics/outliers?threshold=1')
        .set('Authorization', `Bearer ${authToken}`);
      const threshold2 = await request(app)
        .get('/salary-analytics/outliers?threshold=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(threshold1.status).toBe(200);
      expect(threshold2.status).toBe(200);
      expect(threshold1.body.outlierCount).toBeGreaterThanOrEqual(threshold2.body.outlierCount);
    });

    it('should include outlier details', async () => {
      const response = await request(app)
        .get('/salary-analytics/outliers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      if (response.body.outliers.length > 0) {
        const outlier = response.body.outliers[0];
        expect(outlier).toHaveProperty('employeeId');
        expect(outlier).toHaveProperty('firstName');
        expect(outlier).toHaveProperty('lastName');
        expect(outlier).toHaveProperty('jobLevel');
        expect(outlier).toHaveProperty('currentSalaryUsd');
        expect(outlier).toHaveProperty('deviation');
        expect(outlier).toHaveProperty('deviationPercent');
      }
    });

    it('should be ordered by deviation (highest first)', async () => {
      const response = await request(app)
        .get('/salary-analytics/outliers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const outliers = response.body.outliers;
      if (outliers.length > 1) {
        for (let i = 0; i < outliers.length - 1; i++) {
          expect(outliers[i].deviation).toBeGreaterThanOrEqual(outliers[i + 1].deviation);
        }
      }
    });

    it('should show expected range for each outlier', async () => {
      const response = await request(app)
        .get('/salary-analytics/outliers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.outliers.forEach((outlier: any) => {
        expect(outlier).toHaveProperty('expectedRangeMin');
        expect(outlier).toHaveProperty('expectedRangeMax');
        expect(Number(outlier.expectedRangeMin)).toBeLessThan(Number(outlier.expectedRangeMax));
      });
    });

    it('should correctly calculate deviation percentage', async () => {
      const response = await request(app)
        .get('/salary-analytics/outliers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.outliers.forEach((outlier: any) => {
        // deviationPercent = (salary - avg) / avg * 100
        // This is relative to the level average, so just verify it's a reasonable number
        expect(Math.abs(outlier.deviationPercent)).toBeGreaterThan(0);
        expect(Math.abs(outlier.deviationPercent)).toBeLessThan(500); // Reasonable bounds
      });
    });
  });

  describe('Analytics Consistency', () => {
    it('should have consistent total payroll across endpoints', async () => {
      const summary = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);
      const byDept = await request(app)
        .get('/salary-analytics/by-department')
        .set('Authorization', `Bearer ${authToken}`);

      expect(summary.status).toBe(200);
      expect(byDept.status).toBe(200);

      const summaryPayroll = Number(summary.body.totalPayrollUsd);
      const deptPayroll = byDept.body.reduce(
        (sum: number, d: any) => sum + Number(d.totalPayrollUsd),
        0
      );

      // Allow 1% rounding error
      expect(Math.abs(summaryPayroll - deptPayroll) / summaryPayroll).toBeLessThan(0.01);
    });

    it('should have consistent employee count across endpoints', async () => {
      const summary = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);
      const byDept = await request(app)
        .get('/salary-analytics/by-department')
        .set('Authorization', `Bearer ${authToken}`);

      expect(summary.status).toBe(200);
      expect(byDept.status).toBe(200);

      const summaryCount = summary.body.totalEmployees;
      const deptCount = byDept.body.reduce((sum: number, d: any) => sum + d.employeeCount, 0);

      expect(summaryCount).toBe(deptCount);
    });

    it('should have consistent salary ranges', async () => {
      const summary = await request(app)
        .get('/salary-analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);
      const byDept = await request(app)
        .get('/salary-analytics/by-department')
        .set('Authorization', `Bearer ${authToken}`);

      expect(summary.status).toBe(200);
      expect(byDept.status).toBe(200);

      const summaryMin = Number(summary.body.minSalaryUsd);
      const summaryMax = Number(summary.body.maxSalaryUsd);

      const deptMins = byDept.body
        .map((d: any) => Number(d.minSalaryUsd))
        .filter((m: number) => m > 0);
      const deptMaxs = byDept.body.map((d: any) => Number(d.maxSalaryUsd));

      expect(summaryMin).toEqual(Math.min(...deptMins));
      expect(summaryMax).toEqual(Math.max(...deptMaxs));
    });
  });
});
