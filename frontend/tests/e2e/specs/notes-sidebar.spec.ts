import { test, expect } from '@playwright/test';
import { mockBinding, updateMockBindingResponse } from '../utils/mockBinding';
import {
  MOCK_FOLDER_RESPONSE,
  MOCK_NOTES_RESPONSE,
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_PREVIEW_RESPONSE,
} from '../utils/mockResponses';
import { SERVICE_FILES } from '../utils/serviceFiles';
import { humanFileSize } from '../../../src/utils/general';

const formattedPreviewDate = new Date(
  MOCK_NOTE_PREVIEW_RESPONSE.data.lastUpdated
).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const formattedPreviewSize = humanFileSize(
  MOCK_NOTE_PREVIEW_RESPONSE.data.size,
  true
);

test.describe('Notes Sidebar', () => {
  test.beforeEach(async ({ context }) => {
    // Mock folder sidebar dependencies
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.FOLDER_SERVICE,
        method: 'GetFolders',
      },
      MOCK_FOLDER_RESPONSE
    );

    // Mock notes sidebar dependencies
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNotes',
      },
      MOCK_NOTES_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'DoesNoteExist',
      },
      MOCK_NOTE_EXISTS_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNotePreview',
      },
      MOCK_NOTE_PREVIEW_RESPONSE
    );
  });

  test('renders notes sidebar when navigating to a folder', async ({
    page,
  }) => {
    await page.goto('/notes/Economics%20Notes');

    const sidebar = page.getByTestId('notes-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('displays folder name in the sidebar header', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes');

    const sidebar = page.getByTestId('notes-sidebar');
    await expect(sidebar).toContainText('Economics Notes');
  });

  test('displays the list of notes', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes');

    const sidebar = page.getByTestId('notes-sidebar');
    await expect(sidebar).toContainText('Supply and Demand');
    await expect(sidebar).toContainText('Inflation');
    await expect(sidebar).toContainText('Market Equilibrium');

    // Check preview info for each note simply by note button label
    const noteButtons = [
      sidebar.getByRole('button', { name: 'Supply and Demand' }),
      sidebar.getByRole('button', { name: 'Inflation' }),
      sidebar.getByRole('button', { name: 'Market Equilibrium' }),
    ];

    for (const noteButton of noteButtons) {
      await expect(noteButton).toContainText(formattedPreviewDate);
      await expect(noteButton).toContainText(formattedPreviewSize);
    }
  });

  test('displays note count', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes');

    const sidebar = page.getByTestId('notes-sidebar');
    // Should show (3) since we have 3 notes in the mock
    await expect(sidebar).toContainText('(3)');
  });

  test('displays "My Notes" header', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes');

    const sidebar = page.getByTestId('notes-sidebar');
    await expect(sidebar).toContainText('My Notes');
  });

  test('displays "Create Note" button', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes');

    const sidebar = page.getByTestId('notes-sidebar');
    await expect(sidebar).toContainText('Create Note');
  });

  test('creates a note via the sidebar button', async ({ page, context }) => {
    const NEW_NOTE_NAME = 'Product Strategy';
    const UPDATED_NOTES_RESPONSE = {
      success: true,
      message: '',
      data: [
        ...MOCK_NOTES_RESPONSE.data,
        { folder: 'Economics Notes', note: `${NEW_NOTE_NAME}.md` },
      ],
    };

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

    await page.goto('/notes/Economics%20Notes');

    await updateMockBindingResponse(
      page,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNotes',
      },
      UPDATED_NOTES_RESPONSE
    );

    const sidebar = page.getByTestId('notes-sidebar');
    await sidebar.getByRole('button', { name: 'Create Note' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Create Note' })
    ).toBeVisible();

    await dialog.getByLabel('New Note Name').fill(NEW_NOTE_NAME);
    await dialog.getByRole('button', { name: 'Create Note' }).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/notes/Economics%20Notes/${encodeURIComponent(NEW_NOTE_NAME)}`
      )
    );
    await expect(sidebar).toContainText(NEW_NOTE_NAME);
  });

  test('auto-navigates to the first note when visiting folder without a note selected', async ({
    page,
  }) => {
    await page.goto('/notes/Economics%20Notes');

    // Should navigate to the first note in the list
    await expect(page).toHaveURL(
      /\/notes\/Economics%20Notes\/Supply%20and%20Demand/
    );
  });

  test.describe('Empty state', () => {
    test('shows empty state message when no notes exist', async ({
      page,
      context,
    }) => {
      const EMPTY_NOTES_RESPONSE = {
        success: true,
        message: '',
        data: [],
      };

      await mockBinding(
        context,
        {
          file: SERVICE_FILES.NOTE_SERVICE,
          method: 'GetNotes',
        },
        EMPTY_NOTES_RESPONSE
      );

      await page.goto('/notes/Economics%20Notes');

      const sidebar = page.getByTestId('notes-sidebar');
      await expect(
        sidebar.getByText('Create a note using the "Create Note" button above')
      ).toBeVisible();
    });
  });

  test.describe('Error state', () => {
    test('shows error message when notes fetch fails', async ({
      page,
      context,
    }) => {
      const FAILURE_RESPONSE = {
        success: false,
        message: 'Failed to fetch notes',
        data: null,
      };

      await mockBinding(
        context,
        {
          file: SERVICE_FILES.NOTE_SERVICE,
          method: 'GetNotes',
        },
        FAILURE_RESPONSE
      );

      await page.goto('/notes/Economics%20Notes');

      const sidebar = page.getByTestId('notes-sidebar');
      await expect(
        sidebar.getByText('Something went wrong when retrieving the notes')
      ).toBeVisible();

      // Verify retry button is present
      await expect(sidebar.getByText('Retry')).toBeVisible();
    });
  });
});
