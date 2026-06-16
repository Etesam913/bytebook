import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components';
import { UNSAFE_PortalProvider } from '@react-aria/overlays';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { Maximize } from '../../icons/maximize';
import { Minimize } from '../../icons/minimize';
import { HorizontalDots } from '../../icons/horizontal-dots';
import { SquareTerminal } from '../../icons/square-terminal';
import { Subtitles } from '../../icons/subtitles';
import { AppMenu, AppMenuItem, AppMenuPopover, AppMenuTrigger } from '../menu';
import { Tooltip } from '../tooltip';
import { PlayButton } from './play-button';
import type {
  CodeBlockExecutionProps,
  CodeBlockIdentityProps,
  CodeBlockShellProps,
} from './types';
import { languagesWithKernelsSet } from '../../types';
import { routeUrls } from '../../utils/routes';
import { navigate } from 'wouter/use-browser-location';
import { Trash } from '../../icons/trash';
import { removeDecoratorNode } from '../../utils/commands';
import { cn } from '../../utils/string-formatting';

export function CodeActions({
  identity,
  execution,
  shell,
  isSelected,
}: {
  identity: CodeBlockIdentityProps;
  execution: CodeBlockExecutionProps;
  shell: CodeBlockShellProps;
  isSelected?: boolean;
}) {
  const {
    lexicalEditor,
    codeMirrorInstance,
    isExpanded,
    setIsExpanded,
    hideResults,
    setHideResults,
    dialogRef,
  } = shell;
  const { id, nodeKey, language } = identity;
  const { status, setStatus, kernelInstanceId } = execution;

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
    {
      id: isExpanded ? 'minimize' : 'maximize',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          {isExpanded ? (
            <Minimize height="1.125rem" width="1.125rem" />
          ) : (
            <Maximize height="1.125rem" width="1.125rem" />
          )}
          {isExpanded ? 'Minimize' : 'Maximize'}
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
      case 'maximize': {
        setIsExpanded(true);
        break;
      }
      case 'minimize': {
        setIsExpanded(false);
        break;
      }
      case 'delete': {
        lexicalEditor.update(() => {
          removeDecoratorNode(nodeKey);
        });
        break;
      }
    }
  }

  return (
    <div
      className={cn(
        'absolute flex gap-1 z-10 p-1 border border-zinc-200 dark:border-zinc-600 rounded-md shadow-lg bg-white dark:bg-zinc-750',
        isExpanded ? 'top-2 right-2' : '-top-5 right-1.5',
        'group-hover:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 transition-opacity',
        isSelected ? 'opacity-100' : 'opacity-0'
      )}
    >
      {!hideResults && language !== 'text' && (
        <PlayButton
          codeBlockId={id}
          codeMirrorInstance={codeMirrorInstance}
          language={language}
          status={status}
          setStatus={setStatus}
          isExpanded={isExpanded}
          dialogRef={dialogRef}
          kernelInstanceId={kernelInstanceId}
        />
      )}
      {isExpanded && (
        <Tooltip content="Minimize" placement="bottom" root={tooltipRoot}>
          <MotionIconButton onClick={() => setIsExpanded(false)}>
            <Minimize
              className="will-change-transform"
              height="1.125rem"
              width="1.125rem"
            />
          </MotionIconButton>
        </Tooltip>
      )}
      <AppMenuTrigger>
        <Tooltip
          content="More actions"
          placement={isExpanded ? 'bottom' : 'top'}
          root={tooltipRoot}
        >
          <Button
            aria-label="More actions"
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
        {isExpanded && dialogRef ? (
          <UNSAFE_PortalProvider
            getContainer={() => dialogRef.current ?? document.body}
          >
            <AppMenuPopover className="w-48" placement="bottom end">
              <AppMenu onAction={handleAction}>
                {items.map((item) => (
                  <AppMenuItem key={item.id} id={item.id}>
                    {item.label}
                  </AppMenuItem>
                ))}
              </AppMenu>
            </AppMenuPopover>
          </UNSAFE_PortalProvider>
        ) : (
          <AppMenuPopover className="w-48" placement="bottom end">
            <AppMenu onAction={handleAction}>
              {items.map((item) => (
                <AppMenuItem key={item.id} id={item.id}>
                  {item.label}
                </AppMenuItem>
              ))}
            </AppMenu>
          </AppMenuPopover>
        )}
      </AppMenuTrigger>
    </div>
  );
}
