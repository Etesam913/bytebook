import type { JSX, ReactNode } from 'react';
import {
  Radio,
  RadioGroup,
  type RadioGroupProps,
  type RadioProps,
} from 'react-aria-components';
import { cn } from '../../utils/string-formatting';

export function AppRadioGroup({
  className,
  children,
  ...props
}: RadioGroupProps & { children: ReactNode }): JSX.Element {
  return (
    <RadioGroup
      {...props}
      className={cn('flex flex-col gap-1.5', className as string | undefined)}
    >
      {children}
    </RadioGroup>
  );
}

export function AppRadio({
  className,
  children,
  ...props
}: RadioProps & { children: ReactNode }): JSX.Element {
  return (
    <Radio
      {...props}
      className={cn(
        'flex items-center cursor-pointer outline-none',
        className as string | undefined
      )}
    >
      {(renderProps) => (
        <>
          <span
            className={cn(
              'w-4 h-4 border-2 rounded-full flex-shrink-0 mr-2 flex justify-center items-center transition-colors',
              renderProps.isSelected
                ? 'border-(--accent-color)'
                : 'border-zinc-500',
              renderProps.isFocusVisible && 'ring-1 ring-(--accent-color)'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 bg-(--accent-color) rounded-full transition-opacity duration-200',
                renderProps.isSelected ? 'opacity-100' : 'opacity-0'
              )}
            />
          </span>
          {typeof children === 'function' ? children(renderProps) : children}
        </>
      )}
    </Radio>
  );
}
