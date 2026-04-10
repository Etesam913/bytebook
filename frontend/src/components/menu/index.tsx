import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Menu,
  MenuItem,
  type MenuItemProps,
  type MenuProps,
  MenuTrigger,
  type MenuTriggerProps,
  Popover,
  type PopoverProps,
} from 'react-aria-components';
import { cn } from '../../utils/string-formatting';

const SPRING_TRANSITION = {
  type: 'spring',
  damping: 22,
  stiffness: 200,
} as const;

/** Wrapper around React Aria's `MenuTrigger` that manages open/close state for an `AppMenuPopover`. */
export function AppMenuTrigger(props: MenuTriggerProps) {
  return <MenuTrigger {...props} />;
}

/** Animated popover container for menu content. Uses a spring height animation by default; pass `skipAnimation` to render children immediately. */
export function AppMenuPopover({
  className,
  children,
  skipAnimation,
  ...props
}: PopoverProps & { children: ReactNode; skipAnimation?: boolean }) {
  return (
    <Popover
      {...props}
      className={({ isEntering, isExiting }) =>
        cn(
          'rounded-md border-[0.078125rem] border-zinc-300 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-700 overflow-hidden',
          // CSS opacity transition keeps Popover mounted during exit
          'transition-opacity',
          (isEntering || isExiting) && 'duration-500',
          isExiting && 'opacity-0',
          className
        )
      }
    >
      {skipAnimation
        ? children
        : ({ isExiting }) => (
            <motion.div
              initial={{ height: 0 }}
              animate={{
                height: isExiting ? 0 : 'auto',
                transition: SPRING_TRANSITION,
              }}
            >
              {children}
            </motion.div>
          )}
    </Popover>
  );
}

/** Styled menu list that holds `AppMenuItem` children. Renders inside an `AppMenuPopover`. */
export function AppMenu<T extends object>({
  className,
  ...props
}: MenuProps<T>) {
  return (
    <Menu
      {...props}
      className={cn(
        'flex flex-col overflow-y-auto overflow-x-hidden px-[0.28125rem] py-1.5 gap-0.5 outline-hidden text-sm',
        className
      )}
    />
  );
}

/** A single menu option with focus and selection styling. */
export function AppMenuItem({
  className,
  ...props
}: MenuItemProps & { children?: ReactNode }) {
  return (
    <MenuItem
      {...props}
      className={({ isFocused, isSelected }) =>
        cn(
          'outline-hidden focus-visible:ring-0 rounded-md w-full px-1.5 py-0.5 text-left whitespace-nowrap text-nowrap text-ellipsis overflow-hidden flex cursor-default',
          isFocused && 'bg-(--accent-color) text-white',
          !isFocused && isSelected && 'bg-zinc-150 dark:bg-zinc-600',
          typeof className === 'string' ? className : undefined
        )
      }
    />
  );
}
