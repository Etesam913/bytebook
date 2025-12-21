import { test, expect } from '@playwright/test';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_FOLDER_RESPONSE,
  MOCK_NOTES_RESPONSE,
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_PREVIEW_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

const BOLD_TOOLTIP = 'Bold (⌘B)';
const ITALIC_TOOLTIP = 'Italic (⌘I)';
const STRIKETHROUGH_TOOLTIP = 'Strikethrough (⌘⇧X)';

test.describe('Editor', () => {
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

    // Mock project settings
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.SETTINGS_SERVICE,
        method: 'GetProjectSettings',
      },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );

    // Mock note markdown
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdown',
      },
      MOCK_NOTE_MARKDOWN_RESPONSE
    );
  });

  test('renders simple markdown content', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

    // Wait for the editor to be visible
    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    // Verify the heading is rendered
    await expect(editor).toContainText('Sample Note');

    // Verify the paragraph content is rendered
    await expect(editor).toContainText('This is sample markdown content.');
  });

  test('renders note title correctly', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

    // Wait for the note container to be visible
    const noteContainer = page.locator('#note-container');
    await expect(noteContainer).toBeVisible();

    // The note title is rendered in an input element
    const noteTitleInput = noteContainer.locator(
      'input[placeholder="Untitled Note"]'
    );
    await expect(noteTitleInput).toHaveValue('Supply and Demand');
  });

  test('maximize button hides the note sidebar', async ({ page }) => {
    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

    // Wait for the editor to be visible
    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    // Verify the notes sidebar is visible initially
    const notesSidebar = page.getByTestId('notes-sidebar');
    await expect(notesSidebar).toBeVisible();

    // Find the maximize button in the toolbar
    // The button is in a nav element, and it's the first button in a span after NoteFindPanel
    const toolbar = page.locator('nav').first();
    await expect(toolbar).toBeVisible();

    // Find the maximize button - it's in a span with flex items-center gap-1.5, first button
    const maximizeBtn = toolbar
      .locator('span.flex.items-center button')
      .first();

    // Click the maximize button
    await maximizeBtn.click();

    // Verify the notes sidebar is now hidden (wait for animation to complete)
    await expect(notesSidebar).not.toBeVisible({ timeout: 5000 });

    // Click again to minimize and verify sidebar is visible again
    await maximizeBtn.click();
    await expect(notesSidebar).toBeVisible();
  });

  test.describe('Error handling', () => {
    test('handles failed markdown fetch gracefully', async ({
      page,
      context,
    }) => {
      const FAILURE_RESPONSE = {
        success: false,
        message: 'Failed to fetch note markdown',
        data: null,
      };

      await mockBinding(
        context,
        {
          file: SERVICE_FILES.NOTE_SERVICE,
          method: 'GetNoteMarkdown',
        },
        FAILURE_RESPONSE
      );

      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

      // The editor should still be visible even if markdown fetch fails
      const noteContainer = page.locator('#note-container');
      await expect(noteContainer).toBeVisible();
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
        {
          file: SERVICE_FILES.NOTE_SERVICE,
          method: 'GetNoteMarkdown',
        },
        SELECTABLE_MARKDOWN_RESPONSE
      );
    });

    test('shows toolbar buttons when text is selected', async ({ page }) => {
      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

      const editor = page.locator('#content-editable-editor');
      await editor
        .getByText('This is some selectable text')
        .click({ clickCount: 3 });

      const floatingToolbar = page.getByTestId('floating-toolbar');
      await expect(floatingToolbar).toBeVisible({ timeout: 3000 });

      // Verify toolbar buttons are present
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
      test(`applies ${button.toLowerCase()} formatting when ${button} button is clicked`, async ({
        page,
      }) => {
        await page.goto(
          '/notes/Economics%20Notes/Supply%20and%20Demand?ext=md'
        );

        const editor = page.locator('#content-editable-editor');
        await editor
          .getByText('This is some selectable text')
          .click({ clickCount: 3 });

        const floatingToolbar = page.getByTestId('floating-toolbar');
        await expect(floatingToolbar).toBeVisible({ timeout: 3000 });

        await floatingToolbar.locator(`button[aria-label="${button}"]`).click();

        await expect(editor.locator(selector)).toContainText('selectable text');
      });
    }
  });
});
