import { Browser } from '@wailsio/runtime';
import { type TargetAndTransition, motion } from 'motion/react';
import type { LexicalEditor } from 'lexical';
import type { ReactNode } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { Maximize } from '../../icons/maximize';
import { Link } from '../../icons/link';
import { Trash } from '../../icons/trash';
import { removeDecoratorNode } from '../../utils/commands';
import { FILE_SERVER_URL } from '../../utils/general';
import { LocalFilePath } from '../../utils/path';
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
        <motion.button
          {...getDefaultButtonVariants({
            disabled: false,
            whileHover: 1.115,
            whileTap: 0.95,
            whileFocus: 1.115,
          })}
          type="button"
          aria-label="Delete component"
          onClick={() => {
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
        </motion.button>
      )}

      {buttonOptions?.fullscreen?.enabled && (
        <motion.button
          {...getDefaultButtonVariants({
            disabled: false,
            whileHover: 1.115,
            whileTap: 0.95,
            whileFocus: 1.115,
          })}
          type="button"
          aria-label="Fullscreen"
          onClick={() => {
            buttonOptions.fullscreen?.callback?.();
          }}
        >
          <Maximize className="will-change-transform" />
        </motion.button>
      )}
      {children}
      {buttonOptions?.link?.enabled && (
        <motion.button
          {...getDefaultButtonVariants({
            disabled: false,
            whileHover: 1.115,
            whileTap: 0.95,
            whileFocus: 1.115,
          })}
          type="button"
          aria-label="Open link"
          onClick={() => {
            const src = buttonOptions.link?.src;
            if (!src) return;
            if (src.startsWith(FILE_SERVER_URL)) {
              const segments = src.split('/');
              if (segments.length < 2) {
                return;
              }
              const folderName = segments[segments.length - 2];
              const fileName = segments[segments.length - 1];
              const filePath = new LocalFilePath({
                folder: folderName,
                note: fileName,
              });
              navigate(filePath.getLinkToNote());
            } else {
              Browser.OpenURL(src);
            }
          }}
        >
          <Link title="Open Link" className="will-change-transform" />
        </motion.button>
      )}
    </motion.div>
  );
}
