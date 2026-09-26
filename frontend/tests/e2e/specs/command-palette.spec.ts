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

test('keeps note commands searchable but disabled without a note', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openPalette(page, 'commands:open');

  await expect(dialog.getByText('Current Note', { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole('menuitem', { name: 'Open in New Window', exact: true })
  ).toBeDisabled();
  await expect(
    dialog.getByRole('menuitem', { name: 'Rename Note…', exact: true })
  ).toBeDisabled();
  await dialog.getByRole('searchbox').fill('rename');
  await dialog.getByRole('searchbox').press('Enter');

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('menuitem')).toBeDisabled();
  await expect(dialog.getByText('Open a note first')).toBeVisible();
  await expect(page).toHaveURL('/');
});

test('hands focus to find and rename and clears note commands on folder navigation', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  await expect(getEditor(page)).toContainText('Current note');
  let dialog = await openPalette(page, 'commands:open');

  await dialog
    .getByRole('menuitem', { name: 'Find in Note', exact: true })
    .click();

  const find = page.getByPlaceholder('Search in note...');
  await expect(find).toBeFocused();
  await find.fill('Current');
  dialog = await openPalette(page, 'commands:open');
  await dialog
    .getByRole('menuitem', { name: 'Find in Note', exact: true })
    .click();
  await expect(find).toBeFocused();
  await expect(find).toHaveValue('Current');

  dialog = await openPalette(page, 'commands:open');
  await dialog
    .getByRole('menuitem', { name: 'Rename Note…', exact: true })
    .click();
  const title = page.getByRole('textbox', { name: 'Note title' });
  await expect(title).toBeFocused();
  await expect
    .poll(() =>
      title.evaluate(
        (input: HTMLInputElement) => input.selectionEnd! - input.selectionStart!
      )
    )
    .toBe('Supply and Demand'.length);

  await page
    .getByRole('treeitem', { name: 'Research Notes', exact: true })
    .dblclick();
  await expect(page).toHaveURL('/notes/Research%20Notes');
  dialog = await openPalette(page, 'commands:open');
  await expect(
    dialog.getByRole('menuitem', { name: 'Find in Note', exact: true })
  ).toBeDisabled();
});

test('shares note actions and reflects table of contents state', async ({
  page,
  context,
}) => {
  const save = {
    file: SERVICE_FILES.NOTE_SERVICE,
    method: 'SetNoteMarkdownWithCodeResults',
  };
  const settings = {
    file: SERVICE_FILES.SETTINGS_SERVICE,
    method: 'UpdateProjectSettings',
  };
  const reveal = {
    file: SERVICE_FILES.NOTE_SERVICE,
    method: 'RevealFolderOrFileInFinder',
  };
  await mockBinding(context, save, { success: true, message: '' });
  await mockBinding(context, settings, MOCK_PROJECT_SETTINGS_RESPONSE);
  await mockBinding(context, reveal, { success: true, message: '' });
  await mockNote(
    context,
    '---\nshowTableOfContents: false\n---\n# Heading\nCurrent note'
  );
  await page.goto(NOTE_URL);
  await expect(getEditor(page)).toContainText('Current note');
  let dialog = await openPalette(page, 'commands:open');

  await dialog
    .getByRole('menuitem', { name: 'Show Table of Contents', exact: true })
    .click();

  await expect
    .poll(async () => (await getMockBindingCalls(page, save)).at(-1)?.[2])
    .toContain('showTableOfContents: true');
  dialog = await openPalette(page, 'commands:open');
  await expect(
    dialog.getByRole('menuitem', {
      name: 'Hide Table of Contents',
      exact: true,
    })
  ).toBeEnabled();
  await dialog
    .getByRole('menuitem', { name: 'Unpin Note', exact: true })
    .click();
  await expect
    .poll(async () => (await getMockBindingCalls(page, settings)).at(-1)?.[0])
    .toMatchObject({ pinnedNotes: ['Research Notes/Quantum Physics.md'] });

  await emitWailsEvent(page, 'settings:update', {
    ...MOCK_PROJECT_SETTINGS_RESPONSE.data,
    pinnedNotes: ['Research Notes/Quantum Physics.md'],
  });
  dialog = await openPalette(page, 'commands:open');
  await expect(
    dialog.getByRole('menuitem', { name: 'Pin Note', exact: true })
  ).toBeEnabled();
  await dialog
    .getByRole('menuitem', { name: 'Reveal in Finder', exact: true })
    .click();
  await expect
    .poll(() => getMockBindingCalls(page, reveal))
    .toEqual([['notes/Economics Notes/Supply and Demand.md', true]]);

  dialog = await openPalette(page, 'commands:open');
  await dialog
    .getByRole('menuitem', { name: 'Edit Tags…', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Edit Tags', exact: true })
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test('enables note commands only after markdown loads', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const payload = (await response
        .clone()
        .json()
        .catch(() => null)) as { data?: { markdown?: string } } | null;
      if (payload?.data?.markdown === 'Current note') {
        await new Promise<void>((resolve) => {
          (window as unknown as { releaseNote: () => void }).releaseNote =
            resolve;
        });
      }
      return response;
    };
  });
  const quickOpen = await openPalette(page);
  await quickOpen.getByRole('menuitem').first().click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof (window as unknown as { releaseNote?: () => void }).releaseNote
      )
    )
    .toBe('function');
  const dialog = await openPalette(page, 'commands:open');
  await expect(
    dialog.getByRole('menuitem', { name: 'Find in Note', exact: true })
  ).toBeDisabled();

  await page.evaluate(() =>
    (window as unknown as { releaseNote: () => void }).releaseNote()
  );

  await expect(
    dialog.getByRole('menuitem', { name: 'Find in Note', exact: true })
  ).toBeEnabled();
});

