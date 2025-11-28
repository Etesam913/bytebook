import { test, expect } from '@playwright/test';
import { mockBinding } from '../utils/mockBinding';
import {
  MOCK_FOLDER_RESPONSE,
  MOCK_NOTES_RESPONSE,
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_PREVIEW_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../utils/mockResponses';
import { SERVICE_FILES } from '../utils/serviceFiles';

test.describe('Markdown rendering', () => {
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

  test('renders headings correctly', async ({ page, context }) => {
    const HEADING_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: '# Heading 1\n\n## Heading 2\n\n### Heading 3\n\nParagraph text.',
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdown',
      },
      HEADING_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    // Verify all headings are rendered
    await expect(editor.locator('h1')).toContainText('Heading 1');
    await expect(editor.locator('h2')).toContainText('Heading 2');
    await expect(editor.locator('h3')).toContainText('Heading 3');
    await expect(editor.getByText('Paragraph text.')).toBeVisible();
  });

  test('renders lists and check lists correctly', async ({ page, context }) => {
    const LIST_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: [
        '# List Example',
        '',
        '- Item 1',
        '- Item 2',
        '',
        '1. First',
        '2. Second',
        '',
        '- [ ] Unchecked item',
        '- [x] Checked item',
      ].join('\n'),
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdown',
      },
      LIST_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    // Verify unordered list items
    await expect(editor).toContainText('Item 1');
    await expect(editor).toContainText('Item 2');

    // Verify ordered list items
    await expect(editor).toContainText('First');
    await expect(editor).toContainText('Second');

    // Verify checklist items text is present
    await expect(editor).toContainText('Unchecked item');
    await expect(editor).toContainText('Checked item');

    // Expect at least two checkbox items
    const checkboxes = editor.locator('li[role="checkbox"]');
    await expect(checkboxes).toHaveCount(2);

    // Check states: typically unchecked is not checked, checked is checked
    // First: unchecked
    await expect(checkboxes.nth(0)).not.toBeChecked();
    await expect(checkboxes.nth(1)).toBeChecked();
  });

  test('renders bold and italic text correctly', async ({ page, context }) => {
    const FORMATTED_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: '# Formatting\n\nThis has **bold text** and *italic text* and ***bold italic***.',
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdown',
      },
      FORMATTED_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    // Verify the formatted text is present
    await expect(editor).toContainText('bold text');
    await expect(editor).toContainText('italic text');
    await expect(editor).toContainText('bold italic');

    // Verify bold formatting is applied
    await expect(editor.locator('strong').first()).toContainText('bold text');

    // Verify italic formatting is applied
    await expect(editor.locator('em').first()).toContainText('italic text');
  });

  test('renders strikethrough text correctly', async ({ page, context }) => {
    const STRIKETHROUGH_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: '# Strikethrough Example\n\nThis has ~~strikethrough text~~ in it.',
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdown',
      },
      STRIKETHROUGH_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    // Verify strikethrough text is present
    await expect(editor).toContainText('strikethrough text');

    // Verify strikethrough formatting is applied (Lexical uses text-strikethrough class)
    await expect(editor.locator('span.text-strikethrough')).toContainText(
      'strikethrough text'
    );
  });

  test('renders blockquotes correctly', async ({ page, context }) => {
    const BLOCKQUOTE_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: '# Quote Example\n\n> This is a blockquote\n> with multiple lines',
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdown',
      },
      BLOCKQUOTE_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand?ext=md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    // Verify blockquote content is rendered
    await expect(editor).toContainText('This is a blockquote');
  });
});
