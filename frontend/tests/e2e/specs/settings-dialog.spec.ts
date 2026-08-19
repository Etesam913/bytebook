import { expect, test, type Locator, type Page } from '@playwright/test';
import { getMockBindingCalls, mockBinding } from '../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
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

async function openSettingsTab(page: Page, tabName: 'Editor' | 'Code') {
  const dialog = await openSettings(page);
  await dialog.getByRole('tab', { name: tabName }).click();
  return dialog;
}

async function expectLastSettingsUpdate(page: Page, expected: object) {
  await expect
    .poll(async () => {
      const calls = await getMockBindingCalls(page, UPDATE_SETTINGS_BINDING);
      return calls.at(-1)?.[0];
    })
    .toMatchObject(expected);
}

async function toggleSwitch(settingSwitch: Locator) {
  await expect(settingSwitch).not.toBeChecked();
  await settingSwitch.press('Space');
}

test.describe('Settings dialog', () => {
  test.beforeEach(async ({ context }) => {
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

  test('updates the editor line height', async ({ page }) => {
    const dialog = await openSettingsTab(page, 'Editor');
    const lineHeightInput = dialog.getByRole('spinbutton', {
      name: 'Editor line height',
    });

    await expect(lineHeightInput).toHaveValue('2');
    await lineHeightInput.fill('2.4');
    await lineHeightInput.blur();
    await expectLastSettingsUpdate(page, {
      appearance: { editorLineHeight: 2.4 },
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue(
            '--editor-line-height'
          )
        )
      )
      .toBe('2.4');
  });

  test('updates the table of contents default', async ({ page }) => {
    const dialog = await openSettingsTab(page, 'Editor');
    const settingSwitch = dialog.getByRole('switch', {
      name: 'Show the table of contents by default',
    });

    await toggleSwitch(settingSwitch);
    await expectLastSettingsUpdate(page, {
      appearance: { showTableOfContentsByDefault: true },
    });
  });

  test('updates the code block font size', async ({ page }) => {
    const dialog = await openSettingsTab(page, 'Code');
    const fontSizeInput = dialog.getByRole('spinbutton', {
      name: 'Code block font size',
    });

    await expect(fontSizeInput).toHaveValue('13');
    await fontSizeInput.fill('16');
    await fontSizeInput.blur();
    await expectLastSettingsUpdate(page, {
      code: { codeBlockFontSize: 16 },
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue(
            '--code-block-font-size-base'
          )
        )
      )
      .toBe('16px');
  });

  test('updates code block line wrapping', async ({ page }) => {
    const dialog = await openSettingsTab(page, 'Code');
    const settingSwitch = dialog.getByRole('switch', {
      name: 'Enable line wrapping in code blocks',
    });

    await toggleSwitch(settingSwitch);
    await expectLastSettingsUpdate(page, {
      code: { codeBlockLineWrapping: true },
    });
  });

  test('updates code block line numbers', async ({ page }) => {
    const dialog = await openSettingsTab(page, 'Code');
    const settingSwitch = dialog.getByRole('switch', {
      name: 'Show line numbers in code blocks',
    });

    await toggleSwitch(settingSwitch);
    await expectLastSettingsUpdate(page, {
      code: { codeBlockShowLineNumbers: true },
    });
  });

  test('updates the default code block language', async ({ page }) => {
    const dialog = await openSettingsTab(page, 'Code');
    const languageSelect = dialog.getByRole('button', {
      name: 'Default code block language',
    });

    await expect(languageSelect).toContainText('Python');
    await languageSelect.click();
    await page.getByRole('option', { name: 'go' }).click();
    await expectLastSettingsUpdate(page, {
      code: { codeBlockDefaultLanguage: 'go' },
    });
  });
});
