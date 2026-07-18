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

// Titles assigned based on job level for top-level managers
const MANAGER_TITLES_BY_LEVEL: Record<string, string[]> = {
  L6: ['CEO', 'CTO', 'CFO', 'COO', 'CPO', 'CHRO'],
  L5: ['VP of Engineering', 'VP of Sales', 'VP of Marketing', 'VP of Finance', 'VP of Operations', 'VP of Product'],
  L4: ['Director of Engineering', 'Director of Sales', 'Director of Marketing', 'Director of HR', 'Director of Finance'],
  L3: ['Senior Manager', 'Engineering Manager', 'Sales Manager'],
  L2: ['Team Lead'],
  L1: ['Associate Lead']
};

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

  console.log('🎯 Seeding job levels...');
  const jobLevels = [
    { code: 'L1', name: 'Associate', rank: 1 },
    { code: 'L2', name: 'Mid-Level', rank: 2 },
    { code: 'L3', name: 'Senior', rank: 3 },
    { code: 'L4', name: 'Staff', rank: 4 },
    { code: 'L5', name: 'Principal', rank: 5 },
    { code: 'L6', name: 'Executive', rank: 6 }
  ];

  const createdJobLevels = await Promise.all(
    jobLevels.map((jl) =>
      prisma.jobLevel.upsert({
        where: { code: jl.code },
        update: { name: jl.name, rank: jl.rank },
        create: jl
      })
    )
  );

  console.log(`✓ Created ${createdJobLevels.length} job levels`);

  return {
    countries: createdCountries,
    departments: createdDepartments,
    fxRates: createdFxRates,
    jobLevels: createdJobLevels
  };
}

async function seedSalaryHistory(
  refData: Awaited<ReturnType<typeof seedReferenceData>>
) {
  console.log('\n💰 Seeding salary history...');

  // Map country IDs to country names and currency codes
  const countryMap = new Map<string, { name: string; currencyCode: string }>();
  for (const country of refData.countries) {
    countryMap.set(country.id, { name: country.name, currencyCode: country.currencyCode });
  }

  // Map country names to salary band keys
  const countryNameToKey: Record<string, string> = {
    'United States': 'US',
    'India': 'India',
    'United Kingdom': 'UK',
    'Germany': 'Germany',
    'Canada': 'Canada',
    'Singapore': 'Singapore'
  };

  // Fetch all employees and FX rates
  const employees = await prisma.employee.findMany({
    select: { id: true, hireDate: true, countryId: true, jobLevel: { select: { code: true } } }
  });

  const fxRates = await prisma.fxRate.findMany();
  const fxRateMap = new Map(fxRates.map((f) => [f.currencyCode, f.rateToUsd]));

  let totalSalaryRecords = 0;
  let processedEmployees = 0;

  // Process employees in batches
  for (let batch = 0; batch < Math.ceil(employees.length / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, employees.length);
    const batchEmployees = employees.slice(batchStart, batchEnd);

    const salaryRecordBatch = [];

    for (const emp of batchEmployees) {
      const countryId = emp.countryId;
      const jobLevel = emp.jobLevel;
      const countryInfo = countryMap.get(countryId);
      
      if (!countryInfo) continue;

      const currencyCode = countryInfo.currencyCode;
      const fxRate = fxRateMap.get(currencyCode) || new Decimal('1.0');
      const countryKey = countryNameToKey[countryInfo.name];
      const jobLevelCode = emp.jobLevel.code;

      const band =
        salaryBandsByCountry[countryKey as keyof typeof salaryBandsByCountry]?.[
          jobLevelCode as keyof (typeof salaryBandsByCountry)[string]
        ];

      if (!band) continue;

      // HIRE record: base band ± 15% variance
      const hireAmount =
        band.min + (band.max - band.min) * (0.5 + (Math.random() - 0.5) * 0.3);
      const hireAmountUsd = new Decimal(hireAmount).times(fxRate).toDecimalPlaces(2);

      salaryRecordBatch.push({
        employeeId: emp.id,
        amount: new Decimal(hireAmount).toDecimalPlaces(2),
        currency: currencyCode,
        amountUsd: hireAmountUsd,
        effectiveDate: emp.hireDate,
        reason: 'HIRE' as const
      });

      // Generate 0-3 additional records (raises and promotions)
      const numberOfAdditionalRecords = Math.floor(Math.random() * 4); // 0, 1, 2, or 3
      let currentAmount = hireAmount;
      let currentDate = new Date(emp.hireDate);

      for (let rec = 0; rec < numberOfAdditionalRecords; rec++) {
        // Add 12-18 months to the date
        currentDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 12 + Math.floor(Math.random() * 6),
          currentDate.getDate()
        );

        // 80% chance of raise, 20% chance of promotion
        const isPromotion = Math.random() < 0.2;

        if (isPromotion) {
          // PROMOTION: 10-15% bump
          currentAmount *= 1.1 + Math.random() * 0.05;
        } else {
          // ANNUAL_RAISE: 3-8% bump
          currentAmount *= 1.03 + Math.random() * 0.05;
        }

        const currentAmountUsd = new Decimal(currentAmount)
          .times(fxRate)
          .toDecimalPlaces(2);

        salaryRecordBatch.push({
          employeeId: emp.id,
          amount: new Decimal(currentAmount).toDecimalPlaces(2),
          currency: currencyCode,
          amountUsd: currentAmountUsd,
          effectiveDate: currentDate,
          reason: isPromotion ? ('PROMOTION' as const) : ('ANNUAL_RAISE' as const)
        });
      }
    }

    // Create salary records in batch
    if (salaryRecordBatch.length > 0) {
      await prisma.salaryRecord.createMany({ data: salaryRecordBatch });
      totalSalaryRecords += salaryRecordBatch.length;
    }

    processedEmployees += batchEmployees.length;
    const progress = Math.round((processedEmployees / employees.length) * 100);
    console.log(
      `  [${progress}%] Generated ${totalSalaryRecords} salary records for ${processedEmployees}/${employees.length} employees`
    );
  }

  console.log(`✓ Created ${totalSalaryRecords} salary history records`);
}

