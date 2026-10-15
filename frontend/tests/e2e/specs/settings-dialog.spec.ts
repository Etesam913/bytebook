import { expect, test } from '@playwright/test';
import {
  getEditor,
  mockNote,
  NOTE_URL,
  reopenSavedNote,
  SAVE_NOTE_BINDING,
} from '../utils/editor';
import { getMockBindingCalls, mockBinding } from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
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

test('changes editor settings, writes a note, and restores both after reopening', async ({
  page,
  context,
}) => {
  await mockBinding(
    context,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    MOCK_ALL_PATHS_RESPONSE
  );
  await mockBinding(context, getSettings, MOCK_PROJECT_SETTINGS_RESPONSE);
  await mockBinding(context, updateSettings, MOCK_SUCCESS_RESPONSE);
  await mockBinding(context, SAVE_NOTE_BINDING, MOCK_SUCCESS_RESPONSE);
  await mockNote(context, 'Original content');
  await page.goto(NOTE_URL);
  await expect(getEditor(page)).toContainText('Original content');

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await dialog.getByRole('tab', { name: 'Editor', exact: true }).click();
  const lineHeight = dialog.getByRole('textbox', {
    name: 'Editor line height',
  });
  await lineHeight.fill('2.4');
  await lineHeight.blur();
  await expect
    .poll(
      async () => (await getMockBindingCalls(page, updateSettings)).at(-1)?.[0]
    )
    .toMatchObject({ appearance: { editorLineHeight: 2.4 } });
  const savedSettings = (await getMockBindingCalls(page, updateSettings)).at(
    -1
  )![0];
  // The next read returns the actual settings payload submitted by the UI.
  await mockBinding(context, getSettings, {
    success: true,
    message: '',
    data: savedSettings,
  });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await getEditor(page).fill('Written with my editor settings');
  await reopenSavedNote(page, 'Written with my editor settings');

  await expect(getEditor(page)).toHaveText('Written with my editor settings');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await dialog.getByRole('tab', { name: 'Editor', exact: true }).click();
  await expect(lineHeight).toHaveValue('2.4');
});
