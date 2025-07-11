import { useQuery } from '@tanstack/react-query';
import { SquareTerminal } from '../../icons/square-terminal';
import { Languages } from '../../types';
import { GetKernelInfoByLanguage } from '../../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { Duplicate2 } from '../../icons/duplicate-2';
import { LoadingSpinner } from '../loading-spinner';

export function KernelInfoCard({ language }: { language: Languages }) {
  const { data: kernelInfo, isPending } = useQuery({
    queryKey: ['kernel-info', language],
    queryFn: () => {
      return GetKernelInfoByLanguage(language);
    },
  });

  return (
    <div className="bg-white dark:bg-zinc-750 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-3 mb-4">
        <SquareTerminal width={20} height={20} />
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Kernel Information
        </h2>
      </div>
      {isPending ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner height={24} width={24} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Language:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {kernelInfo?.language ?? 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">
              Display Name:
            </span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 font-mono">
              {kernelInfo?.display_name ?? 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Command:</span>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const command = kernelInfo?.argv?.join(' ') ?? 'Unknown';
                  navigator.clipboard.writeText(command);
                }}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                title="Copy command"
              >
                <Duplicate2 height={16} width={16} />
              </button>
              <span className="font-medium text-right text-zinc-800 dark:text-zinc-200 font-mono">
                {kernelInfo?.argv?.join(' ') ?? 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
