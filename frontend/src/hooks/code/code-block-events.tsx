import { LexicalEditor, $nodesOfType } from 'lexical';
import { CodeNode } from '@components/editor/nodes/code';
import { logger } from '@utils/logging';
import { useWailsEvent } from '@hooks/events';
import {
  CODE_BLOCK_DISPLAY_DATA,
  CODE_BLOCK_EXECUTE_INPUT,
  CODE_BLOCK_EXECUTE_RESULT,
  CODE_BLOCK_INPUT_REQUEST,
  CODE_BLOCK_IOPUB_ERROR,
  CODE_BLOCK_STATUS,
  CODE_BLOCK_STREAM,
  KERNEL_INSTANCE_EXITED,
  KERNEL_INSTANCE_LAUNCH_ERROR,
  KERNEL_INSTANCE_SHUTDOWN,
} from '@utils/events';
import { isKernelStatus } from './kernels';

// Message ids are "<codeBlockId>|<executionId>"; the execution id is absent on some messages.
function parseCodeBlockMessageId(messageId: string) {
  const [codeBlockId, executionId] = messageId.split('|');
  return { codeBlockId, executionId };
}

/**
 * Updates a code block node in the editor.
 */
function updateCodeBlock({
  editor,
  codeBlockId,
  callback,
  executionId,
}: {
  editor: LexicalEditor;
  codeBlockId: string;
  callback: (codeNodeToUpdate: CodeNode) => void;
  executionId?: string;
}) {
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
 * Routes kernel messages to the matching code block nodes in the editor, and
 * resets nodes bound to a kernel that went away. Mounted once from CodePlugin.
 */
export function useCodeBlockEvents(editor: LexicalEditor) {
  // Listens for kernel status messages and updates the matching code block's status and duration.
  useWailsEvent(CODE_BLOCK_STATUS, (body) => {
    logger.event(CODE_BLOCK_STATUS);
    const data = body.data;
    if (!isKernelStatus(data.status)) return;
    const status = data.status;
    const { codeBlockId } = parseCodeBlockMessageId(data.messageId);
    updateCodeBlock({
      editor,
      codeBlockId,
      callback: (codeNode) => {
        codeNode.setStatus(status, editor);
        codeNode.setDuration(data.duration, editor);
      },
    });
  });

  // Writes execute_result output into the matching code block node.
  useWailsEvent(CODE_BLOCK_EXECUTE_RESULT, (body) => {
    logger.event(CODE_BLOCK_EXECUTE_RESULT);
    const data = body.data;
    const { codeBlockId, executionId } = parseCodeBlockMessageId(
      data.messageId
    );
    const executionResultContent: string[] = [];
    for (const content of Object.values(data.data)) {
      if (content !== undefined) {
        executionResultContent.push(content);
      }
    }
    updateCodeBlock({
      editor,
      codeBlockId,
      callback: (codeNode) => {
        codeNode.setExecutionResult(executionResultContent.join('\n'), editor);
      },
      executionId,
    });
  });

  // Updates the execution count on the matching code block node.
  useWailsEvent(CODE_BLOCK_EXECUTE_INPUT, (body) => {
    logger.event(CODE_BLOCK_EXECUTE_INPUT);
    const data = body.data;
    const { codeBlockId, executionId } = parseCodeBlockMessageId(
      data.messageId
    );
    updateCodeBlock({
      editor,
      codeBlockId,
      callback: (codeNode) => {
        codeNode.setExecutionCount(data.executionCount, editor);
      },
      executionId,
    });
  });

  // Appends stdout/stderr text to the matching code block's stream result.
  useWailsEvent(CODE_BLOCK_STREAM, (body) => {
    logger.event(CODE_BLOCK_STREAM);
    const data = body.data;
    const { codeBlockId, executionId } = parseCodeBlockMessageId(
      data.messageId
    );
    updateCodeBlock({
      editor,
      codeBlockId,
      callback: (codeNode) => {
        codeNode.setExecutionResult(data.text, editor);
      },
      executionId,
    });
  });

  // Sets the traceback/error output on the matching code block node.
  useWailsEvent(CODE_BLOCK_IOPUB_ERROR, (body) => {
    logger.event(CODE_BLOCK_IOPUB_ERROR, body);
    const data = body.data;
    const { codeBlockId, executionId } = parseCodeBlockMessageId(
      data.messageId
    );
    updateCodeBlock({
      editor,
      codeBlockId,
      callback: (codeNode) => {
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
      executionId,
    });
  });

  // Sets rich display output (e.g. images, HTML) on the matching code block node.
  useWailsEvent(CODE_BLOCK_DISPLAY_DATA, (body) => {
    const data = body.data;
    const { codeBlockId, executionId } = parseCodeBlockMessageId(
      data.messageId
    );
    const displayData: Record<string, string> = {};
    for (const [mimeType, content] of Object.entries(data.data)) {
      if (content !== undefined) {
        displayData[mimeType] = content;
      }
    }
    updateCodeBlock({
      editor,
      codeBlockId,
      callback: (codeNode) => {
        codeNode.setDisplayResult(displayData, editor);
      },
      executionId,
    });
  });

  // Sets a prompt on the matching code block so the user can type a response.
  useWailsEvent(CODE_BLOCK_INPUT_REQUEST, (body) => {
    logger.event(CODE_BLOCK_INPUT_REQUEST, body);
    const data = body.data;
    const { codeBlockId, executionId } = parseCodeBlockMessageId(
      data.messageId
    );
    updateCodeBlock({
      editor,
      codeBlockId,
      callback: (codeNode) => {
        codeNode.setInputPrompt(
          {
            prompt: data.prompt,
            isPassword: data.password,
          },
          editor
        );
      },
      executionId,
    });
  });

  // A code block bound to a kernel that went away is reset to idle and unbound.
  const resetBoundCodeNodes = (instanceId: string) =>
    resetCodeNodesForInstance(editor, instanceId);

  useWailsEvent(KERNEL_INSTANCE_SHUTDOWN, (body) =>
    resetBoundCodeNodes(body.data.id)
  );
  useWailsEvent(KERNEL_INSTANCE_EXITED, (body) =>
    resetBoundCodeNodes(body.data.id)
  );
  useWailsEvent(KERNEL_INSTANCE_LAUNCH_ERROR, (body) =>
    resetBoundCodeNodes(body.data.id)
  );
}
