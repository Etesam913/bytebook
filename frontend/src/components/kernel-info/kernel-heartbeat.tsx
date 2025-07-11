import { Loader } from '../../icons/loader';
import { cn } from '../../utils/string-formatting';
import { KernelStatus, KernelHeartbeatStatus } from '../../types';

export function KernelHeartbeat({
  status,
  heartbeat,
  isBlinking = true,
  className,
  loaderClassName,
  loaderHeight,
  loaderWidth,
}: {
  status: KernelStatus;
  heartbeat: KernelHeartbeatStatus;
  isBlinking?: boolean;
  className?: string;
  loaderClassName?: string;
  loaderHeight?: number;
  loaderWidth?: number;
}) {
  if (status === 'busy' || status === 'starting') {
    return (
      <Loader
        className={loaderClassName}
        height={loaderHeight}
        width={loaderWidth}
      />
    );
  }

  if (status === 'idle') {
    return (
      <span
        className={cn(
          'rounded-full',
          isBlinking && 'kernel-heartbeat',
          heartbeat === 'success' && 'bg-green-500 dark:bg-green-600',
          heartbeat === 'failure' && 'bg-red-600',
          heartbeat === 'idle' && 'bg-gray-500',
          className
        )}
      />
    );
  }

  return null;
}
