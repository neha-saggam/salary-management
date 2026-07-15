import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

interface SalaryBand {
  level: string;
  min: number;
  max: number;
}

// Salary bands per country and job level (USD annual salary)
const salaryBandsByCountry: Record<string, Record<string, SalaryBand>> = {
  US: {
    L1: { level: 'L1', min: 50000, max: 65000 },
    L2: { level: 'L2', min: 65000, max: 85000 },
    L3: { level: 'L3', min: 85000, max: 110000 },
    L4: { level: 'L4', min: 110000, max: 145000 },
    L5: { level: 'L5', min: 145000, max: 190000 },
    L6: { level: 'L6', min: 190000, max: 250000 }
  },
  India: {
    L1: { level: 'L1', min: 8000, max: 12000 },
    L2: { level: 'L2', min: 12000, max: 18000 },
    L3: { level: 'L3', min: 18000, max: 28000 },
    L4: { level: 'L4', min: 28000, max: 45000 },
    L5: { level: 'L5', min: 45000, max: 70000 },
    L6: { level: 'L6', min: 70000, max: 110000 }
  },
  UK: {
    L1: { level: 'L1', min: 40000, max: 52000 },
    L2: { level: 'L2', min: 52000, max: 68000 },
    L3: { level: 'L3', min: 68000, max: 88000 },
    L4: { level: 'L4', min: 88000, max: 116000 },
    L5: { level: 'L5', min: 116000, max: 152000 },
    L6: { level: 'L6', min: 152000, max: 200000 }
  },
  Germany: {
    L1: { level: 'L1', min: 38000, max: 48000 },
    L2: { level: 'L2', min: 48000, max: 62000 },
    L3: { level: 'L3', min: 62000, max: 80000 },
    L4: { level: 'L4', min: 80000, max: 105000 },
    L5: { level: 'L5', min: 105000, max: 138000 },
    L6: { level: 'L6', min: 138000, max: 180000 }
  },
  Canada: {
    L1: { level: 'L1', min: 48000, max: 62000 },
    L2: { level: 'L2', min: 62000, max: 80000 },
    L3: { level: 'L3', min: 80000, max: 104000 },
    L4: { level: 'L4', min: 104000, max: 137000 },
    L5: { level: 'L5', min: 137000, max: 180000 },
    L6: { level: 'L6', min: 180000, max: 236000 }
  },
  Singapore: {
    L1: { level: 'L1', min: 50000, max: 65000 },
    L2: { level: 'L2', min: 65000, max: 85000 },
    L3: { level: 'L3', min: 85000, max: 110000 },
    L4: { level: 'L4', min: 110000, max: 145000 },
    L5: { level: 'L5', min: 145000, max: 190000 },
    L6: { level: 'L6', min: 190000, max: 250000 }
  }
};

const JOB_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
const BATCH_SIZE = 1000;
const TOTAL_EMPLOYEES = 10000;
const TOP_LEVEL_MANAGERS = 60;

async function seedReferenceData() {
  console.log('🌍 Seeding countries and FX rates...');

  const countries = [
    { name: 'United States', currencyCode: 'USD' },
    { name: 'India', currencyCode: 'INR' },
    { name: 'United Kingdom', currencyCode: 'GBP' },
    { name: 'Germany', currencyCode: 'EUR' },
    { name: 'Canada', currencyCode: 'CAD' },
    { name: 'Singapore', currencyCode: 'SGD' }
  ];

  const createdCountries = await Promise.all(
    countries.map((c) =>
      prisma.country.upsert({
        where: { name: c.name },
        update: {},
        create: c
      })
    )
  );

  console.log(`✓ Created ${createdCountries.length} countries`);

  const fxRates = [
    { currencyCode: 'USD', rateToUsd: new Decimal('1.0') },
    { currencyCode: 'INR', rateToUsd: new Decimal('0.012') },
    { currencyCode: 'GBP', rateToUsd: new Decimal('1.27') },
    { currencyCode: 'EUR', rateToUsd: new Decimal('1.10') },
    { currencyCode: 'CAD', rateToUsd: new Decimal('0.73') },
    { currencyCode: 'SGD', rateToUsd: new Decimal('0.74') }
  ];

  const createdFxRates = await Promise.all(
    fxRates.map((f) =>
      prisma.fxRate.upsert({
        where: { currencyCode: f.currencyCode },
        update: { rateToUsd: f.rateToUsd, asOfDate: new Date() },
        create: {
          currencyCode: f.currencyCode,
          rateToUsd: f.rateToUsd,
          asOfDate: new Date()
        }
      })
    )
  );

  console.log(`✓ Created ${createdFxRates.length} FX rates`);

  console.log('🏢 Seeding departments...');

  const departments = [
    { name: 'Engineering' },
    { name: 'Sales' },
    { name: 'Marketing' },
    { name: 'HR' },
    { name: 'Finance' },
    { name: 'Operations' },
    { name: 'Product' }
  ];

  const createdDepartments = await Promise.all(
    departments.map((d) =>
      prisma.department.upsert({
        where: { name: d.name },
        update: {},
        create: d
      })
    )
  );

  console.log(`✓ Created ${createdDepartments.length} departments`);

  return {
    countries: createdCountries,
    departments: createdDepartments,
    fxRates: createdFxRates
  };
}

