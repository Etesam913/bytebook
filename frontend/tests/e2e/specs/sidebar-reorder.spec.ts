import { test, expect } from '@playwright/test';
import { getMockBindingCalls, mockBinding } from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';

const getSettings = {
  file: SERVICE_FILES.SETTINGS_SERVICE,
  method: 'GetProjectSettings',
};
const updateSettings = {
  file: SERVICE_FILES.SETTINGS_SERVICE,
  method: 'UpdateProjectSettings',
};
const savedOrder = [
  'pinned',
  'files',
  'recent',
  'kernels',
  'tags',
  'savedSearches',
];

test.beforeEach(async ({ context }) => {
  await mockBinding(context, getSettings, MOCK_PROJECT_SETTINGS_RESPONSE);
  await mockBinding(context, updateSettings, { success: true, message: '' });
  await mockBinding(
    context,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    MOCK_ALL_PATHS_RESPONSE
  );
});

test('drags an accordion and restores its saved order in a new window', async ({
  page,
  context,
}) => {
  await page.goto('/');
  const sidebar = page.getByTestId('file-sidebar');
  const pinned = sidebar.getByRole('button', {
    name: 'Pinned',
    exact: true,
  });
  const files = sidebar.getByRole('button', {
    name: 'Files',
    exact: true,
  });
  await expect(pinned).toHaveAttribute('aria-expanded', 'true');
  const start = (await pinned.boundingBox())!;
  const target = (await files.boundingBox())!;

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y, { steps: 30 });
  await page.mouse.up();

  await expect
    .poll(async () =>
      (await getMockBindingCalls(page, updateSettings)).map((call) => call[0])
    )
    .toMatchObject([{ appearance: { sidebarOrder: savedOrder } }]);
  await expect(pinned).toHaveAttribute('aria-expanded', 'true');
  await pinned.click();
  await expect(pinned).toHaveAttribute('aria-expanded', 'false');

  const savedSettings = (await getMockBindingCalls(page, updateSettings))[0][0];
  await mockBinding(context, getSettings, {
    success: true,
    message: '',
    data: savedSettings,
  });
  const newWindow = await context.newPage();
  await newWindow.goto('/');
  await expect
    .poll(() =>
      newWindow
        .locator('[data-sidebar-panel]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-sidebar-panel'))
        )
    )
    .toEqual(savedOrder);
});

test('waits for saved settings before showing the initial accordion order', async ({
  page,
  context,
}) => {
  await mockBinding(context, getSettings, {
    ...MOCK_PROJECT_SETTINGS_RESPONSE,
    data: {
      ...MOCK_PROJECT_SETTINGS_RESPONSE.data,
      appearance: {
        ...MOCK_PROJECT_SETTINGS_RESPONSE.data.appearance,
        sidebarOrder: savedOrder,
      },
    },
  });
  await context.addInitScript(() => {
    const settingsReady = new Promise<void>((resolve) => {
      window.addEventListener('release-project-settings', () => resolve(), {
        once: true,
      });
    });
    const fetch = window.fetch.bind(window);
    // Hold the settings response at the Wails boundary to reproduce a slow startup.
    window.fetch = async (...args) => {
      const response = await fetch(...args);
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        const body = await response.clone().json();
        if (body?.data?.appearance) await settingsReady;
      }
      return response;
    };
  });
  await page.goto('/');
  await expect(page.getByTestId('file-sidebar')).toBeVisible();
  await expect
    .poll(async () => (await getMockBindingCalls(page, getSettings)).length)
    .toBe(1);
  await expect(page.locator('[data-sidebar-panel]')).toHaveCount(0);

  await page.evaluate(() =>
    window.dispatchEvent(new Event('release-project-settings'))
  );

  await expect
    .poll(() =>
      page
        .locator('[data-sidebar-panel]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-sidebar-panel'))
        )
    )
    .toEqual(savedOrder);
});
