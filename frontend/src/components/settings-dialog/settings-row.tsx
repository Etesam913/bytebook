import type { ReactNode } from 'react';

export function SettingsRow({
  title,
  description,
  children,
  isFirst = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  isFirst?: boolean;
}) {
  return (
    <div
      className={`settings-row-grid px-0.5 py-2.5 ${!isFirst ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}`}
    >
      <div className="flex flex-col gap-1 h-fit">
        <h3 className="text-base font-bold">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
