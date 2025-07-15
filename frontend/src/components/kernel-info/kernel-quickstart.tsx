import { Languages } from '../../types';
import { PlainCodeSnippet } from '../plain-code-snippet';
import { MotionButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { FolderOpen } from '../../icons/folder-open';
import { useAtomValue, useSetAtom } from 'jotai';
import { dialogDataAtom, projectSettingsAtom } from '../../atoms';
import { PythonVenvDialog } from '../editor/python-venv-dialog';
import {
  usePythonVenvSubmitMutation,
  useRevealInFinderMutation,
} from '../../hooks/code';
import { ReactNode } from 'react';

function QuickstartHeading({ children }: { children: ReactNode }) {
  return <h4 className="text-zinc-700 dark:text-zinc-300">{children}</h4>;
}

function QuickstartDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-zinc-500 dark:text-zinc-300">{children}</p>;
}

export function KernelQuickstart({ language }: { language: Languages }) {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setDialogData = useSetAtom(dialogDataAtom);
  const { mutateAsync: submitPythonVenv } =
    usePythonVenvSubmitMutation(projectSettings);
  const { mutate: revealInFinder } = useRevealInFinderMutation();

  const renderPythonQuickstart = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Python Setup
        </h3>
        <p className="text-zinc-600 dark:text-zinc-300">
          Python requires a virtual environment and the ipykernel package to run
          code blocks.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>1. Create a Virtual Environment</QuickstartHeading>
        <QuickstartDescription>
          Create a virtual environment in your project directory:
        </QuickstartDescription>
        <PlainCodeSnippet
          code={`cd "${projectSettings.projectPath}/code" && python3 -m venv bytebook-venv`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>
          2. Activate the Virtual Environment
        </QuickstartHeading>
        <PlainCodeSnippet
          code={`source "${projectSettings.projectPath}/code/bytebook-venv/bin/activate"`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>3. Install ipykernel</QuickstartHeading>
        <QuickstartDescription>
          Install the required ipykernel package:
        </QuickstartDescription>
        <PlainCodeSnippet code={`pip install ipykernel`} />
      </div>

      <div className="flex flex-col gap-3">
        <QuickstartHeading>4. Configure Virtual Environment</QuickstartHeading>
        <QuickstartDescription>
          Set up your virtual environment path in Bytebook:
        </QuickstartDescription>
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
        <QuickstartHeading>5. Restart Bytebook</QuickstartHeading>
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>6. Create a Python code block</QuickstartHeading>
        <QuickstartDescription>
          Go into a note and type /python
        </QuickstartDescription>
      </div>
    </div>
  );

  const renderGoQuickstart = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Go Setup
        </h3>
        <p className="text-zinc-600 dark:text-zinc-300">
          Go requires the gonb kernel to run code blocks in Bytebook.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>1. Install gonb</QuickstartHeading>
        <QuickstartDescription>
          Install the gonb kernel for Go, goimports, and gopls:
        </QuickstartDescription>
        <PlainCodeSnippet
          code={`go install github.com/janpfeifer/gonb@latest && go install golang.org/x/tools/cmd/goimports@latest && go install golang.org/x/tools/gopls@latest`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>2. Install the Jupyter Kernel</QuickstartHeading>
        <QuickstartDescription>
          Register gonb as a Jupyter kernel:
        </QuickstartDescription>
        <PlainCodeSnippet code={`gonb --install`} />
      </div>
      <div className="flex flex-col gap-2">
        <QuickstartHeading>3. Create a Go code block</QuickstartHeading>
        <QuickstartDescription>
          Go into a note and type /go
        </QuickstartDescription>
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>3. Restart Bytebook</QuickstartHeading>
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>4. Create a Go code block</QuickstartHeading>
        <QuickstartDescription>
          Go into a note and type /go
        </QuickstartDescription>
      </div>
    </div>
  );

  const renderJavaScriptQuickstart = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          JavaScript/Deno Setup
        </h3>
        <p className="text-zinc-600 dark:text-zinc-300">
          JavaScript code blocks run using Deno, which provides a secure runtime
          for JavaScript and TypeScript.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>1. Install Deno</QuickstartHeading>
        <QuickstartDescription>
          Install Deno using the official installer:
        </QuickstartDescription>
        <PlainCodeSnippet
          code={`curl -fsSL https://deno.land/install.sh | sh`}
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Or on macOS with Homebrew:
        </p>
        <PlainCodeSnippet code={`brew install deno`} />
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>2. Install Deno Jupyter Kernel</QuickstartHeading>
        <QuickstartDescription>
          Install the Jupyter kernel for Deno:
        </QuickstartDescription>
        <PlainCodeSnippet code={`deno jupyter --unstable --install`} />
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>3. Create a JavaScript code block</QuickstartHeading>
        <QuickstartDescription>
          Go into a note and type /javascript
        </QuickstartDescription>
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>3. Restart Bytebook</QuickstartHeading>
      </div>

      <div className="flex flex-col gap-2">
        <QuickstartHeading>4. Create a JavaScript code block</QuickstartHeading>
        <QuickstartDescription>
          Go into a note and type /javascript
        </QuickstartDescription>
      </div>
    </div>
  );

  const renderJavaQuickstart = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Java Setup
        </h3>
        <p className="">
          Java code blocks run using the JJava kernel, which provides an
          interactive Java environment with modern Java features.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-zinc-700 dark:text-zinc-200">
          1. Download JJava kernelspec
        </h4>
        <QuickstartDescription>
          Download the zip file that ends with kernelspec.zip from the{' '}
          <a className="link" href="https://github.com/dflib/jjava/releases">
            GitHub releases page
          </a>{' '}
          and unzip it.
        </QuickstartDescription>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-zinc-700 dark:text-zinc-200">
          2. Install JJava Kernel
        </h4>
        <PlainCodeSnippet
          code={`jupyter kernelspec install {pathToUnzippedFolder} --user --name=java`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-zinc-700 dark:text-zinc-200">3. Move .jar files</h4>
        <QuickstartDescription>
          Move the <span className="font-code">jjava-launcher.jar</span> file
          and the <span className="font-code">jjava.jar</span> file to the{' '}
          <button
            className="link"
            onClick={() =>
              revealInFinder({
                path: `${projectSettings.projectPath}/code/java-resource`,
              })
            }
          >
            java-resource/
          </button>{' '}
          directory.
        </QuickstartDescription>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-zinc-700 dark:text-zinc-200">
          4. Restart Bytebook
        </h4>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-zinc-700 dark:text-zinc-200">
          5. Create a Java code block
        </h4>
        <QuickstartDescription>
          Go into a note and type /java
        </QuickstartDescription>
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
      case 'java':
        return renderJavaQuickstart();
      default:
        return (
          <div className="text-center py-8">
            <p className="text-zinc-500 dark:text-zinc-300">
              Quickstart guide not available for this kernel.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-750 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
        Quick Start Guide
      </h2>
      {renderContent()}
    </div>
  );
}
