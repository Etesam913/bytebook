import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { LexicalEditor } from 'lexical';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { CodeBlockStatus, Languages } from '../../types';

export type CodeMirrorRef = ReactCodeMirrorRef | null;

export type CodeBlockIdentityProps = {
  id: string;
  nodeKey: string;
  language: Languages;
};

export type CodeBlockDocumentProps = {
  code: string;
  setCode: (code: string) => void;
};

export type CodeBlockExecutionProps = {
  status: CodeBlockStatus;
  setStatus: (status: CodeBlockStatus) => void;
  executionId: string;
  kernelInstanceId: string | null;
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
  hideResults: boolean;
  setHideResults: (hideResults: boolean) => void;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  isCreatedNow: boolean;
};

export type CodeBlockOutputProps = {
  lastExecutedResult: string;
  setLastExecutedResult: (lastExecutedResult: string) => void;
  isWaitingForInput: boolean;
  setIsWaitingForInput: (isWaitingForInput: boolean) => void;
};

export type CodeBlockResultProps = {
  identity: CodeBlockIdentityProps;
  execution: CodeBlockExecutionProps;
  shell: CodeBlockShellProps;
  output: CodeBlockOutputProps;
};
