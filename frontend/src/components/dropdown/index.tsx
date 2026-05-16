import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Button } from 'react-aria-components/Button';
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox';
import { Select, SelectValue } from 'react-aria-components/Select';
import type { Key } from 'react-aria-components/Breadcrumbs';
import { ChevronDown } from '../../icons/chevron-down';
import type { DropdownItem } from '../../types';
import { cn } from '../../utils/string-formatting';
import { AppMenuPopover } from '../menu';
import { Tooltip } from '../tooltip';

export function Dropdown({
  items,
  className,
  buttonClassName,
  controlledValueIndex,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  disabledTooltipContent,
  id,
}: {
  items: DropdownItem[];
  className?: string;
  buttonClassName?: string;
  controlledValueIndex?: number;
  onChange?: (v: DropdownItem) => void;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabledTooltipContent?: ReactNode;
  id?: string;
}) {
  const [uncontrolledValueIndex, setUncontrolledValueIndex] = useState(0);
  const isControlled = controlledValueIndex !== undefined;

  const derivedControlledIndex =
    controlledValueIndex !== undefined && controlledValueIndex > -1
      ? controlledValueIndex
      : 0;

  const currentValueIndex = isControlled
    ? derivedControlledIndex
    : uncontrolledValueIndex;

  const selectedKey = items[currentValueIndex]?.value ?? null;

  function handleSelectionChange(key: Key | null) {
    if (key === null) return;
    const item = items.find((i) => i.value === key);
    if (!item) return;
    if (!isControlled) {
      const newIndex = items.indexOf(item);
      if (newIndex !== -1) setUncontrolledValueIndex(newIndex);
    }
    onChange?.(item);
  }

  const dropdown = (
    <Select
      id={id}
      isDisabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      selectedKey={selectedKey}
      onSelectionChange={handleSelectionChange}
    >
      <Button
        className={cn(
          'relative w-fit text-sm flex items-center rounded-md gap-1.5 border-[1.25px] border-zinc-300 bg-zinc-50 px-2 py-0.5 text-left dark:border-zinc-600 dark:bg-zinc-700 aria-expanded:bg-zinc-100 dark:aria-expanded:bg-zinc-600 whitespace-nowrap outline-hidden',
          buttonClassName,
          className,
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        {({ isPressed }) => (
          <>
            <SelectValue />
            <motion.span
              className="ml-auto"
              animate={{ rotateZ: isPressed ? 180 : 0 }}
              aria-hidden="true"
            >
              <ChevronDown strokeWidth="2.8px" />
            </motion.span>
          </>
        )}
      </Button>
      <AppMenuPopover className="w-(--trigger-width)">
        <ListBox className="flex flex-col overflow-y-auto overflow-x-hidden px-[0.28125rem] py-1.5 gap-0.5 outline-hidden text-sm">
          {items.map((item) => (
            <ListBoxItem
              key={item.value}
              id={item.value}
              textValue={item.value}
              className={({ isFocused, isSelected }) =>
                cn(
                  'outline-hidden focus-visible:ring-0 rounded-md w-full px-1.5 py-0.5 text-left whitespace-nowrap text-nowrap text-ellipsis overflow-hidden flex cursor-default',
                  isFocused && 'bg-(--accent-color) text-white',
                  !isFocused && isSelected && 'bg-zinc-150 dark:bg-zinc-600'
                )
              }
            >
              {item.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </AppMenuPopover>
    </Select>
  );

  if (!disabledTooltipContent) {
    return dropdown;
  }

  return (
    <Tooltip
      content={disabledTooltipContent}
      disabled={!disabled}
      delay={{ open: 450 }}
    >
      <span
        className="inline-flex"
        tabIndex={disabled ? 0 : undefined}
        aria-label={disabled && ariaLabel ? ariaLabel : undefined}
      >
        {dropdown}
      </span>
    </Tooltip>
  );
}
