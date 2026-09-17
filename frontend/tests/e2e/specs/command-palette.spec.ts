import { test, expect, type Page } from '@playwright/test';
import {
  mockBinding,
  getMockBindingCalls,
  updateMockBindingResponse,
} from '../utils/mock-binding';
import {
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

test('toggles Quick Open closed and leaves the sidebar filter alone', async ({
  page,
}) => {
  await page.goto('/');
  const filter = page.getByRole('searchbox', { name: 'Filter files' });
  await filter.fill('#existing');
  const dialog = await openPalette(page);
  await dialog.getByRole('searchbox').fill('f:redis');

  await emitWailsEvent(page, 'navigation:quick-open', null, 'test');

  await expect(dialog).toHaveCount(0);
  await expect(filter).toHaveValue('#existing');
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

test('does not replace an existing settings dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

  await emitWailsEvent(page, 'navigation:quick-open', null, 'test');

  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Quick Open' })).toHaveCount(0);
});

test('keeps deletion keys inside the palette while editing the query', async ({
  page,
}) => {
  await page.goto(NOTE_URL);
  const dialog = await openPalette(page);
  const input = dialog.getByRole('searchbox');
  await input.fill('redis');
  await expect(dialog.getByRole('menuitem')).toHaveCount(2);
  await page.evaluate(() => {
    (window as unknown as { leakedDeleteKeys: number }).leakedDeleteKeys = 0;
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        (window as unknown as { leakedDeleteKeys: number }).leakedDeleteKeys++;
      }
    });
  });

  await input.press('Backspace');
  await expect(input).toHaveValue('redi');
  await input.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(0, 0)
  );
  await input.press('Delete');
  await expect(input).toHaveValue('edi');
  await input.press('ControlOrMeta+a');
  await input.press('Backspace');

  await expect(input).toHaveValue('');
  await expect(page).toHaveURL(NOTE_URL);
  await expect(input).toBeFocused();
  expect(
    await page.evaluate(
      () => (window as unknown as { leakedDeleteKeys: number }).leakedDeleteKeys
    )
  ).toBe(0);
});

test('shows the shared search syntax help on hover and keyboard focus', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openPalette(page);
  const help = dialog.getByRole('button', { name: 'Search syntax help' });

  await page.mouse.move(0, 0);
  await help.hover();

  await expect(page.getByRole('tooltip')).toContainText('f:readme');
  await expect(page.getByRole('tooltip')).toContainText('Sort');
  await page.mouse.move(0, 0);
  await dialog.getByRole('searchbox').press('Tab');
  await expect(help).toBeFocused();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Refresh', exact: true })
  ).toHaveCount(0);
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

test('either palette shortcut closes an open palette without switch buttons', async ({
  page,
}) => {
  await page.goto('/');
  const commands = await openPalette(page, 'commands:open');

  await expect(
    commands.getByRole('button', { name: 'Files', exact: true })
  ).toHaveCount(0);
  await emitWailsEvent(page, 'navigation:quick-open', null, 'test');
  await expect(commands).toHaveCount(0);
  const files = await openPalette(page);
  await files.getByRole('searchbox').fill('@work/redis.md');

  await expect
    .poll(async () => (await getMockBindingCalls(page, searchBinding)).at(-1))
    .toEqual(['@work/redis.md', [], 100]);
  await expect(
    files.getByRole('button', { name: 'Commands', exact: true })
  ).toHaveCount(0);
  await emitWailsEvent(page, 'commands:open', null, 'test');
  await expect(files).toHaveCount(0);
  await openPalette(page, 'commands:open');
  await expect(commands.getByRole('searchbox')).toHaveValue('');
  await commands.getByRole('menuitem', { name: /Search All Notes/ }).click();
  await expect(
    page.getByRole('searchbox', { name: 'Filter files' })
  ).toBeFocused();
});
