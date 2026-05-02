import { Play } from '../../icons/circle-play';
import {
  useEnsureKernelMutation,
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
} from '../../hooks/code';
import { handleRunOrInterruptCode } from '../../utils/code';
import type { CodeMirrorRef } from './types';
import {
  CodeBlockStatus,
  KernelInstanceData,
  Languages,
  LanguagesWithKernels,
} from '../../types';
import { MediaStop } from '../../icons/media-stop';
import { Loader } from '../../icons/loader';
import { getDefaultStore } from 'jotai';
import { kernelInstancesAtom } from '../../atoms';
import { Tooltip } from '../tooltip';
import { MotionIconButton } from '../buttons';
import type { RefObject } from 'react';
import { useCurrentNoteId } from '../../hooks/routes';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

function getInstanceForNote(
  noteId: string,
  language: LanguagesWithKernels
): KernelInstanceData | null {
  const all = getDefaultStore().get(kernelInstancesAtom);
  return (
    Object.values(all).find(
      (i) => i.noteId === noteId && i.language === language
    ) ?? null
  );
}

export function PlayButton({
  codeBlockId,
  codeMirrorInstance,
  language,
  status,
  setStatus,
  isExpanded,
  dialogRef,
  kernelInstanceId,
}: {
  codeBlockId: string;
  codeMirrorInstance: CodeMirrorRef;
  language: Languages;
  status: CodeBlockStatus;
  setStatus: (status: CodeBlockStatus) => void;
  isExpanded?: boolean;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  kernelInstanceId: string | null;
}) {
  const noteId = useCurrentNoteId();
  const [editor] = useLexicalComposerContext();
  const { mutate: executeCode } = useSendExecuteRequestMutation({
    noteId,
    codeBlockId,
    language,
    setStatus,
    editor,
  });
  const { mutate: interruptExecution } = useSendInterruptRequestMutation();
  const { mutate: ensureKernel } = useEnsureKernelMutation();

  const tooltipRoot = isExpanded && dialogRef ? dialogRef : undefined;

  const statusToLabel: Record<CodeBlockStatus, string> = {
    busy: 'Stop execution',
    starting: 'Starting kernel',
    queueing: 'Loading',
    idle: 'Run code',
  };
  const buttonLabel = statusToLabel[status];

  return (
    <Tooltip
      placement={isExpanded ? 'bottom' : 'top'}
      content={
        status === 'starting'
          ? 'Starting kernel...'
          : status === 'queueing'
            ? 'Loading ...'
            : 'Run code'
      }
      root={tooltipRoot}
    >
      <MotionIconButton
        aria-label={buttonLabel}
        isDisabled={status === 'starting' || status === 'queueing'}
        onClick={() => {
          handleRunOrInterruptCode({
            status,
            noteId,
            codeBlockId,
            codeBlockLanguage: language,
            kernelInstanceId,
            getInstanceForNote,
            interruptExecution,
            codeMirrorInstance,
            executeCode,
            ensureKernel,
          });
        }}
      >
        {status === 'busy' && (
          <MediaStop
            className="will-change-transform"
            width="1.25rem"
            height="1.25rem"
          />
        )}
        {status === 'queueing' && (
          <Loader
            className="will-change-transform"
            width="1.25rem"
            height="1.25rem"
          />
        )}
        {status === 'starting' ||
          (status === 'idle' && (
            <Play
              className="will-change-transform"
              width="1.25rem"
              height="1.25rem"
            />
          ))}
      </MotionIconButton>
    </Tooltip>
  );
}
