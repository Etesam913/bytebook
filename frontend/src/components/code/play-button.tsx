import { MotionIconButton } from '../buttons';
import { Play } from '../../icons/circle-play';
import { MediaStop } from '../../icons/media-stop';
import { useAtomValue } from 'jotai/react';
import { pythonKernelStatusAtom } from '../../atoms';
import { getDefaultButtonVariants } from '../../animations';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useSendExecuteRequestMutation } from '../../hooks/code';
import { Languages } from '../editor/nodes/code';
import { runCode } from '../../utils/code';

export function PlayButton({
  codeBlockId,
  codeMirrorInstance,
  language,
}: {
  codeBlockId: string;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  language: Languages;
}) {
  const pythonKernelStatus = useAtomValue(pythonKernelStatusAtom);
  const { mutate: executeCode } = useSendExecuteRequestMutation(
    codeBlockId,
    language
  );

  return (
    <MotionIconButton
      {...getDefaultButtonVariants()}
      onClick={() => runCode(codeMirrorInstance, executeCode)}
    >
      {pythonKernelStatus === 'busy' ? <MediaStop /> : <Play />}
    </MotionIconButton>
  );
}
