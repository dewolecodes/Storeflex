/*
  scripts/migrateToMultiTenant.ts
  Safe migration helper: dry-run by default, use --apply to actually update records.

  What it does:
  - Creates a default Tenant if none exists
  - Shows counts of records lacking tenantId (users, products, categories, brands, orders)
  - With --apply it will set tenantId for those records to the created/default tenant

  IMPORTANT: Run backups before --apply. Use `npx tsx scripts/migrateToMultiTenant.ts` to run.
*/

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
    console.log('Starting multi-tenant migration helper (dry-run by default)');
    const doApply = process.argv.includes('--apply');

    // Check existing tenants
    const tenantsCount = await prisma.tenant.count().catch(() => 0);
    console.log(`Existing tenants: ${tenantsCount}`);

    let tenant: any = null;
    if (tenantsCount === 0) {
        console.log('No tenants found. A default tenant will be created if --apply is provided.');
    } else {
        tenant = await prisma.tenant.findFirst();
        console.log(`Using existing tenant: ${tenant?.id} (${tenant?.name})`);
    }

    // Helper to count documents missing tenantId
    async function countMissing(modelName: string, field: string) {
        try {
            const count = await (prisma as any)[modelName].count({ where: { [field]: null } });
            return count;
        } catch (err) {
            // Model might not exist in pre-migration schema, return 0 and continue
            return 0;
        }
    }

    const missing = {
        users: await countMissing('user', 'tenantId'),
        products: await countMissing('product', 'tenantId'),
        categories: await countMissing('category', 'tenantId'),
        brands: await countMissing('brand', 'tenantId'),
        orders: await countMissing('order', 'tenantId'),
    };

    console.log('Records missing tenantId (dry-run):');
    console.table(missing);

    if (!doApply) {
        console.log('\nDRY-RUN MODE: No changes made. Re-run with --apply to perform updates.');
        await prisma.$disconnect();
        return;
    }

    console.log('\n--apply detected: performing migration changes');

    // Create default tenant if needed
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Default Tenant',
                slug: 'default-tenant',
                email: process.env.DEFAULT_TENANT_EMAIL || 'admin@local',
            },
        });
        console.log(`Created default tenant: ${tenant.id}`);
    }

    // Update models that are missing tenantId
    async function updateMissing(modelName: string, field: string) {
        try {
            const result = await (prisma as any)[modelName].updateMany({
                where: { [field]: null },
                data: { [field]: tenant.id },
            });
            console.log(`Updated ${result.count} ${modelName} records to tenantId=${tenant.id}`);
        } catch (err: any) {
            console.warn(`Skipping update for ${modelName}: ${err?.message || err}`);
        }
    }

    await updateMissing('user', 'tenantId');
    await updateMissing('product', 'tenantId');
    await updateMissing('category', 'tenantId');
    await updateMissing('brand', 'tenantId');
    await updateMissing('order', 'tenantId');

    console.log('Migration helper finished. Verify data and run your app/testing.');
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('Migration helper failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
