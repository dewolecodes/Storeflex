import { test, expect } from '@playwright/test';
import FormData from 'form-data';
import fetch from 'node-fetch';
import bcrypt from 'bcrypt';
import { db } from '../../src/shared/lib/db';

const BASE = process.env.NEXTAUTH_URL || 'http://127.0.0.1:3001';
const TEST_EMAIL = process.env.TEST_MERCHANT_EMAIL || 'test+1763672053106@example.com';
const TEST_PASS = process.env.TEST_MERCHANT_PASSWORD || 'TestPass123!';

test.describe.serial('Merchant UI-simulated flow (API)', () => {
    test('create product, upload image, persist and delete (with cleanup)', async ({ request }: any) => {
        // Attempt a short DB connectivity check; skip the test if the DB is unreachable.
        const timeout = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
        try {
            // Try to connect with a 3s timeout
            await Promise.race([(db as any).$connect(), timeout(3000)]);
        } catch (err) {
            // Skip the test gracefully when DB cannot be reached.
            test.skip(true, `Skipping DB-dependent test: ${(err as Error).message}`);
            try { await (db as any).$disconnect(); } catch (_) { }
            return;
        }
        // 1) Get CSRF token
        const csrfRes = await request.get(`${BASE}/api/auth/csrf`);
        const csrfJson = await csrfRes.json();
        const csrfToken = csrfJson.csrfToken;
        expect(csrfToken).toBeTruthy();

        // Ensure test user exists in DB; create if missing
        let user = await (db as any).user.findUnique({ where: { email: TEST_EMAIL }, select: { id: true, tenantId: true } });
        if (!user) {
            const tenant = await (db as any).tenant.create({ data: { name: 'Playwright Tenant', slug: `pw-${Date.now()}`, email: TEST_EMAIL } });
            const hashedPassword = await bcrypt.hash(TEST_PASS, 10);
            user = await (db as any).user.create({ data: { email: TEST_EMAIL, name: 'Playwright', hashedPassword, role: 'MERCHANT', tenant: { connect: { id: tenant.id } } }, select: { id: true, tenantId: true } });
        }

        // 2) Login via credentials (form-encoded)
        const params = new URLSearchParams();
        params.set('csrfToken', csrfToken);
        params.set('email', TEST_EMAIL);
        params.set('password', TEST_PASS);
        params.set('callbackUrl', '/dashboard');

        const loginRes = await request.post(`${BASE}/api/auth/callback/credentials`, {
            data: params.toString(),
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
        });
        expect(loginRes.status()).toBeGreaterThanOrEqual(200);

        // 3) Find tenant via DB user (reuse created user)
        const foundUser = await (db as any).user.findUnique({ where: { email: TEST_EMAIL }, select: { id: true, tenantId: true } });
        expect(foundUser).toBeTruthy();
        const tenantId = (foundUser as any).tenantId;

        // 4) Create a tenant-scoped category using Prisma
        const category = await (db as any).category.create({ data: { name: 'Playwright Category', url: 'pw-cat', slug: 'pw-cat', tenantId } });

        // 5) Create product via API
        const createRes = await request.post(`${BASE}/api/merchant/products`, {
            headers: { 'content-type': 'application/json' },
            data: { name: 'PW Product', price: 3.5, categoryId: category.id },
        });
        expect(createRes.status()).toBe(201);
        const createJson = await createRes.json();
        const productId = createJson.product?.id || createJson.id;
        expect(productId).toBeTruthy();

        // 6) Sign upload
        const signRes = await request.post(`${BASE}/api/merchant/uploads/sign`, { headers: { 'content-type': 'application/json' }, data: { filename: 'pw.png', purpose: 'product', productId } });
        expect(signRes.status()).toBe(200);
        const signJson = await signRes.json();

        // 7) Upload small data-uri PNG to Cloudinary
        const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        const dataUri = `data:image/png;base64,${tinyPngBase64}`;
        const fd = new FormData();
        fd.append('file', dataUri);
        fd.append('api_key', signJson.apiKey);
        fd.append('timestamp', String(signJson.timestamp));
        fd.append('signature', signJson.signature);
        fd.append('folder', signJson.folder);

        // Use global fetch to POST the multipart form-data to Cloudinary
        // Use node-fetch to POST the multipart form-data to Cloudinary (compatible with 'form-data')
        const uploadResRaw = await fetch(signJson.uploadUrl, { method: 'POST', body: fd as any });
        const uploadJson: any = await uploadResRaw.json();
        expect(uploadResRaw.status).toBe(200);

        // 8) Complete upload (persist into product)
        const compRes = await request.post(`${BASE}/api/merchant/uploads/complete`, { headers: { 'content-type': 'application/json' }, data: { productId, secure_url: uploadJson.secure_url, public_id: uploadJson.public_id } });
        expect(compRes.status()).toBe(200);

        // 9) Delete via API
        const delRes = await request.post(`${BASE}/api/merchant/uploads/delete`, { headers: { 'content-type': 'application/json' }, data: { productId, imageUrl: uploadJson.secure_url } });
        expect(delRes.status()).toBe(200);

        // Cleanup test DB entries
        try {
            await (db as any).product.delete({ where: { id: productId } });
        } catch (e) { }
        try {
            await (db as any).category.delete({ where: { id: category.id } });
        } catch (e) { }
    });
});
