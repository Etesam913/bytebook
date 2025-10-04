import { motion } from 'motion/react';
import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/string-formatting';
import Tooltip, { type TooltipProps } from '../tooltip';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tooltip?: ReactNode;
    tooltipProps?: Omit<Partial<TooltipProps>, 'content' | 'children'>;
  }
>((props, ref) => {
  const { className, children, tooltip, tooltipProps, ...restOfProps } = props;

  const buttonEl = (
    <button
      ref={ref}
      className={cn(
        'bg-zinc-50 dark:bg-zinc-700 rounded-md text-left p-[6px] border-[1.25px] border-zinc-300 dark:border-zinc-600 ) flex gap-x-1.5 items-center disabled:bg-opacity-75 select-none will-change-transform',
        className
      )}
      type="button"
      {...restOfProps}
    >
      {children}
    </button>
  );

  return tooltip ? (
    <Tooltip content={tooltip} {...tooltipProps}>
      {buttonEl}
    </Tooltip>
  ) : (
    buttonEl
  );
});
Button.displayName = 'Button';

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tooltip?: ReactNode;
    tooltipProps?: Omit<Partial<TooltipProps>, 'content' | 'children'>;
  }
>((props, ref) => {
  const { className, children, tooltip, tooltipProps, ...restOfProps } = props;

  const buttonEl = (
    <button
      ref={ref}
      className={cn(
        'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700  rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform',
        className
      )}
      type="button"
      {...restOfProps}
    >
      {children}
    </button>
  );

  return tooltip ? (
    <Tooltip content={tooltip} {...tooltipProps}>
      {buttonEl}
    </Tooltip>
  ) : (
    buttonEl
  );
});
IconButton.displayName = 'IconButton';

export const MotionButton = motion(Button);
export const MotionIconButton = motion(IconButton);
