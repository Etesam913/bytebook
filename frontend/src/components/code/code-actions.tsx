import { type RefObject } from 'react';
import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components';
import { MotionIconButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { Duplicate2 } from '../../icons/duplicate-2';
import { Maximize } from '../../icons/maximize';
import { Minimize } from '../../icons/minimize';
import { HorizontalDots } from '../../icons/horizontal-dots';
import { SquareTerminal } from '../../icons/square-terminal';
import { Subtitles } from '../../icons/subtitles';
import { AppMenu, AppMenuItem, AppMenuPopover, AppMenuTrigger } from '../menu';
import { Tooltip } from '../tooltip';
import type { CodeMirrorRef } from './types';
import { languagesWithKernelsSet, type Languages } from '../../types';
import { routeUrls } from '../../utils/routes';
import { navigate } from 'wouter/use-browser-location';
import { Trash } from '../../icons/trash';
import { removeDecoratorNode } from '../../utils/commands';
import type { LexicalEditor } from 'lexical';
import { cn } from '../../utils/string-formatting';

export function CodeActions({
  editor,
  codeMirrorInstance,
  isExpanded,
  setIsExpanded,
  hideResults,
  setHideResults,
  language,
  nodeKey,
  dialogRef,
}: {
  editor: LexicalEditor;
  codeMirrorInstance: CodeMirrorRef;
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  hideResults: boolean;
  setHideResults: (value: boolean) => void;
  language: Languages;
  nodeKey: string;
  dialogRef?: RefObject<HTMLDialogElement | null>;
}) {
  const canShowKernelInfo =
    language !== 'text' && languagesWithKernelsSet.has(language);

  const tooltipRoot = isExpanded && dialogRef ? dialogRef : undefined;

  const items = [
    {
      id: 'copy-code',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Duplicate2 height="1.125rem" width="1.125rem" /> Copy Code
        </span>
      ),
    },
    ...(canShowKernelInfo
      ? [
          {
            id: 'kernel-info',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <SquareTerminal height="1.125rem" width="1.125rem" /> Kernel
                Info
              </span>
            ),
          },
        ]
      : []),
    {
      id: hideResults ? 'show-results' : 'hide-results',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Subtitles height="18" width="18" />
          {hideResults ? 'Show Results' : 'Hide Results'}
        </span>
      ),
    },
    {
      id: 'delete',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash height="1.125rem" width="1.125rem" /> Delete
        </span>
      ),
    },
  ];

  function handleAction(key: Key) {
    switch (key) {
      case 'copy-code': {
        if (!codeMirrorInstance?.view) break;
        const editorContent = codeMirrorInstance.view.state.doc.toString();
        if (!editorContent) break;
        void navigator.clipboard.writeText(editorContent);
        break;
      }
      case 'kernel-info': {
        if (!canShowKernelInfo) break;
        navigate(routeUrls.kernel(language));
        break;
      }
      case 'hide-results': {
        setHideResults(true);
        break;
      }
      case 'show-results': {
        setHideResults(false);
        break;
      }
      case 'delete': {
        editor.update(() => {
          removeDecoratorNode(nodeKey);
        });
        break;
      }
    }
  }

  return (
    <div
      className={cn(
        'absolute flex gap-1 -top-5 right-2.5 z-10 p-1 border border-zinc-200 dark:border-zinc-600 rounded-md shadow-lg bg-white dark:bg-zinc-750',
        isExpanded && 'top-2 right-2'
      )}
    >
      {hideResults && (
        <Tooltip content="Delete" placement="bottom" root={tooltipRoot}>
          <MotionIconButton
            onClick={() => {
              editor.update(() => {
                removeDecoratorNode(nodeKey);
              });
            }}
          >
            <Trash
              className="will-change-transform"
              height="1.1875rem"
              width="1.1875rem"
            />
          </MotionIconButton>
        </Tooltip>
      )}
      <Tooltip
        content={isExpanded ? 'Minimize' : 'Maximize'}
        placement="top"
        root={tooltipRoot}
      >
        <MotionIconButton
          {...getDefaultButtonVariants({
            disabled: false,
            whileHover: 1.05,
            whileTap: 0.975,
            whileFocus: 1.05,
          })}
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? <Minimize /> : <Maximize />}
        </MotionIconButton>
      </Tooltip>
      <AppMenuTrigger>
        <Tooltip
          content="Code settings"
          placement={isExpanded ? 'bottom' : 'top'}
          root={tooltipRoot}
        >
          <Button
            aria-label="Code block settings menu"
            className={({ isHovered, isPressed }) =>
              cn(
                'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform outline-hidden transition-transform',
                isHovered && 'scale-105',
                isPressed && 'scale-[0.975]'
              )
            }
          >
            <HorizontalDots height="1.125rem" width="1.125rem" />
          </Button>
        </Tooltip>
        <AppMenuPopover className="w-48">
          <AppMenu onAction={handleAction}>
            {items.map((item) => (
              <AppMenuItem key={item.id} id={item.id}>
                {item.label}
              </AppMenuItem>
            ))}
          </AppMenu>
        </AppMenuPopover>
      </AppMenuTrigger>
    </div>
  );
}
