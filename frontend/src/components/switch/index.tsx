import type { ReactNode } from 'react';
import { Switch, type SwitchProps } from 'react-aria-components';
import { motion } from 'motion/react';
import { cn } from '../../utils/string-formatting';

interface AppSwitchProps extends SwitchProps {
  children?: ReactNode;
  className?: string;
}

export function AppSwitch({ className, children, ...props }: AppSwitchProps) {
  return (
    <Switch
      {...props}
      className={cn(
        'flex items-center gap-2 group',
        typeof className === 'string' ? className : undefined
      )}
    >
      {({
        isSelected,
        isDisabled,
      }: {
        isSelected: boolean;
        isDisabled: boolean;
      }) => (
        <>
          <div
            style={{ justifyContent: isSelected ? 'flex-end' : 'flex-start' }}
            className={cn(
              'flex items-center w-11 h-6 shrink-0 rounded-full px-1 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:ring-(--accent-color)',
              isSelected
                ? 'bg-(--accent-color)'
                : 'bg-gray-200 dark:bg-gray-600',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <motion.div
              layout
              transition={{
                type: 'spring',
                visualDuration: 0.2,
                bounce: 0.35,
              }}
              className="bg-white w-4 h-4 rounded-full"
            />
          </div>
          {children}
        </>
      )}
    </Switch>
  );
}
