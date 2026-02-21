import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { backendQueryAtom } from '../../atoms';
import { Loader } from '../../icons/loader';

export function LoadingModal() {
  const backendQuery = useAtomValue(backendQueryAtom);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (backendQuery.isLoading) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [backendQuery.isLoading]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Loading"
      onCancel={(e) => e.preventDefault()}
      className="m-auto bg-zinc-50 dark:bg-zinc-800 px-4 py-5 max-w-[80vw] w-80 rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 backdrop:bg-[rgba(0,0,0,0.5)]"
    >
      <div className="flex flex-col items-center gap-3 text-center text-balance">
        <Loader height={24} width={24} />
        <h3>{backendQuery.message}</h3>
      </div>
    </dialog>
  );
}
