import { EditorState, type Extension } from '@codemirror/state';
import type {
  Completion,
  CompletionContext,
  CompletionResult as CodeMirrorCompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete';
import { SendCompleteRequest } from '../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { Completion as LSPCompletion } from '../../bindings/github.com/etesam913/bytebook/internal/services/lspservice';
import type { CompletionItem as LSPCompletionItem } from '../../bindings/github.com/etesam913/bytebook/internal/lsp/models';
import type { Languages } from '../types';
import { CODE_BLOCK_COMPLETE_REPLY } from '../utils/events';
import { useWailsEvent } from './events';

type KernelCompletionPayload = {
  status: string;
  messageId: string;
  matches: string[];
  cursorStart: number;
  cursorEnd: number;
  metadata: Record<string, unknown>;
};

type CompletionInputs = {
  language: Languages;
  noteId: string;
  blockId: string;
  blockOrder: number;
  kernelInstanceId: string | null;
  executionId: string;
};

const COMPLETION_DEADLINE_MS = 300;
const KERNEL_CLEANUP_MS = 3000;

const pendingCompletions = new Map<
  string,
  (data: KernelCompletionPayload) => void
>();

function lspKindToCodeMirrorType(kind?: number): Completion['type'] {
  switch (kind) {
    case undefined:
      return 'text';
    case 2:
      return 'method';
    case 3:
    case 4:
      return 'function';
    case 5:
    case 10:
      return 'property';
    case 6:
      return 'variable';
    case 7:
      return 'class';
    case 8:
      return 'interface';
    case 9:
      return 'namespace';
    case 13:
      return 'enum';
    case 14:
      return 'keyword';
    case 21:
      return 'constant';
    case 22:
    case 25:
      return 'type';
    default:
      return 'text';
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(fallback), ms);
    promise
      .then(resolve)
      .catch(() => resolve(fallback))
      .finally(() => clearTimeout(timeout));
  });
}

function getCompletionRange(ctx: CompletionContext) {
  const token = ctx.matchBefore(/[\w.]*$/);
  if (!token) return null;
  if (token.from === token.to && !ctx.explicit) return null;

  const dotIndex = token.text.lastIndexOf('.');
  const from = dotIndex >= 0 ? token.from + dotIndex + 1 : token.from;
  const objectPrefix = dotIndex >= 0 ? token.text.slice(0, dotIndex + 1) : '';

  return {
    from,
    to: token.to,
    objectPrefix,
    validFor: /^[\w.]*$/,
  };
}

function normalizeKernelLabel(label: string, objectPrefix: string) {
  if (objectPrefix && label.startsWith(objectPrefix)) {
    return label.slice(objectPrefix.length);
  }
  return label;
}

function lspItemToCompletion(item: LSPCompletionItem): Completion {
  return {
    label: item.label,
    apply: item.insertText || item.label,
    detail: item.detail,
    info: item.documentation,
    type: lspKindToCodeMirrorType(item.kind),
    boost: 20,
  };
}

async function getLSPCompletions({
  noteId,
  blockId,
  blockOrder,
  source,
  line,
  col,
}: {
  noteId: string;
  blockId: string;
  blockOrder: number;
  source: string;
  line: number;
  col: number;
}): Promise<Completion[]> {
  const res = await LSPCompletion(
    noteId,
    blockId,
    blockOrder,
    source,
    line,
    col
  );
  if (!res.success || !res.data?.available) return [];
  return res.data.items.map(lspItemToCompletion);
}

async function getKernelCompletions({
  kernelInstanceId,
  blockId,
  executionId,
  source,
  cursorPos,
  objectPrefix,
}: {
  kernelInstanceId: string | null;
  blockId: string;
  executionId: string;
  source: string;
  cursorPos: number;
  objectPrefix: string;
}): Promise<Completion[]> {
  if (!kernelInstanceId) return [];

  const res = await SendCompleteRequest(
    kernelInstanceId,
    blockId,
    executionId,
    source,
    cursorPos
  );
  const messageId = res.data?.messageId;
  if (!res.success || !messageId) return [];

  return new Promise((resolve) => {
    let settled = false;

    pendingCompletions.set(messageId, (payload) => {
      pendingCompletions.delete(messageId);
      if (settled) return;
      settled = true;

      if (payload.status !== 'ok') {
        resolve([]);
        return;
      }

      resolve(
        payload.matches
          .map((match) => normalizeKernelLabel(match, objectPrefix))
          .filter(Boolean)
          .map(
            (label): Completion => ({
              label,
              detail: 'runtime',
              type: 'property',
              boost: -10,
            })
          )
      );
    });

    setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve([]);
    }, COMPLETION_DEADLINE_MS);

    setTimeout(() => {
      pendingCompletions.delete(messageId);
    }, KERNEL_CLEANUP_MS);
  });
}

function mergeCompletionItems(
  lspItems: Completion[],
  kernelItems: Completion[]
): Completion[] {
  const merged = new Map<string, Completion>();
  for (const item of lspItems) {
    merged.set(item.label, item);
  }
  for (const item of kernelItems) {
    if (!merged.has(item.label)) {
      merged.set(item.label, item);
    }
  }
  return [...merged.values()];
}

function buildCompletionSource({
  language,
  noteId,
  blockId,
  blockOrder,
  kernelInstanceId,
  executionId,
}: CompletionInputs): CompletionSource {
  return async (ctx) => {
    if (language !== 'python' || !noteId) return null;

    const range = getCompletionRange(ctx);
    if (!range) return null;

    const source = ctx.state.doc.toString();
    const line = ctx.state.doc.lineAt(ctx.pos);
    const lineIndex = line.number - 1;
    const col = ctx.pos - line.from;

    const [lspItems, kernelItems] = await Promise.all([
      withTimeout(
        getLSPCompletions({
          noteId,
          blockId,
          blockOrder,
          source,
          line: lineIndex,
          col,
        }),
        COMPLETION_DEADLINE_MS,
        []
      ),
      withTimeout(
        getKernelCompletions({
          kernelInstanceId,
          blockId,
          executionId,
          source,
          cursorPos: ctx.pos,
          objectPrefix: range.objectPrefix,
        }),
        COMPLETION_DEADLINE_MS,
        []
      ),
    ]);

    const options = mergeCompletionItems(lspItems, kernelItems);
    if (options.length === 0) return null;

    return {
      from: range.from,
      to: range.to,
      options,
      validFor: range.validFor,
    } satisfies CodeMirrorCompletionResult;
  };
}

export function useCompletionExtension({
  language,
  noteId,
  blockId,
  blockOrder,
  kernelInstanceId,
  executionId,
}: CompletionInputs): Extension {
  useWailsEvent(CODE_BLOCK_COMPLETE_REPLY, (body) => {
    const data = body.data as KernelCompletionPayload[];
    const completionData = data[0];
    if (!completionData?.messageId) return;

    pendingCompletions.get(completionData.messageId)?.(completionData);
  });

  const source = buildCompletionSource({
    language,
    noteId,
    blockId,
    blockOrder,
    kernelInstanceId,
    executionId,
  });
  return EditorState.languageData.of(() => [{ autocomplete: source }]);
}
