#!/usr/bin/env node
/*
  scripts/testFullMerchantFlow.ts
  - Seeds a demo tenant + user, creates a product, uploads a test image to Cloudinary,
    writes secure_url & public_id to the product, then deletes the image and removes
    it from the product record.
  - Purpose: exercise Cloudinary signed uploads and DB persistence end-to-end

  Usage:
    npx tsx scripts/testFullMerchantFlow.ts

  Note: This will write data to your configured DATABASE_URL and upload/delete a real
  image on Cloudinary. Make sure you want to run it against the DB in your .env.
*/

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const prisma = new PrismaClient();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadTestImage(folder: string) {
    // Use a tiny embedded PNG (1x1) as data URI so the upload doesn't need external network
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    const dataUri = `data:image/png;base64,${tinyPngBase64}`;
    console.log('Uploading test image to Cloudinary (data URI)...');
    const res = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'image',
        overwrite: true,
    });
    return res; // contains secure_url and public_id
}

async function main() {
    console.log('Starting testFullMerchantFlow');

    const timestamp = Date.now();
    const storeName = `Test Store ${timestamp}`;
    const email = `test+${timestamp}@example.com`;
    const password = 'TestPass123!';

    const hashed = await bcrypt.hash(password, 10);

    console.log('Creating tenant...');
    const tenant = await (prisma as any).tenant.create({ data: { name: storeName, slug: storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''), email } });
    console.log('Tenant created:', { id: tenant.id });

    console.log('Creating user...');
    const user = await (prisma as any).user.create({ data: { email, name: storeName, hashedPassword: hashed, tenantId: tenant.id, role: 'MERCHANT' } });
    console.log('User created:', { id: user.id, email: user.email });

    console.log('Creating category for product...');
    const category = await (prisma as any).category.create({ data: { tenantId: tenant.id, name: 'Uncategorized', url: 'uncategorized', slug: 'uncategorized' } });

    console.log('Creating product placeholder...');
    const product = await (prisma as any).product.create({
        data: {
            tenantId: tenant.id,
            name: `Demo Product ${timestamp}`,
            slug: `demo-product-${timestamp}`,
            description: 'Demo product for testing upload flow',
            price: 9.99,
            images: [],
            imagesPublicIds: [],
            categoryID: category.id,
        }
    });

    console.log('Product created:', { id: product.id });

    // Upload image
    const folder = `tenants/${tenant.id}/products/${product.id}`;
    const uploadRes = await uploadTestImage(folder);
    console.log('Cloudinary upload result:', { public_id: uploadRes.public_id, secure_url: uploadRes.secure_url });

    // Persist to product
    console.log('Persisting image into product record...');
    const updated = await (prisma as any).product.update({ where: { id: product.id }, data: { images: [uploadRes.secure_url], imagesPublicIds: [uploadRes.public_id], thumbnail: uploadRes.secure_url } });
    console.log('Product updated with image:', { id: updated.id, imagesCount: updated.images?.length ?? 0 });

    // Now delete the image from Cloudinary and DB
    console.log('Deleting image from Cloudinary...');
    const destroyRes = await cloudinary.uploader.destroy(uploadRes.public_id, { resource_type: 'image' });
    console.log('Cloudinary destroy response:', destroyRes);

    console.log('Removing image from product record...');
    const removed = await (prisma as any).product.update({ where: { id: product.id }, data: { images: [], imagesPublicIds: [], thumbnail: null } });
    console.log('Product image removed:', { id: removed.id, imagesCount: removed.images?.length ?? 0 });

    console.log('Test flow complete. Cleanup note: The tenant, user, and product remain in DB for inspection.');

    await prisma.$disconnect();
}

main().catch(async (e) => { console.error('Test flow failed:', e?.message || e); await prisma.$disconnect(); process.exit(1); });