async function seedEmployees(
  refData: Awaited<ReturnType<typeof seedReferenceData>>
) {
  console.log('\n👥 Seeding employees...');

  // Set fixed seed for reproducibility
  faker.seed(12345);

  const countryIds = refData.countries.map((c) => c.id);
  const departmentIds = refData.departments.map((d) => d.id);

  // Build jobLevel code -> id map
  const jobLevelMap = new Map(refData.jobLevels.map((jl) => [jl.code, jl.id]));

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

  // Step 1: Create top-level managers (no manager) — one at L6 is CEO
  console.log(`  Creating ${TOP_LEVEL_MANAGERS} top-level managers...`);
  const managers: Array<{ id: string; countryId: string; departmentId: string }> = [];

  const managerBatch = [];
  for (let i = 0; i < TOP_LEVEL_MANAGERS; i++) {
    // First manager is CEO at L6, rest are L5 VPs
    const levelCode = i === 0 ? 'L6' : 'L5';
    const titles = MANAGER_TITLES_BY_LEVEL[levelCode];
    const title = titles[i % titles.length];
    managerBatch.push({
      employeeCode: `MGR${String(i + 1).padStart(5, '0')}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: `mgr${String(i + 1).padStart(5, '0')}@acme.com`,
      countryId: faker.helpers.arrayElement(countryIds),
      departmentId: faker.helpers.arrayElement(departmentIds),
      jobLevelId: jobLevelMap.get(levelCode)!,
      title,
      managerId: null,
      hireDate: faker.date.past({ years: 8 }),
      status: 'ACTIVE' as const
    });
  }

  const createdManagers = await prisma.employee.createMany({
    data: managerBatch
  });

  // Fetch the created managers to get their IDs (both L5 and L6 top-level)
  const dbManagers = await prisma.employee.findMany({
    where: { managerId: null },
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
        jobLevelId: jobLevelMap.get(level)!,
        title: null,
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
    await seedSalaryHistory(refData);
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
