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
