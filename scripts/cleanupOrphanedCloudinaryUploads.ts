#!/usr/bin/env node
/*
  scripts/cleanupOrphanedCloudinaryUploads.ts
  - Dry-run by default. Use --apply to delete orphaned Cloudinary images.
  - Scans Cloudinary resources under the `tenants/` prefix, detects images not referenced
    in any Product.imagesPublicIds, and if older than TTL (hours) will delete them.

  Usage:
    npx tsx scripts/cleanupOrphanedCloudinaryUploads.ts       # dry-run
    npx tsx scripts/cleanupOrphanedCloudinaryUploads.ts --apply --ttlHours=24

  WARNING: This will permanently delete images from your Cloudinary account when run with --apply.
  Make sure your CLOUDINARY_* env vars point to the intended account and you have a backup if needed.
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

const argv = process.argv.slice(2);
const doApply = argv.includes('--apply');
const ttlArg = argv.find((a) => a.startsWith('--ttlHours='));
const ttlHours = ttlArg ? parseInt(ttlArg.split('=')[1], 10) : 24; // default 24 hours

async function listResourcesByPrefix(prefix: string, maxResults = 500) {
    // Cloudinary returns up to a page; we'll page until no more
    let resources: any[] = [];
    let next_cursor: string | undefined = undefined;
    do {
        const res: any = await cloudinary.api.resources({
            type: 'upload',
            prefix,
            max_results: maxResults,
            next_cursor,
        });
        resources = resources.concat(res.resources || []);
        next_cursor = res.next_cursor;
    } while (next_cursor);
    return resources;
}

async function resourceIsReferenced(publicId: string) {
    // Try to find any product whose imagesPublicIds contains this publicId
    try {
        const found = await (prisma as any).product.findFirst({ where: { imagesPublicIds: publicId }, select: { id: true } });
        return !!found;
    } catch (e) {
        // Fallback: load a subset and check in memory (safer but slower)
        const all = await (prisma as any).product.findMany({ select: { id: true, imagesPublicIds: true } });
        return all.some((p: any) => Array.isArray(p.imagesPublicIds) && p.imagesPublicIds.includes(publicId));
    }
}

async function main() {
    console.log(`Starting orphaned Cloudinary cleanup (apply=${doApply}, ttlHours=${ttlHours})`);
    // We'll scan prefix tenants/
    const prefix = 'tenants/';
    const resources = await listResourcesByPrefix(prefix, 500);
    console.log(`Found ${resources.length} Cloudinary resources under prefix '${prefix}'.`);

    const now = Date.now();
    const ttlMs = ttlHours * 60 * 60 * 1000;

    const candidates: Array<{ public_id: string; created_at: string; bytes: number; }> = [];

    for (const r of resources) {
        // Only images
        if (r.resource_type !== 'image') continue;
        const publicId = r.public_id as string;
        const created = new Date(r.created_at).getTime();
        const ageMs = now - created;

        const referenced = await resourceIsReferenced(publicId);
        if (!referenced && ageMs >= ttlMs) {
            candidates.push({ public_id: publicId, created_at: r.created_at, bytes: r.bytes });
        }
    }

    console.log(`Orphaned resources older than ${ttlHours}h: ${candidates.length}`);
    for (const c of candidates) console.log(` - ${c.public_id} (created: ${c.created_at}, ${c.bytes} bytes)`);

    if (!doApply) {
        console.log('Dry-run: no deletions performed. Re-run with --apply to delete these resources.');
        await prisma.$disconnect();
        return;
    }

    console.log('Deleting orphaned resources...');
    for (const c of candidates) {
        try {
            const res = await cloudinary.uploader.destroy(c.public_id, { resource_type: 'image' });
            console.log(`Deleted ${c.public_id}:`, res);
        } catch (e: any) {
            console.error(`Failed to delete ${c.public_id}:`, e?.message || e);
        }
    }

    console.log('Cleanup complete.');
    await prisma.$disconnect();
}

main().catch(async (e) => { console.error('Cleanup failed:', e?.message || e); await prisma.$disconnect(); process.exit(1); });
