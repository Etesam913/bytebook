import { type SidebarPanelKey } from '@utils/sidebar-panels';
export {
  SIDEBAR_PANEL_KEYS,
  type SidebarPanelKey,
} from '@utils/sidebar-panels';
import { atom } from 'jotai';
import {
  type BackendQueryDataType,
  type ContextMenuData,
  type DialogDataType,
} from '@/types';
import {
  type FileOrFolderPath,
  createFilePath,
  createFolderPath,
} from '@utils/path';
import { logger } from '@utils/logging';

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
      if (import.meta.env.DEV) logger.state(name, { prev, next: newValue });
      set(baseAtom, newValue);
    }
  );
}
// Reads the most recent sidebar items from localStorage and converts stored path strings to typed path objects.
// Folder entries written before folder paths carried a trailing slash still
// parse correctly: createFilePath rejects them (no extension) and
// createFolderPath accepts both slashed and slashless input.
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

// Holds the query displayed by the file-tree filter.
export const treeFilterQueryAtom = atom('');

const treeFilterFocusVersionAtom = atom(0);

// Changes whenever focus is requested for the file-tree filter input.
export const treeFilterFocusSignalAtom = atom((get) =>
  get(treeFilterFocusVersionAtom)
);

// Requests focus for the file-tree filter input.
export const focusTreeFilterInputAtom = atom(null, (_get, set) => {
  set(treeFilterFocusVersionAtom, (previous) => previous + 1);
});

// Reflects whether the application is currently rendering in dark mode.
export const isDarkModeOnAtom = atom<boolean>(false);

// Drag and drop ghost element tracked during sidebar and editor drag operations.
export const draggedGhostElementAtom = atom<HTMLElement | null>(null);

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

// Maps each sidebar panel key to whether its accordion section is currently expanded.
type FileSidebarOpenState = Record<SidebarPanelKey, boolean>;

const defaultFileSidebarOpenState: FileSidebarOpenState = {
  files: true,
  pinned: true,
  recent: false,
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
  tags: 1,
  savedSearches: 1,
};

// Holds the open palette mode; null means the palette is closed.
export const commandPaletteModeAtom = atom<'files' | 'commands' | null>(null);
