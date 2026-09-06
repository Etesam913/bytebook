import { test, expect, type Page } from '@playwright/test';
import {
  getMockBindingCalls,
  mockBinding,
  updateMockBindingResponse,
} from '../../utils/mock-binding';
import {
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_SET_TAGS_ON_NOTES_RESPONSE,
  MOCK_TAGS_FOR_NOTES_RESPONSE,
  MOCK_TAGS_RESPONSE,
  MOCK_SUCCESS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';
import { setupWailsEvents, emitWailsEvent } from '../../utils/wails-events';

async function expandTagsSection(page: Page) {
  const tagsHeading = page.getByRole('heading', {
    name: /^Tags \(\d+\)$/,
    level: 3,
  });
  const tagsToggle = tagsHeading.getByRole('button');
  const tagsSection = tagsHeading.locator('..');

  await expect(tagsToggle).toBeVisible();
  await tagsToggle.click();

  return tagsSection;
}

test.describe('Tags Workflow', () => {
  test.beforeEach(async ({ context }) => {
    // Mock project settings
    await mockBinding(
      context,
      { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );

    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'DoesNoteExist' },
      MOCK_NOTE_EXISTS_RESPONSE
    );

    // Mock note markdown
    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdownWithCodeResults',
      },
      MOCK_NOTE_MARKDOWN_RESPONSE
    );

    // Mock tags
    await mockBinding(
      context,
      { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTags' },
      MOCK_TAGS_RESPONSE
    );

    // Mock tags for notes
    await mockBinding(
      context,
      { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTagsForNotes' },
      MOCK_TAGS_FOR_NOTES_RESPONSE
    );
  });

  test.describe('Adding Tags to Notes', () => {
    test('adds a tag to a note and displays it in the tags section', async ({
      page,
      context,
    }) => {
      await setupWailsEvents(context);

      await mockBinding(
        context,
        { file: SERVICE_FILES.TAGS_SERVICE, method: 'SetTagsOnNotes' },
        MOCK_SET_TAGS_ON_NOTES_RESPONSE
      );

      // Navigate to a note that currently has no tags
      await page.goto('/notes/Economics%20Notes/Market%20Equilibrium.md');

      // Wait for the editor to load
      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      // Expand the tags section and click its "Edit Tags" button
      const tagsSection = await expandTagsSection(page);
      const editTagsButton = tagsSection.getByRole('button', {
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
      const devTagOption = dialog.getByRole('option', {
        name: /dev tag/,
      });
      await expect(devTagOption).toBeVisible();
      await devTagOption.click();

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
        { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTagsForNotes' },
        updatedTagsForNotesResponse
      );

      // Click the Save button
      const saveButton = dialog.getByRole('button', { name: 'Save' });
      await saveButton.click();

      // Emit the tags:index_update event to trigger refetch
      await emitWailsEvent(page, 'tags:index_update', {});

      // Wait for dialog to close
      await expect(dialog).not.toBeVisible();

      // Verify the new tag appears in the tags section
      await expect(tagsSection).toContainText('dev');
    });
  });

  test.describe('Autosave after tag changes', () => {
    const notePath = 'Economics Notes/Supply and Demand.md';
    const getTags = {
      file: SERVICE_FILES.TAGS_SERVICE,
      method: 'GetTagsForNotes',
    };
    const saveNote = {
      file: SERVICE_FILES.NOTE_SERVICE,
      method: 'SetNoteMarkdownWithCodeResults',
    };

    test.beforeEach(async ({ context }) => {
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.NOTE_SERVICE,
          method: 'GetNoteMarkdownWithCodeResults',
        },
        {
          ...MOCK_NOTE_MARKDOWN_RESPONSE,
          data: {
            ...MOCK_NOTE_MARKDOWN_RESPONSE.data,
            markdown:
              '---\ntags:\n  - economics\nstatus: draft\n---\nOriginal content',
          },
        }
      );
      await mockBinding(context, getTags, {
        success: true,
        message: '',
        data: { [notePath]: ['economics'] },
      });
      await mockBinding(context, saveNote, MOCK_SUCCESS_RESPONSE);
    });

    test('does not restore the last removed tag on the next edit', async ({
      page,
      context,
    }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.TAGS_SERVICE, method: 'SetTagsOnNotes' },
        MOCK_SET_TAGS_ON_NOTES_RESPONSE
      );
      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');
      const tagsSection = await expandTagsSection(page);
      await updateMockBindingResponse(page, getTags, {
        success: true,
        message: '',
        data: { [notePath]: [] },
      });

      await tagsSection
        .getByRole('button', { name: 'Remove tag economics' })
        .click();

      await expect(
        tagsSection.getByRole('button', { name: 'Tags (0)', exact: true })
      ).toBeVisible();

      await page.locator('#content-editable-editor').fill('Edited content');

      await expect
        .poll(
          async () => (await getMockBindingCalls(page, saveNote)).at(-1)?.[2]
        )
        .toContain('Edited content');
      const markdown = (await getMockBindingCalls(page, saveNote)).at(-1)?.[2];
      expect(markdown).not.toContain('  - economics');
      expect(markdown).toContain('status: draft');
    });

    test('preserves baseline tags when the refreshed map has no entry for the note', async ({
      page,
      context,
    }) => {
      await mockBinding(context, getTags, {
        success: true,
        message: '',
        data: {},
      });
      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');
      await expect(
        page
          .getByTestId('note-tags')
          .getByRole('button', { name: 'Tags (0)', exact: true })
      ).toBeVisible();

      await page.locator('#content-editable-editor').fill('Edited content');

      await expect
        .poll(
          async () => (await getMockBindingCalls(page, saveNote)).at(-1)?.[2]
        )
        .toContain('Edited content');
      const markdown = (await getMockBindingCalls(page, saveNote)).at(-1)?.[2];
      expect(markdown).toContain('  - economics');
    });
  });

  test.describe('Existing Tags Display', () => {
    test('existing tags for a note are displayed in the tags section', async ({
      page,
    }) => {
      // Navigate to a note that has existing tags
      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

      // Wait for the editor to load
      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      // Expand the tags section
      const tagsSection = await expandTagsSection(page);

      // Verify existing tags are displayed
      await expect(tagsSection).toContainText('economics');
      await expect(tagsSection).toContainText('research');
    });

    test('existing tags for a note are pre-selected in the Edit Tags dialog', async ({
      page,
      context,
    }) => {
      // Override mock to only return tags for the specific note being tested
      await mockBinding(
        context,
        { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTagsForNotes' },
        {
          success: true,
          message: '',
          data: {
            'Economics Notes/Supply and Demand.md': ['economics', 'research'],
          },
        }
      );

      // Navigate to a note that has existing tags
      await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

      // Wait for the editor to load
      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      // Expand the tags section and open the Edit Tags dialog
      const tagsSection = await expandTagsSection(page);
      const editTagsButton = tagsSection.getByRole('button', {
        name: /Edit Tags/i,
      });
      await editTagsButton.click();

      const dialog = page.getByRole('dialog');
      await expect(
        dialog.getByRole('heading', { name: 'Edit Tags' })
      ).toBeVisible();

      // Verify existing tags are shown as selected options
      const economicsOption = dialog.getByRole('option', {
        name: /economics tag, selected/,
      });
      const researchOption = dialog.getByRole('option', {
        name: /research tag, selected/,
      });

      await expect(economicsOption).toBeVisible();
      await expect(researchOption).toBeVisible();

      await expect(economicsOption).toHaveAttribute('aria-selected', 'true');
      await expect(researchOption).toHaveAttribute('aria-selected', 'true');

      // The 'dev' tag should not be selected
      const devOption = dialog.getByRole('option', {
        name: /dev tag, not selected/,
      });
      await expect(devOption).toHaveAttribute('aria-selected', 'false');
    });
  });
});
