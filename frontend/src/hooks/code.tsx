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

function updateCodeBlock(
  editor: LexicalEditor,
  codeBlockId: string,
  executionId: string,
  callback: (codeNodeToUpdate: CodeNode) => void
) {
  editor.update(() => {
    const codeNodes = $nodesOfType(CodeNode);
    const codeNodeToUpdate = codeNodes.find(
      (node) => node.getId() === codeBlockId
    );
    if (codeNodeToUpdate) {
      console.log(executionId, codeNodeToUpdate.getExecutionId());
      // This is a fresh execution, so it does not have a result
      if (executionId !== codeNodeToUpdate.getExecutionId()) {
        codeNodeToUpdate.setExecutionId(executionId, editor);
        codeNodeToUpdate.setLastExecutedResult('', editor);
      }
      callback(codeNodeToUpdate);
      // codeNodeToUpdate.setTracebackResult(cleanedTraceback, editor);
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
      updateCodeBlock(editor, codeBlockId, executionId, (codeNode) => {
        codeNode.setTracebackResult(cleanedTraceback, editor);
      });
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
    updateCodeBlock(editor, codeBlockId, executionId, (codeNode) => {
      codeNode.setStreamResult(data[0].text, editor);
    });
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
        throw new QueryError('Failed to execute code');
      }
    },
  });
}
