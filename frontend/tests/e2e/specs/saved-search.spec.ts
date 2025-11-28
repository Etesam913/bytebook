import { test, expect } from '@playwright/test';
import { mockBinding } from '../utils/mockBinding';
import {
  MOCK_FOLDER_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_TAGS_RESPONSE,
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
} from '../utils/mockResponses';
import { SERVICE_FILES } from '../utils/serviceFiles';

// Mock search results for the saved search page
const MOCK_FULL_TEXT_SEARCH_RESPONSE = [
  {
    type: 'note',
    folder: 'Economics Notes',
    note: 'Supply and Demand.md',
    tags: ['economics', 'basics'],
    lastUpdated: '2024-01-15T10:30:00Z',
    created: '2024-01-10T09:00:00Z',
    highlights: [
      {
        field: 'content',
        fragments: ['This is a <mark>search</mark> result highlight'],
      },
    ],
  },
  {
    type: 'note',
    folder: 'Economics Notes',
    note: 'Inflation.md',
    tags: ['economics'],
    lastUpdated: '2024-01-14T15:00:00Z',
    created: '2024-01-11T10:00:00Z',
    highlights: [],
  },
  {
    type: 'note',
    folder: 'Research Notes',
    note: 'Quantum Physics.md',
    tags: ['research', 'physics'],
    lastUpdated: '2024-01-13T12:00:00Z',
    created: '2024-01-12T08:00:00Z',
    highlights: [],
  },
];

const MOCK_EMPTY_SEARCH_RESPONSE: [] = [];

test.describe('Saved Search Page', () => {
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

    // Mock the full-text search
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.SEARCH_SERVICE,
        method: 'FullTextSearch',
      },
      MOCK_FULL_TEXT_SEARCH_RESPONSE
    );
  });

  test('renders saved search page with search query in header', async ({
    page,
  }) => {
    await page.goto('/saved-search/research');

    // Verify the search query is displayed in the header
    await expect(page.getByText('Search:')).toBeVisible();
    await expect(page.getByText('research', { exact: true })).toBeVisible();
  });

  test('displays result count when results exist', async ({ page }) => {
    await page.goto('/saved-search/research');

    // Should show 3 results (3 notes from mock)
    await expect(page.getByText('3 results')).toBeVisible();
  });

  test('displays search results in the sidebar', async ({ page }) => {
    await page.goto('/saved-search/research');

    // Verify note names are displayed
    await expect(page.getByText('Supply and Demand').first()).toBeVisible();
    await expect(page.getByText('Inflation').first()).toBeVisible();
    await expect(page.getByText('Quantum Physics').first()).toBeVisible();
  });

  test('auto-navigates to the first result', async ({ page }) => {
    await page.goto('/saved-search/research');

    // Should auto-navigate to the first note in results
    await expect(page).toHaveURL(
      /\/saved-search\/research\/Economics%20Notes\/Supply%20and%20Demand/
    );
  });

  test('renders the note editor when a result is selected', async ({
    page,
    context,
  }) => {
    // Additional mocks needed for rendering the note
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
        method: 'GetNoteMarkdown',
      },
      MOCK_NOTE_MARKDOWN_RESPONSE
    );

    await page.goto(
      '/saved-search/research/Economics%20Notes/Supply%20and%20Demand?ext=md'
    );

    // Wait for the note container to be visible
    const noteContainer = page.locator('#note-container');
    await expect(noteContainer).toBeVisible();

    // Verify the note title is rendered
    const noteTitleInput = noteContainer.locator(
      'input[placeholder="Untitled Note"]'
    );
    await expect(noteTitleInput).toHaveValue('Supply and Demand');
  });

  test.describe('Tag search', () => {
    test('navigates to saved search from tag click', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');

      // Open the tags accordion
      const tagsAccordion = page.getByTestId('tags-accordion');
      await tagsAccordion.click();

      // Click on a tag
      await sidebar.getByText('economics', { exact: true }).click();

      // Should navigate to saved-search with the tag query (# prefix)
      await expect(page).toHaveURL(/\/saved-search\/%23economics/);
    });

    test('displays tag search query correctly', async ({ page }) => {
      await page.goto('/saved-search/%23economics');

      // Verify the search query shows the tag with # prefix
      await expect(page.getByText('#economics')).toBeVisible();
    });
  });

  test.describe('Empty state', () => {
    test('shows no results message when search returns empty', async ({
      page,
      context,
    }) => {
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.SEARCH_SERVICE,
          method: 'FullTextSearch',
        },
        MOCK_EMPTY_SEARCH_RESPONSE
      );

      await page.goto('/saved-search/nonexistent');

      // Should show "No results found" message
      await expect(
        page.getByText('No results found', { exact: true })
      ).toBeVisible();
    });

    test('shows empty list message with search query', async ({
      page,
      context,
    }) => {
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.SEARCH_SERVICE,
          method: 'FullTextSearch',
        },
        MOCK_EMPTY_SEARCH_RESPONSE
      );

      await page.goto('/saved-search/xyz123');

      // Should show the specific "No results found for" message
      await expect(
        page.getByText('No results found for "xyz123"')
      ).toBeVisible();
    });
  });

  test.describe('Error state', () => {
    test('shows error message when search fails', async ({ page, context }) => {
      const FAILURE_RESPONSE = {
        success: false,
        message: 'Search service unavailable',
        data: null,
      };

      await mockBinding(
        context,
        {
          file: SERVICE_FILES.SEARCH_SERVICE,
          method: 'FullTextSearch',
        },
        FAILURE_RESPONSE
      );

      await page.goto('/saved-search/test');

      // Should show error message
      await expect(
        page.getByText(
          'Something went wrong when retrieving the search results'
        )
      ).toBeVisible();

      // Should show retry button
      await expect(page.getByText('Retry')).toBeVisible();
    });
  });

  test.describe('URL encoding', () => {
    test('handles encoded search queries correctly', async ({ page }) => {
      await page.goto('/saved-search/hello%20world');

      // Verify the decoded search query is displayed
      await expect(page.getByText('hello world')).toBeVisible();
    });

    test('handles special characters in search query', async ({ page }) => {
      await page.goto('/saved-search/test%26query');

      // Verify the decoded search query is displayed
      await expect(page.getByText('test&query')).toBeVisible();
    });
  });

  test.describe('Navigation from saved searches sidebar', () => {
    test('navigates to saved search from sidebar', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('folder-sidebar');

      // Open saved searches accordion
      const savedSearchesAccordion = page.getByTestId(
        'saved-searches-accordion'
      );
      await savedSearchesAccordion.click();

      // Click on a saved search
      await sidebar.getByText('My Research').click();

      // Should navigate to the saved search page
      await expect(page).toHaveURL(/\/saved-search\/research/);
    });
  });
});
