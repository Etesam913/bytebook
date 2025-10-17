import { AnimatePresence, motion } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import useMeasure from 'react-use-measure';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import { dialogDataAtom, selectionRangeAtom } from '../../atoms';
import { editorAtom } from '../editor/atoms';
import { XMark } from '../../icons/circle-xmark';
import { cn } from '../../utils/string-formatting';
import { MotionIconButton } from '../buttons';

/**
 * Animated error text that expands/collapses with its measured height.
 */
export function DialogErrorText({
  errorText,
  className,
}: {
  errorText: string;
  className?: string;
}) {
  const [elementRef, bounds] = useMeasure();
  return (
    <AnimatePresence>
      {errorText.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: bounds.height,
            opacity: 1,
            transition: { type: 'spring' },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: { ease: easingFunctions['ease-out-cubic'] },
          }}
          className={cn('text-red-500 text-[0.85rem] text-left', className)}
        >
          <p ref={elementRef} className="pt-2">
            {errorText}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Dialog() {
  const [dialogData, setDialogData] = useAtom(dialogDataAtom);
  const editor = useAtomValue(editorAtom);
  const [errorText, setErrorText] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const setSelectionRange = useSetAtom(selectionRangeAtom);

  const closeDialog = () => {
    dialogData.onClose?.();
    setDialogData({
      isOpen: false,
      onSubmit: null,
      title: '',
      children: null,
      onClose: undefined,
      isPending: false,
    });
    setErrorText('');
    setSelectionRange(new Set());
  };

  // Handle dialog open/close and event listeners
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (dialogData.isOpen) {
      editor?.blur();
      dialog.showModal();
    }

    const handleCancel = (e: Event) => {
      e.preventDefault();
      setDialogData((prev) =>
        prev.isOpen ? { ...prev, isOpen: false } : prev
      );
    };

    const handleClose = () => {
      if (dialogData.isOpen) {
        closeDialog();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [dialogData.isOpen, editor, dialogData.onClose, setDialogData]);

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent border-none p-0 max-w-none max-h-none w-full h-full"
      onKeyDown={(e) => {
        if (e.metaKey && e.key === 'Enter') {
          const form = dialogRef.current?.querySelector('form');
          form?.dispatchEvent(new Event('submit'));
        }
      }}
    >
      <AnimatePresence
        onExitComplete={() => {
          dialogRef.current?.close();
          closeDialog();
        }}
      >
        {dialogData.isOpen && (
          <>
            <motion.div
              key="shade"
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.form
              key="modal-form"
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                if (!dialogData.onSubmit) return;

                setDialogData((prev) => ({ ...prev, isPending: true }));
                const result = await dialogData.onSubmit(e, setErrorText);
                setDialogData((prev) => ({ ...prev, isPending: false }));

                if (result) {
                  setDialogData((prev) => ({ ...prev, isOpen: false }));
                }
              }}
              style={{ x: '-50%', y: '-50%' }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { ease: easingFunctions['ease-out-circ'] },
              }}
              exit={{
                opacity: 0,
                scale: 0.5,
                transition: { ease: easingFunctions['ease-out-quint'] },
              }}
              className={cn(
                'fixed left-1/2 top-1/2 z-[60] bg-zinc-50 dark:bg-zinc-800 py-3 w-[min(368px,90vw)] rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 max-h-11/12 flex flex-col',
                dialogData.dialogClassName
              )}
            >
              <h2 className="px-3 text-xl pb-2 border-b-2 border-zinc-150 dark:border-zinc-750">
                {dialogData.title}
              </h2>

              <div className="py-2 px-3 overflow-x-hidden flex flex-col gap-5 flex-1 min-h-0">
                {dialogData.children?.(errorText, dialogData.isPending)}
              </div>

              <MotionIconButton
                {...getDefaultButtonVariants()}
                onClick={() =>
                  setDialogData((prev) => ({ ...prev, isOpen: false }))
                }
                className="absolute top-2 right-2"
                type="button"
              >
                <XMark />
              </MotionIconButton>
            </motion.form>
          </>
        )}
      </AnimatePresence>
    </dialog>
  );
}
