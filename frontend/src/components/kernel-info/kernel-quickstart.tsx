import { Languages } from '../../types';
import { PlainCodeSnippet } from '../plain-code-snippet';
import { MotionButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { FolderOpen } from '../../icons/folder-open';
import { useAtomValue, useSetAtom } from 'jotai';
import { dialogDataAtom, projectSettingsAtom } from '../../atoms';
import { PythonVenvDialog } from '../editor/python-venv-dialog';
import { usePythonVenvSubmitMutation } from '../../hooks/code';

interface KernelQuickstartProps {
  language: Languages;
}

export function KernelQuickstart({ language }: KernelQuickstartProps) {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setDialogData = useSetAtom(dialogDataAtom);
  const { mutateAsync: submitPythonVenv } =
    usePythonVenvSubmitMutation(projectSettings);

  const renderPythonQuickstart = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Python Setup
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          Python requires a virtual environment and the ipykernel package to run
          code blocks.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          1. Create a Virtual Environment
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create a virtual environment in your project directory:
        </p>
        <PlainCodeSnippet
          code={`cd "${projectSettings.projectPath}/code" && python3 -m venv bytebook-venv`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          2. Activate the Virtual Environment
        </h4>
        <PlainCodeSnippet
          code={`source "${projectSettings.projectPath}/code/bytebook-venv/bin/activate"`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          3. Install ipykernel
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Install the required ipykernel package:
        </p>
        <PlainCodeSnippet code={`pip install ipykernel`} />
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          4. Configure Virtual Environment
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Set up your virtual environment path in Bytebook:
        </p>
        <MotionButton
          className="text-center w-fit"
          {...getDefaultButtonVariants()}
          onClick={() => {
            setDialogData({
              isOpen: true,
              isPending: false,
              title: 'Setup Python Virtual Environment',
              dialogClassName: 'w-[min(40rem,90vw)]',
              children: (errorText) => (
                <PythonVenvDialog errorText={errorText} />
              ),
              onSubmit: async (e, setErrorText) => {
                return await submitPythonVenv({ e, setErrorText });
              },
            });
          }}
        >
          <FolderOpen />
          Setup Virtual Environment
        </MotionButton>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          5. Create a Python code block
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Go into a note and type /python
        </p>
      </div>
    </div>
  );

  const renderGoQuickstart = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Go Setup
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          Go requires the gonb kernel to run code blocks in Bytebook.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          1. Install gonb
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Install the gonb kernel for Go, goimports, and gopls:
        </p>
        <PlainCodeSnippet
          code={`go install github.com/janpfeifer/gonb@latest && go install golang.org/x/tools/cmd/goimports@latest && go install golang.org/x/tools/gopls@latest`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          2. Install the Jupyter Kernel
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Register gonb as a Jupyter kernel:
        </p>
        <PlainCodeSnippet code={`gonb --install`} />
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          3. Create a Go code block
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Go into a note and type /go
        </p>
      </div>
    </div>
  );

  const renderJavaScriptQuickstart = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          JavaScript/Deno Setup
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          JavaScript code blocks run using Deno, which provides a secure runtime
          for JavaScript and TypeScript.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          1. Install Deno
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Install Deno using the official installer:
        </p>
        <PlainCodeSnippet
          code={`curl -fsSL https://deno.land/install.sh | sh`}
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Or on macOS with Homebrew:
        </p>
        <PlainCodeSnippet code={`brew install deno`} />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          2. Install Deno Jupyter Kernel
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Install the Jupyter kernel for Deno:
        </p>
        <PlainCodeSnippet code={`deno jupyter --unstable --install`} />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-md text-zinc-700 dark:text-zinc-300">
          3. Create a JavaScript code block
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Go into a note and type /javascript
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (language) {
      case 'python':
        return renderPythonQuickstart();
      case 'go':
        return renderGoQuickstart();
      case 'javascript':
        return renderJavaScriptQuickstart();
      default:
        return (
          <div className="text-center py-8">
            <p className="text-zinc-500 dark:text-zinc-400">
              Quickstart guide not available for this kernel.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
        Quick Start Guide
      </h2>
      {renderContent()}
    </div>
  );
}
