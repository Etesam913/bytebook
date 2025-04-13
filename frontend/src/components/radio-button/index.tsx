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
    <label className="flex items-center">
      <input type="radio" checked={checked} {...rest} className="hidden" />
      <span
        className={cn(
          'w-4 h-4 border-2 rounded-full flex-shrink-0 mr-2 flex justify-center items-center',
          checked ? 'border-(--accent-color)' : 'border-zinc-500'
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
