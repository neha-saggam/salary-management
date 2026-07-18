# Branch Protection Setup Guide

## Overview
This guide walks you through enabling branch protection on the `main` branch with required status checks.

## Steps to Enable Branch Protection

### 1. Go to Repository Settings
1. Navigate to your repository: https://github.com/neha-saggam/salary-management
2. Click the **Settings** tab (you may need to scroll right in the repository tabs)
3. In the left sidebar, click **Branches**

### 2. Add Branch Protection Rule
1. Click **Add rule** button
2. Enter `main` as the branch name pattern
3. Check the following boxes:

#### Required Protections:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals (set to 1 or more)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (if CODEOWNERS file exists)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Select these required status checks:
    - `lint` (from GitHub Actions)
    - `format:check` (from GitHub Actions)
    - `test:run` (from GitHub Actions)
    - `build-frontend` (from GitHub Actions)

- ✅ **Require code reviews**
  - Set to 1 minimum required reviewer

- ✅ **Include administrators** (so rules apply to you too)

### 3. Save Changes
1. Scroll to bottom and click **Create** or **Update rule**
2. Branch protection is now active

## What This Enforces

| Check | What It Does |
|-------|-------------|
| **lint** | Ensures code passes ESLint validation (no syntax/style errors) |
| **format:check** | Ensures code is formatted with Prettier (consistent style) |
| **test:run** | Ensures all 109 tests pass |
| **build-frontend** | Ensures frontend TypeScript compiles without errors |
| **PR Review** | Requires at least 1 approval before merge |
| **Up-to-date** | Requires PR branch is current with main before merge |

## Testing Branch Protection

After enabling, test it works:

### 1. Create a Test Branch
```bash
git checkout -b test/branch-protection
echo "test" >> TEST.md
git add TEST.md
git commit -m "test: verify branch protection"
git push -u origin test/branch-protection
```

### 2. Create a Pull Request
- Go to https://github.com/neha-saggam/salary-management/pulls
- Click **New pull request**
- Base: `main` ← Compare: `test/branch-protection`
- Click **Create pull request**

### 3. Verify Checks Run
- Scroll down to see "Checks" section
- You should see:
  - lint: ⏳ (in progress) → ✅ (passed)
  - format:check: ⏳ → ✅
  - test:run: ⏳ → ✅
  - build-frontend: ⏳ → ✅

### 4. Try Merging (Should Fail)
- The **Merge pull request** button will be disabled until checks pass
- Once all checks pass, it will show "All checks have passed"
- You still need an approval before merging (since we required 1 review)

### 5. Clean Up
```bash
git checkout main
git branch -D test/branch-protection
git push origin --delete test/branch-protection
```

## Common Issues

| Problem | Solution |
|---------|----------|
| Merge button still disabled after checks pass | You need a PR review approval. Comment `/approve` or use GitHub UI to approve (usually can't approve your own PR, use another account) |
| Status checks not showing up | Wait 1-2 minutes for GitHub Actions to detect new workflow file. If still missing, go to Settings → Actions → uncheck "Disable actions" if it's disabled |
| Lint/format checks failing | Run locally: `yarn workspace backend lint:fix && yarn workspace backend format` then push again |
| Tests failing | Run locally: `yarn workspace backend test:run` to diagnose, then push fix |

## Reverting Branch Protection (If Needed)

1. Go to Settings → Branches
2. Click the **Edit** button on the main branch rule
3. Click **Delete rule** at the bottom
4. Confirm deletion

## CI/CD Status Checks Explained

The four required status checks come from `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    # ... runs lint, format:check, test:run, and frontend build
```

Each job in the workflow creates a status check that can be required for merge.
