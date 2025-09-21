import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { getDefaultButtonVariants } from '../../animations';
import { Trash } from '../../icons/trash';
import { removeDecoratorNode } from '../../utils/commands';
import { MotionIconButton } from '../buttons';

export function DeleteButton({ nodeKey }: { nodeKey: string }) {
  const [lexicalEditor] = useLexicalComposerContext();

  return (
    <MotionIconButton
      {...getDefaultButtonVariants({ disabled: false, whileHover: 1.05, whileTap: 0.975, whileFocus: 1.05 })}
      onClick={() => {
        lexicalEditor.update(() => {
          removeDecoratorNode(nodeKey);
        });
      }}
    >
      <Trash height={18} width={18} />
    </MotionIconButton>
  );
}
