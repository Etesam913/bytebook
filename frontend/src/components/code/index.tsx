import { JSX, Suspense, lazy, useRef } from 'react';
// import { Button } from '../buttons';
// import { SendExecuteRequest } from '../../../bindings/github.com/etesam913/bytebook/services/codeservice';
import { langs } from '@uiw/codemirror-extensions-langs';
import type { LanguageSupport } from '@codemirror/language';
import { nord } from '@uiw/codemirror-theme-nord';
import { BasicSetupOptions, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { PythonLogo } from '../../icons/python-logo';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { getDefaultButtonVariants } from '../../animations';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom } from '../../atoms';
import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { Trash } from '../../icons/trash';
import { Play } from '../../icons/circle-play';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { removeDecoratorNode } from '../../utils/commands';

const CodeMirror = lazy(() => import('@uiw/react-codemirror'));

type Languages = 'python'; //| 'go';
type LanguageSetting = {
  basicSetup?: BasicSetupOptions;
  extension: () => LanguageSupport;
  icon: JSX.Element;
};

const languageToSettings: Record<Languages, LanguageSetting> = {
  python: {
    basicSetup: { tabSize: 4 },
    extension: langs.python,
    icon: <PythonLogo width={14} height={14} />,
  },
};

export function Code({ nodeKey }: { nodeKey: string }) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const currentLanguage = 'python';
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const [lexicalEditor] = useLexicalComposerContext();

  return (
    <div className="flex border-1 dark:bg-[#2e3440] border-zinc-200 dark:border-zinc-700 rounded-md">
      <div className="flex flex-col gap-1.5 justify-between border-r-1 px-1 pt-2.5 pb-1 border-zinc-200 dark:border-zinc-700">
        <Loader className="mx-auto" height={18} width={18} />
        <MotionIconButton {...getDefaultButtonVariants()}>
          <Play />
        </MotionIconButton>
      </div>
      <div className="flex-1">
        <Suspense fallback={<div>Loading...</div>}>
          <header className="flex justify-between gap-1.5 font-code text-xs px-2 py-1 border-b-1 border-b-zinc-200 dark:border-b-zinc-700">
            <span className="flex items-center gap-1.5">
              {languageToSettings[currentLanguage].icon}
              <p>code-block-1.py</p>
            </span>
            <span className="flex items-center gap-1">
              <MotionIconButton
                {...getDefaultButtonVariants()}
                onClick={() => {
                  if (!editorRef.current) return;
                  const editorContent =
                    editorRef.current.view?.state.doc.toString();
                  if (!editorContent) return;
                  navigator.clipboard.writeText(editorContent);
                }}
              >
                <Duplicate2 height={16} width={16} />
              </MotionIconButton>
              <MotionIconButton
                {...getDefaultButtonVariants()}
                onClick={() => {
                  lexicalEditor.update(() => {
                    removeDecoratorNode(nodeKey);
                  });
                }}
              >
                <Trash height={16} width={16} />
              </MotionIconButton>
            </span>
          </header>
          <CodeMirror
            ref={editorRef}
            value={`
print("Hello World")
          `}
            extensions={[languageToSettings[currentLanguage].extension()]}
            theme={isDarkModeOn ? nord : vscodeLight}
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              ...languageToSettings[currentLanguage].basicSetup,
            }}
          />
          <footer className="flex justify-between gap-1.5 font-code text-xs pl-1 pr-2 py-1.5 border-t-1 border-t-zinc-200 dark:border-t-zinc-700"></footer>
          {/* <Button onClick={handleRunButtonClick}>Run</Button> */}
        </Suspense>
      </div>
    </div>
  );
}
