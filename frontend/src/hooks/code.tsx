import { useAtomValue, useSetAtom } from 'jotai';
import { logger } from '../utils/logging';
import { CodeNode } from '../components/editor/nodes/code';
import { useWailsEvent } from './events';
import { kernelInstancesAtom } from '../atoms';
import {
  CodeBlockStatus,
  isValidKernelLanguage,
  KernelHeartbeatStatus,
  KernelInstanceData,
  KernelStatus,
  Languages,
  LanguagesWithKernels,
  ProjectSettings,
} from '../types';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  EnsureKernel,
  IsPathAValidVirtualEnvironment,
  ListKernels,
  SendExecuteRequest,
  SendInputReply,
  SendInterruptRequest,
  ShutdownKernel,
  ShutdownKernelsByLanguage,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { QueryError } from '../utils/query';
import { $nodesOfType, LexicalEditor } from 'lexical';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import {
  CODE_BLOCK_STATUS,
  CODE_BLOCK_EXECUTE_RESULT,
  CODE_BLOCK_EXECUTE_INPUT,
  CODE_BLOCK_STREAM,
  CODE_BLOCK_IOPUB_ERROR,
  CODE_BLOCK_DISPLAY_DATA,
  CODE_BLOCK_INPUT_REQUEST,
  KERNEL_INSTANCE_CREATED,
  KERNEL_INSTANCE_SHUTDOWN,
  KERNEL_INSTANCE_STATUS,
  KERNEL_INSTANCE_HEARTBEAT,
  KERNEL_INSTANCE_LAUNCH_ERROR,
  KERNEL_INSTANCE_EXITED,
} from '../utils/events';
import { useUpdateProjectSettingsMutation } from './project-settings';
import { Dispatch, SetStateAction, useEffect } from 'react';

type KernelInstanceSnapshotPayload = {
  id: string;
  language: string;
  noteId: string;
  heartbeat: KernelHeartbeatStatus;
  lastActivityAt: number;
  activeExecutions: number;
};

function toKernelInstanceData(
  snapshot: KernelInstanceSnapshotPayload
): KernelInstanceData | null {
  if (
    !isValidKernelLanguage(snapshot.language) ||
    snapshot.language === 'text'
  ) {
    return null;
  }
  const status: KernelStatus = snapshot.activeExecutions > 0 ? 'busy' : 'idle';
  return {
    id: snapshot.id,
    language: snapshot.language,
    noteId: snapshot.noteId,
    status,
    heartbeat: snapshot.heartbeat,
    errorMessage: null,
    lastActivityAt: snapshot.lastActivityAt,
  };
}

/**
 * Hydrates the frontend kernel instance atom from the backend manager. Kernel
 * events update this state during editor usage, but route-level UI can mount
 * after instances already exist.
 */
export function useKernelInstancesQuery() {
  const setInstances = useSetAtom(kernelInstancesAtom);
  const { data: snapshots } = useQuery({
    queryKey: ['kernel-instances'],
    queryFn: async () => {
      const response = await ListKernels();
      if (!response.success) {
        throw new QueryError(response.message);
      }
      return response.data ?? [];
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!snapshots) return;
    setInstances((prev) =>
      Object.fromEntries(
        snapshots.flatMap((snapshot) => {
          const instance = toKernelInstanceData({
            ...snapshot,
            heartbeat: snapshot.heartbeat as KernelHeartbeatStatus,
          });
          return instance
            ? [
                [
                  instance.id,
                  {
                    ...instance,
                    errorMessage: prev[instance.id]?.errorMessage ?? null,
                  },
                ],
              ]
            : [];
        })
      )
    );
  }, [snapshots, setInstances]);
}

type InstanceCreatedPayload = {
  id: string;
  language: LanguagesWithKernels;
  noteId: string;
  scopeType: string;
  heartbeat: KernelHeartbeatStatus;
  lastActivityAt: number;
  activeExecutions: number;
};
type InstanceStatusPayload = { id: string; status: KernelStatus };
type InstanceHeartbeatPayload = { id: string; status: KernelHeartbeatStatus };
type InstanceShutdownPayload = {
  id: string;
  language: LanguagesWithKernels;
  noteId: string;
  reason: string;
};
type InstanceLaunchErrorPayload = {
  id: string;
  language: LanguagesWithKernels;
  noteId: string;
  errorMessage: string;
};
type InstanceExitedPayload = { id: string; exitCode: number };

/**
 * Single hook that wires every kernel:instance:* event into kernelInstancesAtom
 * and resets affected code-block nodes when an instance dies / errors.
 */
