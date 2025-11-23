import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
    const { purpose, productId } = body || {};

        const tenantId = token.tenantId as string;
        const folder = `tenants/${tenantId}/${purpose === 'product' ? `products/${productId ?? 'temp'}` : 'assets'}`;

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign: Record<string, unknown> = { timestamp, folder };

        // signature using cloudinary utils
        const signature = cloudinary.utils.api_sign_request(paramsToSign, cloudinary.config().api_secret as string);

        return NextResponse.json({
            signature,
            timestamp,
            apiKey: cloudinary.config().api_key,
            cloudName: cloudinary.config().cloud_name,
            uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.config().cloud_name}/image/upload`,
            folder,
        });
    } catch (err: unknown) {
        console.error('Upload sign error', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed' }, { status: 500 });
    }
}
