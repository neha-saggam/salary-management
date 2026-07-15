import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

interface SalaryBand {
  level: string;
  min: number;
  max: number;
}

// Salary bands per country and job level (USD annual salary)
// These define realistic salary ranges that vary by market
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

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    await seedReferenceData();
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
