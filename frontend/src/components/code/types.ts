import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { LexicalEditor } from 'lexical';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { Languages } from '@/types';

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
  restoreCodeMirrorViewState: (instance: CodeMirrorRef) => boolean;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  isCreatedNow: boolean;
};
