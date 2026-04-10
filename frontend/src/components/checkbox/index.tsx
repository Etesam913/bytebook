import { Checkbox, type CheckboxProps } from 'react-aria-components';
import { cn } from '../../utils/string-formatting';

/** Styled checkbox with support for selected, indeterminate, and disabled states. */
export function AppCheckbox({ className, children, ...props }: CheckboxProps) {
  return (
    <Checkbox
      {...props}
      className={cn(
        'flex items-center gap-1.5 group text-sm',
        typeof className === 'string' ? className : undefined
      )}
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <div
            className={cn(
              'w-4 h-4 shrink-0 rounded-sm border flex items-center justify-center transition',
              isSelected || isIndeterminate
                ? 'bg-(--accent-color) border-(--accent-color)'
                : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
            )}
          >
            {isIndeterminate ? (
              <svg
                viewBox="0 0 18 18"
                aria-hidden="true"
                className="w-3 h-3 fill-white stroke-none"
              >
                <rect x={1} y={7.5} width={16} height={3} />
              </svg>
            ) : isSelected ? (
              <svg
                viewBox="0 0 18 18"
                aria-hidden="true"
                className="w-3 h-3 fill-none stroke-white stroke-[3px]"
              >
                <polyline points="2 9 7 14 16 4" />
              </svg>
            ) : null}
          </div>
          {children}
        </>
      )}
    </Checkbox>
  );
}
