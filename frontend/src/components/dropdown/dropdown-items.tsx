import { AnimatePresence, motion } from 'motion/react';
import type { SetStateAction } from 'jotai/ts3.8/esm/vanilla';
import {
  type CSSProperties,
  type Dispatch,
  RefObject,
  useEffect,
  useRef,
} from 'react';
import { easingFunctions } from '../../animations';
import type { DropdownItem } from '../../types';
import { cn } from '../../utils/string-formatting';

export function DropdownItems({
  items,
  maxHeight,
  isOpen,
  setIsOpen,
  setValueIndex,
  onChange,
  setFocusIndex,
  focusIndex,
  className,
  selectedItem,
  style,
  ref,
  children,
  menuId,
  buttonId,
  valueIndex,
}: {
  items: DropdownItem[];
  maxHeight?: number;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>> | ((value: boolean) => void);
  setValueIndex?: Dispatch<SetStateAction<number>>;
  onChange?: (item: DropdownItem) => void;
  setFocusIndex: Dispatch<SetStateAction<number>>;
  focusIndex: number | null;
  className?: string;
  selectedItem?: string;
  style?: CSSProperties;
  ref?: RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
  menuId?: string;
  buttonId?: string;
  valueIndex?: number;
}) {
  const dropdownItemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const indexToFocus = focusIndex ?? 0;
    setFocusIndex(indexToFocus);
    if (dropdownItemsRef.current && isOpen) {
      const children = Array.from(dropdownItemsRef.current.children);
      const firstChild = children.at(indexToFocus);
      if (!firstChild) return;
      const firstButton = firstChild.firstChild as HTMLElement;
      firstButton.focus();
    }
  }, [dropdownItemsRef, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="listbox"
          id={menuId}
          ref={ref}
          aria-labelledby={buttonId}
          aria-activedescendant={focusIndex !== null ? `${menuId}-option-${focusIndex}` : undefined}
          className={cn(
            'absolute z-50 w-full overflow-hidden translate-y-1 rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-700',
            maxHeight && 'overflow-y-auto',
            className
          )}
          style={style}
          exit={{
            borderColor: 'transparent',
            transition: {
              borderColor: { delay: 0.25 },
            },
          }}
        >
          <motion.div
            initial={{ height: 0 }}
            animate={{
              height: maxHeight ? maxHeight : 'auto',
              transition: { type: 'spring', damping: 22, stiffness: 200 },
            }}
            exit={{ height: 0, opacity: 0 }}
          >
            {children}
            <div
              ref={dropdownItemsRef}
              className="flex flex-col overflow-y-auto overflow-x-hidden px-[4.5px] py-[6px] gap-0.5"
            >
              {items.map(({ value, label }, i) => {
                const isSelected = valueIndex === i || selectedItem === value;
                const isFocused = focusIndex === i;
                const optionId = `${menuId}-option-${i}`;
                
                return (
                  <div className="w-full inline relative" key={value}>
                    <button
                      id={optionId}
                      className={cn(
                        'relative z-40 outline-hidden rounded-md w-full px-1.5 py-0.5 text-left whitespace-nowrap text-nowrap text-ellipsis overflow-hidden flex'
                      )}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={isFocused ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          const nextIndex = i < items.length - 1 ? i + 1 : 0;
                          const nextButton = document.getElementById(`${menuId}-option-${nextIndex}`);
                          if (nextButton) {
                            nextButton.focus();
                            setFocusIndex(nextIndex);
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          const prevIndex = i > 0 ? i - 1 : items.length - 1;
                          const prevButton = document.getElementById(`${menuId}-option-${prevIndex}`);
                          if (prevButton) {
                            prevButton.focus();
                            setFocusIndex(prevIndex);
                          }
                        } else if (e.key === 'Escape') {
                          setIsOpen(false);
                          // Return focus to the trigger button
                          const triggerButton = document.getElementById(buttonId || '');
                          triggerButton?.focus();
                        } else if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setIsOpen(false);
                          setValueIndex?.(i);
                          onChange?.(items[i]);
                          // Return focus to the trigger button
                          const triggerButton = document.getElementById(buttonId || '');
                          triggerButton?.focus();
                        } else if (e.key === 'Home') {
                          e.preventDefault();
                          const firstButton = document.getElementById(`${menuId}-option-0`);
                          if (firstButton) {
                            firstButton.focus();
                            setFocusIndex(0);
                          }
                        } else if (e.key === 'End') {
                          e.preventDefault();
                          const lastIndex = items.length - 1;
                          const lastButton = document.getElementById(`${menuId}-option-${lastIndex}`);
                          if (lastButton) {
                            lastButton.focus();
                            setFocusIndex(lastIndex);
                          }
                        }
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).focus();
                        setFocusIndex(i);
                      }}
                      onClick={() => {
                        setIsOpen(false);
                        setValueIndex?.(i);
                        onChange?.(items[i]);
                      }}
                    >
                      {label}
                    </button>
                    {isFocused && (
                      <motion.div
                        transition={{
                          ease: easingFunctions['ease-out-expo'],
                        }}
                        layoutId={'dropdown-highlight'}
                        className="absolute z-0 inset-0 rounded-md w-full px-1.5 py-0.5 bg-zinc-150 dark:bg-zinc-600"
                        aria-hidden="true"
                      />
                    )}
                    {isSelected && (
                      <div 
                        className="absolute z-20 inset-0 rounded-md w-full px-1.5 py-0.5 bg-zinc-150 dark:bg-zinc-600" 
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
