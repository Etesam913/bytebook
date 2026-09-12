import { expect, test, type Page } from '@playwright/test';
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
    await mockBinding(
      context,
      { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetFontFamilies' },
      {
        success: true,
        message: '',
        data: ['Arial', 'Menlo', 'Times New Roman'],
      }
    );
    await mockBinding(context, UPDATE_SETTINGS_BINDING, {
      success: true,
      message: '',
      data: MOCK_PROJECT_SETTINGS_RESPONSE.data,
    });
  });

  for (const font of [
    {
      tab: 'General',
      label: 'UI font family',
      section: 'appearance',
      field: 'uiFontFamily',
      defaultValue: 'ui-sans-serif',
    },
    {
      tab: 'Editor',
      label: 'Editor font family',
      section: 'appearance',
      field: 'editorFontFamily',
      defaultValue: '',
    },
    {
      tab: 'Code',
      label: 'Code block font family',
      section: 'code',
      field: 'codeBlockFontFamily',
      defaultValue: 'monospace',
    },
  ]) {
    test(`searches, selects, and resets ${font.label}`, async ({ page }) => {
      const dialog = await openSettings(page);
      await dialog.getByRole('tab', { name: font.tab, exact: true }).click();
      const input = dialog.getByRole('combobox', { name: font.label });

      await input.fill('Men');

      await expect(
        page.getByRole('option', { name: 'Menlo', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Arial', exact: true })
      ).toHaveCount(0);
      expect(
        await getMockBindingCalls(page, UPDATE_SETTINGS_BINDING)
      ).toHaveLength(0);

      await input.press('ArrowDown');
      await input.press('Enter');

      await expect(input).toHaveValue('Menlo');
      await expectLastSettingsUpdate(page, {
        [font.section]: { [font.field]: 'Menlo' },
      });

      await dialog
        .getByRole('button', { name: 'Reset font family', exact: true })
        .click();

      await expect(input).toHaveValue('Default');
      await expectLastSettingsUpdate(page, {
        [font.section]: { [font.field]: font.defaultValue },
      });
    });
  }

  for (const setting of [
    {
      name: 'the table of contents default',
      tab: 'Editor',
      label: 'Show the table of contents by default',
      section: 'appearance',
      field: 'showTableOfContentsByDefault',
    },
    {
      name: 'code block line wrapping',
      tab: 'Code',
      label: 'Enable line wrapping in code blocks',
      section: 'code',
      field: 'codeBlockLineWrapping',
    },
    {
      name: 'code block line numbers',
      tab: 'Code',
      label: 'Show line numbers in code blocks',
      section: 'code',
      field: 'codeBlockShowLineNumbers',
    },
  ] as const) {
    test(`updates ${setting.name}`, async ({ page }) => {
      const dialog = await openSettingsTab(page, setting.tab);
      const settingSwitch = dialog.getByRole('switch', { name: setting.label });
      await expect(settingSwitch).not.toBeChecked();

      await settingSwitch.press('Space');

      await expectLastSettingsUpdate(page, {
        [setting.section]: { [setting.field]: true },
      });
    });
  }

  test('updates the editor line height', async ({ page }) => {
    const dialog = await openSettingsTab(page, 'Editor');
    const lineHeightInput = dialog.getByRole('textbox', {
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

  test('updates the code block font size', async ({ page }) => {
    const dialog = await openSettingsTab(page, 'Code');
    const fontSizeInput = dialog.getByRole('textbox', {
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
