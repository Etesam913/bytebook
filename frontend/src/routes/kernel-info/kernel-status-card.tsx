import { Play } from '../../icons/circle-play';
import HourglassStart from '../../icons/hourglass-start';
import { Loader } from '../../icons/loader';
import PowerOff from '../../icons/power-off';
import { cn } from '../../utils/string-formatting';
import { KernelHeartbeat } from '../../components/file-sidebar/my-kernels-accordion/kernel-heartbeat';
import { KernelInstanceData } from '../../types';
import { useShutdownKernelMutation } from '../../hooks/code';
import { MotionButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';

export function KernelStatusCard({
  instance,
}: {
  instance: KernelInstanceData;
}) {
  const { mutate: shutdownKernel, isPending } = useShutdownKernelMutation();
  const { status, heartbeat, noteId, id } = instance;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return (
          <Play className="text-green-500" width="1.25rem" height="1.25rem" />
        );
      case 'busy':
        return (
          <Loader
            className="text-blue-500 animate-spin"
            width="1.25rem"
            height="1.25rem"
          />
        );
      case 'starting':
        return (
          <HourglassStart
            className="text-yellow-500"
            width="1.25rem"
            height="1.25rem"
          />
        );
      default:
        return (
          <HourglassStart
            className="text-gray-500"
            width="1.25rem"
            height="1.25rem"
          />
        );
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-750 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-3 mb-4">
        {getStatusIcon(status)}
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          {noteId || '(unbound)'}
        </h2>
        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500 font-mono truncate max-w-40">
          {id}
        </span>
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
            onClick={() =>
              shutdownKernel({ kernelInstanceId: id, restart: false })
            }
            isDisabled={isPending}
            {...getDefaultButtonVariants()}
            className="space-x-0.5 px-3"
          >
            {isPending ? (
              <Loader />
            ) : (
              <PowerOff height="0.875rem" width="0.875rem" />
            )}
            <span>{isPending ? 'Stopping...' : 'Stop Kernel'}</span>
          </MotionButton>
        </div>
      </div>
    </div>
  );
}
