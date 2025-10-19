import { atom } from 'jotai';
import type { RefObject } from 'react';
import {
  type BackendQueryDataType,
  type ContextMenuData,
  type DialogDataType,
  KernelsData,
  type ProjectSettings,
  type SearchPanelDataType,
  type SortStrings,
  type UserData,
  type WindowSettings,
} from './types';
import {
  convertFilePathToQueryNotation,
  FilePath,
} from './utils/string-formatting';

// Most recent notes atoms
const initializeMostRecentNotes = (): FilePath[] => {
  const stored = JSON.parse(
    localStorage.getItem('mostRecentNotes') ?? '[]'
  ) as string[];
  return stored
    .filter((path) => {
      const pathWithoutQuery = path.split('?')[0];
      return pathWithoutQuery.split('/').length === 2;
    })
    .map((path) => {
      const pathWithoutQuery = path.split('?')[0];
      const segments = pathWithoutQuery.split('/');
      return new FilePath({ folder: segments[0], note: segments[1] });
    });
};

export const mostRecentNotesAtom = atom(
  initializeMostRecentNotes(),
  (_, set, payload: FilePath[]) => {
    const stringPaths = payload.map((filePath) => filePath.getLinkToNote());
    localStorage.setItem('mostRecentNotes', JSON.stringify(stringPaths));
    set(mostRecentNotesAtom, payload);
  }
);

export const windowSettingsAtom = atom<WindowSettings | null>(null);

export const projectSettingsAtom = atom<ProjectSettings>({
  pinnedNotes: new Set<string>([]),
  repositoryToSyncTo: '',
  projectPath: '',
  appearance: {
    theme: 'light',
    noteSidebarItemSize: 'card',
    accentColor: '',
    noteWidth: 'fullWidth',
    editorFontFamily: 'Bricolage Grotesque',
  },
  code: {
    codeBlockVimMode: false,
    pythonVenvPath: '',
    customPythonVenvPaths: [],
  },
});

export const projectSettingsWithQueryParamsAtom = atom((get) => {
  const projectSettings = get(projectSettingsAtom);
  const pinnedNotes = projectSettings.pinnedNotes;
  return {
    ...projectSettings,
    pinnedNotes: new Set(
      [...pinnedNotes].map((path) => {
        return convertFilePathToQueryNotation(path);
      })
    ),
  };
});

const userDataAtom = atom<UserData | null>(null);
export const userDataAtomWithLocalStorage = atom(
  (get) => get(userDataAtom),
  (_, set, newUserData: UserData) => {
    const accessToken = newUserData.accessToken;

    localStorage.setItem('accessToken', accessToken ?? 'null');
    set(userDataAtom, newUserData);
  }
);

export const folderSortAtom = atom<SortStrings>('date-updated-desc');
export const noteSortAtom = atom<SortStrings>('date-updated-desc');

export const selectionRangeAtom = atom<Set<string>>(new Set([]));

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
export const trapFocusContainerAtom = atom<HTMLElement | null>(null);

export const backendQueryAtom = atom<BackendQueryDataType>({
  isLoading: false,
  message: '',
});

export const contextMenuRefAtom = atom<RefObject<HTMLElement | null> | null>(
  null
);
export const contextMenuDataAtom = atom<ContextMenuData>({
  isShowing: false,
  items: [],
  x: 0,
  y: 0,
});

export const searchPanelDataAtom = atom<SearchPanelDataType>({
  isOpen: false,
  query: '',
  focusedIndex: 0,
  scrollY: 0,
});

export const loadingToastIdsAtom = atom<Map<string, string | number>>(
  new Map()
);

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

export const currentFilePathAtom = atom<FilePath | null>(null);

// Folder sidebar accordion open state
type FolderSidebarOpenState = {
  pinnedNotes: boolean;
  recentNotes: boolean;
  folders: boolean;
  kernels: boolean;
  tags: boolean;
  savedSearches: boolean;
};

const defaultFolderSidebarOpenState: FolderSidebarOpenState = {
  pinnedNotes: true,
  recentNotes: false,
  folders: true,
  kernels: false,
  tags: false,
  savedSearches: false,
};

const initializeFolderSidebarOpenState = (): FolderSidebarOpenState => {
  try {
    const raw = localStorage.getItem('folderSidebarOpenState');
    if (!raw) return { ...defaultFolderSidebarOpenState };
    const parsed = JSON.parse(raw) as Partial<FolderSidebarOpenState>;
    return {
      pinnedNotes:
        typeof parsed.pinnedNotes === 'boolean'
          ? parsed.pinnedNotes
          : defaultFolderSidebarOpenState.pinnedNotes,
      recentNotes:
        typeof parsed.recentNotes === 'boolean'
          ? parsed.recentNotes
          : defaultFolderSidebarOpenState.recentNotes,
      folders:
        typeof parsed.folders === 'boolean'
          ? parsed.folders
          : defaultFolderSidebarOpenState.folders,
      kernels:
        typeof parsed.kernels === 'boolean'
          ? parsed.kernels
          : defaultFolderSidebarOpenState.kernels,
      tags:
        typeof parsed.tags === 'boolean'
          ? parsed.tags
          : defaultFolderSidebarOpenState.tags,
      savedSearches:
        typeof parsed.savedSearches === 'boolean'
          ? parsed.savedSearches
          : defaultFolderSidebarOpenState.savedSearches,
    };
  } catch {
    return { ...defaultFolderSidebarOpenState };
  }
};

export const folderSidebarOpenStateAtom = atom(
  initializeFolderSidebarOpenState(),
  (
    get,
    set,
    update:
      | Partial<FolderSidebarOpenState>
      | ((prev: FolderSidebarOpenState) => Partial<FolderSidebarOpenState>)
  ) => {
    const prev = get(folderSidebarOpenStateAtom);
    const patch = typeof update === 'function' ? update(prev) : update;
    const next: FolderSidebarOpenState = { ...prev, ...patch };
    localStorage.setItem('folderSidebarOpenState', JSON.stringify(next));
    set(folderSidebarOpenStateAtom, next);
  }
);
