import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { getDefaultButtonVariants } from '../../animations';
import { Trash } from '../../icons/trash';
import { removeDecoratorNode } from '../../utils/commands';
import { motion } from 'motion/react';
import { Tooltip } from '../tooltip';
import type { RefObject } from 'react';

export function DeleteButton({
  nodeKey,
  isExpanded,
  dialogRef,
}: {
  nodeKey: string;
  isExpanded?: boolean;
  dialogRef?: RefObject<HTMLDialogElement | null>;
}) {
  const [lexicalEditor] = useLexicalComposerContext();
  const tooltipRoot = isExpanded && dialogRef ? dialogRef : undefined;

  return (
    <Tooltip
      content="Delete"
      placement={isExpanded ? 'bottom' : 'top'}
      root={tooltipRoot}
      delay={{ open: 1200, close: 0 }}
    >
      <motion.button
        {...getDefaultButtonVariants({
          disabled: false,
          whileHover: 1.1,
          whileTap: 0.95,
          whileFocus: 1.1,
        })}
        onClick={() => {
          lexicalEditor.update(() => {
            removeDecoratorNode(nodeKey);
          });
        }}
      >
        <Trash className="will-change-transform" height={19} width={19} />
      </motion.button>
    </Tooltip>
  );
}
