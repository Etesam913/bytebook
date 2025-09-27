import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AnimatePresence, motion } from 'motion/react';
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useRef,
} from 'react';
import { easingFunctions, getDefaultButtonVariants } from '../../../animations';
import { SubmitLink } from '../../../icons/submit-link';
import type { FloatingDataType } from '../../../types';
import { MotionButton } from '../../buttons';
import { TOGGLE_LINK_COMMAND } from '../nodes/link';
import { Input } from '../../input';
import { useSetAtom } from 'jotai';
import { trapFocusContainerAtom } from '../../../atoms';

export function FloatingMenuPlugin({
  floatingData,
  setFloatingData,
  children,
}: {
  floatingData: FloatingDataType;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  children: ReactNode;
}) {
  const [editor] = useLexicalComposerContext();
  const isTextFormatMenuOpen =
    floatingData.isOpen && floatingData.type === 'text-format';
  const isLinkMenuOpen = floatingData.isOpen && floatingData.type === 'link';
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const setTrapFocusContainer = useSetAtom(trapFocusContainerAtom);

  useEffect(() => {
    if (isLinkMenuOpen && floatingData.type === 'link' && floatingData.isOpen) {
      setTrapFocusContainer(formRef.current);
    } else {
      setTrapFocusContainer(null);
    }
  }, [isLinkMenuOpen, formRef, floatingData]);

  return (
    <AnimatePresence>
      {isTextFormatMenuOpen && (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            top: floatingData.top + 25,
            left: floatingData.left,
          }}
          ref={formRef}
          transition={{ ease: easingFunctions['ease-out-circ'] }}
          className="absolute bg-white dark:bg-zinc-750 p-1 rounded-md shadow-lg flex items-center gap-2 z-10 border-[1px] border-zinc-300 dark:border-zinc-600"
        >
          {children}
        </motion.form>
      )}

      {isLinkMenuOpen && (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
          }}
          exit={{ opacity: 0 }}
          style={{
            top: floatingData.top + 12,
            left: floatingData.left,
          }}
          className="absolute bg-zinc-50 dark:bg-zinc-800 p-1 rounded-md bg-opacity-95 shadow-lg flex items-center gap-3 z-50 border-[1.25px] border-zinc-300 dark:border-zinc-700"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            let newUrl: string | null = inputRef.current?.value.trim() ?? null;
            if (newUrl?.length === 0) {
              newUrl = null;
            }
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
              url: newUrl,
            });
            setFloatingData((prev) => ({
              ...prev,
              isOpen: false,
              type: null,
            }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setFloatingData((prev) => ({
                ...prev,
                isOpen: false,
                type: null,
              }));
            }
          }}
        >
          {/* <input
            ref={inputRef}
            onClick={(e) => e.stopPropagation()}
            className="py-1 px-2 rounded-md dark:bg-zinc-750 w-96"
            autoFocus
          /> */}
          <Input
            ref={inputRef}
            labelProps={{}}
            inputProps={{
              defaultValue: floatingData.previousUrl ?? 'https://',
              autoFocus: true,
              className: 'text-sm w-64',
              placeholder: 'https://example.com',
            }}
            helperText="Enter a URL to create a link"
          />
          <MotionButton type="submit" {...getDefaultButtonVariants()}>
            <SubmitLink height={18} width={18} />
          </MotionButton>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
