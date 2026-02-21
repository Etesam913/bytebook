import { atom } from 'jotai';
import type { RefObject } from 'react';
import {
  type BackendQueryDataType,
  type ContextMenuData,
  type DialogDataType,
  KernelsData,
  type ProjectSettings,
} from './types';
import { type FilePath, createFilePath } from './utils/path';
import { logger } from './utils/logging';

/**
 * Creates a jotai atom with automatic STATE logging when values are set.
 * Logs the atom name and new value using the logger.state() method.
 */
export function atomWithLogging<T>(name: string, initialValue: T) {
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
// Most recent notes atoms
const initializeMostRecentNotes = (): FilePath[] => {
  const stored = JSON.parse(
    localStorage.getItem('mostRecentNotes') ?? '[]'
  ) as string[];
  return stored
    .map((path) => createFilePath(path))
    .filter((path): path is FilePath => path !== null);
};

export const mostRecentNotesAtom = atom(
  initializeMostRecentNotes(),
  (_, set, payload: FilePath[]) => {
    const stringPaths = payload.map((filePath) => filePath.fullPath);
    localStorage.setItem('mostRecentNotes', JSON.stringify(stringPaths));
    set(mostRecentNotesAtom, payload);
  }
);

export const projectSettingsAtom = atom<ProjectSettings>({
  pinnedNotes: new Set<string>([]),
  projectPath: '',
  appearance: {
    theme: 'light',
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

export const contextMenuRefAtom = atom<RefObject<HTMLElement | null> | null>(
  null
);
export const contextMenuDataAtom = atom<ContextMenuData>({
  isShowing: false,
  items: [],
  x: 0,
  y: 0,
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

// File sidebar accordion open state
type FileSidebarOpenState = {
  pinnedNotes: boolean;
  recentNotes: boolean;
  folders: boolean;
  kernels: boolean;
  tags: boolean;
  savedSearches: boolean;
};

const defaultFileSidebarOpenState: FileSidebarOpenState = {
  pinnedNotes: true,
  recentNotes: false,
  folders: true,
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
      pinnedNotes:
        typeof parsed.pinnedNotes === 'boolean'
          ? parsed.pinnedNotes
          : defaultFileSidebarOpenState.pinnedNotes,
      recentNotes:
        typeof parsed.recentNotes === 'boolean'
          ? parsed.recentNotes
          : defaultFileSidebarOpenState.recentNotes,
      folders:
        typeof parsed.folders === 'boolean'
          ? parsed.folders
          : defaultFileSidebarOpenState.folders,
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

export const fileSidebarOpenStateAtom = atom(
  initializeFileSidebarOpenState(),
  (
    get,
    set,
    update:
      | Partial<FileSidebarOpenState>
      | ((prev: FileSidebarOpenState) => Partial<FileSidebarOpenState>)
  ) => {
    const prev = get(fileSidebarOpenStateAtom);
    const patch = typeof update === 'function' ? update(prev) : update;
    const next: FileSidebarOpenState = { ...prev, ...patch };
    localStorage.setItem('fileSidebarOpenState', JSON.stringify(next));
    set(fileSidebarOpenStateAtom, next);
  }
);
