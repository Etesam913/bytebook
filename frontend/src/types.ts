import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  AppearanceProjectSettingsJson,
  ProjectSettingsJson,
} from '../bindings/github.com/etesam913/bytebook/internal/config/models';
import { RangeSelection } from 'lexical';

// Supported image file extensions that can be displayed as inline attachments in notes.
export const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

// Supported video file extensions that can be embedded as inline attachments in notes.
export const VIDEO_FILE_EXTENSIONS = ['mov', 'mp4', 'm4v', 'webm'];

export type EditorBlockTypes = string | undefined;

export type DropdownItem = {
  value: string;
  label: ReactNode;
  onChange?: () => void;
};

type FloatingDataTypeBase<T extends null | 'link' | 'text-format'> = {
  isOpen: boolean;
  top: number;
  left: number;
  type: T;
  previousUrl?: string;
  previousSelection: T extends 'link' ? RangeSelection : null;
};

export type FloatingDataType =
  | FloatingDataTypeBase<'link'>
  | FloatingDataTypeBase<'text-format'>
  | FloatingDataTypeBase<null>;

export type DialogDataType = {
  isOpen: boolean;
  title: string;
  children: ((errorText: string, isPending: boolean) => ReactNode) | null;
  dialogClassName?: string;
  onSubmit:
    | ((
        formData: FormData,
        setErrorText: Dispatch<SetStateAction<string>>
      ) => Promise<boolean>)
    | null;
  onClose?: () => void;
  isPending: boolean;
};

export type BackendQueryDataType = {
  isLoading: boolean;
  message: string;
};

export type SidebarVisibility = {
  hidePinned: boolean;
  hideRecent: boolean;
  hideKernels: boolean;
  hideTags: boolean;
  hideSavedSearches: boolean;
};

type AppearanceSettings = Omit<
  AppearanceProjectSettingsJson,
  'theme' | 'noteWidth' | 'sidebarVisibility'
> & {
  theme: 'light' | 'dark' | 'system';
  noteWidth: 'fullWidth' | 'readability';
  editorFontSize: number;
  showEmptyLinePlaceholder: boolean;
  sidebarVisibility: SidebarVisibility;
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
  targetId: string | null;
};

export type KernelStatus = 'busy' | 'idle' | 'starting';
export type CodeBlockStatus = KernelStatus | 'queueing';
export type KernelHeartbeatStatus = 'success' | 'failure' | 'idle';
// Enum-like constant mapping language display keys to their canonical string values used throughout the app.
export const LANGUAGES = {
  PYTHON: 'python',
  GO: 'go',
  JAVASCRIPT: 'javascript',
  JAVA: 'java',
  TEXT: 'text',
} as const;

export type Languages = (typeof LANGUAGES)[keyof typeof LANGUAGES];
export type LanguagesWithKernels = Exclude<Languages, typeof LANGUAGES.TEXT>;

export type KernelInstanceData = {
  id: string;
  language: LanguagesWithKernels;
  noteId: string;
  status: KernelStatus;
  heartbeat: KernelHeartbeatStatus;
  errorMessage: string | null;
  lastActivityAt: number;
};

const allLanguages = [
  LANGUAGES.PYTHON,
  LANGUAGES.GO,
  LANGUAGES.JAVASCRIPT,
  LANGUAGES.JAVA,
  LANGUAGES.TEXT,
] as const;

// Set of all supported language values including text, used for O(1) membership checks.
export const allLanguagesSet = new Set<Languages>(allLanguages);

// Set of languages that support Jupyter kernel execution, excluding the plain text language.
export const languagesWithKernelsSet = new Set<LanguagesWithKernels>(
  allLanguages.filter(
    (language): language is LanguagesWithKernels => language !== LANGUAGES.TEXT
  )
);

// Type guard that checks whether an unknown value is one of the recognized language strings.
export function isValidKernelLanguage(key: unknown): key is Languages {
  return typeof key === 'string' && allLanguagesSet.has(key as Languages);
}

export type Frontmatter = {
  folder?: string;
  note?: string;
  lastUpdated?: string;
  createdDate?: string;
  tags?: string[];
  showTableOfContents?: string;
  pinnedNote?: string;
  // Allow additional properties for extensibility
} & Record<string, string | string[]>;

export type SidebarContentType =
  | 'note'
  | 'pinned-note'
  | 'tag'
  | 'saved-search'
  | 'search-result'
  | 'kernel';
