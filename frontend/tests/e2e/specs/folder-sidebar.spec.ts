import * as EVENTS from '@bindings/util/event-names';
import { test, expect } from '../utils/fixtures';
import type { Locator, Page } from '@playwright/test';
import { getEditor, mockNote } from '../utils/editor';
import {
  getMockBindingCalls,
  mockBinding,
  updateMockBindingResponse,
} from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  SAMPLE_NOTE_MARKDOWN,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_TAGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../utils/mock-responses';
import { BINDINGS, SERVICE_FILES } from '../utils/service-files';
import { setupWailsEvents, emitWailsEvent } from '../utils/wails-events';
import { simulateWatcherChange } from '../utils/watcher';

async function openContextMenu(item: Locator) {
  await item.click({ button: 'right' });
  return item.page().getByRole('menu');
}

async function openAttachmentPicker(page: Page) {
  const menu = await openContextMenu(
    page
      .getByTestId('file-sidebar')
      .getByRole('treeitem', { name: 'Economics Notes' })
  );
  await menu.getByRole('menuitem', { name: 'Add files', exact: true }).click();
}

async function publishImportedNotes(page: Page, names: string[]) {
  const paths = names.map((name) => `Economics Notes/${name}`);
  await simulateWatcherChange(
    page,
    [...MOCK_ALL_PATHS_RESPONSE.data, ...paths],
    EVENTS.FILE_CREATE,
    paths.map((filePath) => ({ filePath }))
  );
  const folder = page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'Economics Notes', exact: true });
  await expect(folder).toHaveAttribute('aria-expanded', 'false');
  await folder.click();
}

test.beforeEach(async ({ context }) => {
  await setupWailsEvents(context);
  await mockBinding(context, BINDINGS.ALL_PATHS, MOCK_ALL_PATHS_RESPONSE);

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

  await mockBinding(
    context,
    { file: SERVICE_FILES.SEARCH_SERVICE, method: 'GetAllSavedSearches' },
    MOCK_SAVED_SEARCHES_RESPONSE
  );
});

test('creates a nested folder and opens it from the tree', async ({
  page,
  context,
}) => {
  const addFolder = { file: SERVICE_FILES.FOLDER_SERVICE, method: 'AddFolder' };
  await mockBinding(context, addFolder, MOCK_SUCCESS_RESPONSE);
  await page.goto('/');
  const sidebar = page.getByTestId('file-sidebar');
  const menu = await openContextMenu(
    sidebar.getByRole('treeitem', { name: 'Economics Notes', exact: true })
  );

  await menu
    .getByRole('menuitem', { name: 'Create Folder', exact: true })
    .click();
  const input = page.getByRole('textbox', {
    name: 'Rename Untitled',
    exact: true,
  });
  await input.fill('My Todos');
  // The watcher may fire as soon as the mutation completes.
  await updateMockBindingResponse(page, BINDINGS.ALL_PATHS, {
    ...MOCK_ALL_PATHS_RESPONSE,
    data: [...MOCK_ALL_PATHS_RESPONSE.data, 'Economics Notes/My Todos/'],
  });
  await input.press('Enter');

  await expect
    .poll(() => getMockBindingCalls(page, addFolder))
    .toEqual([['Economics Notes/My Todos']]);
  await expect(page).toHaveURL('/notes/Economics%20Notes/My%20Todos');
  await expect(
    page.getByRole('heading', { name: 'My Todos', exact: true })
  ).toBeVisible();
  await expect(page.getByText('This folder is empty')).toBeVisible();
  await emitWailsEvent(page, EVENTS.FOLDER_CREATE, [
    { folderPath: 'Economics Notes/My Todos' },
  ]);
  await expect(
    sidebar.getByRole('treeitem', { name: 'My Todos', exact: true })
  ).toBeVisible();
});

test('renames a folder and reopens its notes at the new path', async ({
  page,
  context,
}) => {
  const rename = { file: SERVICE_FILES.FOLDER_SERVICE, method: 'RenameFolder' };
  await mockBinding(context, rename, MOCK_SUCCESS_RESPONSE);
  await mockNote(context, SAMPLE_NOTE_MARKDOWN);
  await page.goto('/notes/Economics%20Notes/Inflation.md');
  await expect(getEditor(page)).toBeVisible();

  // The watcher may fire as soon as the mutation completes.
  await updateMockBindingResponse(page, BINDINGS.ALL_PATHS, {
    ...MOCK_ALL_PATHS_RESPONSE,
    data: MOCK_ALL_PATHS_RESPONSE.data.map((path) =>
      path.replace('Economics Notes', 'Course Notes')
    ),
  });
  const menu = await openContextMenu(
    page
      .getByTestId('file-sidebar')
      .getByRole('treeitem', { name: 'Economics Notes', exact: true })
  );
  await menu.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  const input = page.getByRole('textbox', {
    name: 'Rename Economics Notes',
    exact: true,
  });
  await input.fill('Course Notes');
  await input.press('Enter');
  await expect
    .poll(() => getMockBindingCalls(page, rename))
    .toEqual([['Economics Notes', 'Course Notes']]);
  await emitWailsEvent(page, EVENTS.FOLDER_RENAME, [
    {
      oldFolderPath: 'Economics Notes',
      newFolderPath: 'Course Notes',
    },
  ]);

  const renamed = page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'Course Notes', exact: true });
  await expect(renamed).toHaveAttribute('aria-expanded', 'true');
  await page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'Inflation.md', exact: true })
    .click();
  await expect(page).toHaveURL('/notes/Course%20Notes/Inflation.md');
  await expect(getEditor(page)).toBeVisible();
});

