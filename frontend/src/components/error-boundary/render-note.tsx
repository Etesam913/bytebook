import { RefreshAnticlockwise } from '../../icons/refresh-anticlockwise';
import { TriangleWarning } from '../../icons/triangle-warning';
import { MotionButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { useAtomValue } from 'jotai';
import { currentFilePathAtom } from '../../atoms';

export function RenderNoteFallback({
  error,
  errorInfo,
  resetErrorBoundary,
}: {
  error: Error;
  errorInfo?: { componentStack: string };
  resetErrorBoundary: () => void;
}) {
  const filePath = useAtomValue(currentFilePathAtom);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-4 text-center p-6">
      <div className="flex flex-col items-center gap-3">
        <TriangleWarning className="w-12 h-12 text-amber-500" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-balance text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
            Failed to render note: <b>{filePath?.toString()}</b>. This might be
            due to a temporary issue or corrupted content.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <MotionButton
          {...getDefaultButtonVariants()}
          onClick={resetErrorBoundary}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md max-w-xs mx-auto justify-center"
        >
          <RefreshAnticlockwise className="w-4 h-4" />
          Try Again
        </MotionButton>

        <details className="text-center max-w-md mx-auto">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 list-none">
            Error Details
          </summary>
          <div className="mt-2 h-32 bg-zinc-100 dark:bg-zinc-800 rounded p-3 overflow-auto">
            <div className="text-xs text-left space-y-2 select-text">
              <div>
                <strong>Error Message:</strong>
                <pre className="whitespace-pre-wrap mt-1">{error.message}</pre>
              </div>
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-xs opacity-75">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-xs opacity-75">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
