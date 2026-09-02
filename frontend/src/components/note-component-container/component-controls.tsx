import { Browser } from '@wailsio/runtime';
import { type TargetAndTransition, motion } from 'motion/react';
import type { LexicalEditor } from 'lexical';
import type { ReactNode } from 'react';
import { getDefaultButtonVariants } from '@/animations';
import { MotionIconButton } from '@components/buttons';
import { Maximize } from '@/icons/maximize';
import { Link } from '@/icons/link';
import { Trash } from '@/icons/trash';
import { removeDecoratorNode } from '@utils/commands';
import { createFilePath } from '@utils/path';
import { navigate } from 'wouter/use-browser-location';

export function NoteComponentControls({
  buttonOptions,
  editor,
  nodeKey,
  children,
  initial = { opacity: 0, y: -20, x: '-50%' },
  animate = { opacity: 1, y: -30 },
  exit = { opacity: 0, y: -20 },
}: {
  buttonOptions?: {
    trash?: {
      enabled: boolean;
      callback?: () => void;
    };
    fullscreen?: {
      enabled: boolean;
      callback?: () => void;
    };
    link?: {
      enabled: boolean;
      src: string;
    };
  };
  nodeKey: string;
  editor: LexicalEditor;
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  exit?: TargetAndTransition;
  children?: ReactNode;
}) {
  return (
    <motion.div
      className="absolute left-1/2 text-black dark:text-white top-0 bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3 z-20"
      initial={initial}
      animate={animate}
      exit={exit}
    >
      {buttonOptions?.trash?.enabled && (
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
            if (!nodeKey) {
              throw new Error('Node key is not provided for the trash button');
            }
            editor.update(() => {
              removeDecoratorNode(nodeKey);
            });
            buttonOptions.trash?.callback?.();
          }}
        >
          <Trash className="will-change-transform" />
        </MotionIconButton>
      )}
      {buttonOptions?.fullscreen?.enabled && (
        <MotionIconButton
          {...getDefaultButtonVariants({
            disabled: false,
            whileHover: 1.115,
            whileTap: 0.95,
            whileFocus: 1.115,
          })}
          className="p-0 hover:bg-transparent dark:hover:bg-transparent focus-visible:bg-transparent dark:focus-visible:bg-transparent"
          aria-label="Fullscreen"
          onPress={() => {
            buttonOptions.fullscreen?.callback?.();
          }}
        >
          <Maximize className="will-change-transform" />
        </MotionIconButton>
      )}
      {children}
      {buttonOptions?.link?.enabled && (
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
            const src = buttonOptions.link?.src;
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
      )}
    </motion.div>
  );
}
