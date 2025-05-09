import { UseMutateFunction } from '@tanstack/react-query';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';

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
  >,
  setLastExecutedResult: (result: string) => void
) {
  const newExecutionId = crypto.randomUUID();
  const code = codeMirrorInstance?.view?.state.doc.toString();
  if (code === null || code === undefined) return;
  setLastExecutedResult('');
  executeCode({ code, newExecutionId });
}
