import {
  type Dispatch,
  type SetStateAction,
  useId,
  useRef,
  useState,
} from 'react';
import type { DropdownItem } from '../../types';
import { useOnClickOutside } from '../../hooks/general';
import { DropdownItems } from './dropdown-items';
import { cn } from '../../utils/string-formatting';

/**
 * DropdownMenu - A headless dropdown component that provides keyboard navigation
 * and accessibility without prescribing the button UI.
 *
 * This component handles:
 * - Click outside to close
 * - Keyboard navigation (Arrow keys, Enter, Space, Escape, Tab)
 * - Focus management with roving tabindex
 * - ARIA attributes
 */
export function DropdownMenu({
  items,
  isOpen,
  setIsOpen,
  className,
  onChange,
  selectedItem,
  valueIndex,
  children,
  maxHeight,
  dropdownClassName,
  style,
  id,
  skipAnimation,
}: {
  items: DropdownItem[];
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  className?: string;
  onChange?: (item: DropdownItem) => void;
  selectedItem?: string;
  valueIndex?: number;
  children: (props: {
    buttonId: string;
    menuId: string;
    isOpen: boolean;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    handleClick: (e: React.MouseEvent<HTMLElement>) => void;
  }) => React.ReactNode;
  maxHeight?: number;
  dropdownClassName?: string;
  style?: React.CSSProperties;
  id?: string;
  skipAnimation?: boolean;
}) {
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const uniqueId = useId();
  const dropdownId = id || uniqueId;
  const buttonId = `${dropdownId}-button`;
  const menuId = `${dropdownId}-menu`;

  useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));

  const openDropdown = () => {
    setFocusIndex(0);
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const focusMenuItem = (index: number) => {
    if (index < 0 || index >= items.length) return;
    setTimeout(() => {
      const option = document.getElementById(`${menuId}-option-${index}`);
      option?.focus();
      setFocusIndex(index);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        closeDropdown();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        }
        // Move focus into the menu
        focusMenuItem(0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        }
        // Move focus to last option
        focusMenuItem(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          closeDropdown();
        } else {
          openDropdown();
        }
        // Don't automatically move focus when opening
        break;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
    // Ensure the button has focus after click
    (e.currentTarget as HTMLElement).focus();
  };

  return (
    <div className={cn(className, 'text-sm')} ref={dropdownContainerRef}>
      {children({ buttonId, menuId, isOpen, handleKeyDown, handleClick })}
      <DropdownItems
        menuId={menuId}
        buttonId={buttonId}
        items={items}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        setFocusIndex={setFocusIndex}
        focusIndex={focusIndex}
        onChange={onChange}
        selectedItem={selectedItem}
        valueIndex={valueIndex}
        className={dropdownClassName}
        maxHeight={maxHeight}
        style={style}
        skipAnimation={skipAnimation}
      />
    </div>
  );
}
