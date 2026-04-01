import { type ReactNode } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { cn } from '../../utils/string-formatting';

export function BreadcrumbItem({
  path,
  children,
  className,
}: {
  path: string;
  children: ReactNode;
  className?: string;
}) {
  const baseClassName = cn(
    'flex min-w-0 items-center gap-1 whitespace-nowrap text-ellipsis overflow-hidden shrink-0 text-zinc-500 dark:text-zinc-300',
    className
  );

  return (
    <button
      type="button"
      onClick={() => {
        navigate(path);
      }}
      className={cn(baseClassName, 'hover:underline text-left')}
    >
      {children}
    </button>
  );
}
