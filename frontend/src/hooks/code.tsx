import { useAtomValue, useSetAtom } from 'jotai';
import { CodeNode } from '../components/editor/nodes/code';
import { useWailsEvent } from './events';
import { loadingToastIdsAtom, kernelsDataAtom } from '../atoms';
import {
  CodeBlockStatus,
  CompletionData,
  isValidKernelLanguage,
  KernelHeartbeatStatus,
  KernelStatus,
  Languages,
  ProjectSettings,
  PythonCompletionMetadata,
  RawCompletionData,
} from '../types';
import { useMutation } from '@tanstack/react-query';
import {
  CreateSocketsAndListen,
  IsKernelAvailable,
  IsPathAValidVirtualEnvironment,
  SendExecuteRequest,
  SendInterruptRequest,
  SendShutdownMessage,
  SendInputReply,
  SendCompleteRequest,
  SendInspectRequest,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { RevealFolderOrFileInFinder } from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { QueryError } from '../utils/query';
import { $nodesOfType, LexicalEditor } from 'lexical';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { useUpdateProjectSettingsMutation } from './project-settings';
import { Dispatch, FormEvent, SetStateAction, useRef } from 'react';
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { hoverTooltip, Tooltip } from '@uiw/react-codemirror';
import { Browser } from '@wailsio/runtime';

/**
 * Hook that listens for kernel status updates and updates the kernels data atom.
 * Subscribes to the 'code:kernel:status' event to track changes in kernel status.
 */
export function useKernelStatus() {
  const setKernelsData = useSetAtom(kernelsDataAtom);

  useWailsEvent('code:kernel:status', (body) => {
    console.info('code:kernel:status');
    const data = body.data as {
      status: KernelStatus;
      language: Languages;
    };
    const language = data.language;
    const status = data.status;
    if (isValidKernelLanguage(language)) {
      setKernelsData((prev) => ({
        ...prev,
        [language]: { ...prev[language], status: status },
      }));
    }
  });
}

/**
 * Hook that listens for code block status updates and updates the corresponding code block.
 * Subscribes to the 'code:code-block:status' event to track changes in code block execution status.
 *
 * @param editor - The Lexical editor instance to update code blocks in
 */
export function useCodeBlockStatus(editor: LexicalEditor) {
  useWailsEvent('code:code-block:status', (body) => {
    console.info('code:code-block:status');

    const data = body.data as {
      status: KernelStatus;
      messageId: string;
      duration: string;
    };
    const [codeBlockId] = data.messageId.split('|');
    updateCodeBlock(editor, codeBlockId, (codeNode) => {
      codeNode.setStatus(data.status, editor);
      codeNode.setDuration(data.duration, editor);
    });
  });
}

/**
 * Hook that listens for code block execution result events and updates the corresponding code block
 * in the Lexical editor with the execution result.
 * Subscribes to the 'code:code-block:execute_result' event.
 *
 * @param editor - The Lexical editor instance to update code blocks in
 */
export function useCodeBlockExecuteResult(editor: LexicalEditor) {
  useWailsEvent('code:code-block:execute_result', (body) => {
    console.info('code:code-block:execute_result');

    const data = body.data as {
      messageId: string;
      data: Record<string, string>;
    };
    const [codeBlockId, executionId] = data.messageId.split('|');
    const executionResultContent: string[] = [];
    for (const content of Object.values(data.data)) {
      executionResultContent.push(content);
    }

    updateCodeBlock(
      editor,
      codeBlockId,
      (codeNode) => {
        codeNode.setExecutionResult(executionResultContent.join('\n'), editor);
      },
      executionId
    );
  });
}

/**
 * Hook that listens for code block execution input events and updates the execution count
 * for the corresponding code block in the Lexical editor.
 * Subscribes to the 'code:code-block:execute_input' event.
 *
 * @param editor - The Lexical editor instance to update code blocks in
 */
export function useCodeBlockExecuteInput(editor: LexicalEditor) {
  useWailsEvent('code:code-block:execute_input', (body) => {
    console.info('code:code-block:execute_input');

    const data = body.data as {
      messageId: string;
      code: string;
      executionCount: number;
    };
    const [codeBlockId, executionId] = data.messageId.split('|');

    updateCodeBlock(
      editor,
      codeBlockId,
      (codeNode) => {
        // Set the execution count on the code node
        codeNode.setExecutionCount(data.executionCount, editor);
      },
      executionId
    );
  });
}

/**
 * Hook that listens for kernel shutdown events and updates the kernels data atom.
 * Subscribes to the 'code:kernel:shutdown_reply' event to handle kernel shutdown responses.
 * Throws an error if the shutdown fails.
 */
export function useKernelShutdown() {
  const setKernelsData = useSetAtom(kernelsDataAtom);

  useWailsEvent('code:kernel:shutdown_reply', (body) => {
    console.info('code:kernel:shutdown_reply');
    const data = body.data as {
      status: string;
      language: Languages;
    };
    const language = data.language;
    const status = data.status;
    if (isValidKernelLanguage(language) && status === 'success') {
      setKernelsData((prev) => ({
        ...prev,
        [language]: {
          status: 'idle',
          heartbeat: 'idle',
          errorMessage: null,
        },
      }));
    } else if (status === 'error') {
      throw new QueryError('Kernel shutdown failed');
    }
  });
}

/**
 * Hook that listens for kernel heartbeat events and updates the kernels data atom.
 * Subscribes to the 'code:kernel:heartbeat' event to track kernel health status.
 */
export function useKernelHeartbeat() {
  const setKernelsData = useSetAtom(kernelsDataAtom);
  const setLoadingToastIds = useSetAtom(loadingToastIdsAtom);

  useWailsEvent('code:kernel:heartbeat', (body) => {
    console.info('code:kernel:heartbeat', body);
    const data = body.data as {
      status: KernelHeartbeatStatus;
      language: Languages;
    };
    const language = data.language;
    const kernelHeartbeatStatus = data.status;

    setLoadingToastIds((prev) => {
      const newMap = new Map(prev);
      const loadingToastId = newMap.get(`starting-${language}`);
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
        newMap.delete(`starting-${language}`);
      }
      return newMap;
    });

    setKernelsData((prev) => ({
      ...prev,
      [language]: { ...prev[language], heartbeat: kernelHeartbeatStatus },
    }));
  });
}

