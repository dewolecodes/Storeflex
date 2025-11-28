import { APIRequestContext, Page } from '@playwright/test';

/**
 * Log in using the API request context and copy the resulting storage state cookies
 * into the provided Playwright Page's browser context so the page is authenticated.
 *
 * @param request Playwright APIRequestContext (test fixture `request`)
 * @param page Playwright Page instance
 * @param email User email
 * @param password User password
 */
export async function loginAndAttachStorage(request: APIRequestContext, page: Page, email: string, password: string) {
    // 1) Get CSRF token
    const csrfRes = await request.get('/api/auth/csrf');
    const csrfJson = await csrfRes.json();
    const csrfToken = csrfJson.csrfToken;
    if (!csrfToken) throw new Error('Failed to obtain CSRF token for login');

    // 2) Post to credentials callback
    const params = new URLSearchParams();
    params.set('csrfToken', csrfToken);
    params.set('email', email);
    params.set('password', password);
    params.set('callbackUrl', '/dashboard');

    const loginRes = await request.post('/api/auth/callback/credentials', {
        data: params.toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    if (loginRes.status() >= 400) {
        const body = await loginRes.text();
        throw new Error(`Login failed: ${loginRes.status()} ${body}`);
    }

    // 3) Get storage state (cookies) from the request context and return it
    const storage = await request.storageState();
    if (!storage?.cookies || storage.cookies.length === 0) {
        throw new Error('No cookies were returned from storageState after login');
    }

    // Debug: print storage cookies shape when things go wrong (helps in CI logs)
    // eslint-disable-next-line no-console
    console.log('request.storageState.cookies:', JSON.stringify(storage.cookies || [], null, 2));

    return storage;
}
