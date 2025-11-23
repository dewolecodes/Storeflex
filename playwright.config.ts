import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 60_000,
    expect: { timeout: 5000 },
    reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
    use: {
        trace: 'on-first-retry',
        baseURL: process.env.NEXTAUTH_URL || 'http://127.0.0.1:3001',
    },
    webServer: {
        command: 'npm run dev',
        port: 3001,
        env: {
            PORT: '3001',
            HOST: '127.0.0.1',
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://127.0.0.1:3001',
        },
        reuseExistingServer: true,
        timeout: 120_000,
    },
    projects: [
        { name: 'api', use: {} },
        { name: 'chromium', use: { browserName: 'chromium' } },
    ],
});