export function useKernelLaunchEvents(editor: LexicalEditor) {
  const setKernelsData = useSetAtom(kernelsDataAtom);
  useWailsEvent('kernel:launch-error', (body) => {
    console.info('kernel:launch-error');
    const data = body.data as {
      language: Languages;
      data: string;
    };
    const language = data.language;
    toast.error(data.data, DEFAULT_SONNER_OPTIONS);
    setKernelsData((prev) => ({
      ...prev,
      [language]: { ...prev[language], errorMessage: data.data },
    }));

    // All the nodes of the kernel should be back to idle if the kernel errors out
    editor.update(() => {
      const codeNodes = $nodesOfType(CodeNode);
      const codeNodesToUpdate = codeNodes.filter(
        (node) => node.getLanguage() === language
      );

      for (const node of codeNodesToUpdate) {
        node.setStatus('idle', editor);
      }
    });
  });

  useWailsEvent('kernel:launch-success', (body) => {
    console.info('kernel:launch-success');
    const data = body.data as {
      language: Languages;
      data: string;
    };
    const language = data.language;
    setKernelsData((prev) => ({
      ...prev,
      [language]: { ...prev[language], errorMessage: null },
    }));
  });
}

/**
 * Updates a code block node in the editor
 * @param editor - The Lexical editor instance
 * @param codeBlockId - The ID of the code block to update
 * @param callback - Function to call with the found code node
 * @param executionId - Optional execution ID for fresh executions
 */
