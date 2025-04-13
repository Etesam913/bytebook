import { getDefaultButtonVariants } from '../../animations';
import { Duplicate2 } from '../../icons/duplicate-2';
import { MotionButton } from '../buttons';

// using a MotionButton leads to layout shift for some reason...
export function PlainCodeSnippet({ code }: { code: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="relative bg-zinc-150 group dark:bg-zinc-750 cursor-auto mb-2">
      <div className="overflow-x-auto">
        <pre className="w-full text-xs py-4 px-2 !select-auto">{code}</pre>
      </div>
      <MotionButton
        {...getDefaultButtonVariants()}
        type="button"
        className="absolute top-1.5 right-1 bg-zinc-100 dark:bg-zinc-750 shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100"
        onClick={copyToClipboard}
      >
        <Duplicate2 height={16} width={16} />
      </MotionButton>
    </div>
  );
}
