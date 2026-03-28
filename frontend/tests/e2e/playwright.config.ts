import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  workers: '75%',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    // The e2e suite mocks Wails RPC in the browser, so it only needs Vite plus
    // pre-generated bindings. Starting `wails3 dev` races background Vite boot
    // against a second binding generation pass on fresh CI runners.
    command: 'bun run dev:internal -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
