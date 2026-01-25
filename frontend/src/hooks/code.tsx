import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { logger } from '../utils/logging';
import { CodeNode } from '../components/editor/nodes/code';
import { useWailsEvent } from './events';
import { loadingToastIdsAtom, kernelsDataAtom } from '../atoms';
import {
  CodeBlockStatus,
  isValidKernelLanguage,
  KernelHeartbeatStatus,
  KernelStatus,
  Languages,
  ProjectSettings,
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
} from '../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { RevealFolderOrFileInFinder } from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { QueryError } from '../utils/query';
import { $nodesOfType, LexicalEditor } from 'lexical';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { useUpdateProjectSettingsMutation } from './project-settings';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { runCode } from '../utils/code';
import { CodeMirrorRef } from '../components/code/types';

/**
 * Hook that listens for kernel status updates and updates the kernels data atom.
 * Subscribes to the 'code:kernel:status' event to track changes in kernel status.
 */
export function useKernelStatus() {
  const setKernelsData = useSetAtom(kernelsDataAtom);

  useWailsEvent('code:kernel:status', (body) => {
    logger.event('code:kernel:status');
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
    logger.event('code:code-block:status');

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
    logger.event('code:code-block:execute_result');

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
    logger.event('code:code-block:execute_input');

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
    logger.event('code:kernel:shutdown_reply');
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
    logger.event('code:kernel:heartbeat', body);
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
    logger.event('kernel:launch-error');
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
    logger.event('kernel:launch-success');
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
    logger.event('code:code-block:stream');
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
    logger.event('code:code-block:iopub_error', body);
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
    logger.event('code:code-block:input_request', body);
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
export function useSendExecuteRequestMutation({
  codeBlockId,
  language,
  setStatus,
}: {
  codeBlockId: string;
  language: Languages;
  setStatus: (status: CodeBlockStatus) => void;
}) {
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
export function useTurnOnKernelMutation({
  language,
  codeBlockId,
  setStatus,
}: {
  language: Languages;
  codeBlockId?: string;
  setStatus?: (status: CodeBlockStatus) => void;
}) {
  const [loadingToastIds, setLoadingToastIds] = useAtom(loadingToastIdsAtom);
  const { mutate: executeCode } = useSendExecuteRequestMutation({
    codeBlockId: codeBlockId ?? '',
    language,
    setStatus: setStatus ?? (() => {}),
  });

  return useMutation({
    mutationFn: async ({
      codeMirrorInstance,
    }: {
      codeMirrorInstance?: CodeMirrorRef;
    }) => {
      const toastKey = `starting-${language}`;

      const res = await CreateSocketsAndListen(language);
      if (!res.success) {
        throw new QueryError(res.message);
      } else {
        // Check atomically if a toast already exists before creating a new one
        // This prevents duplicate toasts when spam clicking
        if (loadingToastIds.has(toastKey)) {
          return;
        }

        setLoadingToastIds((prev) => {
          const newMap = new Map(prev);
          const loadingToastId = toast.loading(`Starting ${language} kernel`);
          newMap.set(toastKey, loadingToastId);
          return newMap;
        });

        // If there is a code mirror instance, then wait until the kernel is available
        // to do the initial execution of the code
        if (!codeMirrorInstance) {
          return;
        }

        const interval = setInterval(() => {
          const loadingToastId = loadingToastIds.get(toastKey);
          if (!loadingToastId) {
            clearInterval(interval);
            setTimeout(() => {
              runCode(codeMirrorInstance, executeCode);
            }, 300);
          }
        }, 100);
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
  const { mutateAsync: turnOnKernel } = useTurnOnKernelMutation({ language });

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
          turnOnKernel({});
        }, 2000);
      } else {
        turnOnKernel({});
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
    mutationFn: async ({
      path,
      shouldPrefixWithProjectPath,
    }: {
      path: string;
      shouldPrefixWithProjectPath: boolean;
    }) => {
      const res = await RevealFolderOrFileInFinder(
        path,
        shouldPrefixWithProjectPath
      );
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}
