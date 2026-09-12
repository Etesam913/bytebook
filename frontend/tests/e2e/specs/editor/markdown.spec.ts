import { test, expect } from '@playwright/test';
import { getEditor, mockNote, NOTE_URL } from '../../utils/editor';
import { mockBinding } from '../../utils/mock-binding';
import { MOCK_PROJECT_SETTINGS_RESPONSE } from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

test.describe('Markdown rendering', () => {
  test.beforeEach(async ({ context }) => {
    // Mock project settings
    await mockBinding(
      context,
      { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );
  });

  test('renders headings correctly', async ({ page, context }) => {
    await mockNote(
      context,
      '# Heading 1\n\n## Heading 2\n\n### Heading 3\n\nParagraph text.'
    );

    await page.goto(NOTE_URL);

    const editor = getEditor(page);
    await expect(editor).toBeVisible();

    await expect(editor.locator('h1')).toContainText('Heading 1');
    await expect(editor.locator('h2')).toContainText('Heading 2');
    await expect(editor.locator('h3')).toContainText('Heading 3');
    await expect(editor.getByText('Paragraph text.')).toBeVisible();
  });

  test('renders lists and check lists correctly', async ({ page, context }) => {
    await mockNote(
      context,
      [
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
      ].join('\n')
    );

    await page.goto(NOTE_URL);

    const editor = getEditor(page);
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
    await mockNote(
      context,
      '# Formatting\n\nThis has **bold text** and *italic text* and ***bold italic***.'
    );

    await page.goto(NOTE_URL);

    const editor = getEditor(page);
    await expect(editor).toBeVisible();

    await expect(editor.locator('strong').first()).toContainText('bold text');
    await expect(editor.locator('em').first()).toContainText('italic text');
    const boldItalic = editor
      .locator('strong')
      .filter({ hasText: 'bold italic' });
    await expect(boldItalic).toHaveText('bold italic');
    await expect(boldItalic).toHaveCSS('font-style', 'italic');
  });

  test('renders strikethrough text correctly', async ({ page, context }) => {
    await mockNote(
      context,
      '# Strikethrough Example\n\nThis has ~~strikethrough text~~ in it.'
    );

    await page.goto(NOTE_URL);

    const editor = getEditor(page);
    await expect(editor).toBeVisible();

    await expect(editor.locator('span.text-strikethrough')).toContainText(
      'strikethrough text'
    );
  });

  test('renders blockquotes correctly', async ({ page, context }) => {
    await mockNote(
      context,
      '# Quote Example\n\n> This is a blockquote\n> with multiple lines'
    );

    await page.goto(NOTE_URL);

    const editor = getEditor(page);
    await expect(editor).toBeVisible();

    await expect(editor.locator('blockquote')).toContainText(
      'This is a blockquote'
    );
    await expect(editor.locator('blockquote')).toContainText(
      'with multiple lines'
    );
  });
});
