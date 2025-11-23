import { Prisma } from '@prisma/client';
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
        let body: unknown = {};
        try {
            body = await req.json();
        } catch (e: unknown) {
            console.error('Products POST invalid JSON body', e);
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        if (typeof body !== 'object' || body === null) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const parsed = body as Record<string, unknown>;
        const name = typeof parsed.name === 'string' ? parsed.name : undefined;
        const price = typeof parsed.price === 'number' ? parsed.price : undefined;
        const stock = typeof parsed.stock === 'number' ? parsed.stock : undefined;
        const sku = typeof parsed.sku === 'string' ? parsed.sku : undefined;
        const description = typeof parsed.description === 'string' ? parsed.description : undefined;
        const categoryId = typeof parsed.categoryId === 'string' ? parsed.categoryId : undefined;
        const images = Array.isArray(parsed.images) ? parsed.images.map((i) => String(i)) : undefined;
        const imagesPublicIds = Array.isArray(parsed.imagesPublicIds) ? parsed.imagesPublicIds.map((i) => String(i)) : undefined;
        // categoryId is required by schema; if not provided, create a tenant-scoped default category
        let catId = categoryId;
        const tenantId = token.tenantId as string;

        if (!catId) {
            // create a default category for this tenant
            const slug = `uncategorized-${Date.now()}`;
            const createdCat = await db.category.create({
                data: ({
                    name: 'Uncategorized',
                    url: 'uncategorized',
                    slug,
                    tenant: { connect: { id: tenantId } },
                } as unknown) as Prisma.CategoryUncheckedCreateInput,
            });
            catId = createdCat.id;
        }

        if (!name || typeof price !== 'number') {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

        // create product with provided images/publicIds if present
        const product = await db.product.create({
            data: ({
                name,
                slug,
                description: description ?? null,
                price,
                stock: typeof stock === 'number' ? stock : null,
                sku: sku ?? null,
                tenant: { connect: { id: tenantId } },
                category: { connect: { id: catId } },
                images: Array.isArray(images) ? images : [],
                imagesPublicIds: Array.isArray(imagesPublicIds) ? imagesPublicIds : [],
            } as unknown) as Prisma.ProductUncheckedCreateInput,
        });

        return NextResponse.json({ product }, { status: 201 });
    } catch (err: unknown) {
        console.error('Products POST error', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}
