import { type ReactNode } from 'react';
import { Breadcrumb, Breadcrumbs } from 'react-aria-components/Breadcrumbs';
import { Link } from 'react-aria-components/Link';
import { cn } from '@utils/string-formatting';

/** Breadcrumb trail; RAC marks the last item with aria-current="page". */
export function BreadcrumbTrail({
  className,
  children,
  ...props
}: {
  className?: string;
  children: ReactNode;
  'aria-label': string;
}) {
  return (
    <Breadcrumbs
      {...props}
      className={cn('flex min-w-0 items-center gap-1', className)}
    >
      {children}
    </Breadcrumbs>
  );
}

export function BreadcrumbItem({
  path,
  children,
  className,
}: {
  path: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Breadcrumb className="flex min-w-0 items-center gap-1 [&:not(:last-child)]:after:content-['/']">
      <Link
        href={path}
        className={cn(
          'flex min-w-0 items-center gap-1 whitespace-nowrap text-ellipsis overflow-hidden shrink-0 text-zinc-500 dark:text-zinc-300 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color) rounded-sm',
          className
        )}
      >
        {children}
      </Link>
    </Breadcrumb>
  );
}
