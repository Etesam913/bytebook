import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { getDefaultButtonVariants } from '../../animations';
import { Trash } from '../../icons/trash';
import { removeDecoratorNode } from '../../utils/commands';
import { MotionIconButton } from '../buttons';
import { useSendInterruptRequestMutation } from '../../hooks/code';

export function DeleteButton({
  nodeKey,
  codeBlockId,
}: {
  nodeKey: string;
  codeBlockId: string;
}) {
  const [lexicalEditor] = useLexicalComposerContext();

  const { mutate: interruptExecution } = useSendInterruptRequestMutation(
    codeBlockId,
    () => {
      lexicalEditor.update(() => {
        removeDecoratorNode(nodeKey);
      });
    }
  );

  return (
    <MotionIconButton
      {...getDefaultButtonVariants(false, 1.05, 0.975, 1.05)}
      onClick={() => {
        interruptExecution({ newExecutionId: '' });
      }}
    >
      <Trash height={18} width={18} />
    </MotionIconButton>
  );
}
