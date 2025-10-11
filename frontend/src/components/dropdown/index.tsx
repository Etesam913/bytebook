import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ChevronDown } from '../../icons/chevron-down';
import type { DropdownItem } from '../../types';
import { cn } from '../../utils/string-formatting';
import { DropdownMenu } from './dropdown-menu';

export function Dropdown({
  items,
  maxHeight,
  className,
  buttonClassName,
  controlledValueIndex,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  id,
}: {
  items: DropdownItem[];
  maxHeight?: number;
  className?: string;
  buttonClassName?: string;
  controlledValueIndex?: number;
  onChange?: (v: DropdownItem) => void;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [valueIndex, setValueIndex] = useState(0);

  useEffect(() => {
    if (
      controlledValueIndex !== undefined &&
      controlledValueIndex !== valueIndex
    ) {
      setValueIndex(controlledValueIndex > -1 ? controlledValueIndex : 0);
    }
  }, [controlledValueIndex, valueIndex]);

  const handleChange = (item: DropdownItem) => {
    const newIndex = items.findIndex((i) => i.value === item.value);
    if (newIndex !== -1) {
      setValueIndex(newIndex);
    }
    onChange?.(item);
  };

  return (
    <DropdownMenu
      items={items}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      className={cn('relative w-fit', className)}
      maxHeight={maxHeight}
      onChange={handleChange}
      valueIndex={valueIndex}
      id={id}
    >
      {({ buttonId, menuId, isOpen, handleKeyDown, handleClick }) => (
        <button
          id={buttonId}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          type="button"
          onClick={handleClick}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          className={cn(
            'flex items-center rounded-md gap-1.5 border-[1.25px] border-zinc-300 bg-zinc-50 px-2 py-0.5 text-left dark:border-zinc-600 dark:bg-zinc-700 whitespace-nowrap',
            buttonClassName,
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          {items.at(valueIndex)?.label}
          <motion.span
            className="ml-auto"
            animate={{ rotateZ: isOpen ? 180 : 0 }}
            aria-hidden="true"
          >
            <ChevronDown strokeWidth="2.8px" />
          </motion.span>
        </button>
      )}
    </DropdownMenu>
  );
}
