import { AnimatePresence, motion } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import useMeasure from 'react-use-measure';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import {
  dialogDataAtom,
  editorAtom,
  selectionRangeAtom,
  trapFocusContainerAtom,
} from '../../atoms';
import { XMark } from '../../icons/circle-xmark';
import { cn } from '../../utils/string-formatting';
import { MotionIconButton } from '../buttons';
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
  const setTrapFocusContainer = useSetAtom(trapFocusContainerAtom);
  const editor = useAtomValue(editorAtom);
  const [errorText, setErrorText] = useState('');
  const modalRef = useRef<HTMLFormElement>(null);
  const setSelectionRange = useSetAtom(selectionRangeAtom);

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
    e.stopPropagation();
    if (e.key === 'Escape') {
      resetDialogState();
    }
  }

  // Handles escape key when dialog is open
  useEffect(() => {
    const keyDownHandler = (e: globalThis.KeyboardEvent) =>
      handleDialogKeyDown(e);

    if (dialogData.isOpen) {
      // The editor should not be able to be edited when the dialog is open
      editor?.blur();
      document.addEventListener('keydown', keyDownHandler);
      setTrapFocusContainer(modalRef.current);
    } else {
      editor?.focus();
      setTrapFocusContainer(null);
    }
    return () => {
      document.removeEventListener('keydown', keyDownHandler);
      setTrapFocusContainer(null);
    };
  }, [dialogData.isOpen]);

  return (
    <AnimatePresence>
      {dialogData.isOpen && (
        <>
          <Shade />
          <motion.form
            onKeyDown={(e) => {
              if (e.metaKey && e.key === 'Enter') {
                modalRef.current?.dispatchEvent(new Event('submit'));
              }
            }}
            ref={(refValue) => {
              modalRef.current = refValue;
              setDialogData((prev) => ({
                ...prev,
                element: refValue ?? undefined,
              }));
            }}
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
                if (result) {
                  resetDialogState();
                  setSelectionRange(new Set());
                }
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
              'absolute bg-zinc-50 dark:bg-zinc-800 z-[60] top-2/4 py-3 w-[min(23rem,90vw)] rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4 max-h-11/12 flex flex-col',
              dialogData.dialogClassName
            )}
          >
            <h2 className="px-3 text-xl pb-2 border-b-2 border-zinc-150 dark:border-zinc-750">
              {dialogData.title}
            </h2>
            <div className="pt-3 pb-2 px-3 overflow-x-hidden overflow-y-auto flex flex-col gap-5 flex-1 min-h-0">
              {dialogData.children?.(errorText, dialogData.isPending)}
            </div>
            <MotionIconButton
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
