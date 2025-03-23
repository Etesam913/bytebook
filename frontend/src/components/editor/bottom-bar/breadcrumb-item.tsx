import type { ReactNode } from 'react';
import { Link } from 'wouter';

export function BreadcrumbItem({
  children,
  to,
}: {
  children: ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1 whitespace-nowrap text-ellipsis overflow-hidden text-zinc-500 dark:text-zinc-300 hover:text-[currentColor]"
    >
      {children}
    </Link>
  );
}
