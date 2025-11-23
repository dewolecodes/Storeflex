import { Prisma } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { db } from '@/shared/lib/db';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const secret = process.env.NEXTAUTH_SECRET as string;

export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
    try {
        const token = await getToken({ req, secret });
        if (!token?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId } = params;
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const productTenantId = (product as unknown as { tenantId?: string }).tenantId;
    if (productTenantId !== token.tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        return NextResponse.json({ product });
    } catch (err: unknown) {
        console.error('Product GET error', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { productId: string } }) {
    try {
        const token = await getToken({ req, secret });
        if (!token?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { productId } = params;
        const existing = await db.product.findUnique({ where: { id: productId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existingTenantId = (existing as unknown as { tenantId?: string }).tenantId;
    if (existingTenantId !== token.tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const allowed: Record<string, unknown> = {};
        // Only allow updating a safe subset of fields
        if (typeof body.name === 'string' && body.name.trim() !== '') allowed.name = body.name.trim();
        if (typeof body.description === 'string') allowed.description = body.description;
        if (typeof body.price === 'number') allowed.price = body.price;
        if (typeof body.stock === 'number') allowed.stock = body.stock;
        if (typeof body.sku === 'string') allowed.sku = body.sku;
        if (typeof body.isAvailable === 'boolean') allowed.isAvailable = body.isAvailable;
        // allow images arrays to be set/overwritten by client
        if (Array.isArray(body.images)) allowed.images = body.images;
        if (Array.isArray(body.imagesPublicIds)) allowed.imagesPublicIds = body.imagesPublicIds;

        // regenerate slug if name changed
        if (typeof body.name === 'string' && body.name.trim() !== '') {
            allowed.slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        }

    const updated = await db.product.update({ where: { id: productId }, data: allowed as Prisma.ProductUpdateInput });
        return NextResponse.json({ product: updated });
    } catch (err: unknown) {
        console.error('Product PUT error', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
    try {
        const token = await getToken({ req, secret });
        if (!token?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { productId } = params;
    const existing = await db.product.findUnique({ where: { id: productId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existingTenantIdDel = (existing as unknown as { tenantId?: string }).tenantId;
    if (existingTenantIdDel !== token.tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Delete images from Cloudinary (if any)
        try {
            if (Array.isArray(existing.images) && existing.images.length > 0) {
                for (const url of existing.images) {
                    try {
                        // derive public_id from secure_url: remove extension and version/prefix
                        // example: https://res.cloudinary.com/<cloud>/image/upload/v12345/folder/subfolder/public_id.jpg
                        const parts = url.split('/');
                        const last = parts[parts.length - 1];
                        const publicWithExt = last.split('?')[0];
                        const dotIdx = publicWithExt.lastIndexOf('.');
                        const publicId = publicWithExt.substring(0, dotIdx !== -1 ? dotIdx : publicWithExt.length);
                        // Reconstruct path without cloudinary host and version
                        // public_id may include folder segments if folder used in URL; to be safe, remove version segment 'v{number}' if present
                        // attempt to find 'upload' segment index and take everything after it excluding version
                        const uploadIdx = parts.findIndex((p: string) => p === 'upload');
                        let idPath = publicId;
                        if (uploadIdx !== -1) {
                            // take segments after upload (skip possible 'v12345')
                            const after = parts.slice(uploadIdx + 1, parts.length - 1); // exclude last since we used it
                            // remove version if it matches /^v\d+$/
                            if (after.length > 0 && /^v\d+$/.test(after[0])) after.shift();
                            if (after.length > 0) idPath = `${after.join('/')}/${publicId}`;
                        }
                        await cloudinary.uploader.destroy(idPath, { resource_type: 'image' });
                    } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : String(e);
                        console.warn('Cloudinary delete failed for image', url, msg);
                    }
                }
            }
        } catch (e) {
            const err = e as unknown;
            const msg = err instanceof Error ? err.message : String(err);
            console.warn('Error deleting images from Cloudinary', msg);
        }

        await db.product.delete({ where: { id: productId } });
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error('Product DELETE error', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}
