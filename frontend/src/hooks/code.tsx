import { useSetAtom } from 'jotai';
import { CodeNode, Languages } from '../components/editor/nodes/code';
import { useWailsEvent } from './events';
import { goKernelStatusAtom, pythonKernelStatusAtom } from '../atoms';
import { KernelStatus } from '../types';
import { useMutation } from '@tanstack/react-query';
import { SendExecuteRequest } from '../../bindings/github.com/etesam913/bytebook/services/codeservice';
import { QueryError } from '../utils/query';
import { $nodesOfType, LexicalEditor } from 'lexical';

export function useKernelStatus() {
  const setPythonKernelStatus = useSetAtom(pythonKernelStatusAtom);
  const setGoKernelStatus = useSetAtom(goKernelStatusAtom);
  useWailsEvent('code:kernel:status', (body) => {
    console.info('code:kernel:status');
    const data = body.data as {
      status: KernelStatus;
      language: Languages;
    }[];
    if (data.length === 0) return;
    if (data[0].language === 'python') {
      setPythonKernelStatus(data[0].status);
    } else if (data[0].language === 'go') {
      setGoKernelStatus(data[0].status);
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
      console.log(data[0].errorTraceback);
      const cleanedTraceback = data[0].errorTraceback
        .map((trace) => `<div>${trace}</div>`)
        .join('');
      editor.update(() => {
        const codeNodes = $nodesOfType(CodeNode);
        const codeNodeToUpdate = codeNodes.find(
          (node) => node.getId() === data[0].messageId
        );
        if (codeNodeToUpdate) {
          codeNodeToUpdate.setLastExecutedResult(cleanedTraceback, editor);
        }
      });
      console.error(
        `Error executing code: ${data[0].errorName} - ${data[0].errorValue}\n${cleanedTraceback}`
      );
    }
  });
}

export function useSendExecuteRequestMutation(
  codeBlockId: string,
  language: Languages
) {
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await SendExecuteRequest(codeBlockId, language, code);
      if (!res.success) {
        throw new QueryError('Failed to execute code');
      }
    },
  });
}
