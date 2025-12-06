import { Play } from '../../icons/circle-play';
import HourglassStart from '../../icons/hourglass-start';
import { Loader } from '../../icons/loader';
import PowerOff from '../../icons/power-off';
import { cn } from '../../utils/string-formatting';
import { KernelHeartbeat } from '../../components/folder-sidebar/my-kernels-accordion/kernel-heartbeat';
import { KernelStatus, KernelHeartbeatStatus, Languages } from '../../types';
import {
  useShutdownKernelMutation,
  useTurnOnKernelMutation,
} from '../../hooks/code';
import { MotionButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';

export function KernelStatusCard({
  status,
  heartbeat,
  language,
}: {
  status: KernelStatus;
  heartbeat: KernelHeartbeatStatus;
  language: Languages;
}) {
  const { mutate: shutdownKernel } = useShutdownKernelMutation(language);
  const { mutate: turnOnKernel } = useTurnOnKernelMutation({ language });

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

  const handleKernelToggle = () => {
    if (heartbeat === 'success') {
      shutdownKernel(false);
    } else {
      turnOnKernel({});
    }
  };

  const isKernelRunning = heartbeat === 'success';
  const isLoading = status === 'busy' || status === 'starting';

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
            <KernelHeartbeat
              status={status}
              heartbeat={heartbeat}
              isBlinking={false}
              className="h-3 w-3"
            />
            <span
              className={cn(
                'font-medium capitalize',
                heartbeat === 'idle' && 'text-gray-600 dark:text-gray-400',
                heartbeat === 'success' && 'text-green-600 dark:text-green-600',
                heartbeat === 'failure' && 'text-red-600 dark:text-red-400'
              )}
            >
              {heartbeat}
            </span>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2 mt-4">
          <MotionButton
            onClick={handleKernelToggle}
            disabled={isLoading}
            {...getDefaultButtonVariants()}
            className="space-x-0.5 px-3"
          >
            {isLoading ? (
              <Loader />
            ) : isKernelRunning ? (
              <PowerOff height={14} width={14} />
            ) : (
              <Play />
            )}
            <span>
              {isLoading
                ? 'Processing...'
                : isKernelRunning
                  ? 'Stop Kernel'
                  : 'Start Kernel'}
            </span>
          </MotionButton>
        </div>
      </div>
    </div>
  );
}
