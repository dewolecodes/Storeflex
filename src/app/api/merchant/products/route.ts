import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { db } from '@/shared/lib/db';

const secret = process.env.NEXTAUTH_SECRET as string;

export async function GET(req: NextRequest) {
    try {
        const token = await getToken({ req, secret });
        if (!token?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenantId = token.tenantId as string;
        const products = await db.product.findMany({ where: { tenantId } });
        return NextResponse.json({ products });
    } catch (err: unknown) {
        console.error('Products GET error', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret });
        if (!token?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await req.json();
        const { name, price, stock, sku, description, categoryId, images, imagesPublicIds } = body;
        // categoryId is required by schema; if not provided, create a tenant-scoped default category
        let catId = categoryId;
        const tenantId = token.tenantId as string;

        if (!catId) {
            // create a default category for this tenant
            const slug = `uncategorized-${Date.now()}`;
            const createdCat = await db.category.create({ data: { name: 'Uncategorized', url: 'uncategorized', slug, tenantId } });
            catId = createdCat.id;
        }

        if (!name || typeof price !== 'number') {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

        // create product with provided images/publicIds if present
        const product = await db.product.create({
            data: {
                name,
                slug,
                description: description ?? null,
                price,
                stock: typeof stock === 'number' ? stock : null,
                sku: sku ?? null,
                tenantId,
                categoryID: catId,
                images: Array.isArray(images) ? images : [],
                imagesPublicIds: Array.isArray(imagesPublicIds) ? imagesPublicIds : [],
            },
        });

        return NextResponse.json({ product }, { status: 201 });
    } catch (err: unknown) {
        console.error('Products POST error', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}
