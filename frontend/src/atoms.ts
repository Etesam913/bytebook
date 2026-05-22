import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';
import {
  type BackendQueryDataType,
  type ContextMenuData,
  type DialogDataType,
  type KernelInstanceData,
  type LanguagesWithKernels,
  type ProjectSettings,
} from './types';
import type { FileOrFolder } from './components/virtualized/virtualized-file-tree/types';
import {
  type FileOrFolderPath,
  createFilePath,
  createFolderPath,
} from './utils/path';
import { logger } from './utils/logging';
import { DEFAULT_EDITOR_FONT_SIZE } from './utils/project-settings';

/**
 * Creates a jotai atom with automatic STATE logging when values are set.
 * Logs the atom name and new value using the logger.state() method.
 */
function atomWithLogging<T>(name: string, initialValue: T) {
  const baseAtom = atom(initialValue);

  return atom(
    (get) => get(baseAtom),
    (get, set, update: T | ((prev: T) => T)) => {
      const prev = get(baseAtom);
      const newValue =
        typeof update === 'function'
          ? (update as (prev: T) => T)(prev)
          : update;
      logger.state(name, { prev, next: newValue });
      set(baseAtom, newValue);
    }
  );
}
// Reads the most recent sidebar items from localStorage and converts stored path strings to typed path objects.
const initializeMostRecentItems = (): FileOrFolderPath[] => {
  const stored = JSON.parse(
    localStorage.getItem('mostRecentItems') ?? '[]'
  ) as string[];
  return stored
    .map((path) => createFilePath(path) ?? createFolderPath(path))
    .filter((path): path is FileOrFolderPath => path !== null);
};

/** Inner atom so the derived atom's write does not call `get(self)`. */
const mostRecentItemsBaseAtom = atom<FileOrFolderPath[]>(
  initializeMostRecentItems()
);

// Stores the list of recently visited files and folders; persists to localStorage on every write.
export const mostRecentItemsAtom = atom<
  FileOrFolderPath[],
  [FileOrFolderPath[] | ((prev: FileOrFolderPath[]) => FileOrFolderPath[])],
  void
>(
  (get) => get(mostRecentItemsBaseAtom),
  (get, set, update) => {
    const prev = get(mostRecentItemsBaseAtom);
    const payload = typeof update === 'function' ? update(prev) : update;
    const stringPaths = payload.map((filePath) => filePath.fullPath);
    localStorage.setItem('mostRecentItems', JSON.stringify(stringPaths));
    set(mostRecentItemsBaseAtom, payload);
  }
);

// Holds the current project settings including appearance, code preferences, pinned notes, and project path.
export const projectSettingsAtom = atom<ProjectSettings>({
  pinnedNotes: new Set<string>([]),
  projectPath: '',
  appearance: {
    theme: 'light',
    accentColor: 'rgb(96, 165, 250)',
    noteWidth: 'fullWidth',
    uiFontFamily: 'ui-sans-serif',
    editorFontSize: DEFAULT_EDITOR_FONT_SIZE,
    editorFontFamily: '',
    showEmptyLinePlaceholder: true,
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
    pythonVenvPath: '',
    customPythonVenvPaths: [],
  },
});

// Tracks whether project settings have been loaded from the backend at least once.
export const projectSettingsLoadedAtom = atom<boolean>(false);

export type SidebarSelectionState = {
  selections: Set<string>;
  anchorSelection: string | null;
};

// Tracks the currently selected items in the sidebar and the anchor item used for range selections.
export const sidebarSelectionAtom = atomWithLogging<SidebarSelectionState>(
  'sidebarSelectionAtom',
  {
    selections: new Set([]),
    anchorSelection: null,
  }
);

export type FileTreeData = {
  treeData: Map<string, FileOrFolder>;
  filePathToTreeDataId: Map<string, string>;
};

export type ReadonlyFileTreeData = {
  readonly treeData: ReadonlyMap<string, FileOrFolder>;
  readonly filePathToTreeDataId: ReadonlyMap<string, string>;
};

// Holds the virtualized file tree data including the node map and a reverse lookup from file path to tree node ID.
export const fileTreeDataAtom = atomWithLogging<FileTreeData>(
  'fileTreeDataAtom',
  {
    treeData: new Map<string, FileOrFolder>(),
    filePathToTreeDataId: new Map<string, string>(),
  }
);

/**
 * Stores the set of tree node IDs that should display a drag highlight.
 * Empty set = no highlight. Computed via BFS from the parent of the hovered file.
 */
export const dragHighlightIdsAtom = atom<Set<string>>(new Set<string>());

/**
 * Tracks the tree item currently acting as the active drag-and-drop target.
 * Null means no drop target is active.
 */
export const activeDropTargetIdAtom = atom<string | null>(null);

// Reflects whether the application is currently rendering in dark mode.
export const isDarkModeOnAtom = atom<boolean>(false);

// Editor UI state atoms
// Controls whether the editor toolbar is currently disabled (e.g., when the editor is not focused).
export const isToolbarDisabledAtom = atom<boolean>(false);

// Tracks whether the current file/note is displayed in maximized (full-area) mode, hiding the sidebar.
export const isFileMaximizedAtom = atom<boolean>(false);

// Tracks whether the application window is in native fullscreen mode.
export const isFullscreenAtom = atom<boolean>(false);

// Holds the state for the global modal dialog, including its title, content, and submit handler.
export const dialogDataAtom = atom<DialogDataType>({
  isOpen: false,
  title: '',
  children: null,
  onSubmit: null,
  dialogClassName: '',
  isPending: false,
});

// Represents a pending backend operation shown in the loading modal, with a loading flag and status message.
export const backendQueryAtom = atom<BackendQueryDataType>({
  isLoading: false,
  message: '',
});

