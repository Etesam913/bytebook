import { test, expect } from '@playwright/test';
import { mockBinding } from '../utils/mockBinding';

const MOCK_FOLDER_RESPONSE = {
  success: true,
  message: '',
  data: ['Economics Notes', 'Research Notes'],
};

const MOCK_TAGS_RESPONSE = {
  success: true,
  message: '',
  data: ['economics', 'research', 'dev'],
};

const MOCK_SAVED_SEARCHES_RESPONSE = {
  success: true,
  message: '',
  data: [
    { name: 'My Research', query: 'research' },
    { name: 'Economics', query: 'economics' },
  ],
};

test.describe('Folder Sidebar', () => {
  test.beforeEach(async ({ context }) => {
    await mockBinding(
      context,
      {
        file: 'github.com/etesam913/bytebook/internal/services/folderservice.js',
        method: 'GetFolders',
      },
      MOCK_FOLDER_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: 'github.com/etesam913/bytebook/internal/services/tagsservice.js',
        method: 'GetTags',
      },
      MOCK_TAGS_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: 'github.com/etesam913/bytebook/internal/services/searchservice.js',
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
});
