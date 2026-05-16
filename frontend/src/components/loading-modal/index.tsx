import { useAtomValue } from 'jotai';
import { Dialog as AriaDialog } from 'react-aria-components/Dialog';
import { Modal, ModalOverlay } from 'react-aria-components/Modal';
import { backendQueryAtom } from '../../atoms';
import { Loader } from '../../icons/loader';

export function LoadingModal() {
  const backendQuery = useAtomValue(backendQueryAtom);

  return (
    <ModalOverlay
      isOpen={backendQuery.isLoading}
      isKeyboardDismissDisabled
      className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-150 ease-out data-[entering]:opacity-0 data-[exiting]:opacity-0"
    >
      <Modal className="fixed inset-0 z-60 flex items-center justify-center transition duration-150 ease-out data-[entering]:opacity-0 data-[entering]:scale-95 data-[exiting]:opacity-0 data-[exiting]:scale-95">
        <AriaDialog
          aria-label={`Loading: ${backendQuery.message}`}
          className="bg-zinc-50 dark:bg-zinc-800 px-4 py-5 max-w-[80vw] w-80 rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 outline-none"
        >
          <div className="flex flex-col items-center gap-3 text-center text-balance">
            <Loader height="1.5rem" width="1.5rem" />
            <h3>{backendQuery.message}</h3>
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
