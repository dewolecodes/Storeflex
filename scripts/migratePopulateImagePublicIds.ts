#!/usr/bin/env node
/*
  scripts/migratePopulateImagePublicIds.ts
  - Dry-run by default. Use --apply to update products in the DB.
  - For each product with images but missing imagesPublicIds, try to derive the Cloudinary public_id
    from the secure_url (uses the same heuristic as delete flows), validate with Cloudinary API,
    and then persist the public_id into imagesPublicIds aligned with images array.

  Usage:
    npx tsx scripts/migratePopulateImagePublicIds.ts       # dry-run
    npx tsx scripts/migratePopulateImagePublicIds.ts --apply   # actually apply updates

  IMPORTANT: Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and DATABASE_URL are set in your .env
*/

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const prisma = new PrismaClient();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function parsePublicIdFromUrl(url: string): string | null {
    try {
        const parts = url.split('/');
        const last = parts[parts.length - 1];
        const publicWithExt = last.split('?')[0];
        const dotIdx = publicWithExt.lastIndexOf('.');
        const publicId = publicWithExt.substring(0, dotIdx !== -1 ? dotIdx : publicWithExt.length);
        const uploadIdx = parts.findIndex((p) => p === 'upload');
        let idPath = publicId;
        if (uploadIdx !== -1) {
            const after = parts.slice(uploadIdx + 1, parts.length - 1);
            if (after.length > 0 && /^v\d+$/.test(after[0])) after.shift();
            if (after.length > 0) idPath = `${after.join('/')}/${publicId}`;
        }
        return idPath;
    } catch (e) {
        return null;
    }
}

async function validatePublicId(publicId: string) {
    try {
        const res = await cloudinary.api.resource(publicId, { resource_type: 'image' });
        return !!res;
    } catch (e: any) {
        return false;
    }
}

async function main() {
    const doApply = process.argv.includes('--apply');
    console.log(`Starting imagesPublicIds migration helper (apply=${doApply})`);

    const productsAll = await (prisma as any).product.findMany({ select: { id: true, images: true, imagesPublicIds: true, name: true } });
    const products = productsAll.filter((p: any) => Array.isArray(p.images) && p.images.length > 0);
    console.log(`Found ${products.length} products with images`);

    const updates: Array<{ id: string; images: string[]; imagesPublicIds: (string | null)[] }> = [];

    for (const p of products) {
        const images: string[] = Array.isArray(p.images) ? p.images : [];
        const publicIds: (string | null)[] = Array.isArray(p.imagesPublicIds) ? p.imagesPublicIds : [];
        // If already populated and length matches, skip
        if (publicIds.length === images.length && publicIds.every((x) => x != null && x !== '')) continue;

        const newPublicIds: (string | null)[] = [];
        for (let i = 0; i < images.length; i++) {
            const existing = publicIds[i];
            if (existing && existing !== '') {
                newPublicIds.push(existing);
                continue;
            }

            const url = images[i];
            const candidate = parsePublicIdFromUrl(url);
            if (!candidate) {
                newPublicIds.push(null);
                continue;
            }

            const ok = await validatePublicId(candidate);
            if (ok) {
                newPublicIds.push(candidate);
            } else {
                // try candidate without possible folder parts (take last segment)
                const lastSeg = candidate.split('/').slice(-1)[0];
                const ok2 = await validatePublicId(lastSeg);
                if (ok2) newPublicIds.push(lastSeg);
                else newPublicIds.push(null);
            }
        }

        // if any mappings found (non-null) or we need to align length, schedule update
        const needUpdate = newPublicIds.some((v, idx) => v !== (publicIds[idx] ?? null)) || publicIds.length !== images.length;
        if (needUpdate) {
            updates.push({ id: p.id, images, imagesPublicIds: newPublicIds });
            console.log(`Will update product ${p.id} (${p.name}) -> imagesPublicIds:`, newPublicIds);
        }
    }

    console.log(`\nSummary: ${updates.length} products will be updated.`);

    if (!doApply) {
        console.log('Dry-run mode: no database updates will be performed. Re-run with --apply to apply changes.');
        await prisma.$disconnect();
        return;
    }

    console.log('Applying updates...');
    for (const u of updates) {
        try {
            await prisma.product.update({ where: { id: u.id }, data: { imagesPublicIds: u.imagesPublicIds } } as any);
            console.log(`Updated product ${u.id}`);
        } catch (e: any) {
            console.error(`Failed to update product ${u.id}:`, e?.message || e);
        }
    }

    console.log('Done.');
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('Migration failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
