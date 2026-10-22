import { expect, request, type FullConfig } from '@playwright/test';

export default async function waitForApp(config: FullConfig) {
  const context = await request.newContext({
    baseURL: config.projects[0].use.baseURL,
  });
  try {
    // Bundled Vite returns HTTP 200 for its temporary loading page too.
    await expect
      .poll(
        async () => {
          const response = await context.get('/');
          return response.text();
        },
        {
          timeout: 60000,
          message: 'Wait for Vite to serve the application HTML',
        }
      )
      .toContain('id="root"');
  } finally {
    await context.dispose();
  }
}
