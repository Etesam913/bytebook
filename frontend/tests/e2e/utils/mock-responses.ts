/**
 * Shared mock responses for e2e tests.
 * These provide consistent test data across test suites.
 */

export const MOCK_FOLDER_RESPONSE = {
  success: true,
  message: '',
  data: ['Economics Notes', 'Research Notes'],
};

export const MOCK_TAGS_RESPONSE = {
  success: true,
  message: '',
  data: ['economics', 'research', 'dev'],
};

export const MOCK_SAVED_SEARCHES_RESPONSE = {
  success: true,
  message: '',
  data: [
    { name: 'My Research', query: 'research' },
    { name: 'Economics', query: 'economics' },
  ],
};

export const MOCK_PROJECT_SETTINGS_RESPONSE = {
  success: true,
  message: '',
  data: {
    pinnedNotes: [
      'Economics Notes/Supply and Demand.md',
      'Research Notes/Quantum Physics.md',
    ],
    projectPath: '',
    appearance: {
      theme: 'light',
      noteSidebarItemSize: 'card',
      accentColor: '',
      noteWidth: 'fullWidth',
      editorFontFamily: 'Bricolage Grotesque',
      showEmptyLinePlaceholder: true,
    },
    code: {
      codeBlockVimMode: false,
      pythonVenvPath: '',
      customPythonVenvPaths: [],
    },
  },
};

export const MOCK_NOTES_RESPONSE = {
  success: true,
  message: '',
  data: [
    { folder: 'Economics Notes', note: 'Supply and Demand.md' },
    { folder: 'Economics Notes', note: 'Inflation.md' },
    { folder: 'Economics Notes', note: 'Market Equilibrium.md' },
  ],
};

export const MOCK_NOTE_EXISTS_RESPONSE = true;

export const MOCK_NOTE_PREVIEW_RESPONSE = {
  success: true,
  message: '',
  data: {
    firstLine: 'This is a preview of the note content',
    firstImageSrc: '',
    size: 1024,
    lastUpdated: '2024-01-15T10:30:00Z',
  },
};

export const MOCK_NOTE_MARKDOWN_RESPONSE = {
  success: true,
  message: '',
  data: '# Sample Note\n\nThis is sample markdown content.',
};

/**
 * Mock response for GetTagsForNotes - maps note paths to their associated tags.
 * Used for testing the BottomBar tag display and edit dialog.
 */
export const MOCK_TAGS_FOR_NOTES_RESPONSE = {
  success: true,
  message: '',
  data: {
    'Economics Notes/Supply and Demand.md': ['economics', 'research'],
    'Economics Notes/Inflation.md': ['economics'],
    'Economics Notes/Market Equilibrium.md': [],
  },
};

/**
 * Mock response for SetTagsOnNotes - successful tag update.
 */
export const MOCK_SET_TAGS_ON_NOTES_RESPONSE = {
  success: true,
  message: '',
  data: null,
};