test('edits tags on same-named notes across folders', async ({
  page,
  context,
}) => {
  const paths = ['First/shared.md', 'Second/shared.md'];
  const getTags = {
    file: SERVICE_FILES.TAGS_SERVICE,
    method: 'GetTagsForNotes',
  };
  const setTags = {
    file: SERVICE_FILES.TAGS_SERVICE,
    method: 'SetTagsOnNotes',
  };
  await mockNote(context, SAMPLE_NOTE_MARKDOWN);
  await mockBinding(context, BINDINGS.ALL_PATHS, {
    ...MOCK_ALL_PATHS_RESPONSE,
    data: ['First/', paths[0], 'Second/', paths[1]],
  });
  await mockBinding(context, getTags, {
    success: true,
    data: { [paths[0]]: [], [paths[1]]: [] },
  });
  await mockBinding(context, setTags, MOCK_SUCCESS_RESPONSE);
  await page.goto('/');
  const sidebar = page.getByTestId('file-sidebar');
  await sidebar.getByRole('treeitem', { name: 'First', exact: true }).click();
  await sidebar.getByRole('treeitem', { name: 'Second', exact: true }).click();
  const notes = sidebar.getByRole('treeitem', {
    name: 'shared.md',
    exact: true,
  });
  await notes.nth(0).click();
  await notes.nth(1).click({ modifiers: ['ControlOrMeta'] });
  await expect(notes.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(notes.nth(1)).toHaveAttribute('aria-selected', 'true');

  const menu = await openContextMenu(notes.nth(1));
  await menu.getByText('Edit Tags').click();

  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Edit Tags' })
  ).toBeVisible();
  await expect(
    dialog.getByText('Select tags to add to or remove from 2 note(s)')
  ).toBeVisible();

  await dialog.getByRole('option', { name: /dev tag/ }).click();
  await updateMockBindingResponse(page, getTags, {
    success: true,
    message: '',
    data: { [paths[0]]: ['dev'], [paths[1]]: ['dev'] },
  });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect
    .poll(() => getMockBindingCalls(page, getTags))
    .toContainEqual([paths]);
  await expect
    .poll(() => getMockBindingCalls(page, setTags))
    .toEqual([[paths, ['dev'], []]]);
  await expect(dialog).not.toBeVisible();
});

test('moves a folder to trash via context menu', async ({ page, context }) => {
  // Mock MoveToTrash to succeed
  await mockBinding(
    context,
    { file: SERVICE_FILES.NOTE_SERVICE, method: 'MoveToTrash' },
    { success: true, message: '', data: [] }
  );

  await page.goto('/');
  const sidebar = page.getByTestId('file-sidebar');

  const economicsItem = sidebar.getByRole('treeitem', {
    name: 'Economics Notes',
  });
  await expect(economicsItem).toBeVisible();
  await expect(
    sidebar.getByRole('treeitem', { name: 'Research Notes' })
  ).toBeVisible();

  // The watcher may fire as soon as the mutation completes.
  await updateMockBindingResponse(page, BINDINGS.ALL_PATHS, {
    ...MOCK_ALL_PATHS_RESPONSE,
    data: MOCK_ALL_PATHS_RESPONSE.data.filter(
      (path) => !path.startsWith('Economics Notes/')
    ),
  });

  const contextMenu = await openContextMenu(economicsItem);
  await expect(contextMenu).toBeVisible();
  await contextMenu.getByText('Move to Trash').click();
  await expect
    .poll(() =>
      getMockBindingCalls(page, {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'MoveToTrash',
      })
    )
    .toEqual([[['Economics Notes']]]);

  // The tree removes rows in response to the backend file watcher's
  // delete event, so emit it the way the real backend would.
  await emitWailsEvent(page, EVENTS.FOLDER_DELETE, [
    { folderPath: 'Economics Notes' },
  ]);

  await expect(economicsItem).not.toBeVisible();

  await expect(
    sidebar.getByRole('treeitem', { name: 'Research Notes' })
  ).toBeVisible();
});

