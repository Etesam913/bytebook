import type { ReactElement, ReactNode, RefObject } from 'react';
import { UNSAFE_PortalProvider } from '@react-aria/overlays';
import {
  Focusable,
  OverlayArrow,
  Tooltip as RACTooltip,
  TooltipTrigger,
} from 'react-aria-components';
import { cn } from '../../utils/string-formatting';

type Placement = 'top' | 'bottom' | 'left' | 'right';

type LegacyDelay = number | { open?: number; close?: number };

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = { open: 250, close: 100 },
  disabled = false,
  withArrow = true,
  className,
  root,
}: {
  content: ReactNode;
  children: ReactElement;
  placement?: Placement;
  delay?: LegacyDelay;
  disabled?: boolean;
  withArrow?: boolean;
  className?: string;
  /** Optional portal container. Pass an element ref to render the tooltip inside that element (e.g. inside an open dialog). */
  root?: HTMLElement | RefObject<HTMLElement | null> | null;
}) {
  const openDelay = typeof delay === 'number' ? delay : (delay.open ?? 250);
  const closeDelay = typeof delay === 'number' ? 0 : (delay.close ?? 0);

  const trigger = (
    <TooltipTrigger
      delay={openDelay}
      closeDelay={closeDelay}
      isDisabled={disabled}
    >
      <Focusable>
        {children as Parameters<typeof Focusable>[0]['children']}
      </Focusable>
      <RACTooltip
        placement={placement}
        offset={8}
        className={(renderProps) => {
          const { isEntering, isExiting, placement: actualPlacement } =
            renderProps;
          return cn(
            'group rounded-md px-2 py-1.5 text-sm shadow-md border bg-zinc-50 dark:bg-zinc-750 border-zinc-300 dark:border-zinc-600 whitespace-pre-wrap break-words max-w-xs z-1000 outline-none will-change-transform transition',
            isEntering && 'duration-150 ease-out',
            isExiting && 'duration-75 ease-in',
            (isEntering || isExiting) && 'opacity-0',
            isEntering && actualPlacement === 'top' && 'translate-y-1',
            isEntering && actualPlacement === 'bottom' && '-translate-y-1',
            isEntering && actualPlacement === 'left' && 'translate-x-1',
            isEntering && actualPlacement === 'right' && '-translate-x-1',
            className
          );
        }}
      >
        {withArrow && (
          <OverlayArrow>
            <svg
              width={10}
              height={10}
              viewBox="0 0 10 10"
              className="block fill-zinc-50 dark:fill-zinc-750 stroke-zinc-300 dark:stroke-zinc-600 group-data-[placement=bottom]:rotate-180 group-data-[placement=left]:-rotate-90 group-data-[placement=right]:rotate-90"
            >
              <path d="M0 0 L5 5 L10 0" />
            </svg>
          </OverlayArrow>
        )}
        {content}
      </RACTooltip>
    </TooltipTrigger>
  );

  if (root) {
    const getContainer = () => {
      if (root instanceof HTMLElement) return root;
      return root.current ?? document.body;
    };
    return (
      <UNSAFE_PortalProvider getContainer={getContainer}>
        {trigger}
      </UNSAFE_PortalProvider>
    );
  }

  return trigger;
}

Tooltip.displayName = 'Tooltip';