// Holds the state for the right-click context menu, including its visibility, position, items, and target element.
export const contextMenuDataAtom = atom<ContextMenuData>({
  isShowing: false,
  items: [],
  x: 0,
  y: 0,
  targetId: null,
});

export type TrashRestoreInfo = {
  originalPath: string;
  trashedPath: string;
  isFolder: boolean;
  relatedItems: TrashRestoreInfo[] | undefined;
};

/**
 * Map of kernel instance id -> instance data. The backend KernelManager owns
 * the authoritative state and emits kernel:instance:* events whenever an
 * instance is created, updates status/heartbeat, or shuts down.
 */
export const kernelInstancesAtom = atom<Record<string, KernelInstanceData>>({});

/**
 * Derived: instances grouped by language.
 */
const EMPTY_KERNEL_INSTANCES_BY_LANGUAGE: Record<
  LanguagesWithKernels,
  KernelInstanceData[]
> = {
  python: [],
  go: [],
  javascript: [],
  java: [],
};

// Derived atom that groups all active kernel instances by their programming language.
export const kernelInstancesByLanguageAtom = atom((get) =>
  Object.values(get(kernelInstancesAtom)).reduce((grouped, inst) => {
    grouped[inst.language].push(inst);
    return grouped;
  }, structuredClone(EMPTY_KERNEL_INSTANCES_BY_LANGUAGE))
);

/**
 * Derived: the instance for a given (noteId, language), or null if none exists.
 *
 * `atomFamily` memoizes a parameterized atom: each unique (noteId, language)
 * pair returns the same atom instance, so subscribers re-render only when
 * their specific kernel instance changes — not on every kernelInstancesAtom
 * mutation. The equality fn dedupes the param object by value, not reference.
 */
export const kernelInstanceForNoteAtomFamily = atomFamily(
  ({ noteId, language }: { noteId: string; language: LanguagesWithKernels }) =>
    atom((get) => {
      const all = get(kernelInstancesAtom);
      return (
        Object.values(all).find(
          (i) => i.noteId === noteId && i.language === language
        ) ?? null
      );
    }),
  (a, b) => a.noteId === b.noteId && a.language === b.language
);

// All valid sidebar panel key names used to identify accordion sections.
export const SIDEBAR_PANEL_KEYS = [
  'files',
  'pinned',
  'recent',
  'kernels',
  'tags',
  'savedSearches',
] as const;

export type SidebarPanelKey = (typeof SIDEBAR_PANEL_KEYS)[number];

// Maps each sidebar panel key to whether its accordion section is currently expanded.
type FileSidebarOpenState = Record<SidebarPanelKey, boolean>;

const defaultFileSidebarOpenState: FileSidebarOpenState = {
  files: true,
  pinned: true,
  recent: false,
  kernels: false,
  tags: false,
  savedSearches: false,
};

const initializeFileSidebarOpenState = (): FileSidebarOpenState => {
  try {
    const raw = localStorage.getItem('fileSidebarOpenState');
    if (!raw) return { ...defaultFileSidebarOpenState };
    const parsed = JSON.parse(raw) as Partial<FileSidebarOpenState>;
    return {
      files:
        typeof parsed.files === 'boolean'
          ? parsed.files
          : defaultFileSidebarOpenState.files,
      pinned:
        typeof parsed.pinned === 'boolean'
          ? parsed.pinned
          : defaultFileSidebarOpenState.pinned,
      recent:
        typeof parsed.recent === 'boolean'
          ? parsed.recent
          : defaultFileSidebarOpenState.recent,
      kernels:
        typeof parsed.kernels === 'boolean'
          ? parsed.kernels
          : defaultFileSidebarOpenState.kernels,
      tags:
        typeof parsed.tags === 'boolean'
          ? parsed.tags
          : defaultFileSidebarOpenState.tags,
      savedSearches:
        typeof parsed.savedSearches === 'boolean'
          ? parsed.savedSearches
          : defaultFileSidebarOpenState.savedSearches,
    };
  } catch {
    return { ...defaultFileSidebarOpenState };
  }
};

type FileSidebarOpenStateUpdate =
  | Partial<FileSidebarOpenState>
  | ((prev: FileSidebarOpenState) => Partial<FileSidebarOpenState>);

/** Inner atom so the derived atom's write does not call `get(self)` (breaks inference). */
const fileSidebarOpenStateBaseAtom = atom<FileSidebarOpenState>(
  initializeFileSidebarOpenState()
);

// Stores which sidebar accordion panels are open or closed; persists to localStorage on every write.
export const fileSidebarOpenStateAtom = atom<
  FileSidebarOpenState,
  [FileSidebarOpenStateUpdate],
  void
>(
  (get) => get(fileSidebarOpenStateBaseAtom),
  (get, set, update) => {
    const prev = get(fileSidebarOpenStateBaseAtom);
    const patch = typeof update === 'function' ? update(prev) : update;
    const next: FileSidebarOpenState = { ...prev, ...patch };
    localStorage.setItem('fileSidebarOpenState', JSON.stringify(next));
    set(fileSidebarOpenStateBaseAtom, next);
  }
);

// The minimum flex weight a sidebar panel can be resized to, preventing it from collapsing entirely.
export const MIN_FLEX_WEIGHT = 0.2;

export type SidebarFlexWeights = Record<SidebarPanelKey, number>;

// Default flex weight values for each sidebar panel, used when no saved state exists.
export const DEFAULT_SIDEBAR_FLEX_WEIGHTS: SidebarFlexWeights = {
  files: 1.5,
  pinned: 1,
  recent: 1,
  kernels: 1,
  tags: 1,
  savedSearches: 1,
};
