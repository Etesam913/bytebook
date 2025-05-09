import { InputHTMLAttributes, JSX } from 'react';
import { cn } from '../../utils/string-formatting';

interface RadioButtonProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /**
   * If you pass `checked`, this becomes a controlled radio.
   * Otherwise it’s uncontrolled and toggles itself via defaultChecked.
   */
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
        // only set checked if defined, otherwise let `defaultChecked` in `rest` handle it
        {...(checked !== undefined ? { checked } : {})}
        {...rest}
        className="sr-only peer"
      />

      <span
        className={cn(
          'w-4 h-4 border-2 rounded-full flex-shrink-0 mr-2 flex justify-center items-center',
          'border-zinc-500 peer-checked:border-(--accent-color)',
          'peer-focus:ring-1 peer-focus:ring-(--accent-color)',
          checked && 'border-(--accent-color)',
          'peer-checked:[&>span]:opacity-100'
        )}
      >
        <span
          className={cn(
            'w-2 h-2 bg-(--accent-color) rounded-full transition-opacity duration-200',
            'opacity-0 peer-checked:opacity-100',
            checked && '!opacity-100'
          )}
        />
      </span>

      <span {...labelProps}>{label}</span>
    </label>
  );
}
