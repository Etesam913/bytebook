import { type RefObject } from 'react';
import { MotionIconButton } from '../../buttons';
import { ChevronDown } from '../../../icons/chevron-down';
import { getDefaultButtonVariants } from '../../../animations';

export function TableActionsPlugin({
  ref,
}: {
  ref: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <MotionIconButton
      {...getDefaultButtonVariants({
        disabled: false,
        whileHover: 1.075,
        whileTap: 0.95,
        whileFocus: 1.075,
      })}
      className="absolute p-0.75 top-0 border border-zinc-200 dark:border-zinc-700 right-0 mt-1 mr-1 z-10 bg-zinc-50 dark:bg-zinc-750"
      ref={ref}
    >
      <ChevronDown strokeWidth="2px" />
    </MotionIconButton>
  );
}