function updateCodeBlock(
  editor: LexicalEditor,
  codeBlockId: string,
  callback: (codeNodeToUpdate: CodeNode) => void,
  executionId?: string
) {
  editor.update(() => {
    const codeNodes = $nodesOfType(CodeNode);
    const codeNodeToUpdate = codeNodes.find(
      (node) => node.getId() === codeBlockId
    );
    if (codeNodeToUpdate) {
      // This is a fresh execution, so it does not have a result
      if (executionId && executionId !== codeNodeToUpdate.getExecutionId()) {
        codeNodeToUpdate.setExecutionId(executionId, editor);
        codeNodeToUpdate.resetLastExecutedResult(editor);
      }
      callback(codeNodeToUpdate);
    }
  });
}

/**
 * THIS IS BEING DONE BY THE useCodeBlockIOPubError hook instead
 * Hook that listens for code block execution replies and updates the editor with error traceback info.
 * Subscribes to the 'code:code-block:execute_reply' event to handle execution responses.
 *
 * @param editor - The Lexical editor instance to update code blocks in
 */
// export function useCodeBlockExecuteReply() {
//   useWailsEvent('code:code-block:execute_reply', (body) => {
//     console.info('code:code-block:execute_reply', body);
//     const data = body.data as
//       | { status: 'ok'; messageId: string }[]
//       | {
//           status: 'error';
//           messageId: string;
//           errorValue: string;
//           errorTraceback: string[];
//           errorName: string;
//         }[];
//     if (data.length === 0) return;
//     // const replyData = data[0];

//     // const [codeBlockId, executionId] = replyData.messageId.split('|');
//     // updateCodeBlock(
//     //   editor,
//     //   codeBlockId,
//     //   (codeNode) => {
//     //     if (replyData.status === 'error') {
//     //       const cleanedTraceback = replyData.errorTraceback
//     //         .map((trace) => `<div>${trace}</div>`)
//     //         .join('');
//     //       codeNode.setTracebackResult(cleanedTraceback, editor);
//     //     }
//     //   },
//     //   executionId
//     // );

//   });
// }

/**
 * Hook that listens for code block output streams and updates the editor with stream content.
 * Subscribes to the 'code:code-block:stream' event to handle stdout/stderr outputs.
 *
 * @param editor - The Lexical editor instance to update code blocks in
 */
export function useCodeBlockStream(editor: LexicalEditor) {
  useWailsEvent('code:code-block:stream', (body) => {
    console.info('code:code-block:stream');
    const data = body.data as {
      messageId: string;
      name: 'stdout' | 'stderr';
      text: string;
    };
    const [codeBlockId, executionId] = data.messageId.split('|');
    updateCodeBlock(
      editor,
      codeBlockId,
      (codeNode) => {
        codeNode.setStreamResult(data.text, editor);
      },
      executionId
    );
  });
}

/**
 * Hook that listens for IOPub error messages from code blocks and updates the editor with error details.
 * Subscribes to the 'code:code-block:iopub_error' event to handle error outputs from the kernel.
 *
 * @param editor - The Lexical editor instance to update code blocks in
 */
export function useCodeBlockIOPubError(editor: LexicalEditor) {
  useWailsEvent('code:code-block:iopub_error', (body) => {
    console.info('code:code-block:iopub_error', body);
    const data = body.data as {
      messageId: string;
      errorName: string;
      errorValue: string;
      errorTraceback: string[];
    };
    const [codeBlockId, executionId] = data.messageId.split('|');
    updateCodeBlock(
      editor,
      codeBlockId,
      (codeNode) => {
        const errorName =
          data.errorName && data.errorName.trim().length > 0
            ? `<div style="font-size: 0.7rem" class="text-zinc-500 dark:text-zinc-300">Error Name: ${data.errorName}</div>`
            : '';
        const errorValue =
          data.errorValue && data.errorValue.trim().length > 0
            ? `<div style="font-size: 0.7rem" class="text-zinc-500 dark:text-zinc-300">Error Value: ${data.errorValue}</div>`
            : '';
        const errorTraceback = data.errorTraceback
          .map((trace) => `<div>${trace}</div>`)
          .join('');
        const fullError = `${errorTraceback} ${errorName} ${errorValue}`;
        codeNode.setTracebackResult(fullError, editor);
      },
      executionId
    );
  });
}

