import { MotionIconButton } from '../buttons';
import { Play } from '../../icons/circle-play';
import { getDefaultButtonVariants } from '../../animations';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import {
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
} from '../../hooks/code';
import { runCode } from '../../utils/code';
import { CodeBlockStatus, Languages } from '../../types';
import { MediaStop } from '../../icons/media-stop';
import { Loader } from '../../icons/loader';

export function PlayButton({
  codeBlockId,
  codeMirrorInstance,
  language,
  status,
  setStatus,
}: {
  codeBlockId: string;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  language: Languages;
  status: CodeBlockStatus;
  setStatus: (status: CodeBlockStatus) => void;
}) {
  const { mutate: executeCode } = useSendExecuteRequestMutation(
    codeBlockId,
    language,
    setStatus
  );

  const { mutate: interruptExecution } = useSendInterruptRequestMutation();

  return (
    <MotionIconButton
      {...getDefaultButtonVariants(false, 1.05, 0.975, 1.05)}
      disabled={status === 'starting' || status === 'queueing'}
      onClick={() => {
        if (status === 'busy') {
          interruptExecution({
            codeBlockId,
            codeBlockLanguage: language,
            newExecutionId: '',
          });
        } else {
          runCode(codeMirrorInstance, executeCode);
        }
      }}
    >
      {status === 'busy' && <MediaStop />}
      {status === 'queueing' && <Loader />}
      {status === 'starting' || (status === 'idle' && <Play />)}
    </MotionIconButton>
  );
}
