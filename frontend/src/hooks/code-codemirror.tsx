import { logger } from '../utils/logging';
import { hoverTooltip, type Tooltip } from '@codemirror/view';
import { Browser } from '@wailsio/runtime';
import { toast } from 'sonner';
import { SendInspectRequest } from '../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { Languages } from '../types';
import { CODE_BLOCK_INSPECT_REPLY } from '../utils/events';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { useWailsEvent } from './events';

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
  useWailsEvent(CODE_BLOCK_INSPECT_REPLY, (body) => {
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
