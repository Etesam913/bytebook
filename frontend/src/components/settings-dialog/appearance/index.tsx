import {
  Radio,
  RadioGroup,
  type RadioGroupProps,
} from 'react-aria-components/RadioGroup';
import { cn } from '@utils/string-formatting';

export const settingImageClasses =
  'border-[3px] rounded-md p-1 border-zinc-200 dark:border-zinc-750';

/** Horizontal radio group where each option is a labelled preview image. */
export function SettingImageGroup({
  className,
  ...props
}: Omit<RadioGroupProps, 'orientation'>) {
  return (
    <RadioGroup
      {...props}
      orientation="horizontal"
      className={cn('flex gap-3', className as string | undefined)}
    />
  );
}

export function SettingImage({
  value,
  label,
  imgSrc,
  imgAlt,
}: {
  value: string;
  label: string;
  imgSrc: string;
  imgAlt: string;
}) {
  return (
    <Radio
      value={value}
      className={({ isFocusVisible }) =>
        cn(
          'h-full text-center flex flex-col items-center rounded-md cursor-pointer outline-none',
          isFocusVisible && 'ring-2 ring-offset-2 ring-(--accent-color)'
        )
      }
    >
      {({ isSelected }) => (
        <>
          <p
            className={cn(
              'text-sm text-zinc-500 dark:text-zinc-400',
              isSelected && 'text-zinc-950 dark:text-zinc-100'
            )}
          >
            {label}
          </p>
          <img
            draggable="false"
            className={cn(
              settingImageClasses,
              isSelected && 'border-(--accent-color)!'
            )}
            src={imgSrc}
            alt={imgAlt}
          />
        </>
      )}
    </Radio>
  );
}
