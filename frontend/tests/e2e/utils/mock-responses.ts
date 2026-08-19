/**
 * Shared mock responses for e2e tests.
 * These provide consistent test data across test suites.
 */

/**
 * Mock response for FileTreeService.GetAllPaths — every path under notes/,
 * walk order (each directory immediately followed by its children), with
 * directories marked by a trailing slash. Feeds the sidebar file tree.
 */
export const MOCK_ALL_PATHS_RESPONSE = {
  success: true,
  message: '',
  data: [
    'Economics Notes/',
    'Economics Notes/Inflation.md',
    'Economics Notes/Market Equilibrium.md',
    'Economics Notes/Supply and Demand.md',
    'Research Notes/',
    'Research Notes/Quantum Physics.md',
  ],
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
      accentColor: 'rgb(96, 165, 250)',
      noteWidth: 'fullWidth',
      uiFontFamily: 'ui-sans-serif',
      editorFontSize: 14,
      editorLineHeight: 2,
      editorFontFamily: '',
      showEmptyLinePlaceholder: true,
      showTableOfContentsByDefault: false,
      sidebarVisibility: {
        hidePinned: false,
        hideRecent: false,
        hideKernels: false,
        hideTags: false,
        hideSavedSearches: false,
      },
    },
    code: {
      codeBlockVimMode: false,
      codeBlockFontFamily: '',
      codeBlockFontSize: 13,
      codeBlockLineWrapping: false,
      codeBlockShowLineNumbers: false,
      codeBlockDefaultLanguage: 'python',
      pythonVenvPath: '',
      customPythonVenvPaths: [],
    },
  },
};

export const MOCK_NOTE_EXISTS_RESPONSE = true;

export const MOCK_NOTE_MARKDOWN_RESPONSE = {
  success: true,
  message: '',
  data: {
    markdown: '# Sample Note\n\nThis is sample markdown content.',
    codeResults: { version: 1, codeBlocks: [] },
  },
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

/** Generic success response for operations returning BackendResponseWithoutData */
export const MOCK_SUCCESS_RESPONSE = {
  success: true,
  message: '',
};

/**
 * Mock response for SearchService.FullTextSearch.
 * Uses the FullTextSearchPage format with results, nextSearchAfter, hasMore, total.
 */
export const MOCK_FULL_TEXT_SEARCH_RESPONSE = {
  results: [
    {
      type: 'note',
      title: 'Supply and Demand.md',
      folder: 'Economics Notes',
      name: 'Supply and Demand.md',
      tags: ['economics', 'basics'],
      lastUpdated: '2024-01-15T10:30:00Z',
      created: '2024-01-10T09:00:00Z',
      highlights: [
        {
          content: 'This is a <mark>search</mark> result highlight',
          isCode: false,
          highlightedTerm: 'search',
        },
      ],
      codeContent: [],
    },
    {
      type: 'note',
      title: 'Inflation.md',
      folder: 'Economics Notes',
      name: 'Inflation.md',
      tags: ['economics'],
      lastUpdated: '2024-01-14T15:00:00Z',
      created: '2024-01-11T10:00:00Z',
      highlights: [],
      codeContent: [],
    },
    {
      type: 'note',
      title: 'Quantum Physics.md',
      folder: 'Research Notes',
      name: 'Quantum Physics.md',
      tags: ['research', 'physics'],
      lastUpdated: '2024-01-13T12:00:00Z',
      created: '2024-01-12T08:00:00Z',
      highlights: [],
      codeContent: [],
    },
  ],
  nextSearchAfter: [],
  hasMore: false,
  total: 3,
};

export const MOCK_EMPTY_SEARCH_RESPONSE = {
  results: [],
  nextSearchAfter: [],
  hasMore: false,
  total: 0,
};
