import { test, expect } from '@playwright/test';
import { mockBinding, updateMockBindingResponse } from '../utils/mock-binding';
import {
  MOCK_FOLDER_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_TAGS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';
import { setupWailsEvents, emitWailsEvent } from '../utils/wails-events';

test.describe('Folder Sidebar', () => {
  test.beforeEach(async ({ context }) => {
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.FOLDER_SERVICE,
        method: 'GetFolders',
      },
      MOCK_FOLDER_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.SETTINGS_SERVICE,
        method: 'GetProjectSettings',
      },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.TAGS_SERVICE,
        method: 'GetTags',
      },
      MOCK_TAGS_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.SEARCH_SERVICE,
        method: 'GetAllSavedSearches',
      },
      MOCK_SAVED_SEARCHES_RESPONSE
    );
  });

  test('renders on the landing page', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.getByTestId('folder-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test.describe('Folders Accordion', () => {
    test('renders folders', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Economics Notes');
      await expect(sidebar).toContainText('Research Notes');
    });

    test('clicking on folder navigates to the correct location', async ({
      page,
    }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Economics Notes');
      const economicsFolder = sidebar.getByText('Economics Notes');
      await economicsFolder.click();
      await expect(page).toHaveURL(/\/notes\/Economics%20Notes/i);
    });

    test.describe('Context menu', () => {
      test('reveal in finder option is visible', async ({ page }) => {
        await page.goto('/');

        const sidebar = page.getByTestId('folder-sidebar');
        await sidebar.getByText('Economics Notes').click({ button: 'right' });

        const contextMenu = page.getByRole('listbox');
        await expect(contextMenu).toBeVisible();

        const revealOption = contextMenu.getByText('Reveal In Finder');
        await expect(revealOption).toBeVisible();
      });

      test('renames a folder via context menu', async ({ page, context }) => {
        const NEW_FOLDER_NAME = 'Macroeconomics';

        // Mock RenameFolder to succeed
        await mockBinding(
          context,
          {
            file: SERVICE_FILES.FOLDER_SERVICE,
            method: 'RenameFolder',
          },
          { success: true, message: '', data: null }
        );

        await page.goto('/');

        const sidebar = page.getByTestId('folder-sidebar');
        await sidebar.getByText('Economics Notes').click({ button: 'right' });

        const contextMenu = page.getByRole('listbox');
        await contextMenu.getByText('Rename Folder').click();

        // Verify the dialog appears
        const dialog = page.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', { name: 'Rename Folder' })
        ).toBeVisible();

        const input = dialog.getByLabel('New Folder Name');
        await expect(input).toHaveValue('Economics Notes');
        await input.fill(NEW_FOLDER_NAME);

        // Update the GetFolders mock to return folders with the renamed one
        const updatedFolderResponse = {
          success: true,
          message: '',
          data: ['Research Notes', NEW_FOLDER_NAME],
        };

        await updateMockBindingResponse(
          page,
          {
            file: SERVICE_FILES.FOLDER_SERVICE,
            method: 'GetFolders',
          },
          updatedFolderResponse
        );

        // Click on "Rename Folder" button in the dialog
        await dialog.getByRole('button', { name: 'Rename Folder' }).click();

        // Verify navigation to the new folder URL
        await expect(page).toHaveURL(
          new RegExp(`/notes/${encodeURIComponent(NEW_FOLDER_NAME)}`)
        );

        // Verify the folder name updated in the sidebar
        await expect(sidebar).toContainText(NEW_FOLDER_NAME);
        await expect(sidebar.getByText('Economics Notes')).not.toBeVisible();
      });

      test('moves a folder to trash via context menu', async ({
        page,
        context,
      }) => {
        // Set up wails events for this test
        await setupWailsEvents(context);

        // Mock DeleteFolder to succeed
        await mockBinding(
          context,
          {
            file: SERVICE_FILES.FOLDER_SERVICE,
            method: 'DeleteFolder',
          },
          { success: true, message: '', data: null }
        );

        await page.goto('/');

        const sidebar = page.getByTestId('folder-sidebar');

        // Verify folders are visible
        await expect(sidebar).toContainText('Economics Notes');
        await expect(sidebar).toContainText('Research Notes');

        // Right-click on a folder to open context menu
        await sidebar.getByText('Economics Notes').click({ button: 'right' });

        // Verify the context menu appears with the Move to Trash option
        const contextMenu = page.getByRole('listbox');
        await expect(contextMenu).toBeVisible();
        await expect(contextMenu).toContainText('Move to Trash');

        // Click on "Move to Trash" option in context menu
        await contextMenu.getByText('Move to Trash').click();

        // Verify the dialog appears
        const dialog = page.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', { name: 'Move to Trash' })
        ).toBeVisible();

        // Update the GetFolders mock to return folders without the deleted one
        const updatedFolderResponse = {
          success: true,
          message: '',
          data: MOCK_FOLDER_RESPONSE.data.filter(
            (folder) => folder !== 'Economics Notes'
          ),
        };

        await updateMockBindingResponse(
          page,
          {
            file: SERVICE_FILES.FOLDER_SERVICE,
            method: 'GetFolders',
          },
          updatedFolderResponse
        );

        // Click on "Move to Trash" button in the dialog
        await dialog.getByRole('button', { name: 'Move to Trash' }).click();

        // Simulate the backend emitting a folder:delete event
        await emitWailsEvent(page, 'folder:delete', {});

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

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Kernels');

      const kernelAccordion = page.getByTestId('kernels-accordion');
      kernelAccordion.click();
      await expect(sidebar).toContainText('python');
      await expect(sidebar).toContainText('go');
      await expect(sidebar).toContainText('javascript');
      await expect(sidebar).toContainText('java');
    });
  });

  test.describe('Tags Accordion', () => {
    test('renders tags accordion and navigates on click', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');
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
        // Set up wails events for this test
        await setupWailsEvents(context);

        // Mock DeleteTags to succeed
        await mockBinding(
          context,
          {
            file: SERVICE_FILES.TAGS_SERVICE,
            method: 'DeleteTags',
          },
          { success: true, message: '', data: null }
        );

        await page.goto('/');

        const sidebar = page.getByTestId('folder-sidebar');
        const tagsAccordion = page.getByTestId('tags-accordion');
        await tagsAccordion.click();

        // Verify tags are visible
        await expect(sidebar).toContainText('economics');

        // Right-click on a tag
        await sidebar.getByText('economics', { exact: true }).click({
          button: 'right',
        });

        const contextMenu = page.getByRole('listbox');
        await contextMenu.getByText('Delete Tag').click();

        // Verify the dialog appears
        const dialog = page.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', { name: 'Delete Tag' })
        ).toBeVisible();

        // Update the GetTags mock to return tags without the deleted one
        const updatedTagsResponse = {
          success: true,
          message: '',
          data: MOCK_TAGS_RESPONSE.data.filter((tag) => tag !== 'economics'),
        };

        await updateMockBindingResponse(
          page,
          {
            file: SERVICE_FILES.TAGS_SERVICE,
            method: 'GetTags',
          },
          updatedTagsResponse
        );

        // Click on "Delete" button in the dialog
        await dialog.getByRole('button', { name: 'Delete' }).click();

        // Simulate the backend emitting a tags:index_update event
        await emitWailsEvent(page, 'tags:index_update', {});

        // Verify the tag is no longer in the sidebar
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

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Saved Searches');

      const savedSearchesAccordion = page.getByTestId(
        'saved-searches-accordion'
      );
      await savedSearchesAccordion.click();
      await expect(sidebar).toContainText('My Research');
      await expect(sidebar).toContainText('Economics');

      // Click on a saved search and verify navigation to saved-search route
      await sidebar.getByText('My Research').click();
      await expect(page).toHaveURL(/\/saved-search\/research/);
    });

    test.describe('Context menu', () => {
      test('deletes a saved search via context menu', async ({
        page,
        context,
      }) => {
        // Set up wails events for this test
        await setupWailsEvents(context);

        // Mock RemoveSavedSearch to succeed
        await mockBinding(
          context,
          {
            file: SERVICE_FILES.SEARCH_SERVICE,
            method: 'RemoveSavedSearch',
          },
          { success: true, message: '', data: null }
        );

        await page.goto('/');

        const sidebar = page.getByTestId('folder-sidebar');
        const savedSearchesAccordion = page.getByTestId(
          'saved-searches-accordion'
        );
        await savedSearchesAccordion.click();

        // Verify saved searches are visible
        await expect(sidebar).toContainText('My Research');

        // Right-click on a saved search
        await sidebar.getByText('My Research').click({ button: 'right' });

        const contextMenu = page.getByRole('listbox');
        await contextMenu.getByText('Delete Search').click();

        // Verify the dialog appears
        const dialog = page.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', { name: 'Delete Saved Search' })
        ).toBeVisible();

        // Update the GetAllSavedSearches mock to return searches without the deleted one
        const updatedSavedSearchesResponse = {
          success: true,
          message: '',
          data: MOCK_SAVED_SEARCHES_RESPONSE.data.filter(
            (s) => s.name !== 'My Research'
          ),
        };

        await updateMockBindingResponse(
          page,
          {
            file: SERVICE_FILES.SEARCH_SERVICE,
            method: 'GetAllSavedSearches',
          },
          updatedSavedSearchesResponse
        );

        // Click on "Delete" button in the dialog
        await dialog.getByRole('button', { name: 'Delete' }).click();

        // Simulate the backend emitting a saved-search:update event
        await emitWailsEvent(page, 'saved-search:update', {});

        // Verify the saved search is no longer in the sidebar
        await expect(sidebar.getByText('My Research')).not.toBeVisible();
      });
    });
  });

  test('creates a folder via the sidebar button', async ({ page, context }) => {
    const NEW_FOLDER_NAME = 'My Todos';
    const UPDATED_FOLDER_RESPONSE = {
      success: true,
      message: '',
      data: ['Economics Notes', 'Research Notes', NEW_FOLDER_NAME],
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.FOLDER_SERVICE,
        method: 'AddFolder',
      },
      UPDATED_FOLDER_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'AddNoteToFolder',
      },
      {
        success: true,
        message: '',
        data: null,
      }
    );

    await page.goto('/');

    await updateMockBindingResponse(
      page,
      {
        file: SERVICE_FILES.FOLDER_SERVICE,
        method: 'GetFolders',
      },
      UPDATED_FOLDER_RESPONSE
    );

    const sidebar = page.getByTestId('folder-sidebar');
    await sidebar.getByRole('button', { name: 'Create Folder' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Create Folder' })
    ).toBeVisible();

    await dialog.getByLabel('New Folder Name').fill(NEW_FOLDER_NAME);
    await dialog.getByRole('button', { name: 'Create Folder' }).click();

    await expect(page).toHaveURL(
      new RegExp(`/notes/${encodeURIComponent(NEW_FOLDER_NAME)}$`)
    );
    await expect(sidebar).toContainText(NEW_FOLDER_NAME);
  });

  test.describe('Pinned Notes Accordion', () => {
    test('renders correctly', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Pinned Notes');

      // Pinned notes are open by default
      await expect(sidebar).toContainText('Supply and Demand');
      await expect(sidebar).toContainText('Quantum Physics');
    });

    test('navigates to pinned note', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');
      await sidebar.getByText('Supply and Demand').click();
      await expect(page).toHaveURL(
        /\/notes\/Economics%20Notes\/Supply%20and%20Demand/
      );
    });

    test('unpins a note via context menu', async ({ page, context }) => {
      // Set up wails events for this test
      await setupWailsEvents(context);

      // Updated settings without the unpinned note
      const updatedSettings = {
        success: true,
        message: '',
        data: {
          ...MOCK_PROJECT_SETTINGS_RESPONSE.data,
          pinnedNotes: ['Research Notes/Quantum Physics.md'],
        },
      };

      // Mock UpdateProjectSettings to succeed
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.SETTINGS_SERVICE,
          method: 'UpdateProjectSettings',
        },
        { success: true, message: '', data: null }
      );

      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');

      // Verify both pinned notes are visible before unpinning
      await expect(sidebar).toContainText('Supply and Demand');
      await expect(sidebar).toContainText('Quantum Physics');

      // Right-click on the pinned note to open context menu
      await sidebar.getByText('Supply and Demand').click({ button: 'right' });

      // Verify the context menu appears with the Unpin option
      const contextMenu = page.getByRole('listbox');
      await expect(contextMenu).toBeVisible();
      await expect(contextMenu).toContainText('Unpin Note');

      // Update the GetProjectSettings mock to return the new settings (without the unpinned note)
      await updateMockBindingResponse(
        page,
        {
          file: SERVICE_FILES.SETTINGS_SERVICE,
          method: 'GetProjectSettings',
        },
        updatedSettings
      );

      // Click on "Unpin Note" option - this triggers UpdateProjectSettings
      await contextMenu.getByText('Unpin Note').click();

      // Simulate the backend emitting a settings:update event with the unpinned note removed
      await emitWailsEvent(page, 'settings:update', updatedSettings.data);

      // Verify the note is no longer in the pinned notes section
      await expect(sidebar.getByText('Supply and Demand')).not.toBeVisible();

      // Verify the other pinned note is still visible
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

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Recent Notes');

      const recentNotesAccordion = page.getByTestId('recent-notes-accordion');
      await recentNotesAccordion.click();

      await expect(sidebar).toContainText('Inflation');
      await expect(sidebar).toContainText('Black Holes');
    });
  });

  test.describe('Failure responses', () => {
    test('shows error message when folders fetch fails', async ({
      page,
      context,
    }) => {
      const FAILURE_RESPONSE = {
        success: false,
        message: 'Failed to fetch folders',
        data: null,
      };

      await mockBinding(
        context,
        {
          file: SERVICE_FILES.FOLDER_SERVICE,
          method: 'GetFolders',
        },
        FAILURE_RESPONSE
      );

      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Folders');

      // Verify error message is displayed
      await expect(
        sidebar.getByText('Something went wrong when fetching your folders')
      ).toBeVisible();

      // Verify retry button is present
      await expect(sidebar.getByText('Retry')).toBeVisible();
    });

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
        {
          file: SERVICE_FILES.TAGS_SERVICE,
          method: 'GetTags',
        },
        FAILURE_RESPONSE
      );

      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Tags');

      // Click to open the tags accordion
      const tagsAccordion = page.getByTestId('tags-accordion');
      await tagsAccordion.click();

      // Verify error message is displayed
      await expect(
        sidebar.getByText('Something went wrong when fetching your tags')
      ).toBeVisible();

      // Verify retry button is present
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
        {
          file: SERVICE_FILES.SEARCH_SERVICE,
          method: 'GetAllSavedSearches',
        },
        FAILURE_RESPONSE
      );

      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');
      await expect(sidebar).toContainText('Saved Searches');

      // Click to open the saved searches accordion
      const savedSearchesAccordion = page.getByTestId(
        'saved-searches-accordion'
      );
      await savedSearchesAccordion.click();

      // Verify error message is displayed
      await expect(
        sidebar.getByText(
          'Something went wrong when fetching your saved searches'
        )
      ).toBeVisible();

      // Verify retry button is present
      await expect(sidebar.getByText('Retry')).toBeVisible();
    });
  });
});
