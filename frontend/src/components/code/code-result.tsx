import { useRef } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';

export function CodeResult({
  lastExecutedResult,
}: {
  lastExecutedResult: string;
}) {
  const resultContainerRef = useRef<HTMLDivElement>(null);

  return (
    <footer className="relative border-t-1 border-t-zinc-200 dark:border-t-zinc-700 max-h-[calc(35vh-3.6rem)]">
      <div
        ref={resultContainerRef}
        dangerouslySetInnerHTML={{ __html: lastExecutedResult }}
        className="flex flex-col justify-between max-h-[calc(35vh-3.6rem)] overflow-auto gap-1.5 relative font-code text-xs px-2 py-3"
      />
      <MotionIconButton
        className="absolute right-4 top-2"
        {...getDefaultButtonVariants()}
        onClick={() => {
          if (resultContainerRef.current) {
            navigator.clipboard.writeText(resultContainerRef.current.innerText);
          }
        }}
      >
        <Duplicate2 height={16} width={16} />
      </MotionIconButton>
    </footer>
  );
}
