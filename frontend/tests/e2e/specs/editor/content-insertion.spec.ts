import { test, expect, type Page } from '@playwright/test';
import {
  getEditor,
  mockNote,
  NOTE_URL,
  reopenSavedNote,
  SAVE_NOTE_BINDING,
} from '../../utils/editor';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_ALL_PATHS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

async function openTableDialog(page: Page) {
  await page.goto(NOTE_URL);
  await getEditor(page).click();
  await page.keyboard.type('/table');
  await page.getByRole('option', { name: 'Table', exact: true }).click();
  return page.getByRole('dialog');
}

test.beforeEach(async ({ context }) => {
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
  // Start with an empty document for the table authoring workflow.
  await mockNote(context, '');
  await mockBinding(context, SAVE_NOTE_BINDING, { success: true, message: '' });
});

test('authors a table, reopens its saved content, and removes it', async ({
  page,
}) => {
  const dialog = await openTableDialog(page);
  await dialog.getByRole('button', { name: 'Create Table' }).click();
  await expect(dialog).not.toBeVisible();
  const editor = getEditor(page);
  const rows = editor.locator('table tr');
  const firstCell = rows.first().locator('td, th').first();
  await firstCell.click();
  await page.keyboard.type('Keep this cell');
  const cellActions = page.getByRole('button', {
    name: 'Table cell actions',
  });

  await cellActions.click();
  await page.getByRole('menuitem', { name: 'Insert row below' }).click();

  await expect(rows).toHaveCount(4);
  await expect(firstCell).toHaveText('Keep this cell');

  await firstCell.click();
  await cellActions.click();
  await page.getByRole('menuitem', { name: 'Insert column right' }).click();

  await expect(rows.first().locator('td, th')).toHaveCount(4);
  await expect(firstCell).toHaveText('Keep this cell');

  await rows.nth(1).locator('td, th').nth(1).click();
  await cellActions.click();
  await page.getByRole('menuitem', { name: 'Delete column' }).click();

  await expect(rows.first().locator('td, th')).toHaveCount(3);
  await expect(firstCell).toHaveText('Keep this cell');

  await rows.nth(1).locator('td, th').first().click();
  await cellActions.click();
  await page.getByRole('menuitem', { name: 'Delete row', exact: true }).click();

  await expect(rows).toHaveCount(3);
  await expect(firstCell).toHaveText('Keep this cell');

  await firstCell.locator('p').fill('Saved table content');
  await reopenSavedNote(page, 'Saved table content');
  await expect(rows).toHaveCount(3);
  await expect(firstCell).toHaveText('Saved table content');
  await firstCell.click();
  await cellActions.click();
  await page.getByRole('menuitem', { name: 'Delete table' }).click();

  await expect(editor.locator('table')).toHaveCount(0);
  await editor.fill('The table has been removed');
  const markdown = await reopenSavedNote(page, 'The table has been removed');
  expect(markdown).not.toContain('Saved table content');
  await expect(editor.locator('table')).toHaveCount(0);
  await expect(editor).toHaveText('The table has been removed');
});
