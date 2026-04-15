import { atom } from 'jotai';
import {
  type BackendQueryDataType,
  type ContextMenuData,
  type DialogDataType,
  KernelsData,
  type ProjectSettings,
} from './types';
import type { FileOrFolder } from './components/virtualized/virtualized-file-tree/types';
import {
  type FilePath,
  type FolderPath,
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
type RecentItem = FilePath | FolderPath;

// Most recent sidebar items
const initializeMostRecentItems = (): RecentItem[] => {
  const stored = JSON.parse(
    localStorage.getItem('mostRecentItems') ?? '[]'
  ) as string[];
  return stored
    .map((path) => createFilePath(path) ?? createFolderPath(path))
    .filter((path): path is RecentItem => path !== null);
};

export const mostRecentItemsAtom = atom(
  initializeMostRecentItems(),
  (get, set, update: RecentItem[] | ((prev: RecentItem[]) => RecentItem[])) => {
    const prev = get(mostRecentItemsAtom);
    const payload = typeof update === 'function' ? update(prev) : update;
    const stringPaths = payload.map((filePath) => filePath.fullPath);
    localStorage.setItem('mostRecentItems', JSON.stringify(stringPaths));
    set(mostRecentItemsAtom, payload);
  }
);

export const projectSettingsAtom = atom<ProjectSettings>({
  pinnedNotes: new Set<string>([]),
  projectPath: '',
  appearance: {
    theme: 'light',
    accentColor: '',
    noteWidth: 'fullWidth',
    editorFontSize: DEFAULT_EDITOR_FONT_SIZE,
    editorFontFamily: 'Bricolage Grotesque',
    showEmptyLinePlaceholder: true,
  },
  code: {
    codeBlockVimMode: false,
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

export const isDarkModeOnAtom = atom<boolean>(false);

// Editor UI state atoms
export const isToolbarDisabledAtom = atom<boolean>(false);

export const isNoteMaximizedAtom = atom<boolean>(false);

export const isFullscreenAtom = atom<boolean>(false);

export const dialogDataAtom = atom<DialogDataType>({
  isOpen: false,
  title: '',
  children: null,
  onSubmit: null,
  dialogClassName: '',
  isPending: false,
});

export const backendQueryAtom = atom<BackendQueryDataType>({
  isLoading: false,
  message: '',
});

export const contextMenuDataAtom = atom<ContextMenuData>({
  isShowing: false,
  items: [],
  x: 0,
  y: 0,
  targetId: null,
});

export const loadingToastIdsAtom = atom<Map<string, string | number>>(
  new Map()
);

export type TrashRestoreInfo = {
  originalPath: string;
  trashedPath: string;
  isFolder: boolean;
};

export const kernelsDataAtom = atom<KernelsData>({
  python: {
    status: 'idle',
    heartbeat: 'idle',
    errorMessage: null,
  },
  go: {
    status: 'idle',
    heartbeat: 'idle',
    errorMessage: null,
  },
  javascript: {
    status: 'idle',
    heartbeat: 'idle',
    errorMessage: null,
  },
  java: {
    status: 'idle',
    heartbeat: 'idle',
    errorMessage: null,
  },
});

// Sidebar panel keys and types
export const SIDEBAR_PANEL_KEYS = [
  'files',
  'pinned',
  'recent',
  'kernels',
  'tags',
  'savedSearches',
] as const;

export type SidebarPanelKey = (typeof SIDEBAR_PANEL_KEYS)[number];

// File sidebar accordion open state
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

// Sidebar panel flex weights
export const MIN_FLEX_WEIGHT = 0.2;

export type SidebarFlexWeights = Record<SidebarPanelKey, number>;

export const DEFAULT_SIDEBAR_FLEX_WEIGHTS: SidebarFlexWeights = {
  files: 1.5,
  pinned: 1,
  recent: 1,
  kernels: 1,
  tags: 1,
  savedSearches: 1,
};
