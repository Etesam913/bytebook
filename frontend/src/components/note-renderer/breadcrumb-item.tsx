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
  icon,
  children,
  className,
}: {
  path: string;
  icon?: ReactNode;
  children: string;
  className?: string;
}) {
  return (
    <Breadcrumb
      className={({ isCurrent }) =>
        cn(
          'flex items-center gap-1',
          isCurrent
            ? 'min-w-16 max-w-64'
            : "shrink-0 after:shrink-0 after:content-['/']"
        )
      }
    >
      <Link
        href={path}
        className={cn(
          'flex min-w-0 cursor-default items-center gap-1 text-zinc-500 dark:text-zinc-300 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color) rounded-sm',
          className
        )}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span title={children} className="min-w-0 truncate">
          {children}
        </span>
      </Link>
    </Breadcrumb>
  );
}
