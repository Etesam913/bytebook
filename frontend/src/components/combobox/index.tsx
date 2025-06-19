import { forwardRef, useRef, useState } from 'react';
import type {
  Dispatch,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SetStateAction,
} from 'react';
import { useOnClickOutside } from '../../hooks/general';
import type { DropdownItem } from '../../types';
import { cn } from '../../utils/string-formatting';

interface InputProps {
  label?: string;
  labelProps: LabelHTMLAttributes<HTMLLabelElement>;
  inputProps: InputHTMLAttributes<HTMLInputElement> & {
    setState: Dispatch<SetStateAction<string>>;
  };
  items: DropdownItem[];
}

export const Combobox = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelProps, inputProps, items }, ref) => {
    const {
      className: inputClassName,
      onKeyDown,
      onChange,
      setState,
      id,
      ...restInputProps
    } = inputProps;
    const {
      className: labelClassName,
      htmlFor,
      ...restLabelProps
    } = labelProps;
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const comboboxRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(comboboxRef, () => setIsOpen(false));

    const dropdownItems =
      items.length > 0
        ? items.map(({ value, label }, i) => (
            <button
              role="menuitem"
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseLeave={() => setSelectedIndex(-1)}
              onClick={() => {
                setIsOpen(false);
                setState(value);
              }}
              key={value}
              type="button"
              className={cn(
                'w-full px-1.5 py-0.5 text-left rounded-md',
                selectedIndex === i && 'bg-zinc-150 dark:bg-zinc-600'
              )}
            >
              {label}
            </button>
          ))
        : null;

    const dropdownItemsLength = dropdownItems?.length ?? 0;

    return (
      <div className="flex flex-1" ref={comboboxRef}>
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
          id={id}
          onFocus={() => setIsOpen(true)}
          ref={ref}
          maxLength={75}
          className={cn(
            'bg-zinc-150 dark:bg-zinc-700 py-1 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 focus-visible:border-transparent!',
            inputClassName
          )}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (isOpen) {
                e.stopPropagation();
              }
              setIsOpen(false);
            } else if (e.key === 'ArrowDown') {
              setSelectedIndex((prev) => {
                const nextElement = prev + 1;
                if (nextElement < dropdownItemsLength) return nextElement;
                return 0;
              });
            } else if (e.key === 'ArrowUp') {
              setSelectedIndex((prev) => {
                const nextElement = prev - 1;
                if (nextElement >= 0) return nextElement;
                return dropdownItemsLength - 1;
              });
            } else if (e.key === 'Enter') {
              setIsOpen(false);
              if (isOpen && selectedIndex !== -1) {
                setState(items[selectedIndex].value);
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }
            onKeyDown?.(e);
          }}
          onChange={(e) => {
            setIsOpen(true);
            setSelectedIndex(-1);
            onChange?.(e);
          }}
          {...restInputProps}
        />

        {isOpen && dropdownItems && (
          <menu className="absolute z-40 w-full translate-y-9 overflow-hidden rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-700 flex flex-col gap-0.5 px-[4.5px] py-[6px]">
            {dropdownItems}
          </menu>
        )}
      </div>
    );
  }
);

Combobox.displayName = 'Combobox';