export function useKernelInstanceEvents(editor: LexicalEditor) {
  const setInstances = useSetAtom(kernelInstancesAtom);

  useWailsEvent(KERNEL_INSTANCE_CREATED, (body) => {
    logger.event(KERNEL_INSTANCE_CREATED);
    const data = body.data as InstanceCreatedPayload;
    if (!isValidKernelLanguage(data.language)) return;
    setInstances((prev) => ({
      ...prev,
      [data.id]: {
        id: data.id,
        language: data.language,
        noteId: data.noteId,
        status: 'starting',
        heartbeat: data.heartbeat,
        errorMessage: null,
        lastActivityAt: data.lastActivityAt,
      },
    }));
  });

  useWailsEvent(KERNEL_INSTANCE_STATUS, (body) => {
    logger.event(KERNEL_INSTANCE_STATUS);
    const data = body.data as InstanceStatusPayload;
    setInstances((prev) => {
      const existing = prev[data.id];
      if (!existing) return prev;
      return {
        ...prev,
        [data.id]: {
          ...existing,
          status: data.status,
          lastActivityAt: Date.now(),
        },
      };
    });
  });

  useWailsEvent(KERNEL_INSTANCE_HEARTBEAT, (body) => {
    logger.event(KERNEL_INSTANCE_HEARTBEAT);
    const data = body.data as InstanceHeartbeatPayload;
    setInstances((prev) => {
      const existing = prev[data.id];
      if (!existing) return prev;
      return { ...prev, [data.id]: { ...existing, heartbeat: data.status } };
    });
  });

  useWailsEvent(KERNEL_INSTANCE_SHUTDOWN, (body) => {
    logger.event(KERNEL_INSTANCE_SHUTDOWN);
    const data = body.data as InstanceShutdownPayload;
    setInstances((prev) => {
      const next = { ...prev };
      delete next[data.id];
      return next;
    });
    resetCodeNodesForInstance(editor, data.id);
  });

  useWailsEvent(KERNEL_INSTANCE_EXITED, (body) => {
    logger.event(KERNEL_INSTANCE_EXITED);
    const data = body.data as InstanceExitedPayload;
    setInstances((prev) => {
      const next = { ...prev };
      delete next[data.id];
      return next;
    });
    resetCodeNodesForInstance(editor, data.id);
  });

  useWailsEvent(KERNEL_INSTANCE_LAUNCH_ERROR, (body) => {
    logger.event(KERNEL_INSTANCE_LAUNCH_ERROR);
    const data = body.data as InstanceLaunchErrorPayload;
    toast.error(data.errorMessage, DEFAULT_SONNER_OPTIONS);
    setInstances((prev) => {
      const existing = prev[data.id];
      if (!existing) return prev;
      return {
        ...prev,
        [data.id]: { ...existing, errorMessage: data.errorMessage },
      };
    });
    resetCodeNodesForInstance(editor, data.id);
  });
}

function resetCodeNodesForInstance(editor: LexicalEditor, instanceId: string) {
  editor.update(() => {
    const codeNodes = $nodesOfType(CodeNode);
    for (const node of codeNodes) {
      if (node.getKernelInstanceId?.() === instanceId) {
        node.setStatus('idle', editor);
        node.setKernelInstanceId?.(null, editor);
      }
    }
  });
}

/**
 * Updates a code block node in the editor.
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
      if (executionId && executionId !== codeNodeToUpdate.getExecutionId()) {
        codeNodeToUpdate.setExecutionId(executionId, editor);
        codeNodeToUpdate.resetLastExecutedResult(editor);
      }
      callback(codeNodeToUpdate);
    }
  });
}

export function useCodeBlockStatus(editor: LexicalEditor) {
  useWailsEvent(CODE_BLOCK_STATUS, (body) => {
    logger.event(CODE_BLOCK_STATUS);
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

export function useCodeBlockExecuteResult(editor: LexicalEditor) {
  useWailsEvent(CODE_BLOCK_EXECUTE_RESULT, (body) => {
    logger.event(CODE_BLOCK_EXECUTE_RESULT);
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

export function useCodeBlockExecuteInput(editor: LexicalEditor) {
  useWailsEvent(CODE_BLOCK_EXECUTE_INPUT, (body) => {
    logger.event(CODE_BLOCK_EXECUTE_INPUT);
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
        codeNode.setExecutionCount(data.executionCount, editor);
      },
      executionId
    );
  });
}

export function useCodeBlockStream(editor: LexicalEditor) {
  useWailsEvent(CODE_BLOCK_STREAM, (body) => {
    logger.event(CODE_BLOCK_STREAM);
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

export function useCodeBlockIOPubError(editor: LexicalEditor) {
  useWailsEvent(CODE_BLOCK_IOPUB_ERROR, (body) => {
    logger.event(CODE_BLOCK_IOPUB_ERROR, body);
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

export function useCodeBlockDisplayData(editor: LexicalEditor) {
  useWailsEvent(CODE_BLOCK_DISPLAY_DATA, (body) => {
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

export function useCodeBlockInputRequest(editor: LexicalEditor) {
  useWailsEvent(CODE_BLOCK_INPUT_REQUEST, (body) => {
    logger.event(CODE_BLOCK_INPUT_REQUEST, body);
    const data = body.data as {
      messageId: string;
      prompt: string | null;
      password: boolean | null;
    };
    const [codeBlockId, executionId] = data.messageId.split('|');
    updateCodeBlock(
      editor,
      codeBlockId,
      (codeNode) => {
        codeNode.setInputPrompt(
          {
            prompt: data.prompt ?? '',
            isPassword: data.password ?? false,
          },
          editor
        );
      },
      executionId
    );
  });
}

export function useSendInputReplyMutation(
  codeBlockId: string,
  kernelInstanceId: string | null
) {
  return useMutation({
    mutationFn: async ({
      executionId,
      value,
    }: {
      executionId: string;
      value: string;
    }) => {
      if (!kernelInstanceId) {
        throw new QueryError('No kernel instance bound to this code block');
      }
      const res = await SendInputReply(
        kernelInstanceId,
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
 * Send an execute_request. Resolves (language, noteId) on the backend to a
 * kernel instance (creating it if necessary, or returning ErrNoIdleKernelToEvict
 * if the per-language pool is full and no idle kernel can be evicted). On success
 * the resolved kernel instance id is written back onto the CodeNode so future
 * control calls (interrupt, shutdown) can target the same instance.
 */
