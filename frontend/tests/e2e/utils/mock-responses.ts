/**
 * Shared mock responses for e2e tests.
 * These provide consistent test data across test suites.
 */

/**
 * Mock response for FileTreeService.GetTopLevelItems.
 * Returns an array of top-level FileOrFolder objects.
 */
export const MOCK_TOP_LEVEL_ITEMS_RESPONSE = {
  success: true,
  message: '',
  data: [
    {
      id: 'folder-1',
      path: 'Economics Notes',
      name: 'Economics Notes',
      parentId: '',
      type: 'folder',
      childrenIds: [],
    },
    {
      id: 'folder-2',
      path: 'Research Notes',
      name: 'Research Notes',
      parentId: '',
      type: 'folder',
      childrenIds: [],
    },
  ],
};

/**
 * Mock response for FileTreeService.GetChildrenOfFolderBasedOnPath / GetChildrenOfFolderBasedOnLimit.
 * Returns a page of children for the "Economics Notes" folder.
 */
export const MOCK_ECONOMICS_FOLDER_CHILDREN_RESPONSE = {
  success: true,
  message: '',
  data: {
    items: [
      {
        id: 'note-1',
        path: 'Economics Notes/Inflation.md',
        name: 'Inflation.md',
        parentId: 'folder-1',
        type: 'file',
        childrenIds: [],
      },
      {
        id: 'note-2',
        path: 'Economics Notes/Market Equilibrium.md',
        name: 'Market Equilibrium.md',
        parentId: 'folder-1',
        type: 'file',
        childrenIds: [],
      },
      {
        id: 'note-3',
        path: 'Economics Notes/Supply and Demand.md',
        name: 'Supply and Demand.md',
        parentId: 'folder-1',
        type: 'file',
        childrenIds: [],
      },
    ],
    nextCursor: '',
    hasMore: false,
  },
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
      accentColor: '',
      noteWidth: 'fullWidth',
      editorFontSize: 14,
      editorFontFamily: '',
      showEmptyLinePlaceholder: true,
    },
    code: {
      codeBlockVimMode: false,
      pythonVenvPath: '',
      customPythonVenvPaths: [],
    },
  },
};

export const MOCK_NOTE_EXISTS_RESPONSE = true;

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
