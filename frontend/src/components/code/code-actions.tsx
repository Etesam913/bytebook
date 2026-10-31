import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components/Button';
import { MotionIconButton } from '@components/buttons';
import { Duplicate2 } from '@/icons/duplicate-2';
import { Maximize } from '@/icons/maximize';
import { Minimize } from '@/icons/minimize';
import { HorizontalDots } from '@/icons/horizontal-dots';
import {
  AppMenu,
  AppMenuItem,
  AppMenuPopover,
  AppMenuTrigger,
} from '@components/menu';
import { Tooltip } from '@components/tooltip';
import type { CodeBlockIdentityProps, CodeBlockShellProps } from './types';
import { Trash } from '@/icons/trash';
import { removeDecoratorNode } from '@utils/commands';
import { cn } from '@utils/string-formatting';
import { UNSAFE_PortalProvider } from '@react-aria/overlays';

export function CodeActions({
  identity,
  shell,
  isSelected,
}: {
  identity: CodeBlockIdentityProps;
  shell: CodeBlockShellProps;
  isSelected?: boolean;
}) {
  const {
    lexicalEditor,
    codeMirrorInstance,
    isExpanded,
    expandCodeBlock,
    collapseCodeBlock,
    dialogRef,
  } = shell;
  const { nodeKey } = identity;

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
      data-drag-ghost-exclude
      className={cn(
        'absolute flex gap-1 z-10 p-1 border border-zinc-200 dark:border-zinc-600 rounded-md shadow-lg bg-white dark:bg-zinc-750',
        isExpanded ? 'top-2 right-2' : '-top-5 right-1.5',
        'group-hover:opacity-100 focus-within:opacity-100 has-aria-expanded:opacity-100 transition-opacity',
        isSelected ? 'opacity-100' : 'opacity-0'
      )}
    >
      <Tooltip
        content={isExpanded ? 'Minimize' : 'Maximize'}
        placement={isExpanded ? 'bottom' : 'top'}
        root={tooltipRoot}
        className="[font-family:var(--app-font-family)]"
      >
        <MotionIconButton
          aria-label={isExpanded ? 'Minimize' : 'Maximize'}
          onPress={isExpanded ? collapseCodeBlock : expandCodeBlock}
        >
          {isExpanded ? (
            <Minimize
              className="will-change-transform"
              height="1.125rem"
              width="1.125rem"
            />
          ) : (
            <Maximize
              className="will-change-transform"
              height="1.125rem"
              width="1.125rem"
            />
          )}
        </MotionIconButton>
      </Tooltip>
      <AppMenuTrigger>
        <Tooltip
          content="More actions"
          placement={isExpanded ? 'bottom' : 'top'}
          root={tooltipRoot}
          className="[font-family:var(--app-font-family)]"
        >
          <Button
            aria-label="More actions"
            className={({ isHovered, isPressed }) =>
              cn(
                'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 aria-expanded:bg-zinc-100 dark:aria-expanded:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform outline-hidden transition-transform',
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
            <AppMenuPopover
              className="w-32 [font-family:var(--app-font-family)]"
              placement="bottom end"
            >
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
          <AppMenuPopover
            className="w-32 [font-family:var(--app-font-family)]"
            placement="bottom end"
          >
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
