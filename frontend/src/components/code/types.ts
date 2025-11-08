// Local type definition to avoid importing from @uiw/react-codemirror in the main bundle
// This mirrors the ReactCodeMirrorRef type from @uiw/react-codemirror while keeping the fields typed.
import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

export type CodeMirrorRef = {
  editor?: HTMLDivElement | null;
  state?: EditorState | null;
  view?: EditorView | null;
} | null;
