import {
  test,
  expect,
  type Locator,
  type Page,
  type Route,
} from '@playwright/test';
import { mockNote } from '../utils/editor';
import {
  getMockBindingCalls,
  mockBinding,
  updateMockBindingResponse,
} from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_TAGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';
import { setupWailsEvents, emitWailsEvent } from '../utils/wails-events';

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

// Hold picker/copy responses so each progress state can be checked before continuing.
async function holdAttachmentRequests(page: Page) {
  const requests: Route[] = [];
  await page.route('**/wails/runtime', async (route) => {
    const body = route.request().postDataJSON();
    const args = body?.args?.args;
    if (
      body?.object === 0 &&
      (args?.length === 0 || args?.[1]?.[0]?.startsWith('/tmp/upload-'))
    ) {
      requests.push(route);
    } else {
      await route.fallback();
    }
  });
  return async (data: string[], message = '') => {
    await expect.poll(() => requests.length).toBe(1);
    await requests
      .shift()!
      .fulfill({ json: { success: !message, data, message } });
  };
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
  await setupWailsEvents(context);
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
  await updateMockBindingResponse(
    page,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    {
      ...MOCK_ALL_PATHS_RESPONSE,
      data: [...MOCK_ALL_PATHS_RESPONSE.data, 'Economics Notes/My Todos/'],
    }
  );
  await input.press('Enter');

  await expect
    .poll(() => getMockBindingCalls(page, addFolder))
    .toEqual([['Economics Notes/My Todos']]);
  await expect(page).toHaveURL('/notes/Economics%20Notes/My%20Todos');
  await expect(
    page.getByRole('heading', { name: 'My Todos', exact: true })
  ).toBeVisible();
  await expect(page.getByText('This folder is empty')).toBeVisible();
  await emitWailsEvent(page, 'folder:create', [
    { folderPath: 'Economics Notes/My Todos' },
  ]);
  await sidebar
    .getByRole('treeitem', { name: 'Research Notes', exact: true })
    .click();
  await sidebar
    .getByRole('treeitem', { name: 'My Todos', exact: true })
    .press('Enter');
  await expect(page).toHaveURL('/notes/Economics%20Notes/My%20Todos');
  await expect(
    page.getByRole('heading', { name: 'My Todos', exact: true })
  ).toBeVisible();
});

test('renames a folder and reopens its notes at the new path', async ({
  page,
  context,
}) => {
  await setupWailsEvents(context);
  const rename = { file: SERVICE_FILES.FOLDER_SERVICE, method: 'RenameFolder' };
  await mockBinding(context, rename, MOCK_SUCCESS_RESPONSE);
  await mockNote(context, MOCK_NOTE_MARKDOWN_RESPONSE.data.markdown);
  await page.goto('/notes/Economics%20Notes/Inflation.md');
  await expect(page.locator('#content-editable-editor')).toBeVisible();

  await updateMockBindingResponse(
    page,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    {
      ...MOCK_ALL_PATHS_RESPONSE,
      data: MOCK_ALL_PATHS_RESPONSE.data.map((path) =>
        path.replace('Economics Notes', 'Course Notes')
      ),
    }
  );
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
  await emitWailsEvent(page, 'folder:rename', [
    {
      oldFolderPath: 'Economics Notes',
      newFolderPath: 'Course Notes',
    },
  ]);

  const renamed = page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'Course Notes', exact: true });
  if ((await renamed.getAttribute('aria-expanded')) !== 'true')
    await renamed.click();
  await page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'Inflation.md', exact: true })
    .click();
  await expect(page).toHaveURL('/notes/Course%20Notes/Inflation.md');
  await expect(page.locator('#content-editable-editor')).toBeVisible();
});

