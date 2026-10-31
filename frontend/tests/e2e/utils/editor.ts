import { expect, type BrowserContext, type Page } from '@playwright/test';
import { getMockBindingCalls, mockBinding } from './mock-binding';
import { SERVICE_FILES } from './service-files';

export const NOTE_URL = '/notes/Economics%20Notes/Supply%20and%20Demand.md';

export const SAVE_NOTE_BINDING = {
  file: SERVICE_FILES.NOTE_SERVICE,
  method: 'SetNoteMarkdown',
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
      method: 'GetNoteMarkdown',
    },
    {
      success: true,
      message: '',
      data: markdown,
    }
  );
}

export async function mockNote(context: BrowserContext, markdown: string) {
  await mockBinding(
    context,
    { file: SERVICE_FILES.NOTE_SERVICE, method: 'DoesNoteExist' },
    true
  );
  await mockNoteMarkdown(context, markdown);
}

// Feed the actual autosave payload back through the mocked read boundary.
// This verifies frontend save/load integration, not persistence in the Go backend.
export async function reopenSavedNote(
  page: Page,
  expectedContent: string | string[]
) {
  const markers = Array.isArray(expectedContent)
    ? expectedContent
    : [expectedContent];
  const [, , markdown] = await lastCallMatching(page, markers);
  if (typeof markdown !== 'string') throw new Error('Missing saved markdown');
  await mockBinding(
    page.context(),
    {
      file: SERVICE_FILES.NOTE_SERVICE,
      method: 'GetNoteMarkdown',
    },
    { success: true, message: '', data: markdown }
  );
  await page.reload();
  await expect(getEditor(page)).toBeVisible();
  return markdown;
}

async function lastCallMatching(page: Page, markers: string[]) {
  let call: unknown[] = [];
  await expect(async () => {
    call = (await getMockBindingCalls(page, SAVE_NOTE_BINDING)).at(-1) ?? [];
    const [, , markdown] = call;
    expect(typeof markdown).toBe('string');
    for (const marker of markers)
      expect(markdown).toEqual(expect.stringContaining(marker));
  }).toPass();
  return call;
}