test('imports a batch of picked notes and opens an imported note', async ({
  page,
  context,
}) => {
  await mockNote(
    context,
    '# Imported research\n\nResearch from another project'
  );
  await mockBinding(
    context,
    { file: SERVICE_FILES.NODE_SERVICE, method: 'SelectAttachmentPaths' },
    {
      success: true,
      message: '',
      data: ['/tmp/upload-first.md', '/tmp/upload-second.md'],
    }
  );
  await mockBinding(
    context,
    { file: SERVICE_FILES.NODE_SERVICE, method: 'AddAttachmentsFromPaths' },
    { success: true, message: '', data: [] }
  );
  await page.goto('/notes/Economics%20Notes');
  await expect(
    page.getByRole('heading', { name: 'Economics Notes', exact: true })
  ).toBeVisible();
  await openAttachmentPicker(page);
  await expect(page.locator('[data-sonner-toast]')).toContainText(
    'Upload complete'
  );
  await publishImportedNotes(page, ['upload-first.md', 'upload-second.md']);
  const sidebar = page.getByTestId('file-sidebar');
  await expect(
    sidebar.getByRole('treeitem', { name: 'upload-first.md', exact: true })
  ).toBeVisible();
  await sidebar
    .getByRole('treeitem', { name: 'upload-second.md', exact: true })
    .press('Enter');

  await expect(page).toHaveURL('/notes/Economics%20Notes/upload-second.md');
  await expect(getEditor(page)).toContainText('Research from another project');
});

test('recovers from a failed dropped-file import and opens the retried note', async ({
  page,
  context,
}) => {
  await mockNote(context, '# Retried research');
  const copy = {
    file: SERVICE_FILES.NODE_SERVICE,
    method: 'AddAttachmentsFromPaths',
  };
  await mockBinding(context, copy, {
    success: false,
    message: 'Could not copy file',
  });
  await page.goto('/notes/Economics%20Notes');
  await expect(
    page.getByRole('heading', { name: 'Economics Notes', exact: true })
  ).toBeVisible();
  const drop = {
    droppedFiles: ['/tmp/upload-retry.md'],
    x: 0,
    y: 0,
    targetElementId: '',
  };

  await emitWailsEvent(page, EVENTS.FOLDER_CONTENT_DROP, drop);
  await expect(
    page.getByText(/Upload stopped.*Could not copy file/)
  ).toBeVisible();
  await expect(
    page.getByRole('treeitem', { name: 'upload-retry.md', exact: true })
  ).toHaveCount(0);

  await updateMockBindingResponse(page, copy, {
    success: true,
    message: '',
    data: ['notes/Economics Notes/upload-retry.md'],
  });
  await emitWailsEvent(page, EVENTS.FOLDER_CONTENT_DROP, drop);
  await expect(page.getByText(/Upload complete/)).toBeVisible();
  await publishImportedNotes(page, ['upload-retry.md']);
  await page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'upload-retry.md', exact: true })
    .click();

  await expect(page).toHaveURL('/notes/Economics%20Notes/upload-retry.md');
  await expect(getEditor(page)).toContainText('Retried research');
});

test('recovers from a failed move and moves the open note after retrying', async ({
  page,
  context,
}) => {
  const getPaths = {
    file: SERVICE_FILES.FILE_TREE_SERVICE,
    method: 'GetAllPaths',
  };
  const move = {
    file: SERVICE_FILES.FILE_TREE_SERVICE,
    method: 'MoveItemsToFolder',
  };
  await mockBinding(context, getPaths, {
    success: true,
    message: '',
    data: ['Source/', 'Source/Inflation.md', 'Target/'],
  });
  await mockBinding(context, move, { success: false, message: 'Move failed' });
  await mockNote(context, '# Research in progress');
  await page.goto('/notes/Source/Inflation.md');
  await expect(getEditor(page)).toContainText('Research in progress');
  const sidebar = page.getByTestId('file-sidebar');
  const note = sidebar.getByRole('treeitem', {
    name: 'Inflation.md',
    exact: true,
  });
  const target = sidebar.getByRole('treeitem', { name: 'Target', exact: true });

  await note.dragTo(target);

  await expect
    .poll(() => getMockBindingCalls(page, move))
    .toEqual([[['Source/Inflation.md'], 'Target']]);
  await expect(note).toBeVisible();
  await expect(page).toHaveURL('/notes/Source/Inflation.md');
  await expect(getEditor(page)).toContainText('Research in progress');

  await updateMockBindingResponse(page, move, MOCK_SUCCESS_RESPONSE);
  await note.dragTo(target);
  await expect
    .poll(async () => (await getMockBindingCalls(page, move)).length)
    .toBe(2);
  await expect(page).toHaveURL('/notes/Source/Inflation.md');
  await simulateWatcherChange(
    page,
    ['Source/', 'Target/', 'Target/Inflation.md'],
    EVENTS.FILE_RENAME,
    [{ oldFilePath: 'Source/Inflation.md', newFilePath: 'Target/Inflation.md' }]
  );

  await expect(page).toHaveURL('/notes/Target/Inflation.md');
  await expect(getEditor(page)).toContainText('Research in progress');
});
