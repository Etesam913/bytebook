import { expect, test } from '@playwright/test';
import {
  getEditor,
  mockNote,
  NOTE_URL,
  reopenSavedNote,
  SAVE_NOTE_BINDING,
} from '../../utils/editor';
import {
  getMockBindingCalls,
  mockBinding,
  updateMockBindingResponse,
} from '../../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
  MOCK_TAGS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';
import { emitWailsEvent, setupWailsEvents } from '../../utils/wails-events';

const notePath = 'Economics Notes/Supply and Demand.md';
const getTags = { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTagsForNotes' };
const setTags = { file: SERVICE_FILES.TAGS_SERVICE, method: 'SetTagsOnNotes' };

test('tags a note, saves an edit, then removes the tag and reopens the updated note', async ({
  page,
  context,
}) => {
  await setupWailsEvents(context);
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
    { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTags' },
    MOCK_TAGS_RESPONSE
  );
  await mockBinding(context, getTags, {
    success: true,
    message: '',
    data: { [notePath]: [] },
  });
  await mockBinding(context, setTags, MOCK_SUCCESS_RESPONSE);
  await mockBinding(context, SAVE_NOTE_BINDING, MOCK_SUCCESS_RESPONSE);
  await mockNote(context, 'Original content');
  await page.goto(NOTE_URL);
  const tags = page.getByTestId('note-tags');
  await tags.getByRole('button', { name: 'Tags (0)', exact: true }).click();

  await tags.getByRole('button', { name: /Edit Tags/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Tags', exact: true });
  await dialog.getByRole('option', { name: /dev tag/ }).click();
  const tagged = { success: true, message: '', data: { [notePath]: ['dev'] } };
  await updateMockBindingResponse(page, getTags, tagged);
  await mockBinding(context, getTags, tagged);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(() => getMockBindingCalls(page, setTags))
    .toEqual([[[notePath], ['dev'], []]]);
  await emitWailsEvent(page, 'tags:index_update', {});
  await expect(
    tags.getByRole('button', { name: 'Tags (1)', exact: true })
  ).toBeVisible();
  await getEditor(page).fill('Tagged project notes');
  const taggedMarkdown = await reopenSavedNote(page, 'Tagged project notes');
  expect(taggedMarkdown).toContain('  - dev');
  await expect(
    tags.getByRole('button', { name: 'Tags (1)', exact: true })
  ).toBeVisible();

  const toggle = tags.getByRole('button', { name: 'Tags (1)', exact: true });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true')
    await toggle.click();
  const untagged = { success: true, message: '', data: { [notePath]: [] } };
  await updateMockBindingResponse(page, getTags, untagged);
  await mockBinding(context, getTags, untagged);
  await tags.getByRole('button', { name: 'Remove tag dev' }).click();
  await expect(
    tags.getByRole('button', { name: 'Tags (0)', exact: true })
  ).toBeVisible();
  await getEditor(page).fill('Updated project notes');
  const markdown = await reopenSavedNote(page, 'Updated project notes');

  expect(markdown).not.toContain('  - dev');
  await expect(getEditor(page)).toHaveText('Updated project notes');
  await expect(
    tags.getByRole('button', { name: 'Tags (0)', exact: true })
  ).toBeVisible();
});
