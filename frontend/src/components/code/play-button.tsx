import { MotionIconButton } from '../buttons';
import { Play } from '../../icons/circle-play';
import { MediaStop } from '../../icons/media-stop';
import { useAtomValue } from 'jotai/react';
import { pythonKernelStatusAtom } from '../../atoms';
import { SendExecuteRequest } from '../../../bindings/github.com/etesam913/bytebook/services/codeservice';
import { getDefaultButtonVariants } from '../../animations';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';

export function PlayButton({
  nodeKey,
  codeMirrorInstance,
  language,
}: {
  nodeKey: string;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  language: string;
}) {
  const pythonKernelStatus = useAtomValue(pythonKernelStatusAtom);

  return (
    <MotionIconButton
      {...getDefaultButtonVariants()}
      onClick={async () => {
        console.log(nodeKey);
        const code = codeMirrorInstance?.view?.state.doc.toString();
        if (!code) return;
        await SendExecuteRequest(language, code);
        console.log(nodeKey);
      }}
    >
      {pythonKernelStatus === 'busy' ? <MediaStop /> : <Play />}
    </MotionIconButton>
  );
}
