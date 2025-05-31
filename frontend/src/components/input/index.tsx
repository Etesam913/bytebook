import { forwardRef } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '../../utils/string-formatting';

interface InputProps {
  label?: string;
  labelProps: LabelHTMLAttributes<HTMLLabelElement>;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  clearable?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelProps, inputProps, clearable = false }, ref) => {
    const {
      className: inputClassName,
      id,
      value,
      onChange,
      ...restInputProps
    } = inputProps;
    const {
      className: labelClassName,
      htmlFor,
      ...restLabelProps
    } = labelProps;

    const handleClear = () => {
      if (onChange) {
        const syntheticEvent = {
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const showClearButton = clearable && value && String(value).length > 0;

    return (
      <>
        {label && (
          <label
            htmlFor={htmlFor}
            className={cn(
              'text-sm cursor-pointer pb-2 text-zinc-500 dark:text-zinc-300',
              labelClassName
            )}
            {...restLabelProps}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            maxLength={75}
            value={value}
            onChange={onChange}
            className={cn(
              'bg-zinc-150 dark:bg-zinc-700 py-1 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 focus-visible:border-transparent! w-full',
              clearable && 'pr-8',
              inputClassName
            )}
            {...restInputProps}
          />
          {showClearButton && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 focus:outline-none focus:text-zinc-600 dark:focus:text-zinc-300"
              aria-label="Clear input"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </>
    );
  }
);

Input.displayName = 'Input';
