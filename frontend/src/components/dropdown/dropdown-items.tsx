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
          role="menu"
          ref={ref}
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
              {items.map(({ value, label }, i) => (
                <div className="w-full inline relative" key={value}>
                  <button
                    className={cn(
                      'relative z-40 outline-hidden rounded-md w-full px-1.5 py-0.5 text-left whitespace-nowrap text-nowrap text-ellipsis overflow-hidden flex'
                    )}
                    type="button"
                    role="menuitem"
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextButton = e.currentTarget.parentElement
                          ?.nextSibling?.lastChild as HTMLElement;

                        if (nextButton) {
                          nextButton.focus();
                          setFocusIndex(i + 1);
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const previousButton = e.currentTarget.parentElement
                          ?.previousSibling?.lastChild as HTMLElement;
                        if (previousButton) {
                          previousButton.focus();
                          setFocusIndex(i - 1);
                        }
                      } else if (e.key === 'Escape') {
                        setIsOpen(false);
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
                  {focusIndex === i && (
                    <motion.div
                      transition={{
                        ease: easingFunctions['ease-out-expo'],
                      }}
                      layoutId={'dropdown-highlight'}
                      className="absolute z-0 inset-0 rounded-md w-full px-1.5 py-0.5 bg-zinc-150 dark:bg-zinc-600"
                    />
                  )}
                  {selectedItem === value && (
                    <div className="absolute z-20 inset-0 rounded-md w-full px-1.5 py-0.5 bg-zinc-150 dark:bg-zinc-600" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
