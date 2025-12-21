import { test, expect } from '@playwright/test';
import { mockBinding } from '../utils/mock-binding';
import { MOCK_FOLDER_RESPONSE } from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';

test.describe('Navigation', () => {
  test.beforeEach(async ({ context }) => {
    await mockBinding(
      context,
      { file: SERVICE_FILES.FOLDER_SERVICE, method: 'GetFolders' },
      MOCK_FOLDER_RESPONSE
    );
  });

  test('Go back button navigates to previous page', async ({ page }) => {
    // Start at the home page
    await page.goto('/');

    // Navigate to a folder
    const sidebar = page.getByTestId('folder-sidebar');
    await sidebar.getByText('Economics Notes').click();
    await expect(page).toHaveURL(/\/notes\/Economics%20Notes/);

    // Click the Go back button
    await page.getByTestId('go-back-button').click();

    // Should be back at the home page
    await expect(page).toHaveURL('/');
  });

  test('Go forward button navigates to next page after going back', async ({
    page,
  }) => {
    // Start at the home page
    await page.goto('/');

    // Navigate to a folder
    const sidebar = page.getByTestId('folder-sidebar');
    await sidebar.getByText('Economics Notes').click();
    await expect(page).toHaveURL(/\/notes\/Economics%20Notes/);

    // Go back
    await page.getByTestId('go-back-button').click();
    await expect(page).toHaveURL('/');

    // Click the Go forward button
    await page.getByTestId('go-forward-button').click();

    // Should be back at the folder page
    await expect(page).toHaveURL(/\/notes\/Economics%20Notes/);
  });
});
