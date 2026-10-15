import { test, expect } from '@playwright/test';
import { getEditor, mockNote, NOTE_URL } from '../utils/editor';
import { mockBinding } from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';

test.describe('Navigation', () => {
  test.beforeEach(async ({ context }) => {
    await mockNote(context, '# Economics research');
    await mockBinding(
      context,
      { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
      MOCK_ALL_PATHS_RESPONSE
    );

    await mockBinding(
      context,
      { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );
  });

  test('opens a note from its folder and restores note and folder history', async ({
    page,
  }) => {
    await page.goto('/');
    const sidebar = page.getByTestId('file-sidebar');
    await sidebar.getByRole('treeitem', { name: 'Economics Notes' }).click();
    await expect(page).toHaveURL('/notes/Economics%20Notes');
    await sidebar
      .getByRole('treeitem', { name: 'Supply and Demand.md', exact: true })
      .click();
    await expect(getEditor(page)).toContainText('Economics research');
    await page.getByTestId('go-back-button').click();
    await expect(page).toHaveURL('/notes/Economics%20Notes');
    await page.getByTestId('go-back-button').click();
    await expect(page).toHaveURL('/');

    await page.getByTestId('go-forward-button').click();

    await expect(page).toHaveURL('/notes/Economics%20Notes');
    await page.getByTestId('go-forward-button').click();
    await expect(page).toHaveURL(NOTE_URL);
    await expect(getEditor(page)).toContainText('Economics research');
  });
});
