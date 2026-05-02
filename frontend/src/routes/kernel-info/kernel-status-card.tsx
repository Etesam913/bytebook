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
import { createFilePath, safeDecodeURIComponent } from '../../utils/path';
import { Link } from 'wouter';
import { RenderNoteIcon } from '../../icons/render-note-icon';

export function KernelStatusCard({
  instance,
}: {
  instance: KernelInstanceData;
}) {
  const { mutate: shutdownKernel, isPending } = useShutdownKernelMutation();
  const { status, heartbeat, noteId, id } = instance;
  const notePath = noteId ? createFilePath(noteId) : null;
  const noteLabel = notePath
    ? safeDecodeURIComponent(notePath.fullPath)
    : noteId || '(unbound)';

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
    <div className="bg-white dark:bg-zinc-750 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-3">
        <span className="shrink-0">{getStatusIcon(status)}</span>
        <div className="min-w-0 flex-1">
          {notePath ? (
            <Link
              to={notePath.encodedFileUrl}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md text-sm font-semibold text-zinc-800 hover:text-(--accent-color) dark:text-zinc-200"
            >
              <RenderNoteIcon filePath={notePath} size="sm" />
              <span className="truncate">{noteLabel}</span>
            </Link>
          ) : (
            <span className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {noteLabel}
            </span>
          )}
          <div className="mt-1 flex min-w-0 items-center gap-x-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Status{' '}
              <span className="font-medium capitalize text-zinc-700 dark:text-zinc-300">
                {status}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              Heartbeat
              <KernelHeartbeat
                status={status}
                heartbeat={heartbeat}
                isBlinking={false}
                className="h-2.5 w-2.5"
              />
              <span
                className={cn(
                  'font-medium capitalize',
                  heartbeat === 'idle' && 'text-gray-600 dark:text-gray-400',
                  heartbeat === 'success' &&
                    'text-green-600 dark:text-green-600',
                  heartbeat === 'failure' && 'text-red-600 dark:text-red-400'
                )}
              >
                {heartbeat}
              </span>
            </span>
          </div>
        </div>
        <MotionButton
          onClick={() =>
            shutdownKernel({ kernelInstanceId: id, restart: false })
          }
          isDisabled={isPending}
          {...getDefaultButtonVariants()}
          className="shrink-0 space-x-0.5 px-2 py-1 text-sm"
        >
          {isPending ? (
            <Loader />
          ) : (
            <PowerOff height="0.875rem" width="0.875rem" />
          )}
          <span>{isPending ? 'Stopping...' : 'Stop'}</span>
        </MotionButton>
      </div>
    </div>
  );
}
