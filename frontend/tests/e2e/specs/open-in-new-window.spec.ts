import { test, expect } from '@playwright/test';
import { mockNote, NOTE_URL } from '../utils/editor';
import { getMockBindingCalls, mockBinding } from '../utils/mock-binding';
import {
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';

const openWindow = {
  file: SERVICE_FILES.NOTE_SERVICE,
  method: 'OpenInNewWindow',
};

test.beforeEach(async ({ context }) => {
  await mockBinding(
    context,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    {
      success: true,
      message: '',
      data: [
        'Economics Notes/',
        'Economics Notes/Supply and Demand.md',
        'chart #1.png',
      ],
    }
  );
  await mockBinding(
    context,
    { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
    MOCK_PROJECT_SETTINGS_RESPONSE
  );
  await mockBinding(context, openWindow, MOCK_SUCCESS_RESPONSE);
  await mockNote(context, '# Supply and Demand');
});

for (const { name, path } of [
  { name: 'Economics Notes', path: 'Economics Notes' },
  {
    name: 'Supply and Demand.md',
    path: 'Economics Notes/Supply and Demand.md',
  },
  { name: 'chart #1.png', path: 'chart #1.png' },
]) {
  test(`opens ${path} from its tree menu without navigating the current window`, async ({
    page,
  }) => {
    await page.goto(NOTE_URL);
    const row = page
      .getByTestId('file-sidebar')
      .getByRole('treeitem', { name, exact: true });

    await row.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Open in New Window' }).click();

    await expect
      .poll(() => getMockBindingCalls(page, openWindow))
      .toEqual([[path]]);
    await expect(page).toHaveURL(NOTE_URL);
  });
}

test('opens the current note from note settings', async ({ page }) => {
  await page.goto(NOTE_URL);

  await page.getByRole('button', { name: 'Note settings menu' }).click();
  await page.getByRole('menuitem', { name: 'Open in New Window' }).click();

  await expect
    .poll(() => getMockBindingCalls(page, openWindow))
    .toEqual([['Economics Notes/Supply and Demand.md']]);
  await expect(page).toHaveURL(NOTE_URL);
});
