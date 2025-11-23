import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { db } from '@/shared/lib/db';

const secret = process.env.NEXTAUTH_SECRET as string;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret });
        if (!token?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { productId, imageUrl } = body || {};
        if (!productId || !imageUrl) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

        const product = await db.product.findUnique({ where: { id: productId } });
        if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (product.tenantId !== token.tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Prefer to use stored public_id for deletion if available
        try {
            const imagesArr: string[] = Array.isArray(product.images) ? product.images : [];
            const publicIdsArr: string[] = Array.isArray(product.imagesPublicIds) ? product.imagesPublicIds : [];
            const idx = imagesArr.findIndex((u) => u === imageUrl);
            let deleted = false;
            if (idx !== -1 && publicIdsArr[idx]) {
                try {
                    await cloudinary.uploader.destroy(publicIdsArr[idx], { resource_type: 'image' });
                    deleted = true;
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    console.warn('Cloudinary delete failed for public_id', publicIdsArr[idx], msg);
                }
            } else {
                // fallback: try to parse public_id from URL
                try {
                    const parts = imageUrl.split('/');
                    const last = parts[parts.length - 1];
                    const publicWithExt = last.split('?')[0];
                    const dotIdx = publicWithExt.lastIndexOf('.');
                    const publicId = publicWithExt.substring(0, dotIdx !== -1 ? dotIdx : publicWithExt.length);
                    const uploadIdx = parts.findIndex((p: string) => p === 'upload');
                    let idPath = publicId;
                    if (uploadIdx !== -1) {
                        const after = parts.slice(uploadIdx + 1, parts.length - 1);
                        if (after.length > 0 && /^v\d+$/.test(after[0])) after.shift();
                        if (after.length > 0) idPath = `${after.join('/')}/${publicId}`;
                    }
                    await cloudinary.uploader.destroy(idPath, { resource_type: 'image' });
                    deleted = true;
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    console.warn('Cloudinary delete failed (fallback parse) for image', imageUrl, msg);
                }
            }

            // remove image url and corresponding public_id from product arrays
            const newImages = imagesArr.filter((u) => u !== imageUrl);
            const newPublicIds = publicIdsArr.filter((_, i) => imagesArr[i] !== imageUrl);
            const updated = await db.product.update({ where: { id: productId }, data: { images: newImages, imagesPublicIds: newPublicIds } });

            return NextResponse.json({ success: true, product: updated, deletedFromCloudinary: deleted });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('Error removing image', msg);
            return NextResponse.json({ error: msg || 'Failed' }, { status: 500 });
        }

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Upload delete error', message);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}
