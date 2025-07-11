import { Play } from '../../icons/circle-play';
import HourglassStart from '../../icons/hourglass-start';
import { Loader } from '../../icons/loader';
import { cn } from '../../utils/string-formatting';
import { KernelStatus, KernelHeartbeatStatus } from '../../types';

interface KernelStatusCardProps {
  status: KernelStatus;
  heartbeat: KernelHeartbeatStatus;
}

export function KernelStatusCard({ status, heartbeat }: KernelStatusCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <Play className="text-green-500" width={20} height={20} />;
      case 'busy':
        return (
          <Loader
            className="text-blue-500 animate-spin"
            width={20}
            height={20}
          />
        );
      case 'starting':
        return (
          <HourglassStart className="text-yellow-500" width={20} height={20} />
        );
      default:
        return (
          <HourglassStart className="text-gray-500" width={20} height={20} />
        );
    }
  };

  const getHeartbeatIcon = (heartbeat: string) => {
    switch (heartbeat) {
      case 'idle':
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
      case 'success':
        return (
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        );
      case 'failure':
        return <div className="w-3 h-3 bg-red-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" />;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-750 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-3 mb-4">
        {getStatusIcon(status)}
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Kernel Status
        </h2>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Status:</span>
          <span className={cn('font-medium capitalize')}>{status}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-600 dark:text-zinc-400">Heartbeat:</span>
          <div className="flex items-center gap-2">
            {getHeartbeatIcon(heartbeat)}
            <span
              className={cn(
                'font-medium capitalize',
                heartbeat === 'idle' && 'text-gray-600 dark:text-gray-400',
                heartbeat === 'success' && 'text-green-600 dark:text-green-400',
                heartbeat === 'failure' && 'text-red-600 dark:text-red-400'
              )}
            >
              {heartbeat}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
