import { test, expect } from '@playwright/test';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_TOP_LEVEL_ITEMS_RESPONSE,
  MOCK_ECONOMICS_FOLDER_CHILDREN_RESPONSE,
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

const BOLD_TOOLTIP = 'Bold (⌘B)';
const ITALIC_TOOLTIP = 'Italic (⌘I)';
const STRIKETHROUGH_TOOLTIP = 'Strikethrough (⌘⇧X)';

test.describe('Editor', () => {
  test.beforeEach(async ({ context }) => {
    // Mock file tree dependencies
    await mockBinding(
      context,
      { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetTopLevelItems' },
      MOCK_TOP_LEVEL_ITEMS_RESPONSE
    );

    await mockBinding(
      context,
      { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetChildrenOfFolderBasedOnPath' },
      MOCK_ECONOMICS_FOLDER_CHILDREN_RESPONSE
    );

    await mockBinding(
      context,
      { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'OpenFolderAndAddToFileWatcher' },
      MOCK_SUCCESS_RESPONSE
    );

    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'DoesNoteExist' },
      MOCK_NOTE_EXISTS_RESPONSE
    );

    // Mock project settings
    await mockBinding(
      context,
      { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );

    // Mock note markdown
    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
      MOCK_NOTE_MARKDOWN_RESPONSE
    );
  });

  test('renders simple markdown content', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    await expect(editor).toContainText('Sample Note');
    await expect(editor).toContainText('This is sample markdown content.');
  });

  test('renders note title correctly', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const noteContainer = page.locator('#note-container');
    await expect(noteContainer).toBeVisible();

    const noteTitleInput = noteContainer.locator('input[placeholder="Untitled Note"]');
    await expect(noteTitleInput).toHaveValue('Supply and Demand');
  });

  test('maximize button hides the file sidebar', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    // Verify the file sidebar is visible initially
    const fileSidebar = page.getByTestId('file-sidebar');
    await expect(fileSidebar).toBeVisible();

    // Find the maximize button in the toolbar
    const toolbar = page.locator('nav').first();
    await expect(toolbar).toBeVisible();

    const maximizeBtn = toolbar.locator('span.flex.items-center button').first();
    await maximizeBtn.click();

    // Verify the file sidebar is now hidden
    await expect(fileSidebar).not.toBeVisible({ timeout: 5000 });

    // Click again to minimize and verify sidebar is visible again
    await maximizeBtn.click();
    await expect(fileSidebar).toBeVisible();
  });

  test.describe('Error handling', () => {
    test('handles failed markdown fetch gracefully', async ({ page, context }) => {
      const FAILURE_RESPONSE = {
        success: false,
        message: 'Failed to fetch note markdown',
        data: null,
      };

      await mockBinding(
        context,
        { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
        FAILURE_RESPONSE
      );

      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

      // When markdown fetch fails, the app redirects to the 404 page
      await expect(page).toHaveURL(/\/404/);
    });
  });

  test.describe('Floating toolbar', () => {
    const SELECTABLE_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: '# Sample Note\n\nThis is some selectable text for testing.',
    };

    test.beforeEach(async ({ context }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
        SELECTABLE_MARKDOWN_RESPONSE
      );
    });

    test('shows toolbar buttons when text is selected', async ({ page }) => {
      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

      const editor = page.locator('#content-editable-editor');
      await editor.getByText('This is some selectable text').click({ clickCount: 3 });

      const floatingToolbar = page.getByTestId('floating-toolbar');
      await expect(floatingToolbar).toBeVisible({ timeout: 3000 });

      for (const label of [
        BOLD_TOOLTIP,
        ITALIC_TOOLTIP,
        STRIKETHROUGH_TOOLTIP,
        'Bullet List',
        'Numbered List',
        'Checklist',
        'Insert Link',
      ]) {
        await expect(
          floatingToolbar.locator(`button[aria-label="${label}"]`)
        ).toBeVisible();
      }
    });

    const formattingTests = [
      { button: BOLD_TOOLTIP, selector: 'strong' },
      { button: ITALIC_TOOLTIP, selector: 'em' },
      { button: STRIKETHROUGH_TOOLTIP, selector: 'span.text-strikethrough' },
    ];

    for (const { button, selector } of formattingTests) {
      test(`applies ${button.toLowerCase()} formatting when ${button} button is clicked`, async ({ page }) => {
        await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

        const editor = page.locator('#content-editable-editor');
        await editor.getByText('This is some selectable text').click({ clickCount: 3 });

        const floatingToolbar = page.getByTestId('floating-toolbar');
        await expect(floatingToolbar).toBeVisible({ timeout: 3000 });

        await floatingToolbar.locator(`button[aria-label="${button}"]`).click();
        await expect(editor.locator(selector)).toContainText('selectable text');
      });
    }
  });
});
