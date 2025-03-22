import { UseMutateFunction } from '@tanstack/react-query';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';

export function runCode(
  codeMirrorInstance: ReactCodeMirrorRef | null,
  executeCode: UseMutateFunction<
    void,
    Error,
    {
      code: string;
      newExecutionId: string;
    },
    unknown
  >
) {
  const newExecutionId = crypto.randomUUID();
  const code = codeMirrorInstance?.view?.state.doc.toString();
  if (!code) return;
  executeCode({ code, newExecutionId });
}
