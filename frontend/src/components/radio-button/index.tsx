import { InputHTMLAttributes, JSX } from 'react';
import { cn } from '../../utils/string-formatting';

interface RadioButtonProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  checked?: boolean;
  labelProps?: React.HTMLAttributes<HTMLLabelElement>;
}

export function RadioButton({
  label,
  checked,
  labelProps,
  ...rest
}: RadioButtonProps): JSX.Element {
  return (
    <label className="flex items-center cursor-pointer">
      <input
        type="radio"
        checked={checked}
        {...rest}
        // Using sr-only keeps the input accessible
        className="sr-only peer"
      />
      <span
        className={cn(
          'w-4 h-4 border-2 rounded-full flex-shrink-0 mr-2 flex justify-center items-center',
          checked ? 'border-(--accent-color)' : 'border-zinc-500',
          // Add a focus ring when the input is focused via keyboard
          'peer-focus:ring-2 peer-focus:ring-(--accent-color)'
        )}
      >
        <span
          className={cn(
            'w-2 h-2 bg-(--accent-color) rounded-full transition-opacity duration-200',
            checked ? 'opacity-100' : 'opacity-0'
          )}
        />
      </span>
      <span {...labelProps}>{label}</span>
    </label>
  );
}
