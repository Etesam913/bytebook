import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AnimatePresence, motion } from 'motion/react';
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useRef,
} from 'react';
import { easingFunctions, getDefaultButtonVariants } from '../../../animations';
import { SubmitLink } from '../../../icons/submit-link';
import type { FloatingDataType } from '../../../types';
import { MotionButton } from '../../buttons';
import { TOGGLE_LINK_COMMAND } from '../nodes/link';

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
          transition={{ ease: easingFunctions['ease-out-circ'] }}
          className="absolute bg-white bg-opacity-[98] dark:bg-zinc-750 p-1 rounded-md shadow-lg flex items-center gap-2 z-10 border-[1px] border-zinc-300 dark:border-zinc-600"
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
          className="absolute bg-zinc-100 dark:bg-zinc-750 p-2 rounded-md bg-opacity-95 shadow-lg flex items-center gap-2 z-50"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
              url: inputRef.current?.value ?? '',
            });
            setFloatingData((prev) => ({
              ...prev,
              isOpen: false,
              type: null,
            }));
          }}
          onBlur={() =>
            setFloatingData((prev) => ({
              ...prev,
              isOpen: false,
              type: null,
            }))
          }
        >
          <input
            ref={inputRef}
            defaultValue={'https://'}
            onClick={(e) => e.stopPropagation()}
            className="py-1 px-2 rounded-md dark:bg-zinc-750 w-96"
          />
          <MotionButton
            type="submit"
            {...getDefaultButtonVariants()}
            className="!dark:bg-zinc-750"
          >
            <SubmitLink />
          </MotionButton>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
