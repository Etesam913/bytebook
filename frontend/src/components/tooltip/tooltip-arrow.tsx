import { Ref, CSSProperties } from 'react';
import { cn } from '../../utils/string-formatting';
import { MiddlewareData } from '@floating-ui/react';

export function TooltipArrow({
  ref,
  side,
  middlewareData,
  arrowSide,
}: {
  ref: Ref<HTMLDivElement>;
  side: 'top' | 'right' | 'bottom' | 'left';
  middlewareData: MiddlewareData;
  arrowSide: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <div
      ref={ref}
      className={cn(
        'absolute w-2.5 h-2.5 rotate-45 z-40',
        'bg-zinc-50 border border-zinc-300',
        'dark:bg-zinc-750 dark:border-zinc-600',
        {
          'border-t-transparent! border-l-transparent!': side === 'top',
          'border-t-transparent! border-r-transparent!': side === 'right',
          'border-b-transparent! border-r-transparent!': side === 'bottom',
          'border-b-transparent! border-l-transparent!': side === 'left',
        }
      )}
      style={
        {
          left:
            middlewareData.arrow?.x != null
              ? `${middlewareData.arrow.x}px`
              : '',
          top:
            middlewareData.arrow?.y != null
              ? `${middlewareData.arrow.y}px`
              : '',
          [arrowSide]: '-5px',
        } as CSSProperties
      }
    />
  );
}
