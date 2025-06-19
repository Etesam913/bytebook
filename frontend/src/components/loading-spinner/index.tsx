import { Loader } from '../../icons/loader';

export function LoadingSpinner({
  height,
  width,
  className,
}: {
  height?: number;
  width?: number;
  className?: string;
}) {
  return (
    <div className="animate-pulse text-gray-500 dark:text-zinc-400">
      <Loader height={height} width={width} className={className} />
    </div>
  );
}
