import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes, ButtonHTMLAttributes, ChangeEvent } from 'react';
import { cn } from '../../utils/string-formatting';

interface InputProps {
  label?: string;
  labelProps?: LabelHTMLAttributes<HTMLLabelElement>;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  clearable?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  invalid?: boolean;
  clearButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    labelProps = {}, 
    inputProps, 
    clearable = false, 
    error,
    helperText,
    required = false,
    invalid = false,
    clearButtonProps = {},
  }, ref) => {
    const {
      className: inputClassName,
      id: inputId,
      value,
      onChange,
      'aria-describedby': ariaDescribedBy,
      ...restInputProps
    } = inputProps;
    
    const {
      className: labelClassName,
      htmlFor,
      ...restLabelProps
    } = labelProps || { className: undefined, htmlFor: undefined };

    const {
      className: clearButtonClassName,
      ...restClearButtonProps
    } = clearButtonProps || { className: undefined };

    // Generate unique IDs for accessibility
    const generatedId = useId();
    const inputIdFinal = inputId || generatedId;
    const labelId = `${inputIdFinal}-label`;
    const helperTextId = `${inputIdFinal}-helper`;
    const errorId = `${inputIdFinal}-error`;
    
    // Build aria-describedby string
    const describedBy = [
      ariaDescribedBy,
      helperText ? helperTextId : null,
      error ? errorId : null,
    ].filter(Boolean).join(' ');

    const isInvalid = invalid || !!error;
    const hasValue = value !== undefined && value !== null && value !== '';

    const handleClear = () => {
      if (onChange) {
        const syntheticEvent = {
          target: { value: '' },
        } as ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="flex flex-col">
        {label && (
          <label
            id={labelId}
            htmlFor={inputIdFinal}
            className={cn(
              'text-sm cursor-pointer pb-2 text-zinc-500 dark:text-zinc-300',
              required && 'after:content-["*"] after:ml-1 after:text-red-500',
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
            id={inputIdFinal}
            maxLength={75}
            value={value}
            onChange={onChange}
            required={required}
            aria-invalid={isInvalid}
            aria-required={required}
            aria-describedby={describedBy || undefined}
            className={cn(
              'bg-zinc-150 dark:bg-zinc-700 py-1 px-2 rounded-md border-2 w-full transition-colors',
              'border-zinc-300 dark:border-zinc-600',
              'focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800',
              isInvalid && 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-200 dark:focus:ring-red-800',
              clearable && 'pr-8',
              inputClassName
            )}
            {...restInputProps}
          />
          {clearable && hasValue && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear input"
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800',
                clearButtonClassName
              )}
              {...restClearButtonProps}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-zinc-500 dark:text-zinc-400"
                aria-hidden="true"
              >
                <path
                  d="M9 3L3 9M3 3L9 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
        {helperText && !error && (
          <p
            id={helperTextId}
            className="text-xs text-zinc-500 dark:text-zinc-400 mt-1"
          >
            {helperText}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            className="text-xs text-red-500 dark:text-red-400 mt-1"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
