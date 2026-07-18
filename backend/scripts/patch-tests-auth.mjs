/**
 * One-shot script: adds auth token setup + Authorization headers to all backend test files.
 * Run with: node --input-type=module < scripts/patch-tests-auth.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const AUTH_IMPORT = `import { getAuthToken } from './helpers';`;

const files = [
  'tests/employees.test.ts',
  'tests/salary.test.ts',
  'tests/departments.test.ts',
  'tests/analytics.test.ts',
];

for (const file of files) {
  let src = readFileSync(file, 'utf8');

  // 1. Add import if not already present
  if (!src.includes('getAuthToken')) {
    src = src.replace(
      `import { createApp } from '../src/app';`,
      `import { createApp } from '../src/app';\n${AUTH_IMPORT}`
    );
  }

  // 2. Add authToken variable after app = createApp()
  if (!src.includes('let authToken')) {
    src = src.replace(
      /const app = createApp\(\);(\r?\n)/,
      `const app = createApp();$1\nlet authToken: string;\n`
    );
  }

  // 3. Add authToken = await getAuthToken(app) in each beforeAll
  //    Strategy: find the first beforeAll block that doesn't already have it
  //    and insert as the first line of the async callback body.
  if (!src.includes('authToken = await getAuthToken')) {
    // Insert after the first "beforeAll(async () => {" or add a new one before afterAll
    const beforeAllMatch = /beforeAll\(async \(\) => \{\n/;
    if (beforeAllMatch.test(src)) {
      src = src.replace(
        /beforeAll\(async \(\) => \{\n/,
        `beforeAll(async () => {\n    authToken = await getAuthToken(app);\n`
      );
    } else {
      // No beforeAll — add one before afterAll
      src = src.replace(
        /afterAll\(async \(\) => \{/,
        `beforeAll(async () => {\n    authToken = await getAuthToken(app);\n  });\n\n  afterAll(async () => {`
      );
    }
  }

  // 4. Add .set('Authorization', `Bearer ${authToken}`) after every
  //    request(app).<method>(...) call (single-line style only)
  //    Pattern: request(app)\n?       .get|post|patch|delete(...)
  src = src.replace(
    /(request\(app\)\s*\.\s*(?:get|post|patch|delete)\([^)]*\))/g,
    `$1\n        .set('Authorization', \`Bearer \${authToken}\`)`
  );

  writeFileSync(file, src, 'utf8');
  console.log(`Patched: ${file}`);
}
