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
  setCode: Dispatch<SetStateAction<string>>;
};

export type CodeBlockExecutionProps = {
  status: CodeBlockStatus;
  setStatus: Dispatch<SetStateAction<CodeBlockStatus>>;
  executionId: string;
  kernelInstanceId: string | null;
};

export type CodeBlockShellProps = {
  lexicalEditor: LexicalEditor;
  codeMirrorInstance: CodeMirrorRef;
  setCodeMirrorInstance: Dispatch<SetStateAction<CodeMirrorRef>>;
  isExpanded: boolean;
  setIsExpanded: Dispatch<SetStateAction<boolean>>;
  hideResults: boolean;
  setHideResults: Dispatch<SetStateAction<boolean>>;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  isCreatedNow: boolean;
};

export type CodeBlockOutputProps = {
  lastExecutedResult: string;
  setLastExecutedResult: Dispatch<SetStateAction<string>>;
  isWaitingForInput: boolean;
  setIsWaitingForInput: Dispatch<SetStateAction<boolean>>;
};

export type CodeBlockResultProps = {
  identity: CodeBlockIdentityProps;
  execution: CodeBlockExecutionProps;
  shell: CodeBlockShellProps;
  output: CodeBlockOutputProps;
};