async function seedEmployees(
  refData: Awaited<ReturnType<typeof seedReferenceData>>
) {
  console.log('\n👥 Seeding employees...');

  // Set fixed seed for reproducibility
  faker.seed(12345);

  const countryIds = refData.countries.map((c) => c.id);
  const departmentIds = refData.departments.map((d) => d.id);

  // Weight distribution: more junior employees, fewer senior
  const levelWeights: Record<string, number> = {
    L1: 0.30,
    L2: 0.25,
    L3: 0.20,
    L4: 0.15,
    L5: 0.07,
    L6: 0.03
  };

  function getWeightedLevel(): string {
    const rand = Math.random();
    let cumulative = 0;
    for (const level of JOB_LEVELS) {
      cumulative += levelWeights[level];
      if (rand <= cumulative) return level;
    }
    return 'L1';
  }

  // Step 1: Create top-level managers (no manager)
  console.log(`  Creating ${TOP_LEVEL_MANAGERS} top-level managers...`);
  const managers: Array<{ id: string; countryId: string; departmentId: string }> = [];

  const managerBatch = [];
  for (let i = 0; i < TOP_LEVEL_MANAGERS; i++) {
    managerBatch.push({
      employeeCode: `MGR${String(i + 1).padStart(5, '0')}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: `mgr${String(i + 1).padStart(5, '0')}@acme.com`,
      countryId: faker.helpers.arrayElement(countryIds),
      departmentId: faker.helpers.arrayElement(departmentIds),
      jobLevel: 'L5', // Managers are at L5
      managerId: null,
      hireDate: faker.date.past({ years: 8 }),
      status: 'ACTIVE' as const
    });
  }

  const createdManagers = await prisma.employee.createMany({
    data: managerBatch
  });

  // Fetch the created managers to get their IDs
  const dbManagers = await prisma.employee.findMany({
    where: { jobLevel: 'L5', managerId: null },
    select: { id: true, countryId: true, departmentId: true }
  });

  for (const mgr of dbManagers) {
    managers.push(mgr);
  }

  console.log(`  ✓ Created ${createdManagers.count} top-level managers`);

  // Step 2: Create remaining employees in batches
  const remainingEmployees = TOTAL_EMPLOYEES - TOP_LEVEL_MANAGERS;
  let employeeCount = 0;

  for (let batch = 0; batch < Math.ceil(remainingEmployees / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, remainingEmployees);
    const batchSize = batchEnd - batchStart;

    const employeeBatch = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const countryId = faker.helpers.arrayElement(countryIds);
      const departmentId = faker.helpers.arrayElement(departmentIds);
      const level = getWeightedLevel();

      // Find a manager in the same country & department
      const eligibleManagers = managers.filter(
        (m) => m.countryId === countryId && m.departmentId === departmentId
      );
      const managerId =
        eligibleManagers.length > 0
          ? faker.helpers.arrayElement(eligibleManagers).id
          : managers[0]?.id || null;

      employeeBatch.push({
        employeeCode: `EMP${String(i + TOP_LEVEL_MANAGERS + 1).padStart(7, '0')}`,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: `emp${String(i + TOP_LEVEL_MANAGERS + 1).padStart(7, '0')}@acme.com`,
        countryId,
        departmentId,
        jobLevel: level,
        managerId,
        hireDate: faker.date.past({ years: 10 }),
        status: 'ACTIVE' as const
      });
    }

    await prisma.employee.createMany({ data: employeeBatch });
    employeeCount += batchSize;

    const progress = Math.round(((batch + 1) / Math.ceil(remainingEmployees / BATCH_SIZE)) * 100);
    console.log(`  [${progress}%] Seeded ${employeeCount}/${remainingEmployees} employees`);
  }

  console.log(`✓ Created ${TOP_LEVEL_MANAGERS + remainingEmployees} total employees`);
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    const refData = await seedReferenceData();
    await seedEmployees(refData);
    console.log('\n✅ Seed complete!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
