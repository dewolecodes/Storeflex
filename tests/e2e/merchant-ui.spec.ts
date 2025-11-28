import { test, expect } from '@playwright/test';
import { db } from '../../src/shared/lib/db';
import path from 'path';
import { loginAndAttachStorage } from './helpers/auth';

test('merchant UI flow: register -> login -> create product with image', async ({ page, browser, request }) => {
    // Skip browser UI test when running under the `api` project (which has no browser)
    if (test.info().project.name === 'api') {
        test.skip(true, 'Browser UI test - skipped for api project');
        return;
    }
    const timestamp = Date.now();
    const email = `e2e+${timestamp}@example.com`;
    const password = 'TestPass123!';
    const storeName = `E2E Store ${timestamp}`;

    // 1) Register via API (faster and less flaky than submitting the UI form)
    // Use relative paths so Playwright's baseURL from config is honored.
    const regRes = await request.post('/api/auth/register', {
        headers: { 'content-type': 'application/json' },
        data: { storeName, email, password },
    });
    if (regRes.status() >= 400) {
        const body = await regRes.text();
        throw new Error(`Registration failed: ${regRes.status()} ${body}`);
    }

    // 2) Authenticate via API and get storage/cookies
    const storage = await loginAndAttachStorage(request, page, email, password);

    // Create a new browser context that includes the authenticated storage state
    const authContext = await browser.newContext({ storageState: storage });
    const authPage = await authContext.newPage();

    // Navigate but don't block on 'load' (dev server HMR can delay load); wait for DOMContentLoaded
    await authPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for a stable dashboard element; if it doesn't appear, capture diagnostics
    try {
        await authPage.waitForSelector('text=Total products', { timeout: 60000 });
    } catch (e) {
        const url = authPage.url();
        const loginVisible = await authPage.locator('text=Login').count();
        // eslint-disable-next-line no-console
        console.error('Failed to reach dashboard after auth', { url, loginVisible });
        throw new Error(`Failed to reach dashboard after auth; current url: ${url}`);
    }

    // 3) Navigate to new product page
    await authPage.goto('/dashboard/products/new');
    await authPage.fill('input[name="name"]', 'E2E Product ' + timestamp);
    await authPage.fill('input[name="price"]', '4.99');

    // 4) Upload image via the MultiImageUploader file input
    // Set up request/response watchers BEFORE selecting the file so we don't miss fast requests.
    const signReqPromise = authPage.waitForRequest((r) => r.url().includes('/api/merchant/uploads/sign') && r.method() === 'POST', { timeout: 15000 }).catch(() => null);
    const signResPromise = authPage.waitForResponse((r) => r.url().includes('/api/merchant/uploads/sign') && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
    const cloudUploadReqPromise = authPage.waitForRequest((r) => r.url().includes('api.cloudinary.com') && r.method() === 'POST', { timeout: 30000 }).catch(() => null);
    const cloudUploadResPromise = authPage.waitForResponse((r) => r.url().includes('api.cloudinary.com') && r.request().method() === 'POST', { timeout: 35000 }).catch(() => null);

    // Use an inline tiny PNG base64 and attach as a file payload so Cloudinary receives valid binary
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    // set files on the hidden input (uploader hides native input and shows a button)
    await authPage.setInputFiles('input[type=file]', [{ name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from(tinyPngBase64, 'base64') }]);

    const signReq = await signReqPromise;
    const signRes = await signResPromise;
    // Debug: ensure sign endpoint was called and returned an OK payload
    if (!signReq || !signRes) {
        // eslint-disable-next-line no-console
        console.log('Sign endpoint was not called or did not respond');
    } else {
        // eslint-disable-next-line no-console
        console.log('Sign request postData:', signReq.postData());
        try {
            const signJson = await signRes.json();
            // eslint-disable-next-line no-console
            console.log('Sign response:', JSON.stringify(signJson));
        } catch (e) {
            // ignore
        }
    }

    // Wait for Cloudinary upload request/response (the browser will post the file to their API)
    const cloudReq = await cloudUploadReqPromise;
    const cloudRes = await cloudUploadResPromise;
    if (cloudReq && cloudRes) {
        // eslint-disable-next-line no-console
        console.log('Cloud upload request headers:', JSON.stringify(cloudReq.headers()));
        try {
            const cloudJson = await cloudRes.json();
            // eslint-disable-next-line no-console
            console.log('Cloud upload response:', JSON.stringify(cloudJson));
        } catch (e) {
            // ignore
        }
    } else {
        // eslint-disable-next-line no-console
        console.log('Cloud upload request/response not observed');
    }

    // wait for upload to finish by waiting for the uploaded image to appear
    await authPage.waitForSelector('img[alt^="img-"]', { timeout: 20000 });
    // give a short buffer for state propagation
    await authPage.waitForTimeout(500);

    // 5) Save product
    // Intercept the product create request and response so we can assert payload includes images
    const createReqPromise = authPage.waitForRequest((r) => r.url().includes('/api/merchant/products') && r.method() === 'POST', { timeout: 10000 }).catch(() => null);
    const createResPromise = authPage.waitForResponse((r) => r.url().includes('/api/merchant/products') && r.request().method() === 'POST', { timeout: 15000 }).catch(() => null);

    // Wait until Save is enabled (uploads finished) to avoid race where button is still disabled
    await authPage.waitForSelector('button:has-text("Save"):not([disabled])', { timeout: 10000 });
    await authPage.click('button:has-text("Save")');

    const createReq = await createReqPromise;
    const createRes = await createResPromise;
    if (!createReq || !createRes) {
        throw new Error('Timed out waiting for product create request/response');
    }

    let postBody: any = {};
    try {
        postBody = JSON.parse(createReq.postData() || '{}');
        // eslint-disable-next-line no-console
        console.log('Product create payload:', JSON.stringify(postBody));
    } catch (e) {
        // ignore
    }

    // Expect images to be included in the payload
    expect(Array.isArray(postBody.images)).toBe(true);
    expect(postBody.images.length).toBeGreaterThan(0);

    // Check server response for product create
    if (createRes.status() < 200 || createRes.status() >= 300) {
        const body = await createRes.text();
        throw new Error(`Product create failed: ${createRes.status()} ${body}`);
    }

    const createJson = await createRes.json();
    const productId = createJson.product?.id || createJson.id;
    expect(productId).toBeTruthy();

    // 6) Verify product exists in DB and has images
    const product = await (db as any).product.findFirst({ where: { name: `E2E Product ${timestamp}` } });
    expect(product).toBeTruthy();
    expect(Array.isArray(product.images)).toBe(true);
    expect(product.images.length).toBeGreaterThan(0);

    // cleanup created product and user/tenant
    try { await (db as any).product.delete({ where: { id: product.id } }); } catch (e) { }
    const user = await (db as any).user.findUnique({ where: { email } });
    if (user) {
        const tenantId = user.tenantId;
        try { await (db as any).user.delete({ where: { id: user.id } }); } catch (e) { }
        try { await (db as any).tenant.delete({ where: { id: tenantId } }); } catch (e) { }
    }
});
