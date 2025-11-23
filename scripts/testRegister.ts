import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const db = new PrismaClient();

async function main() {
    const timestamp = Date.now();
    const storeName = `Test Store ${timestamp}`;
    const email = `test+${timestamp}@example.com`;
    const password = 'TestPass123!';

    console.log('Creating tenant and user with:', { storeName, email });

    const hashed = await bcrypt.hash(password, 10);

    const tenant = await (db as any).tenant.create({ data: { name: storeName, slug: storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''), email } });

    const user = await db.user.create({ data: { email, name: storeName, hashedPassword: hashed, tenantId: tenant.id, role: 'MERCHANT' } });

    console.log('Created tenant:', { id: tenant.id, name: tenant.name });
    console.log('Created user:', { id: user.id, email: user.email, tenantId: user.tenantId });

    // Verify in DB
    const dbTenant = await (db as any).tenant.findUnique({ where: { id: tenant.id } });
    const dbUser = await db.user.findUnique({ where: { id: user.id } });

    console.log('Verified tenant exists:', !!dbTenant);
    console.log('Verified user exists:', !!dbUser);

    // Output IDs for manual cleanup if desired
    console.log('Tenant ID:', tenant.id);
    console.log('User ID:', user.id);
    // Also write machine-readable env file for CI consumption
    const fs = require('fs');
    const envFile = '.ci_test_merchant.env';
    const content = `TEST_MERCHANT_EMAIL=${email}\nTEST_MERCHANT_PASSWORD=${password}\nTENANT_ID=${tenant.id}\nUSER_ID=${user.id}\n`;
    fs.writeFileSync(envFile, content);
    console.log('Wrote CI env file:', envFile);

    await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
