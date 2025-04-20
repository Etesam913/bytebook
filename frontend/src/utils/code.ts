import { UseMutateFunction } from '@tanstack/react-query';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { FormEvent } from 'react';
import { IsPathAValidVirtualEnvironment } from '../../bindings/github.com/etesam913/bytebook/services/codeservice';

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

export async function pythonVirtualEnvironmentSubmit(
  e: FormEvent<HTMLFormElement>,
  setErrorText: (error: string) => void
) {
  const formData = new FormData(e.target as HTMLFormElement);
  const entries = Array.from(formData.entries());
  const selectedVirtualEnvironmentElement = entries.at(0);

  if (selectedVirtualEnvironmentElement) {
    const venvPath = selectedVirtualEnvironmentElement[1];
    try {
      const isVenvPathValid = await IsPathAValidVirtualEnvironment(
        venvPath as string
      );
      if (isVenvPathValid.success) {
        setErrorText('');
        return true;
      }
      throw new Error(isVenvPathValid.message);
    } catch (error) {
      if (error instanceof Error) {
        setErrorText(error.message);
      }
      return false;
    }
  }
  return false;
}