test('allows Finder reveal for attachments while note commands stay disabled', async ({
  page,
  context,
}) => {
  const reveal = {
    file: SERVICE_FILES.NOTE_SERVICE,
    method: 'RevealFolderOrFileInFinder',
  };
  await mockBinding(context, reveal, { success: true, message: '' });
  await page.goto('/notes/attachment.txt');
  const dialog = await openPalette(page, 'commands:open');
  await expect(
    dialog.getByRole('menuitem', { name: 'Find in Note', exact: true })
  ).toBeDisabled();

  await dialog
    .getByRole('menuitem', { name: 'Reveal in Finder', exact: true })
    .click();

  await expect
    .poll(() => getMockBindingCalls(page, reveal))
    .toEqual([['notes/attachment.txt', true]]);
});

test('shows and hides the rendered table of contents from keyboard commands', async ({
  page,
  context,
}) => {
  await mockBinding(
    context,
    {
      file: SERVICE_FILES.NOTE_SERVICE,
      method: 'SetNoteMarkdownWithCodeResults',
    },
    { success: true, message: '' }
  );
  await mockNote(
    context,
    '---\nshowTableOfContents: false\n---\n# Heading\nCurrent note'
  );
  await page.goto(NOTE_URL);
  await expect(getEditor(page)).toContainText('Current note');
  await getEditor(page).click();
  const toc = page.getByRole('heading', {
    name: 'Table of Contents',
    exact: true,
  });
  await expect(toc).toHaveCount(0);

  let dialog = await openPalette(page, 'commands:open');
  await dialog.getByRole('searchbox').fill('table of contents');
  await dialog.getByRole('searchbox').press('Enter');

  await expect(dialog).toHaveCount(0);
  await expect(toc).toBeVisible();
  await expect(
    page
      .getByRole('listbox', { name: 'Table of contents' })
      .getByRole('option', { name: 'Heading' })
  ).toBeVisible();

  dialog = await openPalette(page, 'commands:open');
  await dialog.getByRole('searchbox').fill('table of contents');
  await dialog.getByRole('searchbox').press('Enter');

  await expect(dialog).toHaveCount(0);
  await expect(toc).toHaveCount(0);

  await page.getByRole('button', { name: 'Note settings menu' }).click();
  await page
    .getByRole('menuitem', { name: 'Show Table of Contents', exact: true })
    .click();
  await expect(toc).toBeVisible();
  await page.getByRole('button', { name: 'Note settings menu' }).click();
  await page
    .getByRole('menuitem', { name: 'Hide Table of Contents', exact: true })
    .click();
  await expect(toc).toHaveCount(0);
});

for (const { url, path } of [
  { url: NOTE_URL, path: 'Economics Notes/Supply and Demand.md' },
  { url: '/notes/attachment.txt', path: 'attachment.txt' },
]) {
  test(`opens ${path} in a new window from the palette`, async ({
    page,
    context,
  }) => {
    const openWindow = {
      file: SERVICE_FILES.NOTE_SERVICE,
      method: 'OpenInNewWindow',
    };
    await mockBinding(context, openWindow, { success: true, message: '' });
    await page.goto(url);
    const dialog = await openPalette(page, 'commands:open');

    await dialog.getByRole('searchbox').fill('new window');
    await dialog.getByRole('searchbox').press('Enter');

    await expect
      .poll(() => getMockBindingCalls(page, openWindow))
      .toEqual([[path]]);
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(url);
  });
}
