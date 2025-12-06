import { UseMutateFunction } from '@tanstack/react-query';
import type { CodeMirrorRef } from '../components/code/types';
import { CodeBlockStatus, KernelsData, Languages } from '../types';

/**
 * Type for the turnOnKernel mutation function.
 * Accepts an optional codeMirrorInstance to run code after kernel starts.
 */
export type TurnOnKernelFunction = UseMutateFunction<
  void,
  Error,
  { codeMirrorInstance?: CodeMirrorRef },
  unknown
>;

/**
 * Returns the default code template for a given programming language.
 *
 * @param language - The programming language to get the default code for
 * @returns A string containing the default code template for the specified language
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
 * Executes the code present in the given CodeMirror editor instance.
 *
 * @param codeMirrorInstance - Reference to the CodeMirror editor instance containing code to run
 * @param executeCode - Mutation function to execute code, typically from a React Query mutation
 * @param onSuccess - Optional callback to execute when the code has been run successfully
 */
export function runCode(
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
 * Handles running or interrupting code execution based on the current status of the code block.
 *
 * @param options - Configuration object containing all parameters
 * @param options.status - Current execution status of the code block
 * @param options.codeBlockId - Unique identifier for the code block
 * @param options.codeBlockLanguage - Programming language of the code block
 * @param options.interruptExecution - Function to interrupt code execution
 * @param options.codeMirrorInstance - Reference to the CodeMirror editor instance
 * @param options.executeCode - Function to execute the code in the editor
 * @param options.getKernelsData - Function that returns the current kernels data
 * @param options.turnOnKernel - Function to turn on the kernel for the code block
 * @returns True if the code was run or interrupted, false otherwise
 */
export function handleRunOrInterruptCode({
  status,
  codeBlockId,
  codeBlockLanguage,
  interruptExecution,
  codeMirrorInstance,
  executeCode,
  getKernelsData,
  turnOnKernel,
}: {
  status: CodeBlockStatus;
  codeBlockId: string;
  codeBlockLanguage: Languages;
  interruptExecution: ({
    newExecutionId,
    codeBlockId,
    codeBlockLanguage,
  }: {
    newExecutionId: string;
    codeBlockId: string;
    codeBlockLanguage: Languages;
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
  getKernelsData: () => KernelsData;
  turnOnKernel: TurnOnKernelFunction;
}) {
  const kernelsData = getKernelsData();
  const languageHearbeat = kernelsData[codeBlockLanguage].heartbeat;
  if (languageHearbeat === 'failure' || languageHearbeat === 'idle') {
    turnOnKernel({ codeMirrorInstance });
    return true;
  }

  if (status === 'busy') {
    interruptExecution({
      codeBlockId,
      codeBlockLanguage,
      newExecutionId: '',
    });
  } else {
    runCode(codeMirrorInstance, executeCode);
  }
  return true;
}
