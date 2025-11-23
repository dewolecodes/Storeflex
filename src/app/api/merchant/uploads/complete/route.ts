import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { db } from '@/shared/lib/db';

const secret = process.env.NEXTAUTH_SECRET as string;

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret });
        if (!token?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { productId, secure_url, public_id } = body || {};
        if (!productId || !secure_url || !public_id) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const product = await db.product.findUnique({ where: { id: productId } });
        if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        const productTenantId = (product as unknown as { tenantId?: string }).tenantId;
        if (productTenantId !== token.tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Push the secure_url and public_id into respective arrays for the product
    const updated = await db.product.update({ where: { id: productId }, data: { images: { push: secure_url }, imagesPublicIds: { push: public_id } } });

        return NextResponse.json({ success: true, product: updated });
    } catch (err: unknown) {
        console.error('Upload complete error', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}
