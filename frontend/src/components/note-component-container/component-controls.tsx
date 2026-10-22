import { Browser } from '@wailsio/runtime';
import { motion } from 'motion/react';
import type { LexicalEditor } from 'lexical';
import { getDefaultButtonVariants } from '@/animations';
import { MotionIconButton } from '@components/buttons';
import { Link } from '@/icons/link';
import { Trash } from '@/icons/trash';
import { removeDecoratorNode } from '@utils/commands';
import { createFilePath } from '@utils/path';
import { navigate } from 'wouter/use-browser-location';

export function NoteComponentControls({
  src,
  editor,
  nodeKey,
}: {
  src: string;
  nodeKey: string;
  editor: LexicalEditor;
}) {
  return (
    <motion.div
      className="absolute left-1/2 text-black dark:text-white top-0 bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3 z-20"
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: -30 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <MotionIconButton
        {...getDefaultButtonVariants({
          disabled: false,
          whileHover: 1.115,
          whileTap: 0.95,
          whileFocus: 1.115,
        })}
        className="p-0 hover:bg-transparent dark:hover:bg-transparent focus-visible:bg-transparent dark:focus-visible:bg-transparent"
        aria-label="Delete component"
        onPress={() => {
          editor.update(() => {
            removeDecoratorNode(nodeKey);
          });
        }}
      >
        <Trash className="will-change-transform" />
      </MotionIconButton>
      <MotionIconButton
        {...getDefaultButtonVariants({
          disabled: false,
          whileHover: 1.115,
          whileTap: 0.95,
          whileFocus: 1.115,
        })}
        className="p-0 hover:bg-transparent dark:hover:bg-transparent focus-visible:bg-transparent dark:focus-visible:bg-transparent"
        aria-label="Open link"
        onPress={() => {
          if (!src) return;
          if (src.startsWith('/notes')) {
            const filePath = createFilePath(src.replace(/^\/notes\//, ''));
            if (filePath) {
              navigate(filePath.encodedFileUrl);
            }
          } else {
            void Browser.OpenURL(src);
          }
        }}
      >
        <Link className="will-change-transform" />
      </MotionIconButton>
    </motion.div>
  );
}
