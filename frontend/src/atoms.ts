import { atom } from 'jotai';
import type { RefObject } from 'react';
import type {
  BackendQueryDataType,
  ContextMenuData,
  DialogDataType,
  KernelStatus,
  ProjectSettings,
  SearchPanelDataType,
  SortStrings,
  UserData,
  WindowSettings,
} from './types.ts';

const privateMostRecentNotesAtom = atom<string[]>(
  JSON.parse(localStorage.getItem('mostRecentNotes') ?? '[]') as string[]
);
export const mostRecentNotesAtom = atom(
  (get) => get(privateMostRecentNotesAtom),
  (_, set, payload: string[]) => {
    localStorage.setItem('mostRecentNotes', JSON.stringify(payload));
    set(privateMostRecentNotesAtom, payload);
  }
);

export const mostRecentNotesWithoutQueryParamsAtom = atom((get) => {
  const mostRecentNotes = get(mostRecentNotesAtom);
  return mostRecentNotes.map((path) => {
    const lastIndex = path.lastIndexOf('?ext=');
    const folderAndNote = path.substring(0, lastIndex);
    const ext = path.substring(lastIndex + 5);
    return `${folderAndNote}.${ext}`;
  });
});

export const windowSettingsAtom = atom<WindowSettings | null>(null);

export const projectSettingsAtom = atom<ProjectSettings>({
  pinnedNotes: new Set([]),
  repositoryToSyncTo: '',
  projectPath: '',
  darkMode: 'light',
  noteSidebarItemSize: 'card',
  accentColor: '',
});
export const projectSettingsWithQueryParamsAtom = atom((get) => {
  const projectSettings = get(projectSettingsAtom);
  const pinnedNotes = projectSettings.pinnedNotes;
  return {
    ...projectSettings,
    pinnedNotes: new Set(
      [...pinnedNotes].map((path) => {
        const lastIndex = path.lastIndexOf('.');
        const folderAndNote = path.substring(0, lastIndex);
        const ext = path.substring(lastIndex + 1);
        return `${folderAndNote}?ext=${ext}`;
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

export const isToolbarDisabledAtom = atom<boolean>(false);
export const isNoteMaximizedAtom = atom<boolean>(false);

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

export const draggedElementAtom = atom<HTMLElement | null>(null);

export const draggableBlockElementAtom = atom<HTMLElement | null>(null);

export const searchPanelDataAtom = atom<SearchPanelDataType>({
  isOpen: false,
  query: '',
  focusedIndex: 0,
  scrollY: 0,
});

export const noteContainerRefAtom = atom<RefObject<HTMLElement | null> | null>(
  null
);
export const noteIntersectionObserverAtom = atom<IntersectionObserver | null>(
  null
);
export const noteSeenFileNodeKeysAtom = atom<Set<string>>(new Set([]));

export const pythonKernelStatusAtom = atom<KernelStatus | null>(null);
export const goKernelStatusAtom = atom<KernelStatus | null>(null);
