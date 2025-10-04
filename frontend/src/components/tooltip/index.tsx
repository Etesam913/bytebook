import React from 'react';
import {
  autoUpdate,
  offset,
  flip,
  shift,
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  useMergeRefs,
  arrow as arrowMiddleware,
  type Placement,
} from '@floating-ui/react';

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: Placement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  delay?: number | { open?: number; close?: number };
  className?: string;
  withArrow?: boolean;
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  disabled = false,
  delay = { open: 250, close: 100 },
  className,
  withArrow = true,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(Boolean(defaultOpen));
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (disabled) return;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const arrowRef = React.useRef<HTMLDivElement | null>(null);

  const { refs, floatingStyles, context, middlewareData, placement: currentPlacement } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      withArrow ? arrowMiddleware({ element: arrowRef }) : undefined,
    ].filter(Boolean),
  });

  const hover = useHover(context, { move: false, enabled: !disabled, delay });
  const focus = useFocus(context, { enabled: !disabled });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  const mergedRef = useMergeRefs([refs.setReference, (children as any).ref]);

  const child = React.Children.only(children);
  const reference = React.cloneElement(child, getReferenceProps({
    ref: mergedRef,
    ...child.props,
    // Allow tooltips on disabled buttons by forwarding events to a wrapper if needed.
  }));

  const side = currentPlacement.split('-')[0] as 'top' | 'right' | 'bottom' | 'left';

  return (
    <>
      {reference}
      <FloatingPortal>
        {open && !disabled && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            data-side={side}
            className={[
              'z-[1000] pointer-events-none select-none',
              'max-w-xs',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              className={[
                'rounded-md px-2 py-1.5 text-sm leading-snug shadow-md border',
                'bg-zinc-900 text-zinc-50 border-zinc-700',
                'dark:bg-zinc-800 dark:text-zinc-50 dark:border-zinc-700',
                'whitespace-pre-wrap break-words',
              ].join(' ')}
              role="tooltip"
            >
              {content}
              {withArrow && (
                <div
                  ref={arrowRef}
                  className={[
                    'absolute w-2.5 h-2.5 rotate-45',
                    'bg-zinc-900 border border-zinc-700 border-t-transparent border-l-transparent',
                    'dark:bg-zinc-800 dark:border-zinc-700',
                  ].join(' ')}
                  style={{
                    left: middlewareData.arrow?.x != null ? `${middlewareData.arrow.x}px` : '',
                    top: middlewareData.arrow?.y != null ? `${middlewareData.arrow.y}px` : '',
                    [side]: '-5px',
                  } as React.CSSProperties}
                />
              )}
            </div>
          </div>
        )}
      </FloatingPortal>
    </>
  );
};

Tooltip.displayName = 'Tooltip';

export default Tooltip;
