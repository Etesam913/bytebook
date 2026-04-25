import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  AppearanceProjectSettingsJson,
  ProjectSettingsJson,
} from '../bindings/github.com/etesam913/bytebook/internal/config/models';
import { RangeSelection } from 'lexical';

export const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

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

type AppearanceSettings = Omit<
  AppearanceProjectSettingsJson,
  'theme' | 'noteWidth'
> & {
  theme: 'light' | 'dark' | 'system';
  noteWidth: 'fullWidth' | 'readability';
  editorFontSize: number;
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
  targetId: string | null;
};

export type KernelStatus = 'busy' | 'idle' | 'starting';
export type CodeBlockStatus = KernelStatus | 'queueing';
export type KernelHeartbeatStatus = 'success' | 'failure' | 'idle';
export type Languages = 'python' | 'go' | 'javascript' | 'java' | 'text';
export type LanguagesWithKernels = Exclude<Languages, 'text'>;

export type KernelInstanceData = {
  id: string;
  language: LanguagesWithKernels;
  noteId: string;
  status: KernelStatus;
  heartbeat: KernelHeartbeatStatus;
  errorMessage: string | null;
  lastActivityAt: number;
};

const allLanguages = ['python', 'go', 'javascript', 'java', 'text'] as const;

export const allLanguagesSet = new Set<Languages>(allLanguages);

export const languagesWithKernelsSet = new Set<LanguagesWithKernels>(
  allLanguages.filter((language) => language !== 'text')
);

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
