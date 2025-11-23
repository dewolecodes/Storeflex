#!/usr/bin/env node
/**
 * Cleanup the test merchant created by scripts/testRegister.ts
 * Expects a .ci_test_merchant.env file in the repo root created by the seeder.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

function loadEnvFile(filePath: string): Record<string, string> {
    const content = fs.readFileSync(filePath, 'utf8');
    const out: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
        if (!line || line.trim().startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        out[key] = value;
    }
    return out;
}

async function main() {
    const envPath = path.resolve(process.cwd(), '.ci_test_merchant.env');
    if (!fs.existsSync(envPath)) {
        console.error('.ci_test_merchant.env not found. Nothing to clean.');
        process.exit(1);
    }

    const env = loadEnvFile(envPath);
    const tenantId = env['TENANT_ID'];
    const userId = env['USER_ID'];

    if (!tenantId && !userId) {
        console.error('TENANT_ID and USER_ID not found in .ci_test_merchant.env. Aborting.');
        process.exit(1);
    }

    try {
        if (userId) {
            try {
                await (db as any).user.delete({ where: { id: userId } });
                console.log('Deleted user:', userId);
            } catch (e: any) {
                console.warn('Failed to delete user (may already be removed):', e?.message || e);
            }
        }

        if (tenantId) {
            try {
                await (db as any).tenant.delete({ where: { id: tenantId } });
                console.log('Deleted tenant:', tenantId);
            } catch (e: any) {
                console.warn('Failed to delete tenant (may already be removed):', e?.message || e);
            }
        }

        // Remove the env file
        try {
            fs.unlinkSync(envPath);
            console.log('Removed .ci_test_merchant.env');
        } catch (e) {
            /* ignore */
        }

    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
