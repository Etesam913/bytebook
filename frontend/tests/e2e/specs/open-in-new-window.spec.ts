import { expect, test } from '@playwright/test';
import { getEditor, mockNote, NOTE_URL } from '../utils/editor';
import { getMockBindingCalls, mockBinding } from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';

test('requests a second note window and loads its editor independently of the original window', async ({
  page,
  context,
}) => {
  const openWindow = {
    file: SERVICE_FILES.NOTE_SERVICE,
    method: 'OpenInNewWindow',
  };
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
  await mockBinding(context, openWindow, MOCK_SUCCESS_RESPONSE);
  await mockNote(context, '# Supply and Demand\n\nShared note content');
  await page.goto(NOTE_URL);
  await expect(getEditor(page)).toContainText('Shared note content');

  await page.getByRole('button', { name: 'Note settings menu' }).click();
  await page.getByRole('menuitem', { name: 'Open in New Window' }).click();
  await expect
    .poll(() => getMockBindingCalls(page, openWindow))
    .toEqual([['Economics Notes/Supply and Demand.md']]);
  // Model the window Wails would create; this browser suite cannot open native windows.
  const secondWindow = await context.newPage();
  await secondWindow.goto(NOTE_URL);

  await expect(getEditor(secondWindow)).toContainText('Shared note content');
  await secondWindow
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'Research Notes', exact: true })
    .click();
  await expect(secondWindow).toHaveURL('/notes/Research%20Notes');
  await expect(page).toHaveURL(NOTE_URL);
  await expect(getEditor(page)).toContainText('Shared note content');
});
