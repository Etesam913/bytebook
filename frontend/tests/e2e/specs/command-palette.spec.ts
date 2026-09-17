import { test, expect, type Page } from '@playwright/test';
import {
  mockBinding,
  getMockBindingCalls,
  updateMockBindingResponse,
} from '../utils/mock-binding';
import {
  MOCK_SAVED_SEARCHES_RESPONSE,
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_FULL_TEXT_SEARCH_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';
import { setupWailsEvents, emitWailsEvent } from '../utils/wails-events';
import { mockNote, NOTE_URL, getEditor } from '../utils/editor';

const searchBinding = {
  file: SERVICE_FILES.SEARCH_SERVICE,
  method: 'FullTextSearch',
};

async function openPalette(page: Page, event = 'navigation:quick-open') {
  const dialog = page.getByRole('dialog', {
    name: event === 'commands:open' ? 'Command Palette' : 'Quick Open',
    exact: true,
  });
  await expect(async () => {
    await emitWailsEvent(page, event, null, 'test');
    await expect(dialog).toBeVisible();
  }).toPass({ timeout: 10000 });
  return dialog;
}

test.beforeEach(async ({ context }) => {
  await setupWailsEvents(context);
  // Window.Name is a runtime method rather than a generated service binding.
  await context.route('**/wails/runtime', async (route) => {
    const body = route.request().postDataJSON() as {
      object: number;
      method: number;
    };
    if (body.object === 6 && body.method === 18) {
      await route.fulfill({ json: 'test' });
    } else {
      await route.fallback();
    }
  });
  await mockBinding(
    context,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    MOCK_ALL_PATHS_RESPONSE
  );
  await mockBinding(
    context,
    { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
    MOCK_PROJECT_SETTINGS_RESPONSE
  );
  await mockBinding(context, searchBinding, MOCK_FULL_TEXT_SEARCH_RESPONSE);
  await mockBinding(
    context,
    { file: SERVICE_FILES.SEARCH_SERVICE, method: 'GetAllSavedSearches' },
    MOCK_SAVED_SEARCHES_RESPONSE
  );
  await mockNote(context, 'Current note');
  await context.addInitScript(() =>
    localStorage.setItem(
      'mostRecentItems',
      JSON.stringify(['Economics Notes/Inflation.md'])
    )
  );
});

test('opens recent files with Enter without searching', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPalette(page);

  await expect(dialog.getByRole('searchbox')).toBeFocused();
  await expect(dialog.getByRole('menuitem').first()).toContainText(
    'Inflation.md'
  );
  await dialog.getByRole('searchbox').press('Enter');

  await expect(page).toHaveURL('/notes/Economics%20Notes/Inflation.md');
  await expect(dialog).toHaveCount(0);
  expect(await getMockBindingCalls(page, searchBinding)).toEqual([]);
});

test('forwards syntax and preserves backend order while navigating only on activation', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  const dialog = await openPalette(page);
  const input = dialog.getByRole('searchbox');

  await input.fill('#work AND f:redis');

  await expect
    .poll(async () => (await getMockBindingCalls(page, searchBinding)).at(-1))
    .toEqual(['#work AND f:redis', [], 100]);
  await expect(dialog.getByRole('menuitem')).toHaveCount(2);
  await expect(dialog.getByRole('menuitem').nth(0)).toContainText(
    'Inflation.md'
  );
  await expect(dialog.getByRole('menuitem').nth(1)).toContainText(
    'Quantum Physics.md'
  );
  await input.press('ArrowDown');
  await expect(page).toHaveURL(NOTE_URL);
  await dialog.getByRole('menuitem').nth(1).click();
  await expect(page).toHaveURL('/notes/Research%20Notes/Quantum%20Physics.md');
});

test('restores editor focus on Escape and ignores events from another window', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  await getEditor(page).click();
  const dialog = await openPalette(page);

  await dialog.getByRole('searchbox').press('Escape');

  await expect(dialog).toHaveCount(0);
  await expect(getEditor(page)).toBeFocused();
  await emitWailsEvent(page, 'navigation:quick-open', null, 'other-window');
  await expect(dialog).toHaveCount(0);
});

test('shows failures and retries the same query', async ({ page }) => {
  await page.goto('/');
  await updateMockBindingResponse(page, searchBinding, {
    success: false,
    message: 'Search failed',
  });
  const dialog = await openPalette(page);

  await dialog.getByRole('searchbox').fill('r');

  await expect(dialog.getByText('Search is unavailable.')).toBeVisible();
  await dialog.getByRole('searchbox').press('Enter');
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL('/');
  await updateMockBindingResponse(
    page,
    searchBinding,
    MOCK_FULL_TEXT_SEARCH_RESPONSE
  );
  await dialog.getByRole('button', { name: 'Retry' }).click();
  await expect(dialog.getByRole('menuitem')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('quick-open.png') });
});

test('hands the full query to the sidebar after closing', async ({ page }) => {
  await page.goto('/');
  await updateMockBindingResponse(page, searchBinding, {
    ...MOCK_FULL_TEXT_SEARCH_RESPONSE,
    data: { ...MOCK_FULL_TEXT_SEARCH_RESPONSE.data, hasMore: true },
  });
  const dialog = await openPalette(page);
  await dialog.getByRole('searchbox').fill('#work AND type:note');

  await dialog.getByRole('button', { name: 'Search all results' }).click();

  const filter = page.getByRole('searchbox', { name: 'Filter files' });
  await expect(dialog).toHaveCount(0);
  await expect(filter).toHaveValue('#work AND type:note');
  await expect(filter).toBeFocused();
});

