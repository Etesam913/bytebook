import { test, expect } from '@playwright/test';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

test.describe('Markdown rendering', () => {
  test.beforeEach(async ({ context }) => {
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
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdownWithCodeResults',
      },
      MOCK_NOTE_MARKDOWN_RESPONSE
    );
  });

  test('renders headings correctly', async ({ page, context }) => {
    const HEADING_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: {
        markdown:
          '# Heading 1\n\n## Heading 2\n\n### Heading 3\n\nParagraph text.',
        codeResults: { version: 1, codeBlocks: [] },
      },
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdownWithCodeResults',
      },
      HEADING_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    await expect(editor.locator('h1')).toContainText('Heading 1');
    await expect(editor.locator('h2')).toContainText('Heading 2');
    await expect(editor.locator('h3')).toContainText('Heading 3');
    await expect(editor.getByText('Paragraph text.')).toBeVisible();
  });

  test('renders lists and check lists correctly', async ({ page, context }) => {
    const LIST_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: {
        markdown: [
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
        codeResults: { version: 1, codeBlocks: [] },
      },
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdownWithCodeResults',
      },
      LIST_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    await expect(editor).toContainText('Item 1');
    await expect(editor).toContainText('Item 2');
    await expect(editor).toContainText('First');
    await expect(editor).toContainText('Second');
    await expect(editor).toContainText('Unchecked item');
    await expect(editor).toContainText('Checked item');

    const checkboxes = editor.locator('li[role="checkbox"]');
    await expect(checkboxes).toHaveCount(2);

    await expect(checkboxes.nth(0)).not.toBeChecked();
    await expect(checkboxes.nth(1)).toBeChecked();
  });

  test('renders bold and italic text correctly', async ({ page, context }) => {
    const FORMATTED_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: {
        markdown:
          '# Formatting\n\nThis has **bold text** and *italic text* and ***bold italic***.',
        codeResults: { version: 1, codeBlocks: [] },
      },
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdownWithCodeResults',
      },
      FORMATTED_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    await expect(editor).toContainText('bold text');
    await expect(editor).toContainText('italic text');
    await expect(editor).toContainText('bold italic');

    await expect(editor.locator('strong').first()).toContainText('bold text');
    await expect(editor.locator('em').first()).toContainText('italic text');
  });

  test('renders strikethrough text correctly', async ({ page, context }) => {
    const STRIKETHROUGH_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: {
        markdown:
          '# Strikethrough Example\n\nThis has ~~strikethrough text~~ in it.',
        codeResults: { version: 1, codeBlocks: [] },
      },
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdownWithCodeResults',
      },
      STRIKETHROUGH_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    await expect(editor).toContainText('strikethrough text');
    await expect(editor.locator('span.text-strikethrough')).toContainText(
      'strikethrough text'
    );
  });

  test('renders blockquotes correctly', async ({ page, context }) => {
    const BLOCKQUOTE_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: {
        markdown:
          '# Quote Example\n\n> This is a blockquote\n> with multiple lines',
        codeResults: { version: 1, codeBlocks: [] },
      },
    };

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.NOTE_SERVICE,
        method: 'GetNoteMarkdownWithCodeResults',
      },
      BLOCKQUOTE_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    await expect(editor).toContainText('This is a blockquote');
  });
});
