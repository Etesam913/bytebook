import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { Button, type ButtonProps } from 'react-aria-components';
import { cn } from '../../utils/string-formatting';

/** Props shared between React DOM events and motion that have incompatible signatures. */
type ConflictingDOMProps =
  | 'onAnimationStart'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd';

function stripConflictingProps(
  domProps: React.JSX.IntrinsicElements['button']
): Omit<React.JSX.IntrinsicElements['button'], ConflictingDOMProps> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onAnimationStart, onDrag, onDragStart, onDragEnd, ...rest } =
    domProps;
  return rest;
}

/** Motion-specific props that get forwarded to motion.button via the render prop. */
type MotionOwnProps = Omit<
  HTMLMotionProps<'button'>,
  ConflictingDOMProps | keyof React.JSX.IntrinsicElements['button']
>;

const MOTION_KEYS: ReadonlySet<string> = new Set<keyof MotionOwnProps>([
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
  'whileDrag',
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'layout',
  'layoutId',
]);

function splitMotionProps(allProps: Record<string, unknown>): {
  motionProps: Record<string, unknown>;
  buttonProps: Record<string, unknown>;
} {
  const motionProps: Record<string, unknown> = {};
  const buttonProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(allProps)) {
    if (MOTION_KEYS.has(key)) {
      motionProps[key] = value;
    } else {
      buttonProps[key] = value;
    }
  }
  return { motionProps, buttonProps };
}

type MotionButtonProps = ButtonProps &
  MotionOwnProps & {
    children?: ReactNode;
  };

/** Transparent icon-only button with hover/focus background. */
export function AppIconButton({
  className,
  ...props
}: ButtonProps & { children?: ReactNode }) {
  return (
    <Button
      {...props}
      className={cn(
        'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform',
        typeof className === 'string' ? className : undefined
      )}
    />
  );
}

/** Motion-animated styled button. Accepts motion props like whileHover, whileTap, initial, animate, etc. */
export function MotionButton({ className, ...allProps }: MotionButtonProps) {
  const { motionProps, buttonProps } = splitMotionProps(
    allProps as unknown as Record<string, unknown>
  );
  return (
    <Button
      {...(buttonProps as ButtonProps)}
      className={cn(
        'bg-zinc-50 dark:bg-zinc-700 rounded-md text-left p-[6px] border-[1.25px] border-zinc-300 dark:border-zinc-600 flex gap-x-1.5 items-center disabled:bg-opacity-75 select-none will-change-transform',
        typeof className === 'string' ? className : undefined
      )}
      render={(domProps) => (
        <motion.button
          {...stripConflictingProps(domProps)}
          {...(motionProps as MotionOwnProps)}
        />
      )}
    />
  );
}

/** Motion-animated icon button. Accepts motion props like whileHover, whileTap, initial, animate, etc. */
export function MotionIconButton({
  className,
  ...allProps
}: MotionButtonProps) {
  const { motionProps, buttonProps } = splitMotionProps(
    allProps as unknown as Record<string, unknown>
  );
  return (
    <Button
      {...(buttonProps as ButtonProps)}
      className={cn(
        'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform',
        typeof className === 'string' ? className : undefined
      )}
      render={(domProps) => (
        <motion.button
          {...stripConflictingProps(domProps)}
          {...(motionProps as MotionOwnProps)}
        />
      )}
    />
  );
}
