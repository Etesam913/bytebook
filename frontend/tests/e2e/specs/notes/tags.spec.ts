import { test, expect } from '@playwright/test';
import {
  mockBinding,
  updateMockBindingResponse,
} from '../../utils/mock-binding';
import {
  MOCK_FOLDER_RESPONSE,
  MOCK_NOTES_RESPONSE,
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_NOTE_PREVIEW_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SET_TAGS_ON_NOTES_RESPONSE,
  MOCK_TAGS_FOR_NOTES_RESPONSE,
  MOCK_TAGS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';
import { setupWailsEvents, emitWailsEvent } from '../../utils/wails-events';

test.describe('Tags Workflow', () => {
  test.beforeEach(async ({ context }) => {
    // Mock file sidebar dependencies
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.FOLDER_SERVICE,
        method: 'GetFolders',
      },
      MOCK_FOLDER_RESPONSE
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

    // Mock note markdown
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdown',
      },
      MOCK_NOTE_MARKDOWN_RESPONSE
    );

    // Mock tags
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.TAGS_SERVICE,
        method: 'GetTags',
      },
      MOCK_TAGS_RESPONSE
    );

    // Mock tags for notes
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.TAGS_SERVICE,
        method: 'GetTagsForNotes',
      },
      MOCK_TAGS_FOR_NOTES_RESPONSE
    );
  });

  test.describe('Adding Tags to Notes', () => {
    test('tags can be added to a note and they appear in the BottomBar', async ({
      page,
      context,
    }) => {
      // Set up wails events for this test
      await setupWailsEvents(context);

      // Mock SetTagsOnNotes to succeed
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.TAGS_SERVICE,
          method: 'SetTagsOnNotes',
        },
        MOCK_SET_TAGS_ON_NOTES_RESPONSE
      );

      // Navigate to a note that currently has no tags
      await page.goto('/notes/Economics%20Notes/Market%20Equilibrium?ext=md');

      // Wait for the editor to load
      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      // Find the BottomBar's "Edit Tags" button and click it
      const bottomBar = page.locator('footer').first();
      await expect(bottomBar).toBeVisible();

      const editTagsButton = bottomBar.getByRole('button', {
        name: /Edit Tags/i,
      });
      await expect(editTagsButton).toBeVisible();
      await editTagsButton.click();

      // The Edit Tags dialog should open
      const dialog = page.getByRole('dialog');
      await expect(
        dialog.getByRole('heading', { name: 'Edit Tags' })
      ).toBeVisible();

      // Select a tag from the available tags (e.g., 'dev')
      const devTagCheckbox = dialog.getByRole('checkbox', { name: 'dev' });
      await expect(devTagCheckbox).toBeVisible();
      await devTagCheckbox.click();

      // Update the mock to return the new tag for this note
      const updatedTagsForNotesResponse = {
        success: true,
        message: '',
        data: {
          ...MOCK_TAGS_FOR_NOTES_RESPONSE.data,
          'Economics Notes/Market Equilibrium.md': ['dev'],
        },
      };

      await updateMockBindingResponse(
        page,
        {
          file: SERVICE_FILES.TAGS_SERVICE,
          method: 'GetTagsForNotes',
        },
        updatedTagsForNotesResponse
      );

      // Click the Save button
      const saveButton = dialog.getByRole('button', { name: 'Save' });
      await saveButton.click();

      // Emit the tags:index_update event to trigger refetch
      await emitWailsEvent(page, 'tags:index_update', {});

      // Wait for dialog to close
      await expect(dialog).not.toBeVisible();

      // Verify the new tag appears in the BottomBar
      await expect(bottomBar).toContainText('dev');
    });
  });

  test.describe('Existing Tags Display', () => {
    test('existing tags for a note are displayed in the BottomBar', async ({
      page,
    }) => {
      // Navigate to a note that has existing tags
      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

      // Wait for the editor to load
      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      // Find the BottomBar
      const bottomBar = page.locator('footer').first();
      await expect(bottomBar).toBeVisible();

      // Verify existing tags are displayed in the BottomBar
      // According to mock data, this note has 'economics' and 'research' tags
      await expect(bottomBar).toContainText('economics');
      await expect(bottomBar).toContainText('research');
    });

    test('existing tags for a note are pre-selected in the Edit Tags dialog', async ({
      page,
      context,
    }) => {
      // Override mock to only return tags for the specific note being tested
      // This ensures the tag count matches totalSelectedNotes (1)
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.TAGS_SERVICE,
          method: 'GetTagsForNotes',
        },
        {
          success: true,
          message: '',
          data: {
            'Economics Notes/Supply and Demand.md': ['economics', 'research'],
          },
        }
      );

      // Navigate to a note that has existing tags
      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

      // Wait for the editor to load
      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      // Open the Edit Tags dialog
      const bottomBar = page.locator('footer').first();
      const editTagsButton = bottomBar.getByRole('button', {
        name: /Edit Tags/i,
      });
      await editTagsButton.click();

      // The Edit Tags dialog should open
      const dialog = page.getByRole('dialog');
      await expect(
        dialog.getByRole('heading', { name: 'Edit Tags' })
      ).toBeVisible();

      // Verify existing tags are shown as selected/checked
      // According to mock data, this note has 'economics' and 'research' tags
      const economicsCheckbox = dialog.getByRole('checkbox', {
        name: 'economics',
      });
      const researchCheckbox = dialog.getByRole('checkbox', {
        name: 'research',
      });

      await expect(economicsCheckbox).toBeVisible();
      await expect(researchCheckbox).toBeVisible();

      // The checkboxes should be checked since these tags are already on the note
      await expect(economicsCheckbox).toBeChecked();
      await expect(researchCheckbox).toBeChecked();

      // The 'dev' tag should not be checked since it's not on this note
      const devCheckbox = dialog.getByRole('checkbox', { name: 'dev' });
      await expect(devCheckbox).not.toBeChecked();
    });
  });
});
