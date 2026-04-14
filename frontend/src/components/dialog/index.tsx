import { AnimatePresence, motion } from 'motion/react';
import { useAtom, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import useMeasure from 'react-use-measure';
import {
  Dialog as AriaDialog,
  Form,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import { dialogDataAtom, sidebarSelectionAtom } from '../../atoms';
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
  const [errorText, setErrorText] = useState('');
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);
  const formRef = useRef<HTMLFormElement>(null);

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
    setSidebarSelection((prev) => ({ ...prev, selections: new Set() }));
  };

  return (
    <ModalOverlay
      isDismissable
      isOpen={dialogData.isOpen}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
      className="fixed inset-0 z-40 bg-black/40 font-display transition-opacity duration-150 ease-out data-[entering]:opacity-0 data-[exiting]:opacity-0"
    >
      <Modal className="fixed inset-0 z-60 flex items-center justify-center transition duration-150 ease-out data-[entering]:opacity-0 data-[entering]:scale-95 data-[exiting]:opacity-0 data-[exiting]:scale-95">
        <AriaDialog className="outline-none">
          <div
            onKeyDown={(e) => {
              if (e.metaKey && e.key === 'Enter') {
                formRef.current?.requestSubmit();
              }
            }}
          >
            <Form
              ref={formRef}
              action={async (formData) => {
                if (!dialogData.onSubmit) return;

                setDialogData((prev) => ({ ...prev, isPending: true }));
                const result = await dialogData.onSubmit(
                  formData,
                  setErrorText
                );
                setDialogData((prev) => ({ ...prev, isPending: false }));

                if (result) {
                  closeDialog();
                }
              }}
              className={cn(
                'bg-zinc-50 dark:bg-zinc-800 py-3 w-[min(368px,90vw)] rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 max-h-11/12 flex flex-col relative',
                dialogData.dialogClassName
              )}
            >
              <Heading
                slot="title"
                className="px-3 text-xl pb-2 border-b-2 border-zinc-150 dark:border-zinc-750"
              >
                {dialogData.title}
              </Heading>

              <div className="py-2 px-3 overflow-x-hidden flex flex-col gap-5 flex-1 min-h-0">
                {dialogData.children?.(errorText, dialogData.isPending)}
              </div>

              <MotionIconButton
                {...getDefaultButtonVariants()}
                onClick={closeDialog}
                className="absolute top-2 right-2"
                type="button"
                aria-label="Close dialog"
              >
                <XMark />
              </MotionIconButton>
            </Form>
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