test('keeps the active note loaded when it is dragged into another folder', async ({
  page,
  context,
}) => {
  await setupWailsEvents(context);
  await mockNote(context, MOCK_NOTE_MARKDOWN_RESPONSE.data.markdown);
  await mockBinding(
    context,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'MoveItemsToFolder' },
    MOCK_SUCCESS_RESPONSE
  );
  await page.goto('/notes/Economics%20Notes/Inflation.md');
  await expect(page.locator('#content-editable-editor')).toBeVisible();
  const sidebar = page.getByTestId('file-sidebar');
  const noteItem = sidebar.getByRole('treeitem', { name: /Inflation/ });
  const researchFolder = sidebar.getByRole('treeitem', {
    name: 'Research Notes',
  });

  await noteItem.dragTo(researchFolder);

  // The route must not move ahead of the backend: until the watcher
  // reports the move, the note only exists at its old path.
  await expect
    .poll(async () => {
      const calls = await getMockBindingCalls(page, {
        file: SERVICE_FILES.FILE_TREE_SERVICE,
        method: 'MoveItemsToFolder',
      });
      return calls.at(-1);
    })
    .toEqual([['Economics Notes/Inflation.md'], 'Research Notes']);
  await expect(page).toHaveURL('/notes/Economics%20Notes/Inflation.md');

  await updateMockBindingResponse(
    page,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    {
      ...MOCK_ALL_PATHS_RESPONSE,
      data: MOCK_ALL_PATHS_RESPONSE.data
        .filter((path) => path !== 'Economics Notes/Inflation.md')
        .concat('Research Notes/Inflation.md'),
    }
  );
  await emitWailsEvent(page, 'file:rename', [
    {
      oldFilePath: 'Economics Notes/Inflation.md',
      newFilePath: 'Research Notes/Inflation.md',
    },
  ]);

  await expect(page).toHaveURL('/notes/Research%20Notes/Inflation.md');
  await expect(page.locator('#content-editable-editor')).toBeVisible();
});

test('edits tags on same-named notes across folders', async ({
  page,
  context,
}) => {
  await setupWailsEvents(context);
  const paths = ['First/shared.md', 'Second/shared.md'];
  const getTags = {
    file: SERVICE_FILES.TAGS_SERVICE,
    method: 'GetTagsForNotes',
  };
  const setTags = {
    file: SERVICE_FILES.TAGS_SERVICE,
    method: 'SetTagsOnNotes',
  };
  await mockNote(context, MOCK_NOTE_MARKDOWN_RESPONSE.data.markdown);
  await mockBinding(
    context,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    {
      ...MOCK_ALL_PATHS_RESPONSE,
      data: ['First/', paths[0], 'Second/', paths[1]],
    }
  );
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
  await emitWailsEvent(page, 'tags:index_update', {});
  await notes.nth(0).click();
  await expect(
    page
      .getByTestId('note-tags')
      .getByRole('button', { name: 'Tags (1)', exact: true })
  ).toBeVisible();
  await notes.nth(1).click();
  await expect(
    page
      .getByTestId('note-tags')
      .getByRole('button', { name: 'Tags (1)', exact: true })
  ).toBeVisible();
});

test('moves a folder to trash via context menu', async ({ page, context }) => {
  // Mock MoveToTrash to succeed
  await mockBinding(
    context,
    { file: SERVICE_FILES.NOTE_SERVICE, method: 'MoveToTrash' },
    { success: true, message: '', data: [] }
  );
  await setupWailsEvents(context);

  await page.goto('/');
  const sidebar = page.getByTestId('file-sidebar');

  // Verify folders are visible
  const economicsItem = sidebar.getByRole('treeitem', {
    name: 'Economics Notes',
  });
  await expect(economicsItem).toBeVisible();
  await expect(
    sidebar.getByRole('treeitem', { name: 'Research Notes' })
  ).toBeVisible();

  await updateMockBindingResponse(
    page,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    {
      ...MOCK_ALL_PATHS_RESPONSE,
      data: MOCK_ALL_PATHS_RESPONSE.data.filter(
        (path) => !path.startsWith('Economics Notes/')
      ),
    }
  );

  // Right-click on a folder to open context menu
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
  await emitWailsEvent(page, 'folder:delete', [
    { folderPath: 'Economics Notes' },
  ]);

  // Verify the folder is no longer in the sidebar
  await expect(economicsItem).not.toBeVisible();

  // Verify other folders are still visible
  await expect(
    sidebar.getByRole('treeitem', { name: 'Research Notes' })
  ).toBeVisible();
});

