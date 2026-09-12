import { test, expect, type Page, type Locator } from '@playwright/test';
import { getEditor, mockNote, NOTE_URL } from '../../utils/editor';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_FULL_TEXT_SEARCH_RESPONSE,
  MOCK_EMPTY_SEARCH_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

// NOTE_URL points at Supply and Demand.md, which is one of the
// MOCK_FULL_TEXT_SEARCH_RESPONSE results — the @-picker excludes the current
// note, so search assertions use the other two results.

async function openTableDialog(page: Page) {
  await page.goto(NOTE_URL);
  await getEditor(page).click();
  await page.keyboard.type('/table');
  await page.getByRole('option', { name: 'Table', exact: true }).click();
  return page.getByRole('dialog');
}

async function expectAddButtonAlignment(
  cell: Locator,
  button: Locator,
  axis: 'row' | 'column'
) {
  await expect
    .poll(async () => {
      const cellBox = await cell.boundingBox();
      const buttonBox = await button.boundingBox();
      if (!cellBox || !buttonBox) return Infinity;
      const centerOffset =
        axis === 'column'
          ? buttonBox.x + buttonBox.width / 2 - cellBox.x - cellBox.width / 2
          : buttonBox.y + buttonBox.height / 2 - cellBox.y - cellBox.height / 2;
      const edgeOffset =
        axis === 'column'
          ? buttonBox.y + buttonBox.height - cellBox.y - 9
          : buttonBox.x + buttonBox.width - cellBox.x - 9;
      return Math.max(Math.abs(centerOffset), Math.abs(edgeOffset));
    })
    .toBeLessThan(2);
}

test.describe('Editor content insertion', () => {
  test.beforeEach(async ({ context }) => {
    await mockBinding(
      context,
      { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );
    // An empty paragraph lets typeahead and Markdown shortcuts trigger immediately.
    await mockNote(context, '');
  });

  test.describe('Slash command menu', () => {
    test('opens menu on "/" and shows core options', async ({ page }) => {
      await page.goto(NOTE_URL);

      const editor = getEditor(page);
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
      await page.goto(NOTE_URL);

      const editor = getEditor(page);
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
      await page.goto(NOTE_URL);

      const editor = getEditor(page);
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
      await page.goto(NOTE_URL);

      const editor = getEditor(page);
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
      await page.goto(NOTE_URL);

      const editor = getEditor(page);
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
      await page.goto(NOTE_URL);

      const editor = getEditor(page);
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('@inflation');

      // Note: NOTE_URL points to Supply and Demand.md, which the picker
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
      await page.goto(NOTE_URL);

      const editor = getEditor(page);
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

      await page.goto(NOTE_URL);

      const editor = getEditor(page);
      await expect(editor).toBeVisible();

      await editor.click();
      await page.keyboard.type('@nothingmatches');

      await expect(page.getByText('No results found...')).toBeVisible();
    });
  });

  test.describe('Markdown shortcuts', () => {
    const shortcutTests: Array<{
      label: string;
      input: string;
      selector: string;
      expectedText: string;
    }> = [
      {
        label: 'converts "# " shortcut to Heading 1',
        input: '# Header text',
        selector: 'h1',
        expectedText: 'Header text',
      },
      {
        label: 'converts "## " shortcut to Heading 2',
        input: '## Subheader',
        selector: 'h2',
        expectedText: 'Subheader',
      },
      {
        label: 'converts "> " shortcut to blockquote',
        input: '> Quoted',
        selector: 'blockquote',
        expectedText: 'Quoted',
      },
      {
        label: 'converts "- " shortcut to unordered list',
        input: '- List item',
        selector: 'ul li',
        expectedText: 'List item',
      },
      {
        label: 'converts "1. " shortcut to ordered list',
        input: '1. First item',
        selector: 'ol li',
        expectedText: 'First item',
      },
      {
        label: 'converts "**text** " shortcut to bold',
        input: '**bold** ',
        selector: 'strong',
        expectedText: 'bold',
      },
      {
        label: 'converts "*text* " shortcut to italic',
        input: '*italic* ',
        selector: 'em',
        expectedText: 'italic',
      },
      {
        label: 'converts "~~text~~ " shortcut to strikethrough',
        input: '~~strike~~ ',
        selector: 'span.text-strikethrough',
        expectedText: 'strike',
      },
    ];

    for (const { label, input, selector, expectedText } of shortcutTests) {
      test(label, async ({ page }) => {
        await page.goto(NOTE_URL);

        const editor = getEditor(page);
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
      const dialog = await openTableDialog(page);

      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Create Table');
      await expect(dialog.getByLabel('Rows', { exact: true })).toHaveValue('3');
      await expect(dialog.getByLabel('Columns', { exact: true })).toHaveValue(
        '3'
      );
    });

    test('inserts a table when valid dimensions are submitted', async ({
      page,
    }) => {
      const dialog = await openTableDialog(page);
      const editor = getEditor(page);

      await dialog.getByLabel('Rows', { exact: true }).fill('2');
      await dialog.getByLabel('Columns', { exact: true }).fill('2');
      await dialog.getByRole('button', { name: 'Create Table' }).click();

      await expect(dialog).not.toBeVisible();
      await expect(editor.locator('table')).toBeVisible();
      const rows = editor.locator('table tr');
      await expect(rows).toHaveCount(2);
      await expect(rows.nth(0).locator('td, th')).toHaveCount(2);
      await expect(rows.nth(1).locator('td, th')).toHaveCount(2);
    });

    test('aligns add buttons with the hovered column and row', async ({
      page,
    }) => {
      const dialog = await openTableDialog(page);
      const editor = getEditor(page);
      await dialog.getByRole('button', { name: 'Create Table' }).click();
      await expect(dialog).not.toBeVisible();
      const rows = editor.locator('table tr');
      const topCell = rows.first().locator('td, th').nth(2);
      const leftCell = rows.nth(2).locator('td, th').first();
      const addColumn = page.getByRole('button', {
        name: 'Add column',
        exact: true,
      });
      const addRow = page.getByRole('button', { name: 'Add row', exact: true });

      await topCell.hover();

      await expect(addColumn).toBeVisible();

      await expectAddButtonAlignment(topCell, addColumn, 'column');
      await addColumn.click();
      await expect(rows.first().locator('td, th')).toHaveCount(4);

      await leftCell.hover();

      await expect(addRow).toBeVisible();
      await expectAddButtonAlignment(leftCell, addRow, 'row');
      await addRow.click();
      await expect(rows).toHaveCount(4);
    });

    test('shows an error when rows is left blank', async ({ page }) => {
      const dialog = await openTableDialog(page);

      // Empty value sidesteps the input's min/max HTML5 check and lets the
      // server-action validator return its own error.
      await dialog.getByLabel('Rows', { exact: true }).fill('');
      await dialog.getByRole('button', { name: 'Create Table' }).click();

      await expect(
        page.getByText('Please enter a valid number of rows (1-100)')
      ).toBeVisible();
      await expect(dialog).toBeVisible();
    });

    test('closes via the Close button', async ({ page }) => {
      const dialog = await openTableDialog(page);

      await expect(dialog).toBeVisible();

      await dialog.getByRole('button', { name: 'Close dialog' }).click();
      await expect(dialog).not.toBeVisible();
    });
  });
});
