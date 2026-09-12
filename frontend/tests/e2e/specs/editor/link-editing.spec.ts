import { expect, test, type Page } from '@playwright/test';
import {
  getEditor,
  mockNote,
  mockNoteMarkdown,
  NOTE_URL,
} from '../../utils/editor';
import { mockBinding } from '../../utils/mock-binding';
import { MOCK_PROJECT_SETTINGS_RESPONSE } from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

const INITIAL_MARKDOWN =
  '**[Example docs](https://example.com/old)** and [Other](https://other.example)\n\nPlain text';

function getUrlInput(page: Page) {
  return page.getByRole('textbox', { name: 'URL', exact: true });
}

async function appendAutomaticLink(page: Page) {
  const editor = getEditor(page);
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('https://auto.example.com ');
  return editor.getByRole('link', {
    name: 'https://auto.example.com',
    exact: true,
  });
}

test.beforeEach(async ({ context }) => {
  await mockBinding(
    context,
    { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
    MOCK_PROJECT_SETTINGS_RESPONSE
  );
  await mockNote(context, INITIAL_MARKDOWN);
});

test('edits a hovered link without changing its formatted text or another link', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  const editor = getEditor(page);
  const link = editor.getByRole('link', { name: 'Example docs' });

  await link.hover();
  await expect(
    page.getByRole('button', { name: 'Edit link', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit link', exact: true }).click();
  await expect(getUrlInput(page)).toHaveValue('https://example.com/old');
  await getUrlInput(page).fill('https://example.com/new');
  await page.getByRole('button', { name: 'Submit link' }).click();

  await expect(link).toHaveAttribute('href', 'https://example.com/new');
  await expect(link.locator('strong')).toHaveText('Example docs');
  await expect(
    editor.getByRole('link', { name: 'Other', exact: true })
  ).toHaveAttribute('href', 'https://other.example');
  await expect(
    page.getByRole('form', { name: 'Link editor' })
  ).not.toBeVisible();
});

test('offers editing at the caret and cancels without changing the URL', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  const editor = getEditor(page);
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+Home');
  await page.keyboard.press('ArrowRight');

  await page.getByRole('button', { name: 'Edit link', exact: true }).click();
  await getUrlInput(page).fill('https://discard.example');
  await page.keyboard.press('Escape');

  await expect(
    editor.getByRole('link', { name: 'Example docs' })
  ).toHaveAttribute('href', 'https://example.com/old');
  await expect(
    page.getByRole('form', { name: 'Link editor' })
  ).not.toBeVisible();
});

test('removes a hovered link while keeping its text and formatting', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  const editor = getEditor(page);
  await editor.getByRole('link', { name: 'Example docs' }).hover();

  await page.getByRole('button', { name: 'Remove link', exact: true }).click();

  await expect(editor.getByRole('link', { name: 'Example docs' })).toHaveCount(
    0
  );
  await expect(editor.locator('strong')).toHaveText('Example docs');
  await expect(editor).toContainText('Example docs and Other');
});

test('keeps an edited automatic link independent of its displayed URL', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  const link = await appendAutomaticLink(page);
  await link.hover();

  await page.getByRole('button', { name: 'Edit link', exact: true }).click();
  await getUrlInput(page).fill('https://edited.example');
  await page.keyboard.press('Enter');

  await expect(link).toHaveAttribute('href', 'https://edited.example');
  await expect(link).toHaveText('https://auto.example.com');
});

test('switches an internal link to an external URL', async ({
  page,
  context,
}) => {
  await mockNoteMarkdown(context, '[Note](/notes/Old.md)');
  await page.goto(NOTE_URL);
  const link = getEditor(page).getByRole('link', {
    name: 'Note',
    exact: true,
  });
  await link.hover();

  await page.getByRole('button', { name: 'Edit link', exact: true }).click();
  await getUrlInput(page).fill('https://external.example');
  await page.keyboard.press('Enter');

  await expect(link).toHaveAttribute('href', 'https://external.example');
  await expect(link.locator('svg')).toHaveCount(0);
});

test('removes an automatic link without immediately linking it again', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  const editor = getEditor(page);
  const link = await appendAutomaticLink(page);
  await link.hover();

  await page.getByRole('button', { name: 'Remove link', exact: true }).click();

  await expect(
    editor.getByRole('link', { name: 'https://auto.example.com', exact: true })
  ).toHaveCount(0);
  await expect(editor).toContainText('https://auto.example.com');
});

test('Cmd+K links selected text and preserves its highlight', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  const editor = getEditor(page);
  await editor
    .getByText('Plain text', { exact: true })
    .click({ clickCount: 3 });

  await page.keyboard.press('ControlOrMeta+k');
  const input = getUrlInput(page);
  const selectionHighlight = editor
    .locator('xpath=..')
    .locator('[data-selection-highlight="true"]');
  await expect(input).toBeFocused();
  await expect(selectionHighlight).toBeVisible();
  await expect(selectionHighlight).toHaveCSS(
    'background-color',
    'rgba(96, 165, 250, 0.45)'
  );
  await input.fill('https://shortcut.example.com');
  await expect(selectionHighlight).toBeVisible();
  await page.keyboard.press('Enter');

  const link = editor.getByRole('link', { name: 'Plain text', exact: true });
  await expect(link).toHaveAttribute('href', 'https://shortcut.example.com');
});
