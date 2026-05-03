import { UseMutateFunction } from '@tanstack/react-query';
import type { CodeMirrorRef } from '../components/code/types';
import {
  CodeBlockStatus,
  KernelInstanceData,
  Languages,
  LanguagesWithKernels,
} from '../types';
import { createLeadingThrottle } from './general';

/**
 * Type for the ensureKernel mutation function.
 * Resolves a kernel for (noteId, language), launching it if needed.
 */
export type EnsureKernelFunction = UseMutateFunction<
  string | null,
  Error,
  { noteId: string; language: LanguagesWithKernels },
  unknown
>;

/**
 * Returns the default code template for a given programming language.
 */
export function getDefaultCodeForLanguage(language: Languages) {
  switch (language) {
    case 'python':
      return 'print("Hello, World!")\n\n\n\n';
    case 'go':
      return '%% \nfmt.Println("Hello, World!")\n\n\n\n';
    case 'javascript':
      return 'console.log("Hello, World!");\n\n\n\n';
    case 'java':
      return 'System.out.println("Hello, World!");\n\n\n\n';
    case 'text':
      return '';
    default:
      return '';
  }
}

/**
 * Per-code-block throttle to prevent rapid-fire execute requests to the kernel.
 */
const allowExecute = createLeadingThrottle(250);

/**
 * Executes the code present in the given CodeMirror editor instance.
 */
function runCode(
  codeMirrorInstance: CodeMirrorRef,
  executeCode: UseMutateFunction<
    void,
    Error,
    {
      code: string;
      newExecutionId: string;
    },
    unknown
  >,
  onSuccess?: () => void
) {
  const newExecutionId = crypto.randomUUID();
  const code = codeMirrorInstance?.view?.state.doc.toString();
  if (code === null || code === undefined) return;
  executeCode(
    { code, newExecutionId },
    {
      onSuccess,
    }
  );
}

/**
 * Handles running or interrupting code execution based on the current code-block
 * status and whether a kernel instance is bound and heartbeating. If no instance
 * exists for the (noteId, language) pair, ensureKernel is called instead — the
 * backend will create one (or return ErrNoIdleKernelToEvict).
 */
export function handleRunOrInterruptCode({
  status,
  noteId,
  codeBlockId,
  codeBlockLanguage,
  kernelInstanceId,
  getInstanceForNote,
  interruptExecution,
  codeMirrorInstance,
  executeCode,
  ensureKernel,
}: {
  status: CodeBlockStatus;
  noteId: string;
  codeBlockId: string;
  codeBlockLanguage: Languages;
  kernelInstanceId: string | null;
  getInstanceForNote: (
    noteId: string,
    language: LanguagesWithKernels
  ) => KernelInstanceData | null;
  interruptExecution: ({
    kernelInstanceId,
    newExecutionId,
    codeBlockId,
  }: {
    kernelInstanceId: string | null;
    newExecutionId: string;
    codeBlockId: string;
  }) => void;
  codeMirrorInstance: CodeMirrorRef;
  executeCode: UseMutateFunction<
    void,
    Error,
    {
      code: string;
      newExecutionId: string;
    },
    unknown
  >;
  ensureKernel: EnsureKernelFunction;
}) {
  if (codeBlockLanguage === 'text') return false;

  const language = codeBlockLanguage as LanguagesWithKernels;
  const instance = getInstanceForNote(noteId, language);

  if (!instance || instance.heartbeat !== 'success') {
    if (!allowExecute(codeBlockId)) return false;
    ensureKernel(
      { noteId, language },
      {
        onSuccess: () => {
          // Brief delay to let the heartbeat goroutine confirm the kernel is alive
          // before we send the execute_request.
          setTimeout(() => runCode(codeMirrorInstance, executeCode), 300);
        },
      }
    );
    return true;
  }

  if (status === 'busy') {
    interruptExecution({
      kernelInstanceId,
      codeBlockId,
      newExecutionId: '',
    });
  } else {
    if (!allowExecute(codeBlockId)) return false;
    runCode(codeMirrorInstance, executeCode);
  }
  return true;
}
