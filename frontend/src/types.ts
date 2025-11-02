import type { HeadingTagType } from '@lexical/rich-text';
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';
import {
  AppearanceProjectSettingsJson,
  ProjectSettingsJson,
} from '../bindings/github.com/etesam913/bytebook/internal/config/models';

export const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

export const VIDEO_FILE_EXTENSIONS = ['mov', 'mp4', 'm4v', 'webm'];

export type EditorBlockTypes = HeadingTagType | undefined | string;

export type FolderNote = {
  folder: string;
  note: string;
};

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
  previousUrl?: string;
};

export type ResizeWidth = number | '100%';

export type ResizeState = {
  isResizing: boolean;
  setIsResizing: Dispatch<SetStateAction<boolean>>;
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

type AppearanceSettings = Omit<
  AppearanceProjectSettingsJson,
  'theme' | 'noteSidebarItemSize' | 'noteWidth'
> & {
  theme: 'light' | 'dark' | 'system';
  noteSidebarItemSize: 'card' | 'list';
  noteWidth: 'fullWidth' | 'readability';
  showEmptyLinePlaceholder: boolean;
};

export type ProjectSettings = Omit<
  ProjectSettingsJson,
  'pinnedNotes' | 'appearance'
> & {
  pinnedNotes: Set<string>;
  appearance: AppearanceSettings;
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
export type CodeBlockStatus = KernelStatus | 'queueing';
export type KernelHeartbeatStatus = 'success' | 'failure' | 'idle';
export type Languages = 'python' | 'go' | 'javascript' | 'java' | 'text';

type KernelData = {
  status: KernelStatus;
  heartbeat: KernelHeartbeatStatus;
  errorMessage: string | null;
};

const allLanguages = ['python', 'go', 'javascript', 'java', 'text'] as const;

export const allLanguagesSet = new Set<Languages>(allLanguages);

export const languagesWithKernelsSet = new Set<Languages>(
  allLanguages.filter((language) => language !== 'text')
);

export type KernelsData = Record<Languages, KernelData>;

// Function to check if a string is a valid key
export function isValidKernelLanguage(key: unknown): key is Languages {
  return typeof key === 'string' && allLanguagesSet.has(key as Languages);
}

export type RawCompletionData = Omit<CompletionData, 'matches'> & {
  matches: string[];
};

export type CompletionData = {
  status: string;
  messageId: string;
  matches: { label: string; info?: string; detail?: string; type?: string }[];
  cursorStart: number;
  cursorEnd: number;
  metadata: Record<string, unknown>;
};

export type PythonCompletionMetadata = {
  type: string;
  text: string;
  start: number;
  end: number;
  signature: string;
}[];

export type Frontmatter = {
  folder?: string;
  note?: string;
  lastUpdated?: string;
  createdDate?: string;
  tags?: string[];
  showTableOfContents?: string;
  showMarkdown?: string;
  // Allow additional properties for extensibility
} & Record<string, string | string[]>;

export type SidebarContentType = 'note' | 'folder' | 'tag' | 'saved-search';

export function isSidebarContentType(key: unknown): key is SidebarContentType {
  return (
    typeof key === 'string' &&
    (key === 'note' ||
      key === 'folder' ||
      key === 'tag' ||
      key === 'saved-search')
  );
}
