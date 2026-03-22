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

test.describe('Markdown rendering', () => {
  test.beforeEach(async ({ context }) => {
    // Mock file tree dependencies
    await mockBinding(
      context,
      { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetTopLevelItems' },
      MOCK_TOP_LEVEL_ITEMS_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.FILE_TREE_SERVICE,
        method: 'GetChildrenOfFolderBasedOnPath',
      },
      MOCK_ECONOMICS_FOLDER_CHILDREN_RESPONSE
    );

    await mockBinding(
      context,
      {
        file: SERVICE_FILES.FILE_TREE_SERVICE,
        method: 'OpenFolderAndAddToFileWatcher',
      },
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

  test('renders headings correctly', async ({ page, context }) => {
    const HEADING_MARKDOWN_RESPONSE = {
      success: true,
      message: '',
      data: '# Heading 1\n\n## Heading 2\n\n### Heading 3\n\nParagraph text.',
    };

    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
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
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
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
      data: '# Formatting\n\nThis has **bold text** and *italic text* and ***bold italic***.',
    };

    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
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
      data: '# Strikethrough Example\n\nThis has ~~strikethrough text~~ in it.',
    };

    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
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
      data: '# Quote Example\n\n> This is a blockquote\n> with multiple lines',
    };

    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
      BLOCKQUOTE_MARKDOWN_RESPONSE
    );

    await page.goto('/notes/Economics%20Notes/Supply%20and%20Demand.md');

    const editor = page.locator('#content-editable-editor');
    await expect(editor).toBeVisible();

    await expect(editor).toContainText('This is a blockquote');
  });
});
