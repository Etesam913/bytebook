import { cn } from '../../../utils/string-formatting';
import { TagSlash } from '../../../icons/tag-slash';

export function Tag({
  tagName,
  onDelete,
  className,
}: {
  tagName: string;
  onDelete?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 whitespace-nowrap',
        className
      )}
    >
      <p>{tagName}</p>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove tag ${tagName}`}
          className="flex items-center"
        >
          <TagSlash width="0.75rem" height="0.75rem" />
        </button>
      )}
    </span>
  );
}
