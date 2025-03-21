import { MotionIconButton } from '../buttons';
import { Play } from '../../icons/circle-play';
import { MediaStop } from '../../icons/media-stop';
import { useAtomValue } from 'jotai/react';
import { pythonKernelStatusAtom } from '../../atoms';
import { getDefaultButtonVariants } from '../../animations';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useSendExecuteRequestMutation } from '../../hooks/code';
import { Languages } from '../editor/nodes/code';

export function PlayButton({
  codeBlockId,
  setExecutionId,
  codeMirrorInstance,
  language,
}: {
  codeBlockId: string;
  setExecutionId: (id: string) => void;
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
      onClick={() => {
        const newExecutionId = crypto.randomUUID();
        // setExecutionId(newExecutionId)
        const code = codeMirrorInstance?.view?.state.doc.toString();
        if (!code) return;
        executeCode({ code, newExecutionId });
      }}
    >
      {pythonKernelStatus === 'busy' ? <MediaStop /> : <Play />}
    </MotionIconButton>
  );
}
