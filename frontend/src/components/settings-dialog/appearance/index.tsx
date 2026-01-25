import { cn } from '../../../utils/string-formatting';
import { EmptyLinePlaceholderRow } from './empty-line-placeholder-row';
import { FontFamilyRow } from './font-family-row';
import { NoteWidthRow } from './note-width-row';
import { ThemeRow } from './theme-row';

export function SettingImage({
  isActive,
  onClick,
  label,
  imgSrc,
  imgAlt,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  imgSrc: string;
  imgAlt: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-full text-center flex flex-col items-center"
    >
      <p
        className={cn(
          'text-sm text-zinc-500 dark:text-zinc-400',
          isActive && 'text-zinc-950 dark:text-zinc-100 '
        )}
      >
        {label}
      </p>

      <img
        draggable="false"
        className={cn(
          'border-[3px] rounded-md p-1 border-zinc-200 dark:border-zinc-750',
          isActive && 'border-(--accent-color)!'
        )}
        src={imgSrc}
        alt={imgAlt}
      />
    </button>
  );
}

export function AppearancePage() {
  return (
    <>
      <FontFamilyRow />
      <ThemeRow />
      <NoteWidthRow />
      <EmptyLinePlaceholderRow />
    </>
  );
}
