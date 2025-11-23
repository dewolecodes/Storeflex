# CI / E2E Test Setup

This project includes a GitHub Actions workflow to run Playwright E2E tests.

## What the workflow does
- Installs dependencies
- Generates Prisma client
- Builds the Next.js app
- Seeds a test merchant (via `scripts/testRegister.ts`) and writes `.ci_test_merchant.env`
- Starts the app and waits for it to be ready
- Runs Playwright tests (`npm run test:e2e`)
- Uploads the Playwright HTML report as an artifact
- Always attempts to clean up the seeded merchant (`scripts/cleanupTestMerchant.ts`)

## Required repository secrets
Set these in Settings → Secrets for the repository:
- `DATABASE_URL` — MongoDB connection string for Prisma
- `NEXTAUTH_SECRET` — NextAuth secret
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Notes:
- The workflow no longer requires `TEST_MERCHANT_EMAIL` and `TEST_MERCHANT_PASSWORD` because it seeds a test merchant automatically.
- Use a disposable or test database for CI. The seeder will create a tenant and user in the configured `DATABASE_URL`.

## Local run (developer)
You can run the E2E flow locally (dev machine) similar to CI:

1. Ensure your `.env` has `DATABASE_URL`, `NEXTAUTH_SECRET`, and Cloudinary keys.
2. Run the seeder to create a test merchant (it will write `.ci_test_merchant.env`):

```bash
node scripts/testRegister.ts
```

3. Start the app in another terminal:

```bash
npm run dev
```

4. Run Playwright tests:

```bash
npx playwright test tests/e2e/merchant-flow.spec.ts
```

5. Cleanup (if needed):

```bash
node scripts/cleanupTestMerchant.ts
```

## Troubleshooting
- If `prisma generate` fails in CI, ensure `DATABASE_URL` points to a reachable DB and Prisma schema is compatible.
- Prefer using a dedicated test database for CI to avoid polluting production/dev data.
