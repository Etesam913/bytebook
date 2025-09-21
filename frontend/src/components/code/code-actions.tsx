import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { MotionIconButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { Duplicate2 } from '../../icons/duplicate-2';
import { Maximize } from '../../icons/maximize';
import { CodeBlockStatus, Languages } from '../../types';
import { motion } from 'motion/react';
import { PlayButton } from './play-button';
import { Minimize } from '../../icons/minimize';
import { DeleteButton } from './delete-button';

export function CodeActions({
  id,
  codeMirrorInstance,
  language,
  status,
  setStatus,
  isExpanded,
  nodeKey,
  setIsExpanded,
}: {
  id: string;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  language: Languages;
  status: CodeBlockStatus;
  setStatus: (newStatus: CodeBlockStatus) => void;
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  nodeKey: string;
}) {
  return (
    <motion.div
      layout="position"
      className="absolute flex gap-1 top-1 right-1 z-10 p-1 border-1 border-zinc-200 dark:border-zinc-600 rounded-md shadow-lg bg-white dark:bg-[#2e3440]"
    >
      <PlayButton
        codeBlockId={id}
        codeMirrorInstance={codeMirrorInstance}
        language={language}
        status={status}
        setStatus={setStatus}
      />
      <MotionIconButton
        {...getDefaultButtonVariants({ disabled: false, whileHover: 1.05, whileTap: 0.975, whileFocus: 1.05 })}
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        {isExpanded ? <Minimize /> : <Maximize />}
      </MotionIconButton>
      <MotionIconButton
        {...getDefaultButtonVariants({ disabled: false, whileHover: 1.05, whileTap: 0.975, whileFocus: 1.05 })}
        onClick={() => {
          if (!codeMirrorInstance) return;
          const editorContent = codeMirrorInstance.view?.state.doc.toString();
          if (!editorContent) return;
          navigator.clipboard.writeText(editorContent);
        }}
      >
        <Duplicate2 height={18} width={18} />
      </MotionIconButton>
      <DeleteButton nodeKey={nodeKey} />
    </motion.div>
  );
}
