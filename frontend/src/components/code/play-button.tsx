import { MotionIconButton } from '../buttons';
import { Play } from '../../icons/circle-play';
import { getDefaultButtonVariants } from '../../animations';
import {
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
  useTurnOnKernelMutation,
} from '../../hooks/code';
import { handleRunOrInterruptCode } from '../../utils/code';
import type { CodeMirrorRef } from './types';
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
  codeMirrorInstance: CodeMirrorRef;
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
      {...getDefaultButtonVariants({
        disabled: false,
        whileHover: 1.05,
        whileTap: 0.975,
        whileFocus: 1.05,
      })}
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
