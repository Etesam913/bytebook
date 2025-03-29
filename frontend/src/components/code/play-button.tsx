import { MotionIconButton } from '../buttons';
import { Play } from '../../icons/circle-play';
import { MediaStop } from '../../icons/media-stop';
import { useAtomValue } from 'jotai/react';
import { kernelsDataAtom } from '../../atoms';
import { getDefaultButtonVariants } from '../../animations';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useSendExecuteRequestMutation } from '../../hooks/code';
import { runCode } from '../../utils/code';
import { Languages } from '../../types';

export function PlayButton({
  codeBlockId,
  codeMirrorInstance,
  language,
}: {
  codeBlockId: string;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  language: Languages;
}) {
  const kernelsData = useAtomValue(kernelsDataAtom);
  const { status } = kernelsData[language];
  const { mutate: executeCode } = useSendExecuteRequestMutation(
    codeBlockId,
    language
  );

  return (
    <MotionIconButton
      {...getDefaultButtonVariants()}
      onClick={() => runCode(codeMirrorInstance, executeCode)}
    >
      {status === 'busy' ? <MediaStop /> : <Play />}
    </MotionIconButton>
  );
}
