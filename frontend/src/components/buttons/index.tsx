import { motion } from 'motion/react';
import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/string-formatting';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: React.Ref<HTMLButtonElement>;
};

export const Button = (props: ButtonProps) => {
  const { className, children, ref, ...restOfProps } = props;

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
};

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: React.Ref<HTMLButtonElement>;
};

export const IconButton = (props: IconButtonProps) => {
  const { className, children, ref, ...restOfProps } = props;

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
};

export const MotionButton = motion(Button);
export const MotionIconButton = motion(IconButton);