/**
 * Hook that listens for code block display data and updates the editor with rich display content.
 * Subscribes to the 'code:code-block:display_data' event to handle rich output like images, HTML, etc.
 *
 * @param editor - The Lexical editor instance to update code blocks in
 */
export function useCodeBlockDisplayData(editor: LexicalEditor) {
  useWailsEvent('code:code-block:display_data', (body) => {
    const data = body.data as {
      messageId: string;
      data: Record<string, string>;
    };
    const [codeBlockId, executionId] = data.messageId.split('|');
    updateCodeBlock(
      editor,
      codeBlockId,
      (codeNode) => {
        codeNode.setDisplayResult(data.data, editor);
      },
      executionId
    );
  });
}

/**
 * Hook that listens for code block input requests and updates the editor to show input prompts.
 * Subscribes to the 'code:code-block:input_request' event to handle input requests from the kernel.
 *
 * @param editor - The Lexical editor instance to update code blocks in
 */
export function useCodeBlockInputRequest(editor: LexicalEditor) {
  useWailsEvent('code:code-block:input_request', (body) => {
    console.info('code:code-block:input_request', body);
    const data = body.data as {
      messageId: string;
      prompt: string | null;
      password: boolean | null;
    };

    const [codeBlockId, executionId] = data.messageId.split('|');
    const prompt = data.prompt;
    const isPassword = data.password;

    updateCodeBlock(
      editor,
      codeBlockId,
      (codeNode) => {
        codeNode.setInputPrompt(
          {
            prompt: prompt ?? '',
            isPassword: isPassword ?? false,
          },
          editor
        );
      },
      executionId
    );
  });
}

/**
 * Hook that creates a mutation for sending an input reply to the kernel.
 *
 * @returns A mutation object for sending input replies
 */