async function publishImportedNotes(page: Page, names: string[]) {
  const paths = names.map((name) => `Economics Notes/${name}`);
  await updateMockBindingResponse(
    page,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    {
      ...MOCK_ALL_PATHS_RESPONSE,
      data: [...MOCK_ALL_PATHS_RESPONSE.data, ...paths],
    }
  );
  await emitWailsEvent(
    page,
    'file:create',
    paths.map((filePath) => ({ filePath }))
  );
  const folder = page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'Economics Notes', exact: true });
  if ((await folder.getAttribute('aria-expanded')) !== 'true')
    await folder.click();
}

test('imports a batch of picked notes and opens an imported note', async ({
  page,
  context,
}) => {
  await setupWailsEvents(context);
  await mockNote(
    context,
    '# Imported research\n\nResearch from another project'
  );
  await page.goto('/notes/Economics%20Notes');
  await expect(
    page.getByRole('heading', { name: 'Economics Notes', exact: true })
  ).toBeVisible();
  const complete = await holdAttachmentRequests(page);

  await openAttachmentPicker(page);
  await complete(['/tmp/upload-first.md', '/tmp/upload-second.md']);
  await expect(page.locator('[data-sonner-toast]')).toContainText(
    'Uploading files'
  );
  await complete(['notes/Economics Notes/upload-first.md']);
  await complete(['notes/Economics Notes/upload-second.md']);
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
  await expect(page.locator('#content-editable-editor')).toContainText(
    'Research from another project'
  );
});

test('recovers from a failed dropped-file import and opens the retried note', async ({
  page,
  context,
}) => {
  await setupWailsEvents(context);
  await mockNote(context, '# Retried research');
  await page.goto('/notes/Economics%20Notes');
  await expect(
    page.getByRole('heading', { name: 'Economics Notes', exact: true })
  ).toBeVisible();
  const complete = await holdAttachmentRequests(page);
  const drop = { droppedFiles: ['/tmp/upload-retry.md'], x: 0, y: 0 };

  await emitWailsEvent(page, 'folder:content-drop', drop);
  await complete([], 'Could not copy file');
  await expect(
    page.getByText(/Upload stopped.*Could not copy file/)
  ).toBeVisible();
  await expect(
    page.getByRole('treeitem', { name: 'upload-retry.md', exact: true })
  ).toHaveCount(0);

  await emitWailsEvent(page, 'folder:content-drop', drop);
  await complete(['notes/Economics Notes/upload-retry.md']);
  await expect(page.getByText(/Upload complete/)).toBeVisible();
  await publishImportedNotes(page, ['upload-retry.md']);
  await page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name: 'upload-retry.md', exact: true })
    .click();

  await expect(page).toHaveURL('/notes/Economics%20Notes/upload-retry.md');
  await expect(page.locator('#content-editable-editor')).toContainText(
    'Retried research'
  );
});

test('recovers from a failed move and moves the open note after retrying', async ({
  page,
  context,
}) => {
  await setupWailsEvents(context);
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
  await expect(page.locator('#content-editable-editor')).toContainText(
    'Research in progress'
  );
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
  await expect(page.locator('#content-editable-editor')).toContainText(
    'Research in progress'
  );

  await updateMockBindingResponse(page, move, MOCK_SUCCESS_RESPONSE);
  await note.dragTo(target);
  await expect
    .poll(async () => (await getMockBindingCalls(page, move)).length)
    .toBe(2);
  await updateMockBindingResponse(page, getPaths, {
    success: true,
    message: '',
    data: ['Source/', 'Target/', 'Target/Inflation.md'],
  });
  await emitWailsEvent(page, 'file:rename', [
    { oldFilePath: 'Source/Inflation.md', newFilePath: 'Target/Inflation.md' },
  ]);

  await expect(page).toHaveURL('/notes/Target/Inflation.md');
  await expect(page.locator('#content-editable-editor')).toContainText(
    'Research in progress'
  );
});
