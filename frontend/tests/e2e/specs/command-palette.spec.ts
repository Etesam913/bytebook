import { test, expect, type Page } from '@playwright/test';
import {
  mockBinding,
  getMockBindingCalls,
  updateMockBindingResponse,
} from '../utils/mock-binding';
import {
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_FULL_TEXT_SEARCH_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';
import { setupWailsEvents, emitWailsEvent } from '../utils/wails-events';
import {
  mockNote,
  NOTE_URL,
  getEditor,
  reopenSavedNote,
  SAVE_NOTE_BINDING,
} from '../utils/editor';

const searchBinding = {
  file: SERVICE_FILES.SEARCH_SERVICE,
  method: 'FullTextSearch',
};

async function openPalette(page: Page, event = 'navigation:quick-open') {
  const dialog = page.getByRole('dialog', {
    name: event === 'commands:open' ? 'Command Palette' : 'Quick Open',
    exact: true,
  });
  await expect(async () => {
    await emitWailsEvent(page, event, null, 'test');
    await expect(dialog).toBeVisible();
  }).toPass({ timeout: 10000 });
  return dialog;
}

test.beforeEach(async ({ context }) => {
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
  await mockBinding(context, searchBinding, MOCK_FULL_TEXT_SEARCH_RESPONSE);
  await mockBinding(
    context,
    { file: SERVICE_FILES.SEARCH_SERVICE, method: 'GetAllSavedSearches' },
    MOCK_SAVED_SEARCHES_RESPONSE
  );
  await mockNote(context, 'Current note');
  await mockBinding(context, SAVE_NOTE_BINDING, { success: true, message: '' });
});

test('finds a note with Quick Open and opens its content', async ({ page }) => {
  await page.goto(NOTE_URL);
  const dialog = await openPalette(page);
  const input = dialog.getByRole('searchbox');

  await input.fill('#work AND f:redis');

  await expect
    .poll(
      async () => (await getMockBindingCalls(page, searchBinding)).at(-1)?.[0]
    )
    .toBe('#work AND f:redis');
  await dialog.getByRole('menuitem', { name: /Quantum Physics.md/ }).click();
  await expect(page).toHaveURL('/notes/Research%20Notes/Quantum%20Physics.md');
  await expect(getEditor(page)).toContainText('Current note');
  await getEditor(page).fill('Research follow-up');
  await reopenSavedNote(page, 'Research follow-up');
  await expect(getEditor(page)).toHaveText('Research follow-up');
});

test('recovers from a failed search and opens an indexed folder', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('file-sidebar')).toBeVisible();
  await updateMockBindingResponse(page, searchBinding, {
    success: false,
    message: 'Search failed',
  });
  const dialog = await openPalette(page);

  await dialog.getByRole('searchbox').fill('r');

  await expect(dialog.getByText('Search is unavailable.')).toBeVisible();
  await dialog.getByRole('searchbox').press('Enter');
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL('/');
  await updateMockBindingResponse(page, searchBinding, {
    ...MOCK_FULL_TEXT_SEARCH_RESPONSE,
    data: {
      ...MOCK_FULL_TEXT_SEARCH_RESPONSE.data,
      results: [
        {
          type: 'folder',
          name: 'Research Notes',
          folder: '',
        },
        ...MOCK_FULL_TEXT_SEARCH_RESPONSE.data.results,
      ],
      total: 4,
    },
  });
  await dialog.getByRole('button', { name: 'Retry' }).click();
  await expect(dialog.getByRole('menuitem')).toHaveCount(4);
  await expect(dialog.getByRole('menuitem').first()).toHaveText(
    /Research Notes/
  );
  await expect
    .poll(
      async () => (await getMockBindingCalls(page, searchBinding)).at(-1)?.[3]
    )
    .toBe(true);
  await dialog.getByRole('menuitem').first().click();
  await expect(page).toHaveURL('/notes/Research%20Notes');
  await expect(
    page.getByRole('heading', { name: 'Research Notes', exact: true })
  ).toBeVisible();
});

test('creates a note from the palette, writes content, and reopens it', async ({
  page,
  context,
}) => {
  const addNote = {
    file: SERVICE_FILES.NOTE_SERVICE,
    method: 'AddNoteToFolder',
  };
  await mockBinding(context, addNote, { success: true, message: '' });
  await page.goto('/');
  const palette = await openPalette(page, 'commands:open');

  await palette.getByRole('searchbox').fill('new note');
  await palette
    .getByRole('menuitem', { name: 'New Note…', exact: true })
    .click();
  const picker = page.getByRole('dialog', { name: 'Create note', exact: true });
  await picker.getByRole('menuitem', { name: /Economics Notes/ }).click();
  await expect
    .poll(() => getMockBindingCalls(page, addNote))
    .toEqual([['Economics Notes', 'Untitled']]);
  await expect(page).toHaveURL('/notes/Economics%20Notes/Untitled.md');
  await expect(picker).not.toBeVisible();
  await getEditor(page).fill('A newly created note');

  await reopenSavedNote(page, 'A newly created note');

  await expect(getEditor(page)).toHaveText('A newly created note');
  await expect(page.getByRole('textbox', { name: 'Note title' })).toHaveValue(
    'Untitled'
  );
});
