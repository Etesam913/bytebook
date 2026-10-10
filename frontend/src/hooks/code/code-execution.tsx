import { useAtomValue } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { $nodesOfType, LexicalEditor } from 'lexical';
import {
  SendExecuteRequest,
  SendInputReply,
  SendInterruptRequest,
} from '@bindings/services/codeservice';
import { kernelInstancesAtom } from '@/atoms';
import { CodeBlockStatus, Languages } from '@/types';
import { CodeNode } from '@components/editor/nodes/code';
import { getBackendResponseData, QueryError } from '@utils/query';

// Sends a user-typed input reply to the kernel in response to an input_request prompt.
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
      await getBackendResponseData(
        SendInputReply(kernelInstanceId, codeBlockId, executionId, value)
      );
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

// Sends an interrupt request to the kernel bound to a code block, stopping any running execution.
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

      // Must reject: resolving here would run onSuccess and flip the code block
      // to idle while the kernel is still executing.
      await getBackendResponseData(
        SendInterruptRequest(kernelInstanceId, codeBlockId, newExecutionId)
      );
    },
    onSuccess,
  });
}
