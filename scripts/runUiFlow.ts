#!/usr/bin/env node
/*
 Script: runUiFlow.ts
 Purpose: Simulate the UI flow programmatically and log each step.
 Steps:
 1. Authenticate via NextAuth credentials to obtain session cookie.
 2. Create a product via /api/merchant/products (POST)
 3. Call /api/merchant/uploads/sign to get signature
 4. Upload a small data URI image to Cloudinary using returned uploadUrl
 5. Call /api/merchant/uploads/complete to persist secure_url and public_id
 6. Call /api/merchant/uploads/delete to delete the image

 Note: This script runs against local dev server at http://localhost:3000 and uses .env for credentials.
*/

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { db } from '../src/shared/lib/db';
import FormData from 'form-data';
import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';

dotenv.config();

const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function main() {
    console.log('Starting UI-simulated flow...');

    // Use the latest merchant created earlier from getLatestMerchant script
    const merchantEmail = process.env.TEST_MERCHANT_EMAIL || 'test+1763672053106@example.com';
    const merchantPassword = 'TestPass123!';

    // 1) Authenticate via NextAuth credentials
    console.log('\n1) POST /api/auth/callback/credentials (login)');
    // NextAuth expects a form POST with content-type application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('csrfToken', ''); // we'll fetch csrf token first

    // Get CSRF token
    // use a cookie jar so auth cookies persist across requests
    const jar = new CookieJar();
    const fetchWithCookie = fetchCookie(fetch, jar as any);

    const csrfRes = await fetchWithCookie(`${BASE}/api/auth/csrf`);
    const csrfData: any = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    console.log('  - fetched csrfToken');

    params.set('csrfToken', csrfToken);
    params.append('email', merchantEmail);
    params.append('password', merchantPassword);
    params.append('callbackUrl', '/dashboard');

    const loginRes = await fetchWithCookie(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        body: params,
        // follow redirects so NextAuth sets the session cookie
        redirect: 'follow',
    });

    console.log('  - login response status:', loginRes.status);

    if (loginRes.status >= 400) {
        const body = await loginRes.text();
        console.error('Login failed:', body);
        process.exit(1);
    }

    // read current cookies from the jar for logging
    const cookieHeader = await new Promise<string>((resolve, reject) => {
        jar.getCookieString(BASE, (err, cookies) => {
            if (err) return reject(err);
            resolve(cookies || '');
        });
    });
    console.log('  - cookie header after login:', cookieHeader || '(no cookies)');

    // Create a category for this tenant in the DB so product creation can reference it
    const userRecord: any = await (db as any).user.findUnique({ where: { email: merchantEmail }, select: { tenantId: true, id: true } });
    if (!userRecord) {
        console.error('Could not find user in DB to derive tenantId. Make sure the test merchant exists.');
        process.exit(1);
    }
    const tenantIdForCategory = userRecord.tenantId as string;
    const category = await (db as any).category.create({ data: { name: 'UI Flow Category', url: 'ui-flow', slug: 'ui-flow', tenantId: tenantIdForCategory } });
    const categoryIdToUse = category.id;
    console.log('  - created category id for test:', categoryIdToUse);

    // 2) Create a product
    console.log('\n2) POST /api/merchant/products (create product)');
    const createRes = await fetchWithCookie(`${BASE}/api/merchant/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'UI Flow Product', price: 5.99, categoryId: categoryIdToUse }),
    });
    const createData: any = await createRes.json();
    console.log('  - create status:', createRes.status, 'response:', createData);
    if (!createRes.ok) process.exit(1);
    const productId = createData.product?.id || createData.id || createData.productId || null;
    console.log('  - product id:', productId);

    // 3) Call sign endpoint
    console.log('\n3) POST /api/merchant/uploads/sign');
    const signRes = await fetch(`${BASE}/api/merchant/uploads/sign`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader }, body: JSON.stringify({ filename: 'test.png', purpose: 'product', productId }) });
    const signData: any = await signRes.json();
    console.log('  - sign status:', signRes.status, 'data:', signData);
    if (!signRes.ok) process.exit(1);

    // 4) Upload to Cloudinary using uploadUrl
    console.log('\n4) Uploading to Cloudinary via uploadUrl');
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    const dataUri = `data:image/png;base64,${tinyPngBase64}`;
    // Cloudinary supports direct data-uri uploads via the API endpoint
    const fd = new FormData();
    fd.append('file', dataUri);
    fd.append('api_key', signData.apiKey);
    fd.append('timestamp', String(signData.timestamp));
    fd.append('signature', signData.signature);
    fd.append('folder', signData.folder);

    const uploadRes = await fetch(signData.uploadUrl, { method: 'POST', body: fd });
    const uploadData: any = await uploadRes.json();
    console.log('  - upload status:', uploadRes.status, 'uploadData:', uploadData);
    if (!uploadRes.ok) process.exit(1);

    // 5) Call complete endpoint
    console.log('\n5) POST /api/merchant/uploads/complete');
    const compRes = await fetch(`${BASE}/api/merchant/uploads/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader }, body: JSON.stringify({ productId, secure_url: uploadData.secure_url, public_id: uploadData.public_id }) });
    const compData: any = await compRes.json();
    console.log('  - complete status:', compRes.status, 'data:', compData);
    if (!compRes.ok) process.exit(1);

    // 6) Delete the image via uploads/delete
    console.log('\n6) POST /api/merchant/uploads/delete');
    const delRes = await fetch(`${BASE}/api/merchant/uploads/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader }, body: JSON.stringify({ productId, imageUrl: uploadData.secure_url }) });
    const delData: any = await delRes.json();
    console.log('  - delete status:', delRes.status, 'data:', delData);

    // Cleanup: remove the test product and category to avoid leaving test artifacts
    console.log('\n7) Cleanup test product and category from DB');
    try {
        // delete product
        const deletedProduct = await (db as any).product.delete({ where: { id: productId } });
        console.log('  - deleted product:', deletedProduct.id);
    } catch (e: any) {
        console.warn('  - failed to delete product (might already be removed):', e?.message || e);
    }

    try {
        const deletedCategory = await (db as any).category.delete({ where: { id: categoryIdToUse } });
        console.log('  - deleted category:', deletedCategory.id);
    } catch (e: any) {
        console.warn('  - failed to delete category (might already be removed):', e?.message || e);
    }

    console.log('\nUI-simulated flow complete.');
}

main().catch((e) => { console.error('Flow failed:', e); process.exit(1); });
