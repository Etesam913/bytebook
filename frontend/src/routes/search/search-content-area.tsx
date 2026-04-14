import { useDeferredValue } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { NoteRenderer } from '../../components/note-renderer';
import { RouteFallback } from '../../components/route-fallback';
import { useNoteExists } from '../../hooks/notes';
import { createFilePath, type FilePath } from '../../utils/path';
import { TriangleWarning } from '../../icons/triangle-warning';
import { ArrowRotateAnticlockwise } from '../../icons/arrow-rotate-anticlockwise';
import { MotionButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';

function SearchFileContent({ filePath }: { filePath: FilePath }) {
  const { data: noteExists, isLoading, error } = useNoteExists(filePath);

  if (isLoading) {
    return (
      <div className="flex h-full min-w-0 flex-1">
        <RouteFallback
          height="2.625rem"
          width="2.625rem"
          className="mx-auto my-auto"
        />
      </div>
    );
  }

  if (!noteExists || error) {
    return (
      <div className="flex h-full min-w-0 flex-1 items-center justify-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Note not found: <b>{filePath.fullPath}</b>
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1">
      <NoteRenderer filePath={filePath} />
    </div>
  );
}

function RenderErrorFallback({
  error,
  resetErrorBoundary,
  filePath,
}: {
  error: unknown;
  resetErrorBoundary: (...args: unknown[]) => void;
  filePath: FilePath;
}) {
  const normalizedError =
    error instanceof Error ? error : new Error(String(error));

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6 mx-auto">
      <TriangleWarning className="w-12 h-12 text-amber-500" />
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-balance text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
          Failed to render: <b>{filePath.fullPath}</b>
        </p>
      </div>
      <MotionButton
        {...getDefaultButtonVariants()}
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md"
      >
        <ArrowRotateAnticlockwise className="w-4 h-4" />
        Try Again
      </MotionButton>
      <details className="text-center max-w-md mx-auto">
        <summary className="cursor-pointer text-xs text-zinc-500">
          Error Details
        </summary>
        <pre className="mt-2 text-xs text-left bg-zinc-100 dark:bg-zinc-800 rounded p-3 overflow-auto whitespace-pre-wrap select-text">
          {normalizedError.message}
        </pre>
      </details>
    </div>
  );
}

export function SearchContentArea({ curPath }: { curPath?: string }) {
  const deferredCurPath = useDeferredValue(curPath);
  const filePath = deferredCurPath ? createFilePath(deferredCurPath) : null;

  if (filePath) {
    return (
      <ErrorBoundary
        key={filePath.fullPath}
        FallbackComponent={(fallbackProps) => (
          <RenderErrorFallback {...fallbackProps} filePath={filePath} />
        )}
      >
        <SearchFileContent filePath={filePath} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Type a search query to get started
      </p>
    </div>
  );
}