export function useSendExecuteRequestMutation({
  noteId,
  codeBlockId,
  language,
  setStatus,
  editor,
}: {
  noteId: string;
  codeBlockId: string;
  language: Languages;
  setStatus: (status: CodeBlockStatus) => void;
  editor: LexicalEditor;
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
        noteId,
        codeBlockId,
        newExecutionId,
        language,
        code
      );
      if (!res.success) {
        setStatus('idle');
        throw new QueryError(res.message);
      }
      const instanceId = res.data?.kernelInstanceId;
      if (instanceId) {
        editor.update(() => {
          const codeNodes = $nodesOfType(CodeNode);
          const node = codeNodes.find((n) => n.getId() === codeBlockId);
          node?.setKernelInstanceId?.(instanceId, editor);
        });
      }
    },
  });
}

export function useSendInterruptRequestMutation(onSuccess?: () => void) {
  const instances = useAtomValue(kernelInstancesAtom);
  return useMutation({
    mutationFn: async ({
      kernelInstanceId,
      codeBlockId,
      newExecutionId,
    }: {
      kernelInstanceId: string | null;
      codeBlockId: string;
      newExecutionId: string;
    }) => {
      if (!kernelInstanceId) return;
      const inst = instances[kernelInstanceId];
      if (!inst || inst.heartbeat !== 'success') return;

      const res = await SendInterruptRequest(
        kernelInstanceId,
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
 * Shut down a single kernel instance by id.
 */
export function useShutdownKernelMutation() {
  return useMutation({
    mutationFn: async ({
      kernelInstanceId,
      restart,
    }: {
      kernelInstanceId: string;
      restart: boolean;
    }) => {
      const res = await ShutdownKernel(kernelInstanceId, restart);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}

/**
 * Ensure a kernel exists for (noteId, language) without sending an execute_request.
 * Used by the bottom-bar "turn on kernel" button.
 */
export function useEnsureKernelMutation() {
  return useMutation({
    mutationFn: async ({
      noteId,
      language,
    }: {
      noteId: string;
      language: LanguagesWithKernels;
    }) => {
      const res = await EnsureKernel(noteId, language);
      if (!res.success) {
        throw new QueryError(res.message);
      }
      return res.data?.kernelInstanceId ?? null;
    },
  });
}

/**
 * Hook that updates Python venv settings and shuts down all active python kernels
 * so they pick up the new interpreter on next launch.
 */
type pythonVenvMutationParams = {
  formData: FormData;
  setErrorText: Dispatch<SetStateAction<string>>;
};

export function usePythonVenvSubmitMutation(projectSettings: ProjectSettings) {
  const { mutateAsync: updateProjectSettings } =
    useUpdateProjectSettingsMutation();

  return useMutation({
    mutationFn: async (variables: pythonVenvMutationParams) => {
      const { formData } = variables;
      const selectedVenvPath = formData.get('venv-path-option');
      const customVenvPathValue = formData.get('custom-venv-path-value');
      if (typeof selectedVenvPath !== 'string' || !selectedVenvPath) {
        throw new Error('No virtual environment path provided');
      }

      const check = await IsPathAValidVirtualEnvironment(selectedVenvPath);
      if (!check.success) {
        throw new Error(check.message);
      }
      let newCustomVenvPaths = projectSettings.code.customPythonVenvPaths;
      if (
        typeof customVenvPathValue === 'string' &&
        customVenvPathValue !== '' &&
        selectedVenvPath === customVenvPathValue
      ) {
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

      // Tear down every existing python kernel; they will be recreated on next execute.
      await ShutdownKernelsByLanguage('python');
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
