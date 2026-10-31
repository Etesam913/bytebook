import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import {
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalEditor,
} from 'lexical';
export function getCodemirrorKeymap({
  isExpanded,
  lexicalEditor,
  setSelected,
}: {
  isExpanded: boolean;
  lexicalEditor: LexicalEditor;
  setSelected: (selected: boolean) => void;
}) {
  return Prec.highest(
    keymap.of([
      {
        key: 'ArrowUp',
        run: (view) => {
          if (isExpanded) return false;
          const cursorPos = view.state.selection.main.head;
          const currentLine = view.state.doc.lineAt(cursorPos).number - 1;
          if (currentLine <= 0) {
            const arrowUpEvent = new KeyboardEvent('keydown', {
              key: 'ArrowUp',
              code: 'ArrowUp',
              keyCode: 38,
              which: 38,
              bubbles: true,
              cancelable: true,
            });
            lexicalEditor.update(() => {
              lexicalEditor.dispatchCommand(KEY_ARROW_UP_COMMAND, arrowUpEvent);
            });
            return false;
          }
          setSelected(true);
          return false;
        },
      },
      {
        key: 'ArrowDown',
        run: (view) => {
          if (isExpanded) return false;
          const cursorPos = view.state.selection.main.head;
          const currentLine = view.state.doc.lineAt(cursorPos).number + 1;
          if (currentLine > view.state.doc.lines) {
            const arrowDownEvent = new KeyboardEvent('keydown', {
              key: 'ArrowDown',
              code: 'ArrowDown',
              keyCode: 40,
              which: 40,
              bubbles: true,
              cancelable: true,
            });
            lexicalEditor.update(() => {
              lexicalEditor.dispatchCommand(
                KEY_ARROW_DOWN_COMMAND,
                arrowDownEvent
              );
            });
            return true;
          }
          setSelected(true);
          return false;
        },
      },
    ])
  );
}
