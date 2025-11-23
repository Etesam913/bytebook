import { MotionIconButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { Duplicate2 } from '../../icons/duplicate-2';
import { Maximize } from '../../icons/maximize';
import { Minimize } from '../../icons/minimize';
import type { CodeMirrorRef } from './types';

export function CodeActions({
  codeMirrorInstance,
  isExpanded,
  setIsExpanded,
}: {
  codeMirrorInstance: CodeMirrorRef;
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
}) {
  return (
    <div className="absolute flex gap-1 -top-5 right-2.5 z-10 p-1 border border-zinc-200 dark:border-zinc-600 rounded-md shadow-lg cm-background">
      <MotionIconButton
        {...getDefaultButtonVariants({
          disabled: false,
          whileHover: 1.05,
          whileTap: 0.975,
          whileFocus: 1.05,
        })}
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
        {...getDefaultButtonVariants({
          disabled: false,
          whileHover: 1.05,
          whileTap: 0.975,
          whileFocus: 1.05,
        })}
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        {isExpanded ? <Minimize /> : <Maximize />}
      </MotionIconButton>
    </div>
  );
}
