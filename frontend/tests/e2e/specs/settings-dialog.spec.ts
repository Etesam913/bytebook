import { expect, test, type Page } from '@playwright/test';
import { getMockBindingCalls, mockBinding } from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
  MOCK_TOP_LEVEL_ITEMS_RESPONSE,
} from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';

const UPDATE_SETTINGS_BINDING = {
  file: SERVICE_FILES.SETTINGS_SERVICE,
  method: 'UpdateProjectSettings',
};

async function openSettings(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Settings' })).toBeVisible();
  return dialog;
}

test.describe('Settings dialog', () => {
  test.beforeEach(async ({ context }) => {
    await mockBinding(
      context,
      { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetTopLevelItems' },
      MOCK_TOP_LEVEL_ITEMS_RESPONSE
    );
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
    await mockBinding(context, UPDATE_SETTINGS_BINDING, {
      success: true,
      message: '',
      data: MOCK_PROJECT_SETTINGS_RESPONSE.data,
    });
  });

  test('updates the new editor settings', async ({ page }) => {
    const dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Editor' }).click();

    const lineHeightInput = dialog.getByRole('spinbutton', {
      name: 'Editor line height',
    });
    const tableOfContentsSwitch = dialog.getByRole('switch', {
      name: 'Show the table of contents by default',
    });

    await expect(lineHeightInput).toHaveValue('2');
    await expect(tableOfContentsSwitch).not.toBeChecked();

    await lineHeightInput.fill('2.4');
    await lineHeightInput.blur();
    await expect
      .poll(async () => {
        const calls = await getMockBindingCalls(page, UPDATE_SETTINGS_BINDING);
        return calls.at(-1)?.[0];
      })
      .toMatchObject({ appearance: { editorLineHeight: 2.4 } });
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue(
            '--editor-line-height'
          )
        )
      )
      .toBe('2.4');

    await tableOfContentsSwitch.press('Space');
    await expect
      .poll(async () => {
        const calls = await getMockBindingCalls(page, UPDATE_SETTINGS_BINDING);
        return calls.at(-1)?.[0];
      })
      .toMatchObject({
        appearance: { showTableOfContentsByDefault: true },
      });
  });

  test('updates the new code block settings', async ({ page }) => {
    const dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Code' }).click();

    const fontSizeInput = dialog.getByRole('spinbutton', {
      name: 'Code block font size',
    });
    const lineWrappingSwitch = dialog.getByRole('switch', {
      name: 'Enable line wrapping in code blocks',
    });
    const lineNumbersSwitch = dialog.getByRole('switch', {
      name: 'Show line numbers in code blocks',
    });
    const languageSelect = dialog.getByRole('button', {
      name: 'Default code block language',
    });

    await expect(fontSizeInput).toHaveValue('13');
    await expect(lineWrappingSwitch).not.toBeChecked();
    await expect(lineNumbersSwitch).not.toBeChecked();
    await expect(languageSelect).toContainText('Python');

    await fontSizeInput.fill('16');
    await fontSizeInput.blur();
    await expect
      .poll(async () => {
        const calls = await getMockBindingCalls(page, UPDATE_SETTINGS_BINDING);
        return calls.at(-1)?.[0];
      })
      .toMatchObject({ code: { codeBlockFontSize: 16 } });
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue(
            '--code-block-font-size-base'
          )
        )
      )
      .toBe('16px');

    await lineWrappingSwitch.press('Space');
    await expect
      .poll(async () => {
        const calls = await getMockBindingCalls(page, UPDATE_SETTINGS_BINDING);
        return calls.at(-1)?.[0];
      })
      .toMatchObject({ code: { codeBlockLineWrapping: true } });

    await lineNumbersSwitch.press('Space');
    await expect
      .poll(async () => {
        const calls = await getMockBindingCalls(page, UPDATE_SETTINGS_BINDING);
        return calls.at(-1)?.[0];
      })
      .toMatchObject({ code: { codeBlockShowLineNumbers: true } });

    await languageSelect.click();
    await page.getByRole('option', { name: 'go' }).click();
    await expect
      .poll(async () => {
        const calls = await getMockBindingCalls(page, UPDATE_SETTINGS_BINDING);
        return calls.at(-1)?.[0];
      })
      .toMatchObject({ code: { codeBlockDefaultLanguage: 'go' } });
  });
});
