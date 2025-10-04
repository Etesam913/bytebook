import {
  useState,
  useRef,
  Children,
  cloneElement,
  type ReactNode,
  type ReactElement,
  type Ref,
  type CSSProperties,
} from 'react';
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
  type Delay,
} from '@floating-ui/react';

export const Tooltip = ({
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
}: {
  content: ReactNode;
  children: ReactElement;
  placement?: Placement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  delay?: Delay;
  className?: string;
  withArrow?: boolean;
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(Boolean(defaultOpen));
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (disabled) return;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const arrowRef = useRef<HTMLDivElement | null>(null);

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

  const child = Children.only(children) as ReactElement & { ref?: Ref<unknown> };
  const mergedRef = useMergeRefs([refs.setReference, (child as any).ref]);
  const reference = cloneElement(child, getReferenceProps({
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
            className={`z-[1000] pointer-events-none select-none max-w-xs${className ? ` ${className}` : ''}`}
          >
            <div
              className={
                'rounded-md px-2 py-1.5 text-sm leading-snug shadow-md border ' +
                'bg-zinc-900 text-zinc-50 border-zinc-700 ' +
                'dark:bg-zinc-800 dark:text-zinc-50 dark:border-zinc-700 ' +
                'whitespace-pre-wrap break-words'
              }
              role="tooltip"
            >
              {content}
              {withArrow && (
                <div
                  ref={arrowRef}
                  className={'absolute w-2.5 h-2.5 rotate-45 bg-zinc-900 border border-zinc-700 border-t-transparent border-l-transparent dark:bg-zinc-800 dark:border-zinc-700'}
                  style={{
                    left: middlewareData.arrow?.x != null ? `${middlewareData.arrow.x}px` : '',
                    top: middlewareData.arrow?.y != null ? `${middlewareData.arrow.y}px` : '',
                    [side]: '-5px',
                  } as CSSProperties}
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
