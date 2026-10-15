import { expect, type BrowserContext, type Page } from '@playwright/test';
import { getMockBindingCalls, mockBinding } from './mock-binding';
import { MOCK_NOTE_EXISTS_RESPONSE } from './mock-responses';
import { SERVICE_FILES } from './service-files';

export const NOTE_URL = '/notes/Economics%20Notes/Supply%20and%20Demand.md';

export const SAVE_NOTE_BINDING = {
  file: SERVICE_FILES.NOTE_SERVICE,
  method: 'SetNoteMarkdownWithCodeResults',
};

export function getEditor(page: Page) {
  return page.locator('#content-editable-editor');
}

export async function mockNoteMarkdown(
  context: BrowserContext,
  markdown: string
) {
  await mockBinding(
    context,
    {
      file: SERVICE_FILES.NOTE_SERVICE,
      method: 'GetNoteMarkdownWithCodeResults',
    },
    {
      success: true,
      message: '',
      data: { markdown, codeResults: { version: 1, codeBlocks: [] } },
    }
  );
}

export async function mockNote(context: BrowserContext, markdown: string) {
  await mockBinding(
    context,
    { file: SERVICE_FILES.NOTE_SERVICE, method: 'DoesNoteExist' },
    MOCK_NOTE_EXISTS_RESPONSE
  );
  await mockNoteMarkdown(context, markdown);
}

// Feed the actual autosave payload back through the mocked read boundary.
// This verifies frontend save/load integration, not persistence in the Go backend.
export async function reopenSavedNote(page: Page, expectedContent: string) {
  await expect
    .poll(
      async () =>
        (await getMockBindingCalls(page, SAVE_NOTE_BINDING)).at(-1)?.[2]
    )
    .toContain(expectedContent);
  const saved = (await getMockBindingCalls(page, SAVE_NOTE_BINDING)).at(-1)!;
  const markdown = saved[2];
  if (typeof markdown !== 'string') throw new Error('Expected saved Markdown');
  await mockBinding(
    page.context(),
    {
      file: SERVICE_FILES.NOTE_SERVICE,
      method: 'GetNoteMarkdownWithCodeResults',
    },
    { success: true, message: '', data: { markdown, codeResults: saved[3] } }
  );
  await page.reload();
  await expect(getEditor(page)).toBeVisible();
  return markdown;
}
