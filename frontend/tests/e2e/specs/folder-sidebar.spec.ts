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
  await menu.getByRole('menuitem', { name: 'Add attachments' }).click();
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

test.describe('File Sidebar', () => {
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

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.SEARCH_SERVICE,
        method: 'GetPathsFromSearchQuery',
      },
      {
        ...MOCK_ALL_PATHS_RESPONSE,
        data: MOCK_ALL_PATHS_RESPONSE.data.filter(
          (path) => !path.endsWith('/')
        ),
      }
    );
  });

  for (const eventName of [
    'file-tree:content-drop',
    'folder:content-drop',
    'attachment picker',
  ]) {
    for (const succeeds of [true, false]) {
      test(`${eventName} shows completed upload progress and ${succeeds ? 'success' : 'failure'}`, async ({
        page,
        context,
      }) => {
        await setupWailsEvents(context);
        await page.goto('/notes/Economics%20Notes');
        await expect(
          page.getByTestId('file-sidebar').getByRole('treeitem', {
            name: 'Economics Notes',
          })
        ).toBeVisible();
        const completeRequest = await holdAttachmentRequests(page);

        const droppedFiles = [
          '/tmp/upload-first.png',
          '/tmp/upload-second.png',
        ];
        if (eventName === 'attachment picker') {
          await openAttachmentPicker(page);
          const loadingDialog = page.getByRole('dialog', {
            name: 'Loading: Adding attachments ...',
          });
          await expect(loadingDialog).toBeVisible();
          await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
          await completeRequest(droppedFiles);
          await expect(loadingDialog).not.toBeVisible();
        } else {
          await emitWailsEvent(page, eventName, {
            droppedFiles,
            x: 0,
            y: 0,
          });
        }

        const toast = page.locator('[data-sonner-toast]');
        await expect(toast).toHaveText('Uploading files… 0/2');
        await expect(toast).toHaveAttribute('data-type', 'loading');
        await expect(
          page.locator(
            '[data-sonner-toaster][data-y-position="bottom"][data-x-position="right"]'
          )
        ).toBeAttached();
        await completeRequest(['notes/upload-first.png']);
        await expect(toast).toHaveText('Uploading files… 1/2');
        await completeRequest(
          succeeds ? ['notes/upload-second.png'] : [],
          succeeds ? '' : 'Could not copy file'
        );

        await expect(toast).toHaveCount(1);
        await expect(toast).toHaveText(
          succeeds
            ? 'Upload complete · 2/2'
            : 'Upload stopped · 1/2 completed. Could not copy file'
        );
        await expect(toast).toHaveAttribute(
          'data-type',
          succeeds ? 'success' : 'error'
        );
      });
    }
  }

  for (const cancelled of [true, false]) {
    test(`attachment picker ${cancelled ? 'cancellation' : 'failure'} clears the modal without importing`, async ({
      page,
      context,
    }) => {
      const copyBinding = {
        file: SERVICE_FILES.NODE_SERVICE,
        method: 'AddAttachmentsFromPaths',
      };
      await mockBinding(context, copyBinding, MOCK_SUCCESS_RESPONSE);
      await mockBinding(
        context,
        { file: SERVICE_FILES.NODE_SERVICE, method: 'SelectAttachmentPaths' },
        {
          success: cancelled,
          data: [],
          message: cancelled ? '' : 'Picker failed',
        }
      );
      await page.goto('/');

      await openAttachmentPicker(page);

      await expect(page.getByRole('dialog')).not.toBeVisible();
      if (cancelled) {
        await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
      } else {
        await expect(page.locator('[data-sonner-toast]')).toHaveText(
          'Picker failed'
        );
      }
      expect(await getMockBindingCalls(page, copyBinding)).toEqual([]);
    });
  }

  test('scales tree rows with text without losing expanded folders', async ({
    page,
    context,
  }) => {
    await setupWailsEvents(context);
    await page.goto('/');
    const sidebar = page.getByTestId('file-sidebar');
    const folder = sidebar.getByRole('treeitem', { name: 'Economics Notes' });
    await folder.click();
    const note = sidebar.getByRole('treeitem', { name: 'Inflation.md' });
    await expect(note).toBeVisible();

    for (const [event, height] of [
      ['zoom:out', 22.5],
      ['zoom:in', 37.5],
      ['zoom:reset', 30],
    ] as const) {
      for (let step = 0; step < 6; step++) {
        await emitWailsEvent(page, event, null);
      }
      await expect(folder).toHaveAttribute('aria-expanded', 'true');
      await expect(folder).toHaveAttribute('aria-selected', 'true');
      await expect(note).toBeVisible();
      await expect
        .poll(async () => (await note.boundingBox())?.height)
        .toBe(height);
      await expect
        .poll(async () => (await folder.boundingBox())?.height)
        .toBe(height);
    }
  });

  test('focuses the file filter from the native search shortcut', async ({
    page,
  }) => {
    await page.goto('/');
    const sidebar = page.getByTestId('file-sidebar');
    const filterInput = sidebar.getByRole('searchbox', {
      name: 'Filter files',
    });

    await page.keyboard.press('Meta+Shift+f');

    await expect(filterInput).toBeFocused();
  });

  test('focuses the file filter when searching the current folder', async ({
    page,
  }) => {
    await page.goto('/notes/Economics%20Notes');
    const filterInput = page
      .getByTestId('file-sidebar')
      .getByRole('searchbox', { name: 'Filter files' });

    await page.getByRole('button', { name: 'Search this folder' }).click();

    await expect(filterInput).toHaveValue('f:"Economics Notes/"');
    await expect(filterInput).toBeFocused();
  });

  test.describe('File Tree', () => {
    test('reveals the selected search result when clearing the filter repeatedly', async ({
      page,
      context,
    }) => {
      const paths = Array.from(
        { length: 100 },
        (_, index) => `Folder/Note${String(index).padStart(3, '0')}.md`
      );
      await mockBinding(
        context,
        { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
        { ...MOCK_ALL_PATHS_RESPONSE, data: ['Folder/', ...paths] }
      );
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.SEARCH_SERVICE,
          method: 'GetPathsFromSearchQuery',
        },
        { ...MOCK_ALL_PATHS_RESPONSE, data: [paths[99]] }
      );
      await mockNote(context, MOCK_NOTE_MARKDOWN_RESPONSE.data.markdown);
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      const filter = sidebar.getByRole('searchbox', { name: 'Filter files' });
      const target = sidebar.getByRole('treeitem', { name: 'Note099.md' });

      // The first reveal expands the folder; subsequent reveals reuse it.
      for (let attempt = 0; attempt < 2; attempt++) {
        await filter.fill('Note099');
        await target.click();
        await expect(page).toHaveURL('/notes/Folder/Note099.md');
        await filter.fill('');

        await expect(target).toBeInViewport();
        await expect(target).toHaveAttribute('aria-selected', 'true');
        await expect(filter).toBeFocused();
      }
    });

    // @pierre/trees renders row labels as truncation fragments, so text-based
    // locators can't match a full name — use the treeitem's accessible name.
    test('renders folders', async ({ page }) => {
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(
        sidebar.getByRole('treeitem', { name: 'Economics Notes' })
      ).toBeVisible();
      await expect(
        sidebar.getByRole('treeitem', { name: 'Research Notes' })
      ).toBeVisible();
    });

    test('keeps the active note loaded when an ancestor folder is renamed', async ({
      page,
      context,
    }) => {
      await setupWailsEvents(context);
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
      await emitWailsEvent(page, 'folder:rename', [
        {
          oldFolderPath: 'Economics Notes',
          newFolderPath: 'Course Notes',
        },
      ]);

      await expect(page).toHaveURL('/notes/Course%20Notes/Inflation.md');
      await expect(page.locator('#content-editable-editor')).toBeVisible();
    });

    for (const itemName of ['Inflation.md', 'Child']) {
      test(`restores ${itemName} after a failed move with an unchanged path response`, async ({
        page,
        context,
      }) => {
        const getPaths = {
          file: SERVICE_FILES.FILE_TREE_SERVICE,
          method: 'GetAllPaths',
        };
        const moveItems = {
          file: SERVICE_FILES.FILE_TREE_SERVICE,
          method: 'MoveItemsToFolder',
        };
        const paths = [
          'Source/',
          'Source/Inflation.md',
          'Source/Child/',
          'Source/Child/nested.md',
          'Target/',
          'other.md',
        ];
        await mockBinding(context, getPaths, {
          success: true,
          message: '',
          data: paths,
        });
        await mockBinding(context, moveItems, {
          success: false,
          message: 'Move failed',
        });
        const pageErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        const source = sidebar.getByRole('treeitem', {
          name: 'Source',
          exact: true,
        });
        const target = sidebar.getByRole('treeitem', {
          name: 'Target',
          exact: true,
        });
        await source.click();
        await target.click();
        const item = sidebar.getByRole('treeitem', {
          name: itemName,
          exact: true,
        });
        await expect(item).toBeVisible();
        const fetchesBefore = (await getMockBindingCalls(page, getPaths))
          .length;

        await item.dragTo(target);

        await expect
          .poll(() => getMockBindingCalls(page, moveItems))
          .toEqual([[['Source/' + itemName], 'Target']]);
        await expect
          .poll(async () => (await getMockBindingCalls(page, getPaths)).length)
          .toBeGreaterThan(fetchesBefore);
        await expect(item).toHaveCount(1);
        await source.click();
        await expect(source).toHaveAttribute('aria-expanded', 'false');
        await expect(item).toHaveCount(0);
        await source.click();
        await expect(item).toBeVisible();
        expect(pageErrors).toEqual([]);
      });
    }

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

    test.describe('Context menu', () => {
      test('shows Reveal in Finder option in folder context menu', async ({
        page,
      }) => {
        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        const contextMenu = await openContextMenu(
          sidebar.getByRole('treeitem', { name: 'Economics Notes' })
        );
        await expect(contextMenu).toBeVisible();
        const revealOption = contextMenu.getByText('Reveal In Finder');
        await expect(revealOption).toBeVisible();
      });

      test('opens the folder rename input via context menu', async ({
        page,
      }) => {
        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        const contextMenu = await openContextMenu(
          sidebar.getByRole('treeitem', { name: 'Economics Notes' })
        );
        await contextMenu.getByText('Rename').click();

        // An inline input should appear with the current folder name
        const input = page.getByRole('textbox', {
          name: 'Rename Economics Notes',
        });
        await expect(input).toBeVisible();
        await expect(input).toHaveValue('Economics Notes');
      });

      test('creates a nested folder via context menu', async ({
        page,
        context,
      }) => {
        const addFolderBinding = {
          file: SERVICE_FILES.FOLDER_SERVICE,
          method: 'AddFolder',
        };
        const renameFolderBinding = {
          file: SERVICE_FILES.FOLDER_SERVICE,
          method: 'RenameFolder',
        };
        await mockBinding(context, addFolderBinding, MOCK_SUCCESS_RESPONSE);
        await mockBinding(context, renameFolderBinding, MOCK_SUCCESS_RESPONSE);

        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        const contextMenu = await openContextMenu(
          sidebar.getByRole('treeitem', { name: 'Economics Notes' })
        );
        await contextMenu.getByText('Create Folder').click();

        const input = page.getByRole('textbox', { name: 'Rename Untitled' });
        await expect(input).toBeVisible();
        await input.fill('My Todos');
        const previousUrl = page.url();
        // Hold the RPC response so premature tree navigation stays observable.
        await page.evaluate(() => {
          const originalFetch = window.fetch.bind(window);
          let release: () => void;
          const pending = new Promise<void>((resolve) => {
            release = resolve;
          });
          Object.assign(window, { releaseFolderCreation: () => release() });
          window.fetch = async (input, init) => {
            const response = await originalFetch(input, init);
            if (
              typeof init?.body === 'string' &&
              JSON.parse(init.body).args?.args?.[0] ===
                'Economics Notes/My Todos'
            ) {
              await pending;
            }
            return response;
          };
        });

        await input.press('Enter');

        await expect
          .poll(() => getMockBindingCalls(page, addFolderBinding))
          .toEqual([['Economics Notes/My Todos']]);
        await expect(page).toHaveURL(previousUrl);
        await expect(
          page.getByRole('heading', {
            name: 'Sorry, but this note does not exist.',
          })
        ).not.toBeVisible();
        await page.evaluate(() => {
          (
            window as typeof window & { releaseFolderCreation: () => void }
          ).releaseFolderCreation();
        });
        await expect
          .poll(() => getMockBindingCalls(page, renameFolderBinding))
          .toEqual([]);
        await expect(page).toHaveURL('/notes/Economics%20Notes/My%20Todos');
        await expect(
          page.getByRole('heading', { name: 'My Todos' })
        ).toBeVisible();
        await expect(
          page.getByRole('heading', {
            name: 'Sorry, but this note does not exist.',
          })
        ).not.toBeVisible();
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
        await sidebar
          .getByRole('treeitem', { name: 'First', exact: true })
          .click();
        await sidebar
          .getByRole('treeitem', { name: 'Second', exact: true })
          .click();
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
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();

        await expect
          .poll(() => getMockBindingCalls(page, getTags))
          .toContainEqual([paths]);
        await expect
          .poll(() => getMockBindingCalls(page, setTags))
          .toEqual([[paths, ['dev'], []]]);
        await expect(dialog).not.toBeVisible();
      });

      test('does not show Edit Tags for folders', async ({ page }) => {
        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        const contextMenu = await openContextMenu(
          sidebar.getByRole('treeitem', { name: 'Economics Notes' })
        );
        await expect(contextMenu).toBeVisible();
        await expect(contextMenu.getByText('Edit Tags')).not.toBeVisible();
      });

      test('moves a folder to trash via context menu', async ({
        page,
        context,
      }) => {
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
    });
  });

  test.describe('Kernels Accordion', () => {
    test('renders kernel accordion', async ({ page }) => {
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Kernels');

      const kernelAccordion = page.getByTestId('kernels-accordion');
      await kernelAccordion.click();
      await expect(sidebar).toContainText('python');
      await expect(sidebar).toContainText('go');
      await expect(sidebar).toContainText('javascript');
      await expect(sidebar).toContainText('java');
    });
  });

  test.describe('Tags Accordion', () => {
    test('fills the file filter when a tag is clicked', async ({ page }) => {
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Tags');

      const tagsAccordion = page.getByTestId('tags-accordion');
      await tagsAccordion.click();
      await expect(sidebar).toContainText('economics');
      await expect(sidebar).toContainText('research');
      await expect(sidebar).toContainText('dev');

      const tagButton = sidebar.getByRole('button', {
        name: 'economics',
        exact: true,
      });
      await tagButton.click();

      await expect(
        sidebar.getByRole('searchbox', { name: 'Filter files' })
      ).toHaveValue('#"economics"');
      await expect(sidebar.getByText('4 results')).toBeVisible();
      await expect(
        sidebar.getByRole('button', { name: 'Save search' })
      ).toBeVisible();
      await expect(page).toHaveURL('/');
      await expect(tagButton).toBeFocused();
    });

    test.describe('Context menu', () => {
      test('deletes a tag via context menu', async ({ page, context }) => {
        await setupWailsEvents(context);

        await mockBinding(
          context,
          { file: SERVICE_FILES.TAGS_SERVICE, method: 'DeleteTags' },
          { success: true, message: '', data: null }
        );

        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        const tagsAccordion = page.getByTestId('tags-accordion');
        await tagsAccordion.click();

        await expect(sidebar).toContainText('economics');

        const contextMenu = await openContextMenu(
          sidebar.getByText('economics', { exact: true })
        );
        await contextMenu.getByText('Delete Tag').click();

        const dialog = page.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', { name: 'Delete Tag' })
        ).toBeVisible();

        const updatedTagsResponse = {
          success: true,
          message: '',
          data: MOCK_TAGS_RESPONSE.data.filter((tag) => tag !== 'economics'),
        };

        await updateMockBindingResponse(
          page,
          { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTags' },
          updatedTagsResponse
        );

        await dialog.getByRole('button', { name: 'Delete' }).click();
        await emitWailsEvent(page, 'tags:index_update', {});

        await expect(
          sidebar.getByText('economics', { exact: true })
        ).not.toBeVisible();
      });
    });
  });

  test.describe('Saved Searches Accordion', () => {
    for (const filesOpen of [true, false]) {
      test(`fills and focuses the file filter with Files ${filesOpen ? 'open' : 'collapsed'}`, async ({
        page,
      }) => {
        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        await expect(sidebar).toContainText('Saved Searches');

        const savedSearchesAccordion = page.getByTestId(
          'saved-searches-accordion'
        );
        await savedSearchesAccordion.click();
        await expect(sidebar).toContainText('My Research');
        await expect(sidebar).toContainText('Economics');

        const savedSearchButton = sidebar.getByRole('button', {
          name: 'My Research',
          exact: true,
        });
        if (!filesOpen) {
          await sidebar
            .getByRole('button', { name: 'Files', exact: true })
            .click();
        }

        await savedSearchButton.click();

        const filter = sidebar.getByRole('searchbox', { name: 'Filter files' });
        await expect(filter).toHaveValue('research');
        await expect(page).toHaveURL('/');
        await expect(filter).toBeFocused();

        await savedSearchButton.click();

        await expect(filter).toBeFocused();
      });
    }

    test.describe('Context menu', () => {
      test('deletes a saved search via context menu', async ({
        page,
        context,
      }) => {
        await setupWailsEvents(context);

        await mockBinding(
          context,
          { file: SERVICE_FILES.SEARCH_SERVICE, method: 'RemoveSavedSearch' },
          { success: true, message: '', data: null }
        );

        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        const savedSearchesAccordion = page.getByTestId(
          'saved-searches-accordion'
        );
        await savedSearchesAccordion.click();

        await expect(sidebar).toContainText('My Research');

        const contextMenu = await openContextMenu(
          sidebar.getByText('My Research')
        );
        await contextMenu.getByText('Delete Search').click();

        const dialog = page.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', { name: 'Delete Saved Search' })
        ).toBeVisible();

        const updatedSavedSearchesResponse = {
          success: true,
          message: '',
          data: MOCK_SAVED_SEARCHES_RESPONSE.data.filter(
            (s) => s.name !== 'My Research'
          ),
        };

        await updateMockBindingResponse(
          page,
          { file: SERVICE_FILES.SEARCH_SERVICE, method: 'GetAllSavedSearches' },
          updatedSavedSearchesResponse
        );

        await dialog.getByRole('button', { name: 'Delete' }).click();
        await emitWailsEvent(page, 'saved-search:update', {});

        await expect(sidebar.getByText('My Research')).not.toBeVisible();
      });
    });
  });

  test('creates a dotted folder via inline input', async ({
    page,
    context,
  }) => {
    const NEW_FOLDER_NAME = 'My Todos.v1';

    await mockBinding(
      context,
      { file: SERVICE_FILES.FOLDER_SERVICE, method: 'AddFolder' },
      {
        success: true,
        message: '',
        data: ['Economics Notes', 'Research Notes', NEW_FOLDER_NAME],
      }
    );

    await page.goto('/');

    const fileTree = page.locator('#file-tree');

    // Click the Create Folder button in the file tree
    await fileTree.getByText('Create Folder').click();

    // An inline input should appear with placeholder "New folder"
    const input = fileTree.locator('input[placeholder="New folder"]');
    await expect(input).toBeVisible();

    await input.fill(NEW_FOLDER_NAME);
    await input.press('Enter');

    // Verify navigation to the new folder
    await expect(page).toHaveURL(
      `/notes/${encodeURIComponent(NEW_FOLDER_NAME)}`
    );
    await expect(page.getByText('This folder is empty')).toBeVisible();
  });

  test.describe('Pinned Accordion', () => {
    test('renders pinned notes list', async ({ page }) => {
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Pinned');

      // Pinned notes are open by default
      await expect(sidebar).toContainText('Supply and Demand');
      await expect(sidebar).toContainText('Quantum Physics');
    });

    test('navigates to pinned note', async ({ page, context }) => {
      // Mock note dependencies to prevent /404 redirect
      await mockNote(context, '# Supply and Demand');
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await sidebar.getByText('Supply and Demand').click();
      await expect(page).toHaveURL(
        /\/notes\/Economics%20Notes\/Supply%20and%20Demand/
      );
    });

    test('unpins a note via context menu', async ({ page, context }) => {
      await setupWailsEvents(context);

      const updatedSettings = {
        success: true,
        message: '',
        data: {
          ...MOCK_PROJECT_SETTINGS_RESPONSE.data,
          pinnedNotes: ['Research Notes/Quantum Physics.md'],
        },
      };

      await mockBinding(
        context,
        {
          file: SERVICE_FILES.SETTINGS_SERVICE,
          method: 'UpdateProjectSettings',
        },
        { success: true, message: '', data: null }
      );

      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');

      await expect(sidebar).toContainText('Supply and Demand');
      await expect(sidebar).toContainText('Quantum Physics');

      const contextMenu = await openContextMenu(
        sidebar.getByText('Supply and Demand')
      );
      await expect(contextMenu).toBeVisible();
      await expect(contextMenu).toContainText('Unpin Note');

      await updateMockBindingResponse(
        page,
        { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
        updatedSettings
      );

      await contextMenu.getByText('Unpin Note').click();
      await emitWailsEvent(page, 'settings:update', updatedSettings.data);

      await expect(sidebar.getByText('Supply and Demand')).not.toBeVisible();
      await expect(sidebar).toContainText('Quantum Physics');
    });
  });

  test.describe('Recent Accordion', () => {
    test('renders recent items accordion', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'mostRecentItems',
          JSON.stringify(['Economics Notes/Inflation.md', 'Research Notes'])
        );
      });

      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Recent');

      const recentAccordion = page.getByTestId('recent-accordion');
      await recentAccordion.click();

      await expect(sidebar).toContainText('Inflation');
      await expect(sidebar).toContainText('Research Notes');
    });
  });

  test.describe('Failure responses', () => {
    for (const scenario of [
      {
        name: 'tags',
        file: SERVICE_FILES.TAGS_SERVICE,
        method: 'GetTags',
        accordion: 'tags-accordion',
        heading: 'Tags',
      },
      {
        name: 'saved searches',
        file: SERVICE_FILES.SEARCH_SERVICE,
        method: 'GetAllSavedSearches',
        accordion: 'saved-searches-accordion',
        heading: 'Saved Searches',
      },
    ]) {
      test(`shows error message when ${scenario.name} fetch fails`, async ({
        page,
        context,
      }) => {
        await mockBinding(
          context,
          { file: scenario.file, method: scenario.method },
          {
            success: false,
            message: `Failed to fetch ${scenario.name}`,
            data: null,
          }
        );
        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        await expect(sidebar).toContainText(scenario.heading);

        await page.getByTestId(scenario.accordion).click();

        await expect(
          sidebar.getByText(
            `Something went wrong when fetching your ${scenario.name}`
          )
        ).toBeVisible();
        await expect(
          sidebar.getByRole('button', { name: 'Retry' })
        ).toBeVisible();
      });
    }
  });
});
