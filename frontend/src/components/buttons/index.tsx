import { motion } from 'motion/react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/string-formatting';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { className, children, ...restOfProps } = props;

  return (
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
});
Button.displayName = 'Button';

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { className, children, ...restOfProps } = props;

  return (
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
});
IconButton.displayName = 'IconButton';

export const MotionButton = motion.create(Button);
export const MotionIconButton = motion.create(IconButton);
