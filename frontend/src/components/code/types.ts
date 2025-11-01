// Local type definition to avoid importing from @uiw/react-codemirror in the main bundle
// This mirrors the ReactCodeMirrorRef type from @uiw/react-codemirror
export type CodeMirrorRef = {
  editor?: HTMLDivElement | null;
  state?: any;
  view?: any;
} | null;
