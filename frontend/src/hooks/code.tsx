import { useSetAtom } from 'jotai';
import { CodeNode } from '../components/editor/nodes/code';
import { useWailsEvent } from './events';
import { kernelsDataAtom } from '../atoms';
import {
  isValidKernelLanguage,
  KernelHeartbeatStatus,
  KernelStatus,
  Languages,
} from '../types';
import { useMutation } from '@tanstack/react-query';
import {
  IsPathAValidVirtualEnvironment,
  SendExecuteRequest,
  SendInterruptRequest,
} from '../../bindings/github.com/etesam913/bytebook/services/codeservice';
import { QueryError } from '../utils/query';
import { $nodesOfType, LexicalEditor } from 'lexical';
import { FormEvent } from 'react';

export function useKernelStatus() {
  const setKernelsData = useSetAtom(kernelsDataAtom);

  useWailsEvent('code:kernel:status', (body) => {
    console.info('code:kernel:status');
    const data = body.data as {
      status: KernelStatus;
      language: Languages;
    }[];
    if (data.length === 0) return;
    const language = data[0].language;
    const status = data[0].status;
    if (isValidKernelLanguage(language)) {
      setKernelsData((prev) => ({
        ...prev,
        [language]: { ...prev[language], status: status },
      }));
    }
  });
}

export function useCodeBlockStatus(editor: LexicalEditor) {
  useWailsEvent('code:code-block:status', (body) => {
    console.info('code:code-block:status');

    const data = body.data as {
      status: KernelStatus;
      messageId: string;
    }[];
    if (data.length === 0) return;
    const [codeBlockId] = data[0].messageId.split(':');
    updateCodeBlock(editor, codeBlockId, (codeNode) => {
      codeNode.setStatus(data[0].status, editor);
    });
  });
}

export function useKernelShutdown() {
  const setKernelsData = useSetAtom(kernelsDataAtom);

  useWailsEvent('code:kernel:shutdown_reply', (body) => {
    console.info('code:kernel:shutdown_reply');
    const data = body.data as {
      status: string;
      language: Languages;
    }[];
    if (data.length === 0) return;
    const language = data[0].language;
    const status = data[0].status;
    if (isValidKernelLanguage(language) && status === 'success') {
      setKernelsData((prev) => ({
        ...prev,
        [language]: {
          status: 'idle',
          heartbeat: 'failure',
        },
      }));
    } else if (status === 'error') {
      throw new QueryError('Kernel shutdown failed');
    }
  });
}

export function useKernelHeartbeat() {
  const setKernelsData = useSetAtom(kernelsDataAtom);

  useWailsEvent('code:kernel:heartbeat', (body) => {
    console.info('code:kernel:heartbeat');
    const data = body.data as {
      status: KernelHeartbeatStatus;
      language: Languages;
    }[];
    if (data.length === 0) return;
    const language = data[0].language;
    const kernelHeartbeatStatus = data[0].status;
    setKernelsData((prev) => ({
      ...prev,
      [language]: { ...prev[language], heartbeat: kernelHeartbeatStatus },
    }));
  });
}

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
        codeNodeToUpdate.setLastExecutedResult('', editor);
      }
      callback(codeNodeToUpdate);
    }
  });
}

export function useCodeBlockExecuteReply(editor: LexicalEditor) {
  useWailsEvent('code:code-block:execute-reply', (body) => {
    console.info('code:code-block:execute-reply');
    const data = body.data as (
      | { status: 'ok'; messageId: string }
      | {
          status: 'error';
          messageId: string;
          errorValue: string;
          errorTraceback: string[];
          errorName: string;
        }
    )[];
    if (data[0].status === 'error') {
      const cleanedTraceback = data[0].errorTraceback
        .map((trace) => `<div>${trace}</div>`)
        .join('');
      const [codeBlockId, executionId] = data[0].messageId.split(':');
      updateCodeBlock(
        editor,
        codeBlockId,
        (codeNode) => {
          codeNode.setTracebackResult(cleanedTraceback, editor);
        },
        executionId
      );
      console.error(
        `Error executing code: ${data[0].errorName} - ${data[0].errorValue}\n${cleanedTraceback}`
      );
    }
  });
}

export function useCodeBlockStream(editor: LexicalEditor) {
  useWailsEvent('code:code-block:stream', (body) => {
    console.info('code:code-block:stream');
    const data = body.data as {
      messageId: string;
      name: 'stdout' | 'stderr';
      text: string;
    }[];
    const [codeBlockId, executionId] = data[0].messageId.split(':');
    updateCodeBlock(
      editor,
      codeBlockId,
      (codeNode) => {
        codeNode.setStreamResult(data[0].text, editor);
      },
      executionId
    );
  });
}

export function useSendExecuteRequestMutation(
  codeBlockId: string,
  language: Languages
) {
  return useMutation({
    mutationFn: async ({
      code,
      newExecutionId,
    }: {
      code: string;
      newExecutionId: string;
    }) => {
      const res = await SendExecuteRequest(
        codeBlockId,
        newExecutionId,
        language,
        code
      );
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}

export function useSendInterruptRequestMutation(onSuccess?: () => void) {
  return useMutation({
    mutationFn: async ({
      codeBlockId,
      newExecutionId,
    }: {
      codeBlockId: string;
      newExecutionId: string;
    }) => {
      const res = await SendInterruptRequest(codeBlockId, newExecutionId);
      if (!res.success) throw new QueryError(res.message);
    },
    onSuccess,
  });
}

/**
 * Hook for validating and submitting a Python virtual environment path.
 * Uses React Query's useMutation to handle the validation process.
 *
 * @returns A mutation object that can be used to validate Python virtual environments
 */
export function usePythonVirtualEnvironmentSubmit() {
  return useMutation({
    mutationFn: async ({
      e,
      setErrorText,
    }: {
      e: FormEvent<HTMLFormElement>;
      setErrorText: (error: string) => void;
    }) => {
      // Getting the selected virtual env from the form and checking if it is valid
      const formData = new FormData(e.target as HTMLFormElement);
      const entries = Array.from(formData.entries());
      const selectedVirtualEnvironmentElement = entries.at(0);

      if (selectedVirtualEnvironmentElement) {
        const venvPath = selectedVirtualEnvironmentElement[1];
        try {
          const isVenvPathValid = await IsPathAValidVirtualEnvironment(
            venvPath as string
          );
          if (isVenvPathValid.success) {
            setErrorText('');
            return true;
          }
          throw new Error(isVenvPathValid.message);
        } catch (error) {
          if (error instanceof Error) {
            setErrorText(error.message);
          }
          return false;
        }
      }
      return false;
    },
  });
}
