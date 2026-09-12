import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_NOTE_EXISTS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

const NOTE_PATH = '/notes/Economics%20Notes/Supply%20and%20Demand.md';
const MARKDOWN = [
  '## Dragged heading',
  '',
  '- Bullet item',
  '    - Nested bullet',
  '',
  '| First | Second |',
  '| --- | --- |',
  '| Alpha | Beta |',
  '',
  'A paragraph long enough to wrap onto multiple lines. '.repeat(8),
].join('\n');

type DragCapture = {
  connected: boolean;
  inViewport: boolean;
  visible: boolean;
  trusted: boolean;
};

declare global {
  interface Window {
    __dragCapture?: DragCapture;
  }
}

async function startBlockDrag(page: Page, block: Locator) {
  await block.hover();
  const dragHandle = page.getByRole('button', {
    name: 'Drag to reorder block',
  });
  // Locator hover waits for the spring-driven handle to stop moving.
  await dragHandle.hover();
  await expect(dragHandle).toHaveCSS('opacity', '1');
  const bounds = await dragHandle.boundingBox();
  if (!bounds) throw new Error('Drag handle has no bounds');
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;

  await page.mouse.down();
  await page.mouse.move(x + 40, y + 10, { steps: 10 });

  const ghost = page.locator('#block-element');
  await expect(ghost).toBeAttached();
  return ghost;
}

async function getBlockAppearance(block: Locator) {
  return block.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      text: element.textContent,
      color: style.color,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      whiteSpace: style.whiteSpace,
      width: bounds.width,
      height: bounds.height,
      listStyleType: style.listStyleType,
      borderCollapse: style.borderCollapse,
      children: Array.from(element.querySelectorAll('li, th, td')).map(
        (child) => {
          const css = getComputedStyle(child);
          return {
            text: child.textContent,
            display: css.display,
            marginLeft: css.marginLeft,
            listStyleType: css.listStyleType,
            borderWidth: css.borderWidth,
            borderColor: css.borderColor,
          };
        }
      ),
    };
  });
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Editor drag ghost (${theme})`, () => {
    test.beforeEach(async ({ context, page }) => {
      await mockBinding(
        context,
        { file: SERVICE_FILES.NOTE_SERVICE, method: 'DoesNoteExist' },
        MOCK_NOTE_EXISTS_RESPONSE
      );
      await mockBinding(
        context,
        { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
        {
          ...MOCK_PROJECT_SETTINGS_RESPONSE,
          data: {
            ...MOCK_PROJECT_SETTINGS_RESPONSE.data,
            appearance: {
              ...MOCK_PROJECT_SETTINGS_RESPONSE.data.appearance,
              theme,
              editorFontFamily: 'Georgia',
              editorFontSize: 18,
              editorLineHeight: 1.5,
            },
          },
        }
      );
      await mockBinding(
        context,
        {
          file: SERVICE_FILES.NOTE_SERVICE,
          method: 'GetNoteMarkdownWithCodeResults',
        },
        {
          success: true,
          message: '',
          data: {
            markdown: MARKDOWN,
            codeResults: { version: 1, codeBlocks: [] },
          },
        }
      );
      // The native drag bitmap is outside Playwright's page screenshots. Observe
      // its capture boundary without replacing setDragImage or synthesizing a drag.
      await page.addInitScript(() => {
        let trusted = false;
        document.addEventListener(
          'dragstart',
          (event) => {
            trusted = event.isTrusted;
          },
          true
        );
        const original = DataTransfer.prototype.setDragImage;
        DataTransfer.prototype.setDragImage = function (image, x, y) {
          const bounds = image.getBoundingClientRect();
          const css = getComputedStyle(image);
          window.__dragCapture = {
            connected: image.isConnected,
            trusted,
            inViewport:
              bounds.left >= 0 &&
              bounds.top >= 0 &&
              bounds.right <= innerWidth &&
              bounds.bottom <= innerHeight,
            visible:
              bounds.width > 0 &&
              bounds.height > 0 &&
              css.visibility === 'visible' &&
              css.opacity === '1',
          };
          original.call(this, image, x, y);
        };
      });
    });

    for (const { name, selector } of [
      { name: 'H2 heading', selector: 'h2' },
      { name: 'nested bullet list', selector: ':scope > ul' },
      { name: 'table', selector: 'table' },
      {
        name: 'wrapped paragraph',
        selector: ':scope > p:has-text("A paragraph")',
      },
    ]) {
      test(`captures a visible ${name} with its editor formatting`, async ({
        page,
      }, testInfo) => {
        await page.goto(NOTE_PATH);
        const editor = page.locator('#content-editable-editor');
        const source = editor.locator(selector).first();
        await expect(source).toBeVisible();
        const appearance = await getBlockAppearance(source);
        if (name === 'wrapped paragraph') {
          expect(appearance.height).toBeGreaterThan(
            parseFloat(appearance.lineHeight)
          );
        }
        if (name === 'nested bullet list') {
          await expect(source.locator('ul')).toHaveCount(1);
        }

        const ghost = await startBlockDrag(page, source);

        expect(await page.evaluate(() => window.__dragCapture)).toEqual({
          connected: true,
          inViewport: true,
          visible: true,
          trusted: true,
        });
        expect(
          await getBlockAppearance(ghost.locator(selector).first())
        ).toEqual(appearance);
        await expect
          .poll(() =>
            ghost.evaluate((element) => element.getBoundingClientRect().right)
          )
          .toBeLessThan(0);
        // Render the captured source for visual QA; this does not assert pixels
        // of the operating system's native drag bitmap.
        await ghost.evaluate((element) => {
          element.style.left = '0';
        });
        const imagePath = testInfo.outputPath('drag-image-source.png');
        await ghost.screenshot({ path: imagePath });
        await testInfo.attach('drag-image-source', {
          path: imagePath,
          contentType: 'image/png',
        });
        await ghost.evaluate((element) => {
          element.style.left = '-9999px';
        });
        await page.mouse.up();
        await expect(ghost).not.toBeAttached();
      });
    }
  });
}
