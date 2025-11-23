import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { getDefaultButtonVariants } from '../../animations';
import { Trash } from '../../icons/trash';
import { removeDecoratorNode } from '../../utils/commands';
import { motion } from 'motion/react';

export function DeleteButton({ nodeKey }: { nodeKey: string }) {
  const [lexicalEditor] = useLexicalComposerContext();

  return (
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
  );
}
