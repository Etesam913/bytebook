import { useQuery } from '@tanstack/react-query';
import { SquareTerminal } from '../../icons/square-terminal';
import { Languages } from '../../types';
import { GetKernelDescriptor } from '../../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { Duplicate2 } from '../../icons/duplicate-2';
import { LoadingSpinner } from '../../components/loading-spinner';

export function KernelInfoCard({ language }: { language: Languages }) {
  const { data: response, isPending } = useQuery({
    queryKey: ['kernel-descriptor', language],
    queryFn: () => GetKernelDescriptor(language),
  });
  const kernelInfo = response?.success ? response.data : null;

  return (
    <div className="overflow-hidden bg-white dark:bg-zinc-750 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-3 mb-4">
        <SquareTerminal width="1.25rem" height="1.25rem" />
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Kernel Information
        </h2>
      </div>
      {isPending ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner height="1.5rem" width="1.5rem" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Language:</span>
            <span className="min-w-0 truncate text-right font-medium text-zinc-800 dark:text-zinc-200">
              {kernelInfo?.language ?? 'Unknown'}
            </span>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">
              Display Name:
            </span>
            <span className="min-w-0 truncate text-right font-medium text-zinc-800 dark:text-zinc-200 font-mono">
              {kernelInfo?.display_name ?? 'Unknown'}
            </span>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Command:</span>
            <div className="flex min-w-0 items-center justify-end gap-2">
              <button
                onClick={() => {
                  const command = kernelInfo?.argv?.join(' ') ?? 'Unknown';
                  void navigator.clipboard.writeText(command);
                }}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                title="Copy command"
              >
                <Duplicate2 height="1rem" width="1rem" />
              </button>
              <span className="min-w-0 truncate text-right font-medium text-zinc-800 dark:text-zinc-200 font-mono">
                {kernelInfo?.argv?.join(' ') ?? 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
