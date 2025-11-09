import { type RefObject } from 'react';
import { cn } from '../../utils/string-formatting';

export function FilePlaceholder({
  loaderRef,
  nodeKey,
  width,
  height,
}: {
  loaderRef: RefObject<HTMLDivElement | null>;
  nodeKey: string;
  width: number;
  height: number;
}) {
  return (
    <div
      ref={loaderRef}
      data-node-key={nodeKey}
      style={{
        height,
        width,
      }}
      className={cn(
        'mx-1 bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none inline-block'
      )}
    />
  );
}