export function useSendInputReplyMutation(
  codeBlockId: string,
  language: Languages
) {
  return useMutation({
    mutationFn: async ({
      executionId,
      value,
    }: {
      executionId: string;
      value: string;
    }) => {
      const res = await SendInputReply(
        language,
        codeBlockId,
        executionId,
        value
      );
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}

/**
 * Hook that creates a mutation for sending code execution requests to the kernel.
 * Sets the code block status to 'queueing' while the request is processed.
 *
 * @param codeBlockId - The ID of the code block to execute
 * @param language - The programming language of the code block
 * @param setStatus - Function to update the code block's status
 * @returns A mutation object for executing code
 */
export function useSendExecuteRequestMutation(
  codeBlockId: string,
  language: Languages,
  setStatus: (status: CodeBlockStatus) => void
) {
  return useMutation({
    mutationFn: async ({
      code,
      newExecutionId,
    }: {
      code: string;
      newExecutionId: string;
    }) => {
      setStatus('queueing');
      const res = await SendExecuteRequest(
        codeBlockId,
        newExecutionId,
        language,
        code
      );
      if (!res.success) {
        setStatus('idle');
        throw new QueryError(res.message);
      }
    },
  });
}

/**
 * Hook that creates a mutation for sending interrupt requests to the kernel.
 * Only sends the request if the kernel's heartbeat status is not 'failure'.
 *
 * @param onSuccess - Optional callback function to execute when the interrupt is successful
 * @returns A mutation object for interrupting code execution
 */
export function useSendInterruptRequestMutation(onSuccess?: () => void) {
  const kernelsData = useAtomValue(kernelsDataAtom);
  return useMutation({
    mutationFn: async ({
      codeBlockId,
      codeBlockLanguage,
      newExecutionId,
    }: {
      codeBlockId: string;
      codeBlockLanguage: Languages;
      newExecutionId: string;
    }) => {
      // Nothing to interrupt if the kernel is not running
      if (
        kernelsData[codeBlockLanguage].heartbeat === 'idle' ||
        kernelsData[codeBlockLanguage].heartbeat === 'failure'
      ) {
        return;
      }

      const res = await SendInterruptRequest(
        codeBlockLanguage,
        codeBlockId,
        newExecutionId
      );
      if (!res.success) {
        toast.error(res.message, DEFAULT_SONNER_OPTIONS);
      }
    },
    onSuccess,
  });
}

/**
 * Hook that creates a mutation for shutting down a kernel.
 * Can optionally restart the kernel after shutdown.
 * Throws an error if the shutdown request fails.
 *
 * @returns A mutation object for shutting down the kernel
 */
export function useShutdownKernelMutation(language: Languages) {
  return useMutation({
    mutationFn: async (restart: boolean) => {
      const res = await SendShutdownMessage(language, restart);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}

/**
 * Hook that creates a mutation for starting up a kernel.
 * Creates sockets and establishes event listeners for the specified language.
 * Throws an error if the startup request fails.
 *
 * @returns A mutation object for starting up the kernel
 */
export function useTurnOnKernelMutation() {
  const setLoadingToastIds = useSetAtom(loadingToastIdsAtom);
  return useMutation({
    mutationFn: async (language: Languages) => {
      const res = await CreateSocketsAndListen(language);
      if (!res.success) {
        throw new QueryError(res.message);
      } else {
        const loadingToastId = toast.loading(`Starting ${language} kernel`);
        setLoadingToastIds((prev) => {
          const newMap = new Map(prev);
          newMap.set(`starting-${language}`, loadingToastId);
          return newMap;
        });
      }
    },
  });
}

type pythonVenvMutationParams = {
  e: FormEvent<HTMLFormElement>;
  setErrorText: Dispatch<SetStateAction<string>>;
};

/**
 * Hook that creates a mutation for updating Python virtual environment settings.
 * Validates the virtual environment path, updates project settings, and restarts the Python kernel.
 * Throws an error if the path is invalid or virtual environment validation fails.
 *
 * @param projectSettings - The current project settings object
 * @returns A mutation object for updating Python virtual environment settings
 */
export function usePythonVenvSubmitMutation(projectSettings: ProjectSettings) {
  // Only python uses virtual environments
  const language = 'python';
  const { mutateAsync: updateProjectSettings } =
    useUpdateProjectSettingsMutation();
  const { mutateAsync: shutdownKernel } = useShutdownKernelMutation(language);
  const { mutateAsync: turnOnKernel } = useTurnOnKernelMutation();

  return useMutation({
    mutationFn: async (variables: pythonVenvMutationParams) => {
      const { e } = variables;
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const selectedVenvPath = formData.get('venv-path-option');
      const elementForSelectedVenvPath = form.querySelector(
        'input[name="venv-path-option"]:checked'
      );
      if (
        !elementForSelectedVenvPath ||
        typeof selectedVenvPath !== 'string' ||
        !selectedVenvPath
      ) {
        throw new Error('No virtual environment path provided');
      }

      const check = await IsPathAValidVirtualEnvironment(selectedVenvPath);
      if (!check.success) {
        throw new Error(check.message);
      }
      let newCustomVenvPaths = projectSettings.code.customPythonVenvPaths;
      // If the custom venv radio button is selected, then add the path to the list of custom paths so
      // that it can be shown as a radio button when the dialog is opened in the future
      if (elementForSelectedVenvPath.id === 'custom-venv-path') {
        newCustomVenvPaths = [
          ...new Set([
            ...projectSettings.code.customPythonVenvPaths,
            selectedVenvPath,
          ]),
        ];
      }
      await updateProjectSettings({
        newProjectSettings: {
          ...projectSettings,
          code: {
            ...projectSettings.code,
            pythonVenvPath: selectedVenvPath,
            customPythonVenvPaths: newCustomVenvPaths,
          },
        },
      });
      const canUseKernel = await IsKernelAvailable(language);

      if (canUseKernel) {
        await shutdownKernel(false);
        // Switch the kernel on after 2 seconds, hopefully after the shutdown kernel message has been processed
        setTimeout(() => {
          turnOnKernel(language);
        }, 2000);
      } else {
        turnOnKernel(language);
      }

      return true;
    },
    onError: (error, variables) => {
      const { setErrorText } = variables;
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText('An unknown error occurred');
      }
    },
  });
}

/**
 * Hook that creates a mutation for revealing a folder or file in the system's file manager.
 *
 * @returns A mutation object for revealing folders/files in finder
 */
export function useRevealInFinderMutation() {
  return useMutation({
    mutationFn: async ({ path }: { path: string }) => {
      const res = await RevealFolderOrFileInFinder(path, false);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}

/**
 * Creates a completion source function for code autocompletion.
 *
 * @param id - The ID of the code block
 * @param executionId - The execution ID for the completion request
 * @param pendingCompletions - Map to store pending completion promises by messageId
 * @param COMPLETION_TIMEOUT - Timeout duration in ms before abandoning completion request (default: 3000)
 * @returns An async completion source function that handles code completion requests
 */
export function useCompletionSource(
  id: string,
  executionId: string,
  language: Languages,
  pendingCompletions: Map<string, (data: CompletionData) => void>,
  COMPLETION_TIMEOUT = 3000
) {
  // Store the latest messageId to match responses
  const latestMessageId = useRef<string | null>(null);

  // Listen for completion replies
  useWailsEvent('code:code-block:complete_reply', (body) => {
    const data = body.data as RawCompletionData[];
    if (data.length === 0) return;
    const rawCompletionData = data[0];
    const completionData: CompletionData = {
      ...rawCompletionData,
      matches: rawCompletionData.matches.map((match) => ({ label: match })),
    };
    const jupyterTypesExperimental = completionData.metadata[
      '_jupyter_types_experimental'
    ] as PythonCompletionMetadata | undefined;
    if (jupyterTypesExperimental) {
      jupyterTypesExperimental.forEach(({ signature, type }, i) => {
        completionData.matches[i].detail = signature;
        completionData.matches[i].type = type;
      });
    }
    // Resolve the pending promise if it exists
    const resolve = pendingCompletions.get(completionData.messageId);
    if (resolve) {
      resolve(completionData);
      pendingCompletions.delete(completionData.messageId);
    }
  });

  // The async completion source
  return async function completionSource(
    context: CompletionContext
  ): Promise<CompletionResult | null> {
    console.log('completionSource', context);
    const code = context.state.doc.toString();
    const cursorPos = context.pos;
    // Send the request
    const completeReq = await SendCompleteRequest(
      language,
      id,
      executionId,
      code,
      cursorPos
    );
    const completionMessageId = completeReq.data?.messageId;
    if (!completionMessageId) {
      return null;
    }
    // Generate a unique messageId for this request
    latestMessageId.current = completionMessageId;

    // Return a promise that resolves when the response arrives
    return new Promise((resolve) => {
      // Store the resolver so the event handler can call it
      pendingCompletions.set(
        completionMessageId,
        (completionData: CompletionData) => {
          // Only resolve if this is the latest request
          if (latestMessageId.current === completionMessageId) {
            resolve({
              from: completionData.cursorStart,
              to: completionData.cursorEnd,
              options: completionData.matches
                // Filters out magic commands
                .filter((match) => !match.label.startsWith('%'))
                .map(({ label, detail, type }) => ({
                  label,
                  detail,
                  type,
                })),
            });
          } else {
            // Ignore the request if it is not the latest request
            resolve(null);
          }
        }
      );
      // Optionally, add a timeout to avoid hanging forever
      setTimeout(() => {
        if (pendingCompletions.has(completionMessageId)) {
          pendingCompletions.delete(completionMessageId);
          resolve(null);
        }
      }, COMPLETION_TIMEOUT);
    });
  };
}

type HoverTooltipData = {
  found: boolean;
  messageId: string;
  message: string;
};

export function useInspectTooltip(
  language: Languages,
  id: string,
  executionId: string,
  pendingInspections: Map<string, (data: HoverTooltipData) => void>
) {
  useWailsEvent('code:code-block:inspect_reply', (body) => {
    console.info('code:code-block:inspect_reply', body);
    const data = body.data as {
      found: boolean;
      messageId: string;
      data: Record<string, string>;
    }[];

    if (data.length === 0) {
      return;
    }

    const inspectData = data[0];
    if (!inspectData.found) {
      // Resolve the pending promise with null so the tooltip knows there's nothing to show
      const resolve = pendingInspections.get(inspectData.messageId);
      if (resolve) {
        resolve({
          found: false,
          messageId: inspectData.messageId,
          message: '',
        });
        pendingInspections.delete(inspectData.messageId);
      }
      return;
    }

    const tooltipData: HoverTooltipData = {
      found: inspectData.found,
      messageId: inspectData.messageId,
      message:
        inspectData.data['text/plain'] ||
        inspectData.data['text/html'] ||
        inspectData.data['text/markdown'],
    };
    console.log({ tooltipData });

    // Resolve the pending promise if it exists
    const resolve = pendingInspections.get(inspectData.messageId);
    if (resolve) {
      resolve(tooltipData);
      pendingInspections.delete(inspectData.messageId);
    }
  });

  return hoverTooltip(async (view, cursorPos) => {
    const word = view.state.wordAt(cursorPos);
    if (!word) {
      return null;
    }
    const code = view.state.doc.toString();
    const res = await SendInspectRequest(
      language,
      id,
      executionId,
      code,
      cursorPos,
      1
    );

    if (!res.success || !res.data || !res.data.messageId) {
      return null;
    }

    // Use the messageId returned from the backend
    const inspectMessageId = res.data.messageId;

    // Return a promise that resolves when the response arrives
    return new Promise<Tooltip | null>((resolve) => {
      // Store the resolver so the event handler can call it
      pendingInspections.set(
        inspectMessageId,
        (tooltipData: HoverTooltipData) => {
          // Only resolve if this is the latest request and for the correct code block
          const codeBlockIdFromMessageId =
            tooltipData.messageId.split('|')?.[0];
          if (id === codeBlockIdFromMessageId) {
            // If no information was found, don't show a tooltip
            if (!tooltipData.found || !tooltipData.message.trim()) {
              resolve(null);
              return;
            }

            resolve({
              pos: word.from,
              end: word.to,
              above: true,
              create: () => {
                const dom = document.createElement('div');
                dom.className = 'cm-tooltip-custom';
                dom.innerHTML = tooltipData.message;

                dom.addEventListener('click', (e) => {
                  // find the nearest <a> (in case they click a child node)
                  const a = (e.target as HTMLElement).closest('a');
                  if (!a) return;
                  e.preventDefault();
                  e.stopPropagation();
                  Browser.OpenURL(a.href).catch(() => {
                    toast.error('Failed to open link', DEFAULT_SONNER_OPTIONS);
                  });
                });

                return { dom };
              },
            });
          } else {
            // Ignore the request if it's not the latest or wrong code block
            resolve(null);
          }
        }
      );

      // Add a timeout to avoid hanging forever
      setTimeout(() => {
        if (pendingInspections.has(inspectMessageId)) {
          pendingInspections.delete(inspectMessageId);
          resolve(null);
        }
      }, 3000);
    });
  });
}
