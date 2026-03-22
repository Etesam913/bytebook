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

test.describe('Saved Search Page', () => {
  test.beforeEach(async ({ context }) => {
    // Mock file sidebar dependencies
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

    // Mock the full-text search
    await mockBinding(
      context,
      { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
      MOCK_FULL_TEXT_SEARCH_RESPONSE
    );
  });

  test('renders saved search page with search query in header', async ({ page }) => {
    await page.goto('/saved-search/research/');

    await expect(page.getByText('Search:')).toBeVisible();
    await expect(
      page.locator('header span.font-code', { hasText: 'research' })
    ).toBeVisible();
  });

  test('displays result count when results exist', async ({ page }) => {
    await page.goto('/saved-search/research/');

    // Should show 3 results (total from mock)
    await expect(page.getByText('3 results')).toBeVisible();
  });

  test('displays search results in the sidebar', async ({ page }) => {
    await page.goto('/saved-search/research/');

    await expect(page.getByText('Supply and Demand').first()).toBeVisible();
    await expect(page.getByText('Inflation').first()).toBeVisible();
    await expect(page.getByText('Quantum Physics').first()).toBeVisible();
  });

  test('auto-navigates to the first result', async ({ page }) => {
    await page.goto('/saved-search/research/');

    await expect(page).toHaveURL(
      /\/saved-search\/research\/Economics%20Notes\/Supply%20and%20Demand/
    );
  });

  test('renders the note editor when a result is selected', async ({ page, context }) => {
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
      '/saved-search/research/Economics%20Notes/Supply%20and%20Demand.md'
    );

    const noteContainer = page.locator('#note-container');
    await expect(noteContainer).toBeVisible();

    const noteTitleInput = noteContainer.locator('input[placeholder="Untitled Note"]');
    await expect(noteTitleInput).toHaveValue('Supply and Demand');
  });

  test.describe('Tag search', () => {
    test('navigates to saved search from tag click', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('file-sidebar');
      const tagsAccordion = page.getByTestId('tags-accordion');
      await tagsAccordion.click();

      await sidebar.getByText('economics', { exact: true }).click();
      await expect(page).toHaveURL(/\/saved-search\/%23economics/);
    });

    test('displays tag search query correctly', async ({ page }) => {
      await page.goto('/saved-search/%23economics/');

      await expect(page.getByText('#economics')).toBeVisible();
    });
  });

  test.describe('Empty state', () => {
    test('shows no results message when search returns empty', async ({ page, context }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
        MOCK_EMPTY_SEARCH_RESPONSE
      );

      await page.goto('/saved-search/nonexistent/');

      await expect(
        page.getByText('No results found', { exact: true })
      ).toBeVisible();
    });

    test('shows empty list message with search query', async ({ page, context }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
        MOCK_EMPTY_SEARCH_RESPONSE
      );

      await page.goto('/saved-search/xyz123/');

      await expect(
        page.getByText('No results found for "xyz123"')
      ).toBeVisible();
    });
  });

  test.describe('Error state', () => {
    test('shows error message when search fails', async ({ page, context }) => {
      // Mock FullTextSearch with null to cause FullTextSearchPage.createFrom to throw,
      // which makes the query reject and sets isError=true
      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
        null
      );

      await page.goto('/saved-search/test/');

      await expect(
        page.getByText('Something went wrong when retrieving the search results')
      ).toBeVisible();
      await expect(page.getByText('Retry')).toBeVisible();
    });
  });

  test.describe('URL encoding', () => {
    test('handles encoded search queries correctly', async ({ page }) => {
      await page.goto('/saved-search/hello%20world/');

      await expect(page.getByText('hello world')).toBeVisible();
    });

    test('handles special characters in search query', async ({ page }) => {
      await page.goto('/saved-search/test%26query/');

      await expect(page.getByText('test&query')).toBeVisible();
    });
  });

  test.describe('Navigation from saved searches sidebar', () => {
    test('navigates to saved search from sidebar', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.getByTestId('file-sidebar');
      const savedSearchesAccordion = page.getByTestId('saved-searches-accordion');
      await savedSearchesAccordion.click();

      await sidebar.getByText('My Research').click();
      await expect(page).toHaveURL(/\/saved-search\/research/);
    });
  });
});
