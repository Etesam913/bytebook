import { forwardRef } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '../../utils/string-formatting';

interface InputProps {
  label?: string;
  labelProps: LabelHTMLAttributes<HTMLLabelElement>;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelProps, inputProps }, ref) => {
    const { className: inputClassName, id, ...restInputProps } = inputProps;
    const {
      className: labelClassName,
      htmlFor,
      ...restLabelProps
    } = labelProps;
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
        <input
          ref={ref}
          id={id}
          maxLength={75}
          className={cn(
            'bg-zinc-150 dark:bg-zinc-700 py-1 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 focus-visible:border-transparent!',
            inputClassName
          )}
          {...restInputProps}
        />
      </>
    );
  }
);

Input.displayName = 'Input';
