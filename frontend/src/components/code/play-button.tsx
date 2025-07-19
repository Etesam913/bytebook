import { MotionIconButton } from '../buttons';
import { Play } from '../../icons/circle-play';
import { getDefaultButtonVariants } from '../../animations';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import {
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
  useTurnOnKernelMutation,
} from '../../hooks/code';
import { handleRunOrInterruptCode } from '../../utils/code';
import { CodeBlockStatus, Languages } from '../../types';
import { MediaStop } from '../../icons/media-stop';
import { Loader } from '../../icons/loader';
import { useAtomValue } from 'jotai/react';
import { kernelsDataAtom } from '../../atoms';

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
  const kernelsData = useAtomValue(kernelsDataAtom);

  const { mutate: executeCode } = useSendExecuteRequestMutation(
    codeBlockId,
    language,
    setStatus
  );
  const { mutate: interruptExecution } = useSendInterruptRequestMutation();
  const { mutate: turnOnKernel } = useTurnOnKernelMutation();

  return (
    <MotionIconButton
      {...getDefaultButtonVariants(false, 1.05, 0.975, 1.05)}
      disabled={status === 'starting' || status === 'queueing'}
      onClick={() => {
        handleRunOrInterruptCode({
          status,
          codeBlockId,
          codeBlockLanguage: language,
          interruptExecution,
          codeMirrorInstance,
          executeCode,
          kernelsData,
          turnOnKernel,
        });
      }}
    >
      {status === 'busy' && <MediaStop />}
      {status === 'queueing' && <Loader />}
      {status === 'starting' || (status === 'idle' && <Play />)}
    </MotionIconButton>
  );
}
