import { XMark } from '../../icons/circle-xmark';

interface KernelErrorCardProps {
  errorMessage: string;
}

export function KernelErrorCard({ errorMessage }: KernelErrorCardProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <XMark fill="rgb(239 68 68)" width={20} height={20} />
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
          Error Message
        </h2>
      </div>
      <div className="bg-red-100 dark:bg-red-900/40 rounded-md p-4 font-mono text-sm">
        <pre className="text-red-800 dark:text-red-200 whitespace-pre-wrap">
          {errorMessage}
        </pre>
      </div>
    </div>
  );
}
