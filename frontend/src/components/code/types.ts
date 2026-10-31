import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { LexicalEditor } from 'lexical';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { Languages } from '@/types';

export type CodeMirrorViewState = {
  ranges: Array<{ anchor: number; head: number }>;
  mainIndex: number;
  scrollTop: number;
  scrollLeft: number;
  shouldFocus: boolean;
};

export type CodeMirrorRef = ReactCodeMirrorRef | null;

export type CodeBlockIdentityProps = {
  nodeKey: string;
  language: Languages;
};

export type CodeBlockDocumentProps = {
  code: string;
  setCode: (code: string) => void;
};

export type CodeBlockShellProps = {
  lexicalEditor: LexicalEditor;
  codeMirrorInstance: CodeMirrorRef;
  setCodeMirrorInstance: Dispatch<SetStateAction<CodeMirrorRef>>;
  isExpanded: boolean;
  setIsExpanded: Dispatch<SetStateAction<boolean>>;
  expandCodeBlock: () => void;
  collapseCodeBlock: () => void;
  pendingCodeMirrorViewStateRef: RefObject<CodeMirrorViewState | null>;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  isCreatedNow: boolean;
};
