#!/usr/bin/env node
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Inspecting products (read-only)...');
    const total = await (prisma as any).product.count();
    console.log(`Total products in DB: ${total}`);

    const sample = await (prisma as any).product.findMany({ take: 50, select: { id: true, name: true, images: true, imagesPublicIds: true, tenantId: true } });
    const withImages = sample.filter((p: any) => Array.isArray(p.images) && p.images.length > 0).length;
    console.log(`Among first ${sample.length} products, ${withImages} have images.`);

    console.log('\nSample products (sanitized):');
    for (let i = 0; i < Math.min(3, sample.length); i++) {
        const p = sample[i];
        console.log({
            id: p.id,
            name: p.name,
            imagesCount: Array.isArray(p.images) ? p.images.length : 0,
            imagesPublicIdsCount: Array.isArray(p.imagesPublicIds) ? p.imagesPublicIds.length : 0,
            tenantId: p.tenantId ? String(p.tenantId).slice(0, 8) + '...' : null,
        });
    }

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('Inspect failed:', e?.message || e);
    await prisma.$disconnect();
    process.exit(1);
});
