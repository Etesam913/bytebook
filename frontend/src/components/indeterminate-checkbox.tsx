import { InputHTMLAttributes, useEffect, useRef } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean;
}

export function Checkbox({ indeterminate = false, ...props }: CheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  // Determine aria-checked value based on indeterminate state
  const ariaChecked = indeterminate ? 'mixed' : props.checked;

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      {...props}
      aria-checked={ariaChecked}
    />
  );
}
