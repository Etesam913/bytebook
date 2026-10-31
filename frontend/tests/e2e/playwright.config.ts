import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5174';
const port = new URL(baseURL).port || '5174';
const production = process.env.PLAYWRIGHT_PRODUCTION === 'true';

export default defineConfig({
  testDir: './specs',
  globalSetup: './wait-for-app.ts',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  workers: '75%',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    cwd: `${import.meta.dirname}/../..`,
    // The e2e suite mocks Wails RPC in the browser, so it only needs Vite plus
    // pre-generated bindings. Starting `wails3 dev` races background Vite boot
    // against a second binding generation pass on fresh CI runners.
    command: production
      ? `bunx vite preview --host 127.0.0.1 --port ${port} --strictPort`
      : `bun run dev:internal -- --mode e2e --port ${port} --strictPort`,
    url: baseURL,
    // Always start the E2E configuration instead of reusing an ordinary dev server.
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
