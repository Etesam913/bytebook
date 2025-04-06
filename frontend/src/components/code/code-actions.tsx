import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { MotionIconButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { Duplicate2 } from '../../icons/duplicate-2';
import { Trash } from '../../icons/trash';
import { Maximize } from '../../icons/maximize';
import { CodeBlockStatus, Languages } from '../../types';
import { motion } from 'motion/react';
import { PlayButton } from './play-button';
import { LexicalEditor } from 'lexical';
import { removeDecoratorNode } from '../../utils/commands';
import { Minimize } from '../../icons/minimize';

export function CodeActions({
  id,
  codeMirrorInstance,
  language,
  status,
  setStatus,
  setLastExecutedResult,
  isExpanded,
  setIsExpanded,
  nodeKey,
  lexicalEditor,
}: {
  id: string;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  language: Languages;
  status: CodeBlockStatus;
  setStatus: (newStatus: CodeBlockStatus) => void;
  setLastExecutedResult: (result: string | null) => void;
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  nodeKey: string;
  lexicalEditor: LexicalEditor;
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
        setLastExecutedResult={setLastExecutedResult}
      />
      <MotionIconButton
        {...getDefaultButtonVariants(false, 1.05, 0.975, 1.05)}
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        {isExpanded ? <Minimize /> : <Maximize />}
      </MotionIconButton>
      <MotionIconButton
        {...getDefaultButtonVariants(false, 1.05, 0.975, 1.05)}
        onClick={() => {
          if (!codeMirrorInstance) return;
          const editorContent = codeMirrorInstance.view?.state.doc.toString();
          if (!editorContent) return;
          navigator.clipboard.writeText(editorContent);
        }}
      >
        <Duplicate2 height={18} width={18} />
      </MotionIconButton>
      <MotionIconButton
        {...getDefaultButtonVariants(false, 1.05, 0.975, 1.05)}
        onClick={() => {
          lexicalEditor.update(() => {
            removeDecoratorNode(nodeKey);
          });
        }}
      >
        <Trash height={18} width={18} />
      </MotionIconButton>
    </motion.div>
  );
}
