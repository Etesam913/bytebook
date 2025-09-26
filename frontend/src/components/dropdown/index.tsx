import { motion } from 'motion/react';
import { useEffect, useRef, useState, useId } from 'react';
import { useOnClickOutside } from '../../hooks/general';
import { ChevronDown } from '../../icons/chevron-down';
import type { DropdownItem } from '../../types';
import { cn } from '../../utils/string-formatting';
import { DropdownItems } from './dropdown-items';

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
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [valueIndex, setValueIndex] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  
  const uniqueId = useId();
  const dropdownId = id || uniqueId;
  const buttonId = `${dropdownId}-button`;
  const menuId = `${dropdownId}-menu`;

  useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));

  useEffect(() => {
    if (
      controlledValueIndex !== undefined &&
      controlledValueIndex !== valueIndex
    ) {
      setValueIndex(controlledValueIndex > -1 ? controlledValueIndex : 0);
    }
  }, [controlledValueIndex, valueIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusIndex(0);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          setFocusIndex(0);
        }
        break;
    }
  };

  return (
    <div className={cn('relative w-fit', className)} ref={dropdownContainerRef}>
      <button
        id={buttonId}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={cn(
          'flex items-center rounded-md gap-1.5 border-[1.25px] border-zinc-300 bg-zinc-50 px-2 py-0.5 text-left dark:border-zinc-600 dark:bg-zinc-700',
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

      <DropdownItems
        items={items}
        maxHeight={maxHeight}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        setValueIndex={setValueIndex}
        setFocusIndex={setFocusIndex}
        focusIndex={focusIndex}
        onChange={onChange}
        menuId={menuId}
        buttonId={buttonId}
        valueIndex={valueIndex}
      />
    </div>
  );
}
