import { test, expect } from '@playwright/test';
import { mockBinding, updateMockBindingResponse } from '../utils/mockBinding';
import {
  MOCK_FOLDER_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_TAGS_RESPONSE,
} from '../utils/mockResponses';
import { SERVICE_FILES } from '../utils/serviceFiles';

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

  test('renders tags accordion', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.getByTestId('folder-sidebar');
    await expect(sidebar).toContainText('Tags');

    const tagsAccordion = page.getByTestId('tags-accordion');
    tagsAccordion.click();
    await expect(sidebar).toContainText('economics');
    await expect(sidebar).toContainText('research');
    await expect(sidebar).toContainText('dev');
  });

  test('renders saved searches accordion', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.getByTestId('folder-sidebar');
    await expect(sidebar).toContainText('Saved Searches');

    const savedSearchesAccordion = page.getByTestId('saved-searches-accordion');
    savedSearchesAccordion.click();
    await expect(sidebar).toContainText('My Research');
    await expect(sidebar).toContainText('Economics');
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

  test('renders pinned notes accordion', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.getByTestId('folder-sidebar');
    await expect(sidebar).toContainText('Pinned Notes');

    // Pinned notes are open by default
    await expect(sidebar).toContainText('Supply and Demand');
    await expect(sidebar).toContainText('Quantum Physics');
  });

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
