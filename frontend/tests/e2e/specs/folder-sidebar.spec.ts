import { test, expect } from '@playwright/test';
import { mockBinding, updateMockBindingResponse } from '../utils/mock-binding';
import {
  MOCK_TOP_LEVEL_ITEMS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_TAGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';
import { setupWailsEvents, emitWailsEvent } from '../utils/wails-events';

test.describe('File Sidebar', () => {
  test.beforeEach(async ({ context }) => {
    await mockBinding(
      context,
      { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetTopLevelItems' },
      MOCK_TOP_LEVEL_ITEMS_RESPONSE
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

  test('renders on the landing page', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByTestId('file-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test.describe('File Tree', () => {
    test('renders folders', async ({ page }) => {
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Economics Notes');
      await expect(sidebar).toContainText('Research Notes');
    });

    test('clicking on folder navigates to the correct location', async ({
      page,
    }) => {
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Economics Notes');
      const economicsFolder = sidebar.getByText('Economics Notes');
      await economicsFolder.click();
      await expect(page).toHaveURL(/\/notes\/Economics%20Notes/i);
    });

    test.describe('Context menu', () => {
      test('reveal in finder option is visible', async ({ page, context }) => {
        // Mock RevealFolderOrFileInFinder
        await mockBinding(
          context,
          {
            file: SERVICE_FILES.NOTE_SERVICE,
            method: 'RevealFolderOrFileInFinder',
          },
          MOCK_SUCCESS_RESPONSE
        );

        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        await sidebar.getByText('Economics Notes').click({ button: 'right' });

        const contextMenu = page.getByRole('listbox');
        await expect(contextMenu).toBeVisible();
        const revealOption = contextMenu.getByText('Reveal In Finder');
        await expect(revealOption).toBeVisible();
      });

      test('renames a folder via context menu', async ({ page, context }) => {
        // Mock RenameFolder to succeed
        await mockBinding(
          context,
          { file: SERVICE_FILES.FOLDER_SERVICE, method: 'RenameFolder' },
          {
            success: true,
            message: '',
            data: ['Research Notes', 'Macroeconomics'],
          }
        );

        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');
        await sidebar.getByText('Economics Notes').click({ button: 'right' });

        const contextMenu = page.getByRole('listbox');
        await contextMenu.getByText('Rename').click();

        // An inline input should appear with the current folder name
        const fileTree = page.locator('#file-tree');
        const input = fileTree.locator('input');
        await expect(input).toBeVisible();
        await expect(input).toHaveValue('Economics Notes');
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

        await page.goto('/');
        const sidebar = page.getByTestId('file-sidebar');

        // Verify folders are visible
        await expect(sidebar).toContainText('Economics Notes');
        await expect(sidebar).toContainText('Research Notes');

        // Update GetTopLevelItems mock so refetch returns only remaining folders
        await updateMockBindingResponse(
          page,
          { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetTopLevelItems' },
          {
            success: true,
            message: '',
            data: [
              {
                id: 'folder-2',
                path: 'Research Notes',
                name: 'Research Notes',
                parentId: '',
                type: 'folder',
                childrenIds: [],
              },
            ],
          }
        );

        // Right-click on a folder to open context menu
        await sidebar.getByText('Economics Notes').click({ button: 'right' });

        // Click "Move to Trash" - no confirmation dialog, items removed optimistically
        const contextMenu = page.getByRole('listbox');
        await expect(contextMenu).toBeVisible();
        await contextMenu.getByText('Move to Trash').click();

        // Verify the folder is no longer in the sidebar
        await expect(sidebar.getByText('Economics Notes')).not.toBeVisible();

        // Verify other folders are still visible
        await expect(sidebar).toContainText('Research Notes');
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
    test('renders tags accordion and navigates on click', async ({ page }) => {
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Tags');

      const tagsAccordion = page.getByTestId('tags-accordion');
      await tagsAccordion.click();
      await expect(sidebar).toContainText('economics');
      await expect(sidebar).toContainText('research');
      await expect(sidebar).toContainText('dev');

      // Click on a tag and verify navigation to saved-search route with # prefix
      await sidebar.getByText('economics', { exact: true }).click();
      await expect(page).toHaveURL(/\/saved-search\/%23economics/);
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

        await sidebar
          .getByText('economics', { exact: true })
          .click({ button: 'right' });

        const contextMenu = page.getByRole('listbox');
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
    test('renders saved searches accordion and navigates on click', async ({
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

      await sidebar.getByText('My Research').click();
      await expect(page).toHaveURL(/\/saved-search\/research/);
    });

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

        await sidebar.getByText('My Research').click({ button: 'right' });

        const contextMenu = page.getByRole('listbox');
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

  test('creates a folder via inline input', async ({ page, context }) => {
    const NEW_FOLDER_NAME = 'My Todos';

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

    const sidebar = page.getByTestId('file-sidebar');
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
      new RegExp(`/notes/${encodeURIComponent(NEW_FOLDER_NAME)}`)
    );
  });

  test.describe('Pinned Notes Accordion', () => {
    test('renders correctly', async ({ page }) => {
      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Pinned Notes');

      // Pinned notes are open by default
      await expect(sidebar).toContainText('Supply and Demand');
      await expect(sidebar).toContainText('Quantum Physics');
    });

    test('navigates to pinned note', async ({ page, context }) => {
      // Mock note dependencies to prevent /404 redirect
      await mockBinding(
        context,
        { file: SERVICE_FILES.NOTE_SERVICE, method: 'DoesNoteExist' },
        true
      );
      await mockBinding(
        context,
        { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
        { success: true, message: '', data: '# Supply and Demand' }
      );
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.FILE_TREE_SERVICE,
          method: 'GetChildrenOfFolderBasedOnPath',
        },
        {
          success: true,
          message: '',
          data: { items: [], nextCursor: '', hasMore: false },
        }
      );
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.FILE_TREE_SERVICE,
          method: 'OpenFolderAndAddToFileWatcher',
        },
        { success: true, message: '' }
      );

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

      await sidebar.getByText('Supply and Demand').click({ button: 'right' });

      const contextMenu = page.getByRole('listbox');
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

  test.describe('Recent Notes Accordion', () => {
    test('renders recent notes accordion', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'mostRecentNotes',
          JSON.stringify([
            'Economics Notes/Inflation.md',
            'Research Notes/Black Holes.md',
          ])
        );
      });

      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Recent Notes');

      const recentNotesAccordion = page.getByTestId('recent-notes-accordion');
      await recentNotesAccordion.click();

      await expect(sidebar).toContainText('Inflation');
      await expect(sidebar).toContainText('Black Holes');
    });
  });

  test.describe('Failure responses', () => {
    test('shows error message when tags fetch fails', async ({
      page,
      context,
    }) => {
      const FAILURE_RESPONSE = {
        success: false,
        message: 'Failed to fetch tags',
        data: null,
      };

      await mockBinding(
        context,
        { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTags' },
        FAILURE_RESPONSE
      );

      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Tags');

      const tagsAccordion = page.getByTestId('tags-accordion');
      await tagsAccordion.click();

      await expect(
        sidebar.getByText('Something went wrong when fetching your tags')
      ).toBeVisible();
      await expect(sidebar.getByText('Retry')).toBeVisible();
    });

    test('shows error message when saved searches fetch fails', async ({
      page,
      context,
    }) => {
      const FAILURE_RESPONSE = {
        success: false,
        message: 'Failed to fetch saved searches',
        data: null,
      };

      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'GetAllSavedSearches' },
        FAILURE_RESPONSE
      );

      await page.goto('/');
      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar).toContainText('Saved Searches');

      const savedSearchesAccordion = page.getByTestId(
        'saved-searches-accordion'
      );
      await savedSearchesAccordion.click();

      await expect(
        sidebar.getByText(
          'Something went wrong when fetching your saved searches'
        )
      ).toBeVisible();
      await expect(sidebar.getByText('Retry')).toBeVisible();
    });
  });
});
