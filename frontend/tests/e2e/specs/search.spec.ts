import { test, expect } from '@playwright/test';
import { mockBinding } from '../utils/mock-binding';
import {
  MOCK_TOP_LEVEL_ITEMS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_TAGS_RESPONSE,
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_FULL_TEXT_SEARCH_RESPONSE,
  MOCK_EMPTY_SEARCH_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';

test.describe('Search Page', () => {
  test.beforeEach(async ({ context }) => {
    // File sidebar dependencies
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

    // Default to the populated full-text-search response. Individual tests
    // override this when they need empty/error variants.
    await mockBinding(
      context,
      { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
      MOCK_FULL_TEXT_SEARCH_RESPONSE
    );
  });

  test('displays the result count when results exist', async ({ page }) => {
    await page.goto('/search/research/');

    await expect(page.getByText('3 results')).toBeVisible();
  });

  test('renders search results in the search sidebar', async ({ page }) => {
    await page.goto('/search/research/');

    const sidebar = page.getByTestId('file-sidebar');
    await expect(sidebar.getByText('Supply and Demand').first()).toBeVisible();
    await expect(sidebar.getByText('Inflation').first()).toBeVisible();
    await expect(sidebar.getByText('Quantum Physics').first()).toBeVisible();
  });

  test('renders the note for the active result', async ({ page, context }) => {
    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'DoesNoteExist' },
      MOCK_NOTE_EXISTS_RESPONSE
    );

    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
      MOCK_NOTE_MARKDOWN_RESPONSE
    );

    await page.goto(
      '/search/research/Economics%20Notes/Supply%20and%20Demand.md'
    );

    const noteContainer = page.locator('#note-container');
    await expect(noteContainer).toBeVisible();

    const noteTitleInput = noteContainer.locator(
      'input[placeholder="Untitled Note"]'
    );
    await expect(noteTitleInput).toHaveValue('Supply and Demand');
  });

  test.describe('Empty state', () => {
    test('shows the help/examples panel when the query is empty', async ({
      page,
    }) => {
      await page.goto('/search/');

      const sidebar = page.getByTestId('file-sidebar');
      await expect(sidebar.getByText('Examples')).toBeVisible();
      await expect(sidebar.getByText('Basics')).toBeVisible();
    });

    test('shows "0 results found" when the search returns nothing', async ({
      page,
      context,
    }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
        MOCK_EMPTY_SEARCH_RESPONSE
      );

      await page.goto('/search/nonexistent/');

      await expect(page.getByText('0 results found')).toBeVisible();
    });

    test('does not render the note content area when no result is selected', async ({
      page,
      context,
    }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
        MOCK_EMPTY_SEARCH_RESPONSE
      );

      await page.goto('/search/nonexistent/');

      await expect(
        page.getByText('Type a search query to get started')
      ).toBeVisible();
    });
  });

  test.describe('Error state', () => {
    test('shows an error message when the search request fails', async ({
      page,
      context,
    }) => {
      // Returning null causes useFullTextSearchQuery to throw when it reads
      // lastPage.hasMore, which puts the query into the isError state.
      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
        null
      );

      await page.goto('/search/test/');

      await expect(
        page.getByText(
          'Something went wrong when retrieving the search results'
        )
      ).toBeVisible();
      await expect(page.getByText('Retry')).toBeVisible();
    });
  });
});