test('keeps previous results visible until the new query completes', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openPalette(page);
  const input = dialog.getByRole('searchbox');
  await input.fill('first-query');
  await expect(dialog.getByRole('menuitem')).toHaveCount(3);
  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as { args?: { args?: unknown[] } })
          : null;
      const response = await originalFetch(input, init);
      if (body?.args?.args?.[0] === 'next-query') {
        await new Promise<void>((resolve) => {
          (window as unknown as { releaseSearch: () => void }).releaseSearch =
            resolve;
        });
      }
      return response;
    };
  });
  await updateMockBindingResponse(page, searchBinding, {
    ...MOCK_FULL_TEXT_SEARCH_RESPONSE,
    data: {
      ...MOCK_FULL_TEXT_SEARCH_RESPONSE.data,
      results: [MOCK_FULL_TEXT_SEARCH_RESPONSE.data.results[2]],
    },
  });

  await input.fill('next-query');

  await expect(dialog.getByRole('menuitem')).toHaveCount(3);
  await expect
    .poll(async () => (await getMockBindingCalls(page, searchBinding)).at(-1))
    .toEqual(['next-query', [], 100]);
  await expect(dialog.getByRole('menuitem')).toHaveCount(3);
  await expect(dialog.getByText('Searching…', { exact: true })).toHaveCount(0);
  await page.evaluate(() =>
    (window as unknown as { releaseSearch: () => void }).releaseSearch()
  );
  await expect(dialog.getByRole('menuitem')).toHaveCount(1);
  await expect(dialog.getByRole('menuitem')).toContainText(
    'Quantum Physics.md'
  );
});

test('opens commands and hands focus to Settings without a file search', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openPalette(page, 'commands:open');

  await dialog.getByRole('searchbox').fill('preferences');
  await dialog.getByRole('menuitem', { name: /Open Settings/ }).click();

  await expect(
    page.getByRole('dialog', { name: 'Settings', exact: true })
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(await getMockBindingCalls(page, searchBinding)).toEqual([]);
  await expect
    .poll(() =>
      page
        .getByRole('dialog', { name: 'Settings', exact: true })
        .evaluate((element) => element.contains(document.activeElement))
    )
    .toBe(true);
});

test('creates a unique default note and reveals it in the expanded unfiltered file tree', async ({
  page,
  context,
}) => {
  const addNote = {
    file: SERVICE_FILES.NOTE_SERVICE,
    method: 'AddNoteToFolder',
  };
  await mockBinding(context, addNote, { success: true, message: '' });
  await mockBinding(
    context,
    { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
    {
      ...MOCK_ALL_PATHS_RESPONSE,
      data: [
        ...MOCK_ALL_PATHS_RESPONSE.data,
        'Economics Notes/Untitled.md',
        'Economics Notes/Untitled 2.md',
      ],
    }
  );
  await page.goto(NOTE_URL);
  const sidebar = page.getByTestId('file-sidebar');
  await page.getByRole('searchbox', { name: 'Filter files' }).fill('#nothing');
  await sidebar.getByRole('button', { name: 'Files', exact: true }).click();
  const commands = await openPalette(page, 'commands:open');
  await commands
    .getByRole('menuitem', { name: 'Toggle Sidebar', exact: true })
    .click();
  await expect(sidebar).not.toBeVisible();
  const palette = await openPalette(page);
  await palette.getByRole('searchbox').fill('#work AND f:redis');
  await palette.getByRole('button', { name: 'New Note…', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Create note', exact: true });
  await picker.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(palette.getByRole('searchbox')).toBeFocused();
  await palette.getByRole('button', { name: 'New Note…', exact: true }).click();
  await expect(picker.getByRole('textbox', { name: 'Note title' })).toHaveCount(
    0
  );
  await expect(picker.getByRole('menuitem').first()).toContainText(
    'Economics Notes'
  );

  await picker.getByRole('menuitem', { name: /Economics Notes/ }).click();

  await expect
    .poll(async () => (await getMockBindingCalls(page, addNote)).at(-1))
    .toEqual(['Economics Notes', 'Untitled 3']);
  await expect(page).toHaveURL('/notes/Economics%20Notes/Untitled%203.md');
  await expect(picker).toHaveCount(0);
  await expect(sidebar).toBeVisible();
  await expect(
    page.getByRole('searchbox', { name: 'Filter files' })
  ).toHaveValue('');
  const created = sidebar.getByRole('treeitem', {
    name: 'Untitled 3.md',
    exact: true,
  });
  await expect(created).toBeInViewport();
  await expect(created).toHaveAttribute('aria-selected', 'true');
});

test('opens an updated saved search and removes deleted entries while open', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openPalette(page, 'commands:open');
  const filter = page.getByRole('searchbox', { name: 'Filter files' });
  await expect(
    dialog.getByRole('menuitem', { name: 'Open saved search: My Research' })
  ).toBeVisible();
  await expect(filter).toHaveValue('');

  await updateMockBindingResponse(
    page,
    { file: SERVICE_FILES.SEARCH_SERVICE, method: 'GetAllSavedSearches' },
    {
      success: true,
      message: '',
      data: [{ name: 'My Research', query: '#work AND f:redis' }],
    }
  );
  await emitWailsEvent(page, 'saved-search:update', null, 'test');

  await expect(
    dialog.getByRole('menuitem', { name: 'Open saved search: Economics' })
  ).toHaveCount(0);
  await expect(
    dialog.getByRole('menuitem', { name: 'Open saved search: My Research' })
  ).toContainText('#work AND f:redis');
  await dialog.getByRole('searchbox').fill('research');
  await dialog.getByRole('searchbox').press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(filter).toHaveValue('#work AND f:redis');
  await expect(filter).toBeFocused();
});
