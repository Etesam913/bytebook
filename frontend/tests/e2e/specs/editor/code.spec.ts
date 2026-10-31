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
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

test('authors code in an expanded block and reopens its saved content', async ({
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
  await mockBinding(context, SAVE_NOTE_BINDING, MOCK_SUCCESS_RESPONSE);
  await mockNote(context, '');
  const codeRequests: string[] = [];
  page.on('request', (request) => {
    if (/chunk-(?:vendor-cm|codemirror-editor)\./.test(request.url()))
      codeRequests.push(request.url());
  });
  await page.goto(NOTE_URL);
  await expect(getEditor(page)).toBeVisible();
  if (process.env.PLAYWRIGHT_PRODUCTION === 'true')
    expect(codeRequests).toHaveLength(0);

  await getEditor(page).click();
  await page.keyboard.type('/python');
  await page.getByRole('option', { name: 'Python', exact: true }).click();
  const code = getEditor(page).locator('.cm-content');
  await expect(code).toBeVisible();
  await code.fill('print("first")');
  await code.press('End');
  await page.getByRole('button', { name: 'Maximize', exact: true }).click();
  const expanded = page.locator('#code-dialog');
  await expect(expanded).toBeVisible();
  const expandedCode = expanded.locator('.cm-content');
  await expect(expandedCode).toHaveText('print("first")');
  // Typing at the restored caret also checks selection survives the remount.
  await expandedCode.press('Enter');
  await page.keyboard.insertText('print("second")');
  await expect(expandedCode.locator('.cm-line')).toHaveText([
    'print("first")',
    'print("second")',
  ]);
  await expanded.getByRole('button', { name: 'Minimize', exact: true }).click();
  await expect(expanded).not.toBeVisible();
  await expect(code).toContainText('print("second")');
  const markdown = await reopenSavedNote(page, 'print("second")');

  expect(markdown).toContain('```python');
  await expect(getEditor(page).locator('.cm-content')).toContainText(
    'print("first")'
  );
  await expect(getEditor(page).locator('.cm-content')).toContainText(
    'print("second")'
  );
  if (process.env.PLAYWRIGHT_PRODUCTION === 'true')
    expect(codeRequests.length).toBeGreaterThan(0);
});
