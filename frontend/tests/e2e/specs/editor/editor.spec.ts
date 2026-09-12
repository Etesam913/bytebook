import { test, expect } from '@playwright/test';
import {
  getEditor,
  mockNote,
  NOTE_URL,
  mockNoteMarkdown,
} from '../../utils/editor';
import { mockBinding } from '../../utils/mock-binding';
import {
  MOCK_ALL_PATHS_RESPONSE,
  MOCK_NOTE_MARKDOWN_RESPONSE,
  MOCK_PROJECT_SETTINGS_RESPONSE,
} from '../../utils/mock-responses';
import { SERVICE_FILES } from '../../utils/service-files';

const BOLD_TOOLTIP = 'Bold (⌘B)';
const ITALIC_TOOLTIP = 'Italic (⌘I)';
const STRIKETHROUGH_TOOLTIP = 'Strikethrough (⌘⇧X)';

test.describe('Editor', () => {
  test.beforeEach(async ({ context }) => {
    await mockBinding(
      context,
      { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
      MOCK_ALL_PATHS_RESPONSE
    );

    // Mock project settings
    await mockBinding(
      context,
      { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
      MOCK_PROJECT_SETTINGS_RESPONSE
    );

    await mockNote(context, MOCK_NOTE_MARKDOWN_RESPONSE.data.markdown);
  });

  test('renders simple markdown content', async ({ page }) => {
    await page.goto(NOTE_URL);

    const editor = getEditor(page);
    await expect(editor).toBeVisible();

    await expect(editor).toContainText('Sample Note');
    await expect(editor).toContainText('This is sample markdown content.');
  });

  test('renders note title correctly', async ({ page }) => {
    await page.goto(NOTE_URL);

    const noteContainer = page.locator('#note-container');
    await expect(noteContainer).toBeVisible();

    const noteTitleInput = noteContainer.locator(
      'input[placeholder="Untitled Note"]'
    );
    await expect(noteTitleInput).toHaveValue('Supply and Demand');
  });

  test('scrolls breadcrumbs and tags together without overlapping segments', async ({
    page,
    context,
  }, testInfo) => {
    const filename = 'college-average-publication-with-a-long-filename.xyz';
    const filePath = `Research/Lots of files/tmp/${filename}`;
    await mockBinding(
      context,
      { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTagsForNotes' },
      {
        success: true,
        message: '',
        data: { [filePath]: ['College', 'Economics', 'Research methods'] },
      }
    );
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto(
      `/notes/${filePath.split('/').map(encodeURIComponent).join('/')}`
    );
    const trail = page.getByLabel('Note location');
    const row = trail.locator('..');
    const tags = page.getByRole('grid', { name: 'Note tags' });
    await expect(tags).toBeVisible();
    const label = trail.getByTitle(filename);

    await expect(label).toHaveCSS('text-overflow', 'ellipsis');
    expect(await label.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true
    );
    const bounds = await trail.locator('li').evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        const link = item.firstElementChild!.getBoundingClientRect();
        return { left: box.left, right: box.right, linkRight: link.right };
      })
    );
    for (let i = 0; i < bounds.length; i++) {
      expect(bounds[i].linkRight).toBeLessThanOrEqual(bounds[i].right + 1);
      if (i > 0)
        expect(bounds[i].left).toBeGreaterThanOrEqual(bounds[i - 1].right);
    }
    await expect(row).toHaveCSS('overflow-x', 'auto');
    const trailBefore = await trail.boundingBox();
    const tagsBefore = await tags.boundingBox();

    await row.evaluate((el) => {
      el.scrollLeft = 100;
    });

    expect(await row.evaluate((el) => el.scrollLeft)).toBe(100);
    expect((await trail.boundingBox())!.x).toBeCloseTo(trailBefore!.x - 100);
    expect((await tags.boundingBox())!.x).toBeCloseTo(tagsBefore!.x - 100);

    await row.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });

    await expect(
      tags.getByText('Research methods', { exact: true })
    ).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('breadcrumb-tags.png') });
  });

  test('maximize button hides the file sidebar', async ({ page }) => {
    await page.goto(NOTE_URL);

    const editor = getEditor(page);
    await expect(editor).toBeVisible();

    // Verify the file sidebar is visible initially
    const fileSidebar = page.getByTestId('file-sidebar');
    const economicsFolder = fileSidebar.getByRole('treeitem', {
      name: 'Economics Notes',
    });
    await expect(fileSidebar).toBeVisible();
    await expect(economicsFolder).toBeVisible();

    // Find the maximize button in the toolbar
    const toolbar = page.locator('nav').first();
    await expect(toolbar).toBeVisible();

    const maximizeBtn = toolbar
      .locator('span.flex.items-center button')
      .first();
    await maximizeBtn.click();

    // Verify the file sidebar is now hidden
    await expect(fileSidebar).not.toBeVisible({ timeout: 5000 });

    // Click again to minimize and verify sidebar is visible again
    await maximizeBtn.click();
    await expect(fileSidebar).toBeVisible();
    await expect(economicsFolder).toBeVisible();
  });

  test.describe('Error handling', () => {
    test('handles failed markdown fetch gracefully', async ({
      page,
      context,
    }) => {
      const FAILURE_RESPONSE = {
        success: false,
        message: 'Failed to fetch note markdown',
        data: null,
      };

      await mockBinding(
        context,
        {
          file: SERVICE_FILES.NOTE_SERVICE,
          method: 'GetNoteMarkdownWithCodeResults',
        },
        FAILURE_RESPONSE
      );

      await page.goto(NOTE_URL);

      // When markdown fetch fails, the app redirects to the 404 page
      await expect(page).toHaveURL(/\/404/);
    });
  });

  test.describe('Floating toolbar', () => {
    test.beforeEach(async ({ context }) => {
      await mockNoteMarkdown(
        context,
        '# Sample Note\n\nThis is some selectable text for testing.'
      );
    });

    test('shows toolbar buttons when text is selected', async ({ page }) => {
      await page.goto(NOTE_URL);

      const editor = getEditor(page);
      await editor
        .getByText('This is some selectable text')
        .click({ clickCount: 3 });

      const floatingToolbar = page.getByTestId('floating-toolbar');
      await expect(floatingToolbar).toBeVisible({ timeout: 3000 });

      for (const label of [
        BOLD_TOOLTIP,
        ITALIC_TOOLTIP,
        STRIKETHROUGH_TOOLTIP,
        'Bullet List',
        'Numbered List',
        'Checklist',
        'Insert Link (⌘K)',
      ]) {
        await expect(
          floatingToolbar.getByRole('button', { name: label, exact: true })
        ).toBeVisible();
      }
    });

    const formattingTests = [
      { button: BOLD_TOOLTIP, selector: 'strong' },
      { button: ITALIC_TOOLTIP, selector: 'em' },
      { button: STRIKETHROUGH_TOOLTIP, selector: 'span.text-strikethrough' },
    ];

    for (const { button, selector } of formattingTests) {
      test(`applies ${button.toLowerCase()} formatting when ${button} button is clicked`, async ({
        page,
      }) => {
        await page.goto(NOTE_URL);

        const editor = getEditor(page);
        await editor
          .getByText('This is some selectable text')
          .click({ clickCount: 3 });

        const floatingToolbar = page.getByTestId('floating-toolbar');
        await expect(floatingToolbar).toBeVisible({ timeout: 3000 });

        await floatingToolbar.locator(`button[aria-label="${button}"]`).click();
        await expect(editor.locator(selector)).toContainText('selectable text');
      });
    }
  });
});
