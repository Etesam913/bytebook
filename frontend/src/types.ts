import type { HeadingTagType } from '@lexical/rich-text';
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';
import { ProjectSettingsJson } from '../bindings/github.com/etesam913/bytebook/lib/project_types/models';

export const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

export const VIDEO_FILE_EXTENSIONS = ['mov', 'mp4', 'm4v', 'webm'];

export type EditorBlockTypes = HeadingTagType | undefined | string;

export type DropdownItem = {
  value: string;
  label: ReactNode;
  onChange?: () => void;
};

export type UserData = {
  login: string;
  accessToken: string | null;
  avatarUrl: string;
  email: string;
};

export type FolderDialogAction = 'create' | 'rename' | 'delete';

export type MostRecentNoteType = {
  name: string;
  path: string;
};

export type FloatingDataType = {
  isOpen: boolean;
  top: number;
  left: number;
  type: null | 'link' | 'text-format';
};

export type ResizeWidth = number | '100%';

export type ResizeState = {
  isResizing: boolean;
  setIsResizing: Dispatch<SetStateAction<boolean>>;
  isSelected: boolean;
  setSelected: (arg0: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: Dispatch<SetStateAction<boolean>>;
};

export type DialogDataType = {
  isOpen: boolean;
  title: string;
  children: ((errorText: string, isPending: boolean) => ReactNode) | null;
  dialogClassName?: string;
  onSubmit:
    | ((
        e: FormEvent<HTMLFormElement>,
        setErrorText: Dispatch<SetStateAction<string>>
      ) => Promise<boolean>)
    | null;
  onClose?: () => void;
  isPending: boolean;
};

export type SearchPanelDataType = {
  isOpen: boolean;
  query: string;
  focusedIndex: number;
  scrollY: number;
};

export type BackendQueryDataType = {
  isLoading: boolean;
  message: string;
};

export type SortStrings =
  | 'date-updated-desc'
  | 'date-updated-asc'
  | 'date-created-desc'
  | 'date-created-asc'
  | 'file-name-a-z'
  | 'file-name-z-a'
  | 'size-desc'
  | 'size-asc'
  | 'file-type';

export type WindowSettings = {
  windowId: string;
};

export type ProjectSettings = Omit<
  ProjectSettingsJson,
  'pinnedNotes' | 'darkMode' | 'noteSidebarItemSize' | 'noteWidth'
> & {
  pinnedNotes: Set<string>;
  darkMode: 'light' | 'dark' | 'system';
  noteSidebarItemSize: 'list' | 'card';
  noteWidth: 'fullWidth' | 'readability';
};

export type ContextMenuData = {
  isShowing: boolean;
  items: DropdownItem[];
  x: number;
  y: number;
};

export type GithubRepositoryData = {
  name: string;
  clone_url: string;
};

export type KernelStatus = 'busy' | 'idle' | 'starting';
