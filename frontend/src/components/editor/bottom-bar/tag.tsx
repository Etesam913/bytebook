import { XMark } from '../../../icons/circle-xmark';

export function Tag({
  tagName,
  onDelete,
}: {
  tagName: string;
  onDelete?: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 whitespace-nowrap">
      <p>{tagName}</p>
      {onDelete && (
        <button type="button" onClick={onDelete}>
          <XMark width={12} height={12} />
        </button>
      )}
    </span>
  );
}
