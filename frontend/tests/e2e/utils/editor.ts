import type { BrowserContext, Page } from '@playwright/test';
import { mockBinding } from './mock-binding';
import { MOCK_NOTE_EXISTS_RESPONSE } from './mock-responses';
import { SERVICE_FILES } from './service-files';

export const NOTE_URL = '/notes/Economics%20Notes/Supply%20and%20Demand.md';

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
