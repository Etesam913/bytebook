import { expect, test, type Locator, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { getEditor, mockNote, NOTE_URL } from '../../utils/editor';
import { getMockBindingCalls, mockBinding } from '../../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

const saveBinding = {
  file: SERVICE_FILES.NOTE_SERVICE,
  method: 'SetNoteMarkdownWithCodeResults',
};

async function expectFullWidth(page: Page, media: Locator) {
  const editorBox = (await getEditor(page).boundingBox())!;
  await expect
    .poll(async () => (await media.boundingBox())?.width)
    .toBeCloseTo(editorBox.width - 12, 0);
  const bounds = (await media.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(editorBox.x);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    editorBox.x + editorBox.width
  );
}

test.beforeEach(async ({ context, page }) => {
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
  await mockBinding(context, saveBinding, { success: true, message: '' });
  await mockNote(
    context,
    [
      '![First?width=160&height=80](/notes/first.png)',
      '![Clip?width=160&height=90](/notes/clip.webm)',
      '![Outside?width=160&height=80](/notes/outside.png)',
      'Text stays unchanged.',
    ].join('\n\n')
  );
  await page.route('**/notes/*.png', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80"><rect width="160" height="80" fill="steelblue"/></svg>',
    })
  );
  await page.route('**/notes/clip.webm', (route) =>
    route.fulfill({
      contentType: 'video/webm',
      path: fileURLToPath(
        new URL('../../fixtures/media.webm', import.meta.url)
      ),
    })
  );
  await page.goto(NOTE_URL);
  await expect(getEditor(page).getByAltText('First')).toBeVisible();
  await expect(
    getEditor(page).getByTitle('Clip', { exact: true })
  ).toBeVisible();
  await expect(getEditor(page).getByAltText('Outside')).toBeVisible();
});

test('makes an unselected image full width without resizing the previous selection', async ({
  page,
}) => {
  const editor = getEditor(page);
  const selected = editor.getByAltText('First');
  const target = editor.getByAltText('Outside');
  await selected.click();

  await target.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Full width' }).click();

  await expectFullWidth(page, target);
  expect((await selected.boundingBox())?.width).toBe(160);
  const bounds = (await target.boundingBox())!;
  expect(bounds.width / bounds.height).toBeCloseTo(2, 1);
});

test('makes the selected image and video full width, saves dimensions, and undoes together', async ({
  page,
}) => {
  const editor = getEditor(page);
  const image = editor.getByAltText('First');
  const video = editor.getByTitle('Clip', { exact: true });
  const outside = editor.getByAltText('Outside');
  await image.click();
  await video.click({ modifiers: ['Shift'], position: { x: 20, y: 10 } });
  await expect(
    page.getByRole('slider', { name: 'Resize image' })
  ).toBeVisible();
  await expect(
    page.getByRole('slider', { name: 'Resize video' })
  ).toBeVisible();

  await video.click({ button: 'right', position: { x: 20, y: 10 } });
  await page.getByRole('menuitem', { name: 'Full width' }).click();

  await expectFullWidth(page, image);
  await expectFullWidth(page, video);
  expect((await outside.boundingBox())?.width).toBe(160);
  const videoBox = (await video.boundingBox())!;
  expect(videoBox.width / videoBox.height).toBeCloseTo(16 / 9, 1);
  const width = (await image.boundingBox())!.width;
  await expect
    .poll(async () => {
      const calls = await getMockBindingCalls(page, saveBinding);
      return calls.at(-1)?.[2];
    })
    .toContain(`First?width=${width}&height=${Math.round(width / 2)}`);
  await expect
    .poll(async () => {
      const calls = await getMockBindingCalls(page, saveBinding);
      return calls.at(-1)?.[2];
    })
    .toContain(`Clip?width=${width}&height=${Math.round((width * 9) / 16)}`);
  await expect(editor).toContainText('Text stays unchanged.');

  await image.click();
  await page.keyboard.press('ControlOrMeta+z');

  await expect(image).toHaveCSS('width', '160px');
  await expect(video).toHaveCSS('width', '160px');
});

test('makes every media item in a range selection full width', async ({
  page,
}) => {
  const editor = getEditor(page);
  const image = editor.getByAltText('First');
  const video = editor.getByTitle('Clip', { exact: true });
  const outside = editor.getByAltText('Outside');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');

  await video.click({ button: 'right', position: { x: 20, y: 10 } });
  await page.getByRole('menuitem', { name: 'Full width' }).click();

  await expectFullWidth(page, image);
  await expectFullWidth(page, video);
  await expectFullWidth(page, outside);
});
