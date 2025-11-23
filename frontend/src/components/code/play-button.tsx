import { Play } from '../../icons/circle-play';
import { getDefaultButtonVariants } from '../../animations';
import { motion } from 'motion/react';
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
import { Tooltip } from '../tooltip';

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
    <Tooltip
      delay={{ open: 1200, close: 0 }}
      placement="bottom"
      content={
        status === 'starting'
          ? 'Starting kernel...'
          : status === 'queueing'
            ? 'Loading ...'
            : 'Run code'
      }
    >
      <motion.button
        {...getDefaultButtonVariants({
          disabled: false,
          whileHover: 1.1,
          whileTap: 0.95,
          whileFocus: 1.1,
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
        {status === 'busy' && (
          <MediaStop className="will-change-transform" width={20} height={20} />
        )}
        {status === 'queueing' && (
          <Loader className="will-change-transform" width={20} height={20} />
        )}
        {status === 'starting' ||
          (status === 'idle' && (
            <Play className="will-change-transform" width={20} height={20} />
          ))}
      </motion.button>
    </Tooltip>
  );
}
