import { AnimatePresence, motion } from 'framer-motion';
import { useAtom, useAtomValue } from 'jotai';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import useMeasure from 'react-use-measure';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import { backendQueryAtom, dialogDataAtom } from '../../atoms';
import { XMark } from '../../icons/circle-xmark';
import { cn } from '../../utils/string-formatting';
import { MotionIconButton } from '../buttons';
import { useTrapFocus } from './hooks';
import { Shade } from './shade';

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
            transition: {
              ease: easingFunctions['ease-out-cubic'],
            },
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
  const backendQuery = useAtomValue(backendQueryAtom);
  const [errorText, setErrorText] = useState('');
  const modalRef = useRef<HTMLFormElement>(null);
  useTrapFocus(modalRef, dialogData.isOpen);

  function resetDialogState() {
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
  }

  function handleDialogKeyDown(e: globalThis.KeyboardEvent) {
    if (e.key === 'Escape') {
      resetDialogState();
    }
  }

  // Handles escape key when dialog is open
  useEffect(() => {
    const keyDownHandler = (e: globalThis.KeyboardEvent) =>
      handleDialogKeyDown(e);

    if (dialogData.isOpen) {
      document.addEventListener('keydown', keyDownHandler);
    }
    return () => {
      document.removeEventListener('keydown', keyDownHandler);
    };
  }, [dialogData.isOpen]);

  return (
    <AnimatePresence>
      {dialogData.isOpen && !backendQuery.isLoading && (
        <>
          <Shade />
          <motion.form
            onKeyDown={(e) => {
              if (e.metaKey && e.key === 'Enter') {
                modalRef.current?.dispatchEvent(new Event('submit'));
              }
            }}
            ref={modalRef}
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (dialogData.onSubmit) {
                setDialogData((prev) => ({
                  ...prev,
                  isPending: true,
                }));
                const result = await dialogData.onSubmit(e, setErrorText);
                setDialogData((prev) => ({
                  ...prev,
                  isPending: false,
                }));
                if (result) resetDialogState();
              }
            }}
            initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }}
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
              'absolute flex flex-col gap-5 bg-zinc-50 dark:bg-zinc-800 z-[60] top-2/4 py-3 px-4 w-[min(23rem,90vw)] rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4',
              dialogData.dialogClassName
            )}
          >
            <h2 className=" text-xl">{dialogData.title}</h2>
            {dialogData.children?.(errorText, dialogData.isPending)}
            <MotionIconButton
              autoFocus
              {...getDefaultButtonVariants()}
              onClick={resetDialogState}
              className="absolute top-2 right-2"
              type="button"
            >
              <XMark />
            </MotionIconButton>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  );
}
