import { InputHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/string-formatting';
import { motion } from 'motion/react';

interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showStatus?: boolean;
}

export function Toggle({
  label,
  showStatus = false,
  disabled = false,
  checked = false,
  ...inputProps
}: ToggleProps) {
  // eslint-disable-next-line react-hooks/react-compiler
  'use no memo';
  const generatedId = useId();
  const inputId = `toggle-${generatedId}`;

  const mergedInputProps = {
    ...inputProps,
    id: inputId,
    type: 'checkbox' as const,
    role: 'switch' as const,
    'aria-checked': checked,
    'aria-label': !label ? inputProps['aria-label'] : undefined,
    checked,
    disabled,
    className: 'sr-only focus-visible:outline-none',
  };

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center',
          !disabled && 'cursor-pointer'
        )}
      >
        <input {...mergedInputProps} />
        <div
          aria-hidden="true"
          style={{ justifyContent: checked ? 'flex-end' : 'flex-start' }}
          className={cn(
            'flex items-center w-11 h-6 rounded-full transition-colors duration-200 ease-in-out px-1 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-(--accent-color)',
            checked ? 'bg-(--accent-color)' : 'bg-gray-200 dark:bg-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <motion.div
            layout
            transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.35 }}
            className="bg-white w-4 h-4 rounded-full"
          />
        </div>
        {label && (
          <span className="ml-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {label}
          </span>
        )}
        {showStatus && (
          <span className="ml-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {checked ? 'On' : 'Off'}
          </span>
        )}
      </label>
    </div>
  );
}
