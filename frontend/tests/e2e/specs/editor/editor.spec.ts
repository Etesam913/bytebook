import { expect, test } from '@playwright/test';
import {
  getEditor,
  mockNote,
  NOTE_URL,
  reopenSavedNote,
  SAVE_NOTE_BINDING,
} from '../../utils/editor';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_FULL_TEXT_SEARCH_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

test('authors a formatted note with a linked note and reopens its saved content', async ({
  page,
  context,
}) => {
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
  await mockBinding(
    context,
    { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
    MOCK_FULL_TEXT_SEARCH_RESPONSE
  );
  await mockBinding(context, SAVE_NOTE_BINDING, MOCK_SUCCESS_RESPONSE);
  await mockNote(context, '');
  await page.goto(NOTE_URL);
  const editor = getEditor(page);

  await editor.click();
  await page.keyboard.type('/heading 1');
  await page.getByRole('option', { name: 'Heading 1', exact: true }).click();
  await page.keyboard.type('Project plan');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Implementation notes');
  await editor
    .getByText('Implementation notes', { exact: true })
    .click({ clickCount: 3 });
  await page
    .getByTestId('floating-toolbar')
    .getByRole('button', { name: 'Bold (⌘B)', exact: true })
    .click();
  await expect(editor.locator('strong')).toContainText('Implementation notes');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.type('@inflation');
  await page.getByRole('option').filter({ hasText: 'Inflation.md' }).click();
  await expect(
    editor.getByRole('link', { name: 'Inflation.md' })
  ).toBeVisible();

  const markdown = await reopenSavedNote(page, 'Inflation.md');

  expect(markdown).toContain('# Project plan');
  await expect(
    editor.getByRole('heading', { name: 'Project plan', level: 1 })
  ).toBeVisible();
  await expect(editor.locator('strong')).toContainText('Implementation notes');
  await expect(
    editor.getByRole('link', { name: 'Inflation.md' })
  ).toBeVisible();
});
