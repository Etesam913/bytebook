import { useRef } from 'react';
import { logger } from '../utils/logging';
import type {
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import { hoverTooltip, Tooltip } from '@uiw/react-codemirror';
import { Browser } from '@wailsio/runtime';
import { toast } from 'sonner';
import {
  SendCompleteRequest,
  SendInspectRequest,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import {
  CompletionData,
  Languages,
  PythonCompletionMetadata,
  RawCompletionData,
} from '../types';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { useWailsEvent } from './events';

/**
 * Creates a completion source function for code autocompletion.
 *
 * @param id - The ID of the code block
 * @param executionId - The execution ID for the completion request
 * @param pendingCompletions - Map to store pending completion promises by messageId
 * @param COMPLETION_TIMEOUT - Timeout duration in ms before abandoning completion request (default: 3000)
 * @returns An async completion source function that handles code completion requests
 */
export function useCompletionSource({
  id,
  executionId,
  language,
  pendingCompletions,
  COMPLETION_TIMEOUT = 3000,
}: {
  id: string;
  executionId: string;
  language: Languages;
  pendingCompletions: Map<string, (data: CompletionData) => void>;
  COMPLETION_TIMEOUT?: number;
}) {
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

export function useInspectTooltip({
  language,
  id,
  executionId,
  pendingInspections,
}: {
  language: Languages;
  id: string;
  executionId: string;
  pendingInspections: Map<string, (data: HoverTooltipData) => void>;
}) {
  useWailsEvent('code:code-block:inspect_reply', (body) => {
    logger.event('code:code-block:inspect_reply', body);
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
