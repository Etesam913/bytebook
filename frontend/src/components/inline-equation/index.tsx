import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { Pen } from '../../icons/pen';
import { ReturnKey } from '../../icons/return-key';
import { cn } from '../../utils/string-formatting';
import { Button } from '../buttons';
import { NoteComponentControls } from '../note-component-container/component-controls';
import { KatexRenderer } from './katex-renderer';

export function InlineEquation({
  nodeKey,
  equationFromNode,
  defaultIsEditing,
  writeEquationToNode,
}: {
  nodeKey: string;
  equationFromNode: string;
  defaultIsEditing: boolean;
  writeEquationToNode: (equation: string) => void;
}) {
  const [equation, setEquation] = useState(equationFromNode);
  const [editor] = useLexicalComposerContext();
  const [isSelected] = useLexicalNodeSelection(nodeKey);
  const inlineEquationRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(defaultIsEditing);

  return (
    <div
      data-interactable="true"
      data-node-key={nodeKey}
      ref={inlineEquationRef}
      className={cn(
        'relative w-fit inline-block',
        isSelected && 'relative bg-(--accent-color-highlight)'
      )}
    >
      <AnimatePresence>
        {isEditing && (
          <motion.form
            onSubmit={(e) => {
              e.preventDefault();
              setIsEditing(false);
              writeEquationToNode(equation);
            }}
            onBlur={() => {
              setIsEditing(false);
              setEquation(equationFromNode);
            }}
            initial={{ opacity: 0, y: -35 }}
            animate={{ opacity: 1, y: -45 }}
            exit={{ opacity: 0, y: -35 }}
            className="absolute top-0 left-0 flex rounded-md shadow-md items-center gap-2 bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 px-1 py-0.5 z-20"
          >
            <input
              type="text"
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEquation(equationFromNode);
                }
              }}
              autoFocus
              value={equation}
              className="bg-transparent rounded-md py-1 px-1 text-sm w-56"
              onChange={(e) => setEquation(e.target.value)}
            />
            <Button
              type="submit"
              className="text-nowrap gap-1 text-xs border-0"
            >
              Done <ReturnKey strokewidth="1.5" />
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSelected && !isEditing && (
          <NoteComponentControls
            buttonOptions={{
              trash: {
                enabled: true,
              },
            }}
            nodeKey={nodeKey}
            editor={editor}
          >
            <motion.button
              {...getDefaultButtonVariants({ disabled: false, whileHover: 1.115, whileTap: 0.95, whileFocus: 1.115 })}
              type="button"
              onClick={() => setIsEditing(true)}
            >
              <Pen className="will-change-transform" />
            </motion.button>
          </NoteComponentControls>
        )}
      </AnimatePresence>
      <KatexRenderer equation={equation} />
    </div>
  );
}
