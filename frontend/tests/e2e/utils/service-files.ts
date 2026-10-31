/**
 * Service file paths for Wails bindings used in e2e tests.
 * These paths correspond to the generated binding files in the bindings directory.
 */
export const SERVICE_FILES = {
  FILE_TREE_SERVICE:
    'github.com/etesam913/bytebook/internal/services/filetreeservice.js',
  FOLDER_SERVICE:
    'github.com/etesam913/bytebook/internal/services/folderservice.js',
  NOTE_SERVICE:
    'github.com/etesam913/bytebook/internal/services/noteservice.js',
  NODE_SERVICE:
    'github.com/etesam913/bytebook/internal/services/nodeservice.js',
  TAGS_SERVICE:
    'github.com/etesam913/bytebook/internal/services/tagsservice.js',
  SEARCH_SERVICE:
    'github.com/etesam913/bytebook/internal/services/searchservice.js',
  SETTINGS_SERVICE:
    'github.com/etesam913/bytebook/internal/services/settingsservice.js',
} as const;

export const BINDINGS = {
  ALL_PATHS: { file: SERVICE_FILES.FILE_TREE_SERVICE, method: 'GetAllPaths' },
  PROJECT_SETTINGS: {
    file: SERVICE_FILES.SETTINGS_SERVICE,
    method: 'GetProjectSettings',
  },
  FONT_FAMILIES: {
    file: SERVICE_FILES.SETTINGS_SERVICE,
    method: 'GetFontFamilies',
  },
  TAGS: { file: SERVICE_FILES.TAGS_SERVICE, method: 'GetTags' },
  TAGS_FOR_NOTES: {
    file: SERVICE_FILES.TAGS_SERVICE,
    method: 'GetTagsForNotes',
  },
  SAVED_SEARCHES: {
    file: SERVICE_FILES.SEARCH_SERVICE,
    method: 'GetAllSavedSearches',
  },
  LINKED_MENTIONS: {
    file: SERVICE_FILES.SEARCH_SERVICE,
    method: 'GetLinkedMentions',
  },
  FULL_TEXT_SEARCH: {
    file: SERVICE_FILES.SEARCH_SERVICE,
    method: 'FullTextSearch',
  },
} as const;
