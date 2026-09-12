import { test, expect, type Page } from '@playwright/test';
import { getEditor, mockNote, NOTE_URL } from '../utils/editor';
import {
  getMockBindingCalls,
  mockBinding,
  updateMockBindingResponse,
} from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';
import { emitWailsEvent, setupWailsEvents } from '../utils/wails-events';

const folderUrl = '/notes/Economics%20Notes';
const notePath = 'Economics Notes/Supply and Demand.md';
const existsBinding = {
  file: SERVICE_FILES.NOTE_SERVICE,
  method: 'DoesNoteExist',
};
const saveBinding = {
  file: SERVICE_FILES.NOTE_SERVICE,
  method: 'SetNoteMarkdownWithCodeResults',
};

function treeItem(page: Page, name: string) {
  return page
    .getByTestId('file-sidebar')
    .getByRole('treeitem', { name, exact: true });
}

async function openNote(page: Page) {
  await page.goto(NOTE_URL);
  await expect(getEditor(page)).toContainText('External deletion regression');
}

async function expectEditorClosed(page: Page, url: string) {
  await expect(page).toHaveURL(url);
  await expect(getEditor(page)).toHaveCount(0);
}

test.beforeEach(async ({ context }) => {
  await setupWailsEvents(context);
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
  await mockNote(context, 'External deletion regression');
  await mockBinding(context, saveBinding, {
    success: true,
    message: '',
    data: '',
  });
});

test('closes a deleted note without saving its pending edit', async ({
  page,
}) => {
  await openNote(page);
  const clockTime = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: clockTime });
  await page.clock.pauseAt(new Date(clockTime.getTime() + 1000));
  await getEditor(page).fill('Pending edit');
  const savesBefore = await getMockBindingCalls(page, saveBinding);
  await updateMockBindingResponse(page, existsBinding, false);

  await emitWailsEvent(page, 'file:delete', [{ filePath: notePath }]);

  await expectEditorClosed(page, folderUrl);
  await page.clock.runFor(500);
  expect(await getMockBindingCalls(page, saveBinding)).toEqual(savesBefore);
});

test('leaves the highest deleted ancestor and ignores unrelated paths', async ({
  page,
}) => {
  await openNote(page);

  await emitWailsEvent(page, 'folder:delete', [{ folderPath: 'Economics' }]);
  await emitWailsEvent(page, 'file:delete', [
    { filePath: 'Economics Notes/Other.md' },
  ]);

  await expect(page).toHaveURL(NOTE_URL);
  await expect(getEditor(page)).toBeVisible();

  await emitWailsEvent(page, 'folder:delete', [
    { folderPath: 'Economics Notes/Child' },
    { folderPath: 'Economics Notes' },
  ]);

  await expectEditorClosed(page, '/');
});

test('rechecks deleted and restored notes on revisit', async ({ page }) => {
  await openNote(page);
  await updateMockBindingResponse(page, existsBinding, false);

  await emitWailsEvent(page, 'file:delete', [{ filePath: notePath }]);

  await expect(page).toHaveURL(folderUrl);
  await treeItem(page, 'Supply and Demand.md').click();
  await expectEditorClosed(page, '/404');

  await treeItem(page, 'Economics Notes').click();
  await expect(page).toHaveURL(folderUrl);
  await treeItem(page, 'Economics Notes').press('ArrowRight');
  await updateMockBindingResponse(page, existsBinding, true);
  await emitWailsEvent(page, 'file:create', [{ filePath: notePath }]);
  await treeItem(page, 'Supply and Demand.md').click();

  await expect(page).toHaveURL(NOTE_URL);
  await expect(getEditor(page)).toContainText('External deletion regression');
});

test('handles maximized deletion and replaces history', async ({ page }) => {
  await page.goto('/');
  await treeItem(page, 'Economics Notes').click();
  await treeItem(page, 'Supply and Demand.md').click();
  await expect(getEditor(page)).toBeVisible();
  await page
    .locator('nav')
    .first()
    .locator('span.flex.items-center button')
    .first()
    .click();
  await expect(page.getByTestId('file-sidebar')).not.toBeVisible();

  await emitWailsEvent(page, 'file:delete', [{ filePath: notePath }]);

  await expectEditorClosed(page, folderUrl);
  await page.goBack();
  await expect(page).toHaveURL(folderUrl);
  await page.goBack();
  await expect(page).toHaveURL('/');
});
