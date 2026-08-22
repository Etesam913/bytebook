/**
 * Centralized TanStack Query keys.
 *
 * Each factory returns an `as const` tuple so the type-checker catches shape
 * mismatches between callers that read/write the cache.
 *
 * Conventions:
 *   - Use kebab-case for the key root.
 *   - Use the `*All` suffix for prefix-only keys (used for invalidation that
 *     should target every variant of a query).
 */
export const queryKeys = {
  // File tree
  allPaths: () => ['file-tree', 'all-paths'] as const,
  file: (src: string) => ['file', src] as const,

  // Notes
  doesNoteExist: (fullPath: string) => ['does-note-exist', fullPath] as const,
  noteMarkdown: (path: string) => ['note-markdown', path] as const,
  linkedMentions: (fullPath: string) => ['linked-mentions', fullPath] as const,

  // Tags
  tagsAll: () => ['get-tags'] as const,
  notesTagsAll: () => ['notes-tags'] as const,
  notesTags: (paths: string[]) => ['notes-tags', paths] as const,

  // Search
  filePickerFullTextSearch: (searchQuery: string) =>
    ['file-picker-full-text-search', searchQuery] as const,
  savedSearches: () => ['saved-searches'] as const,
  treeFilterPathsAll: () => ['tree-filter-paths'] as const,
  treeFilterPaths: (searchQuery: string) =>
    ['tree-filter-paths', searchQuery] as const,

  // Settings & kernels
  projectSettings: () => ['project-settings'] as const,
  kernelInstances: () => ['kernel-instances'] as const,
  kernelDescriptor: (language: string) =>
    ['kernel-descriptor', language] as const,
  pythonVenvs: () => ['python-venvs'] as const,
};
