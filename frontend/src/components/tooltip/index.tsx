import {
  useState,
  Children,
  cloneElement,
  type ReactNode,
  type ReactElement,
  type Ref,
  type RefObject,
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
import { cn } from '../../utils/string-formatting';
import { motion, AnimatePresence } from 'motion/react';
import { easingFunctions } from '../../animations';
import { TooltipArrow } from './tooltip-arrow';

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
  root,
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
  root?: HTMLElement | RefObject<HTMLElement | null> | null;
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(
    Boolean(defaultOpen)
  );
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (disabled) return;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null);

  const {
    refs,
    floatingStyles,
    context,
    middlewareData,
    placement: currentPlacement,
  } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      withArrow ? arrowMiddleware({ element: arrowElement }) : undefined,
    ].filter(Boolean),
  });

  const hover = useHover(context, { move: false, enabled: !disabled, delay });
  const focus = useFocus(context, { enabled: !disabled });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const childWithRef = Children.only(children) as ReactElement & {
    ref?: Ref<unknown>;
  };
  const mergedRef = useMergeRefs([refs.setReference, childWithRef.ref]);
  function setFloatingRef(node: HTMLElement | null) {
    refs.setFloating(node);
  }

  function handleArrowRef(node: HTMLDivElement | null) {
    if (arrowElement !== node) {
      setArrowElement(node);
    }
  }
  const reference = cloneElement(
    childWithRef,
    getReferenceProps({
      ref: mergedRef,
      ...(childWithRef.props || {}),
      // Allow tooltips on disabled buttons by forwarding events to a wrapper if needed.
    })
  );

  const side = currentPlacement.split('-')[0] as
    | 'top'
    | 'right'
    | 'bottom'
    | 'left';

  // Arrow should be on opposite side of tooltip
  const arrowSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[side] as 'top' | 'right' | 'bottom' | 'left';

  // Determine animation direction based on side
  const isHorizontal = side === 'left' || side === 'right';
  const animationOffset = 12.5;
  const animationAxis = isHorizontal ? 'x' : 'y';
  const animationDirection = isHorizontal
    ? side === 'right'
      ? -1
      : 1
    : side === 'bottom'
      ? -1
      : 1;

  const animationVariants = {
    initial: {
      opacity: 0,
      [animationAxis]: animationOffset * animationDirection,
    },
    animate: {
      opacity: 1,
      [animationAxis]: 0,
    },
    exit: {
      opacity: 0,
      [animationAxis]: animationOffset * animationDirection,
    },
  };

  return (
    <>
      {reference}
      <FloatingPortal root={root}>
        <AnimatePresence>
          {open && !disabled && (
            <div
              ref={setFloatingRef}
              style={floatingStyles}
              {...getFloatingProps()}
              data-side={side}
              className={cn(
                'z-1000 pointer-events-none select-none max-w-xs',
                className
              )}
            >
              <motion.div
                className="relative rounded-md px-2 py-1.5 text-sm shadow-md border bg-zinc-50 dark:bg-zinc-750 border-zinc-300 dark:border-zinc-600 whitespace-pre-wrap wrap-break-word z-50"
                style={{ overflow: 'visible' }}
                role="tooltip"
                initial={animationVariants.initial}
                animate={animationVariants.animate}
                exit={animationVariants.exit}
                transition={{ ease: easingFunctions['ease-out-quint'] }}
              >
                {content}
                {withArrow && (
                  <TooltipArrow
                    ref={handleArrowRef}
                    side={side}
                    middlewareData={middlewareData}
                    arrowSide={arrowSide}
                  />
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
};

Tooltip.displayName = 'Tooltip';
