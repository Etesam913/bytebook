import { AnimatePresence, motion } from 'motion/react';
import type { SetStateAction } from 'jotai/ts3.8/esm/vanilla';
import { useAtomValue } from 'jotai';
import {
  type CSSProperties,
  type Dispatch,
  RefObject,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { easingFunctions } from '../../animations';
import type { DropdownItem } from '../../types';
import { cn } from '../../utils/string-formatting';
import { isDarkModeOnAtom } from '../../atoms';

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
  const isDarkMode = useAtomValue(isDarkModeOnAtom);

  useEffect(() => {
    // Only update focus index when dropdown opens, but don't steal focus
    if (isOpen) {
      setFocusIndex(focusIndex ?? 0);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="listbox"
          id={menuId}
          ref={ref}
          aria-labelledby={buttonId}
          aria-activedescendant={
            focusIndex !== null ? `${menuId}-option-${focusIndex}` : undefined
          }
          className={cn(
            'absolute z-50 w-full overflow-hidden translate-y-1 rounded-md border-[1.25px] bg-zinc-50 shadow-xl dark:bg-zinc-700',
            maxHeight && 'overflow-y-auto',
            className
          )}
          style={style}
          initial={{
            borderColor: isDarkMode ? 'rgb(82, 82, 91)' : 'rgb(209, 213, 219)',
          }}
          animate={{
            borderColor: isDarkMode ? 'rgb(82, 82, 91)' : 'rgb(209, 213, 219)',
          }}
          exit={{
            borderColor: 'rgba(0, 0, 0, 0)',
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
                          if (i < items.length - 1) {
                            const nextIndex = i + 1;
                            setFocusIndex(nextIndex);
                            const nextButton = document.getElementById(
                              `${menuId}-option-${nextIndex}`
                            );
                            nextButton?.focus();
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (i > 0) {
                            const prevIndex = i - 1;
                            setFocusIndex(prevIndex);
                            const prevButton = document.getElementById(
                              `${menuId}-option-${prevIndex}`
                            );
                            prevButton?.focus();
                          }
                        } else if (e.key === 'Tab') {
                          // Allow Tab to close dropdown and move focus naturally
                          setIsOpen(false);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsOpen(false);
                          // Return focus to the trigger button
                          const triggerButton = document.getElementById(
                            buttonId || ''
                          );
                          triggerButton?.focus();
                        } else if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setIsOpen(false);
                          setValueIndex?.(i);
                          onChange?.(items[i]);
                          // Return focus to the trigger button
                          const triggerButton = document.getElementById(
                            buttonId || ''
                          );
                          triggerButton?.focus();
                        } else if (e.key === 'Home') {
                          e.preventDefault();
                          setFocusIndex(0);
                          const firstButton = document.getElementById(
                            `${menuId}-option-0`
                          );
                          firstButton?.focus();
                        } else if (e.key === 'End') {
                          e.preventDefault();
                          const lastIndex = items.length - 1;
                          setFocusIndex(lastIndex);
                          const lastButton = document.getElementById(
                            `${menuId}-option-${lastIndex}`
                          );
                          lastButton?.focus();
                        }
                      }}
                      onMouseEnter={() => {
                        setFocusIndex(i);
                      }}
                      onFocus={() => {
                        setFocusIndex(i);
                      }}
                      onClick={() => {
                        setIsOpen(false);
                        setValueIndex?.(i);
                        onChange?.(items[i]);
                        // Return focus to the trigger button
                        const triggerButton = document.getElementById(
                          buttonId || ''
                        );
                        triggerButton?.focus();
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
