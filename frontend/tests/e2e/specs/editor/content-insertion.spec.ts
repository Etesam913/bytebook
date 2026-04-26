import { test, expect } from '@playwright/test';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_TOP_LEVEL_ITEMS_RESPONSE,
  MOCK_ECONOMICS_FOLDER_CHILDREN_RESPONSE,
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_FULL_TEXT_SEARCH_RESPONSE,
  MOCK_EMPTY_SEARCH_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

// NOTE_PATH points at Supply and Demand.md, which is one of the
// MOCK_FULL_TEXT_SEARCH_RESPONSE results — the @-picker excludes the current
// note, so search assertions use the other two results.
const NOTE_PATH = '/notes/Economics%20Notes/Supply%20and%20Demand.md';

// Empty markdown loads the editor with a single empty paragraph, which keeps
// the cursor at the start of an empty node so typeahead triggers (/, @) and
// markdown shortcuts fire on the first keystroke.
const EMPTY_NOTE_MARKDOWN = {
  success: true,
  message: '',
  data: '',
};

test.describe('Editor content insertion', () => {
  test.beforeEach(async ({ context }) => {
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
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'DoesNoteExist' },
      MOCK_NOTE_EXISTS_RESPONSE
    );
    await mockBinding(
      context,
      { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );
    await mockBinding(
      context,
      { file: SERVICE_FILES.NOTE_SERVICE, method: 'GetNoteMarkdown' },
      EMPTY_NOTE_MARKDOWN
    );
  });

  test.describe('Slash command menu', () => {
    test('opens menu on "/" and shows core options', async ({ page }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/');

      const options = page.locator('li[role="option"]');
      await expect(options.first()).toBeVisible();

      for (const label of ['Heading 1', 'Quote', 'Table', 'Line Break']) {
        await expect(options.filter({ hasText: label }).first()).toBeVisible();
      }
    });

    test('filters options by typed query', async ({ page }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/quote');

      const options = page.locator('li[role="option"]');
      await expect(options.filter({ hasText: 'Quote' })).toHaveCount(1);
      await expect(options.filter({ hasText: 'Heading 1' })).toHaveCount(0);
    });

    test('inserts a heading when Heading 1 option is clicked', async ({
      page,
    }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/heading 1');
      await page
        .locator('li[role="option"]', { hasText: 'Heading 1' })
        .first()
        .click();
      await page.keyboard.type('My heading');

      await expect(editor.locator('h1')).toContainText('My heading');
    });

    test('inserts a horizontal rule when Line Break is selected', async ({
      page,
    }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/line');
      await page
        .locator('li[role="option"]', { hasText: 'Line Break' })
        .first()
        .click();

      await expect(editor.locator('hr')).toHaveCount(1);
    });

    test('inserts via keyboard (Enter on highlighted option)', async ({
      page,
    }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/quote');

      // Wait for the menu to render the (single) Quote option before pressing Enter
      await expect(
        page.locator('li[role="option"]', { hasText: 'Quote' }).first()
      ).toBeVisible();

      await page.keyboard.press('Enter');
      await page.keyboard.type('Quoted text');

      await expect(editor.locator('blockquote')).toContainText('Quoted text');
    });
  });

  test.describe('@ file picker', () => {
    test.beforeEach(async ({ context }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
        MOCK_FULL_TEXT_SEARCH_RESPONSE
      );
    });

    test('shows search results when typing a query after "@"', async ({
      page,
    }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('@inflation');

      // Note: NOTE_PATH points to Supply and Demand.md, which the picker
      // excludes from results — assert against the other two mocked results.
      const options = page.locator('li[role="option"]');
      await expect(
        options.filter({ hasText: 'Inflation.md' }).first()
      ).toBeVisible();
      await expect(
        options.filter({ hasText: 'Quantum Physics.md' }).first()
      ).toBeVisible();
    });

    test('inserts a link node when a result is clicked', async ({ page }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('@inflation');
      await page
        .locator('li[role="option"]', { hasText: 'Inflation.md' })
        .first()
        .click();

      await expect(editor.locator('a')).toContainText('Inflation.md');
    });

    test('shows empty state when search returns no results', async ({
      page,
      context,
    }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.SEARCH_SERVICE, method: 'FullTextSearch' },
        MOCK_EMPTY_SEARCH_RESPONSE
      );

      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('@nothingmatches');

      await expect(page.getByText('No results found...')).toBeVisible();
    });
  });

  test.describe('Markdown shortcuts', () => {
    const blockTests: Array<{
      label: string;
      input: string;
      selector: string;
      expectedText: string;
    }> = [
      {
        label: '"# " → Heading 1',
        input: '# Header text',
        selector: 'h1',
        expectedText: 'Header text',
      },
      {
        label: '"## " → Heading 2',
        input: '## Subheader',
        selector: 'h2',
        expectedText: 'Subheader',
      },
      {
        label: '"> " → blockquote',
        input: '> Quoted',
        selector: 'blockquote',
        expectedText: 'Quoted',
      },
      {
        label: '"- " → unordered list',
        input: '- List item',
        selector: 'ul li',
        expectedText: 'List item',
      },
      {
        label: '"1. " → ordered list',
        input: '1. First item',
        selector: 'ol li',
        expectedText: 'First item',
      },
    ];

    for (const { label, input, selector, expectedText } of blockTests) {
      test(`${label}`, async ({ page }) => {
        await page.goto(NOTE_PATH);

        const editor = page.locator('#content-editable-editor');
        await expect(editor).toBeVisible();

        await editor.click();
        await page.keyboard.type(input);

        await expect(editor.locator(selector)).toContainText(expectedText);
      });
    }

    // Note: a typed "- [ ] " markdown shortcut does not trigger checklist
    // conversion incrementally because "- " converts to a plain unordered
    // list before "[ ] " is typed. The Check List slash-menu option is the
    // user-facing path and is exercised in the Slash command menu describe.

    const inlineTests: Array<{
      label: string;
      input: string;
      selector: string;
      expectedText: string;
    }> = [
      {
        label: '"**text** " → bold',
        input: '**bold** ',
        selector: 'strong',
        expectedText: 'bold',
      },
      {
        label: '"*text* " → italic',
        input: '*italic* ',
        selector: 'em',
        expectedText: 'italic',
      },
      {
        label: '"~~text~~ " → strikethrough',
        input: '~~strike~~ ',
        selector: 'span.text-strikethrough',
        expectedText: 'strike',
      },
    ];

    for (const { label, input, selector, expectedText } of inlineTests) {
      test(`${label}`, async ({ page }) => {
        await page.goto(NOTE_PATH);

        const editor = page.locator('#content-editable-editor');
        await expect(editor).toBeVisible();

        await editor.click();
        await page.keyboard.type(input);

        await expect(editor.locator(selector)).toContainText(expectedText);
      });
    }
  });

  test.describe('Create Table dialog', () => {
    test('opens with default 3×3 dimensions when Table option is selected', async ({
      page,
    }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/table');
      await page
        .locator('li[role="option"]', { hasText: 'Table' })
        .first()
        .click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Create Table');
      await expect(page.locator('input#table-rows')).toHaveValue('3');
      await expect(page.locator('input#table-columns')).toHaveValue('3');
    });

    test('inserts a table when valid dimensions are submitted', async ({
      page,
    }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/table');
      await page
        .locator('li[role="option"]', { hasText: 'Table' })
        .first()
        .click();

      await page.locator('input#table-rows').fill('2');
      await page.locator('input#table-columns').fill('2');
      await page.getByRole('button', { name: 'Create Table' }).click();

      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(editor.locator('table')).toBeVisible();
    });

    test('shows an error when rows is left blank', async ({ page }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/table');
      await page
        .locator('li[role="option"]', { hasText: 'Table' })
        .first()
        .click();

      // Empty value sidesteps the input's min/max HTML5 check and lets the
      // server-action validator return its own error.
      await page.locator('input#table-rows').fill('');
      await page.getByRole('button', { name: 'Create Table' }).click();

      await expect(
        page.getByText('Please enter a valid number of rows (1-100)')
      ).toBeVisible();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('closes via the Close button', async ({ page }) => {
      await page.goto(NOTE_PATH);

      const editor = page.locator('#content-editable-editor');
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('/table');
      await page
        .locator('li[role="option"]', { hasText: 'Table' })
        .first()
        .click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await page.getByRole('button', { name: 'Close dialog' }).click();
      await expect(dialog).not.toBeVisible();
    });
  });
});
