import { JSX, Suspense, lazy, useEffect, useRef } from 'react';
import { SendExecuteRequest } from '../../../bindings/github.com/etesam913/bytebook/services/codeservice';
import { langs } from '@uiw/codemirror-extensions-langs';
import type { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { nord } from '@uiw/codemirror-theme-nord';
import { BasicSetupOptions, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { PythonLogo } from '../../icons/python-logo';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { getDefaultButtonVariants } from '../../animations';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom, pythonKernelStatusAtom } from '../../atoms';
import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { Trash } from '../../icons/trash';
import { Play } from '../../icons/circle-play';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { removeDecoratorNode } from '../../utils/commands';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { cn } from '../../utils/string-formatting';
import { Languages } from '../editor/nodes/code';
import { GolangLogo } from '../../icons/golang-logo';
import { MediaStop } from '../../icons/media-stop';

const CodeMirror = lazy(() => import('@uiw/react-codemirror'));

type LanguageSetting = {
  basicSetup?: BasicSetupOptions;
  extension: () => LanguageSupport | StreamLanguage<unknown>;
  icon: JSX.Element;
};

const languageToSettings: Record<Languages, LanguageSetting> = {
  python: {
    basicSetup: { tabSize: 4 },
    extension: langs.python,
    icon: <PythonLogo width={14} height={14} />,
  },
  go: {
    basicSetup: { tabSize: 4 },
    extension: langs.go,
    icon: <GolangLogo width={16} height={16} />,
  },
};

export function Code({
  code,
  setCode,
  language,
  nodeKey,
}: {
  code: string;
  setCode: (newCode: string) => void;
  language: Languages;
  nodeKey: string;
}) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const [lexicalEditor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const pythonKernelStatus = useAtomValue(pythonKernelStatusAtom);

  const focusEditor = () => {
    if (editorRef.current?.view) {
      editorRef.current.view.focus();
    }
  };

  useEffect(() => {
    if (isSelected) {
      focusEditor();
    }
  }, [isSelected]);

  return (
    <div
      className={cn(
        'flex overflow-hidden border-2 dark:bg-[#2e3440] transition-colors border-zinc-200 dark:border-zinc-700 rounded-md',
        isSelected && '!border-(--accent-color)'
      )}
    >
      <div className="flex flex-col justify-end gap-2 border-r-1 px-1 pt-2.5 pb-1 border-zinc-200 dark:border-zinc-700">
        {(pythonKernelStatus === 'busy' ||
          pythonKernelStatus === 'starting') && (
          <Loader className="mx-auto" height={18} width={18} />
        )}
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={async () => {
            const code = editorRef.current?.view?.state.doc.toString();
            if (!code) return;
            await SendExecuteRequest(language, code);
          }}
        >
          {pythonKernelStatus === 'busy' ? <MediaStop /> : <Play />}
        </MotionIconButton>
      </div>
      <div className="flex-1 overflow-x-auto">
        <Suspense
          fallback={<Loader className="mx-auto mt-3" height={18} width={18} />}
        >
          <header className="flex justify-between gap-1.5 font-code text-xs px-2 py-1 border-b-1 border-b-zinc-200 dark:border-b-zinc-700">
            <span className="flex items-center gap-1.5">
              {languageToSettings[language].icon}
              <p>{language}</p>
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
            value={code}
            onChange={(newCode) => {
              setCode(newCode);
            }}
            extensions={[languageToSettings[language].extension()]}
            theme={isDarkModeOn ? nord : vscodeLight}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                document.getElementById('content-editable-editor')?.focus();
              } else if (e.key === 'Backspace') {
                // Fixes weird bug where pressing backspace at beginning of first line focuses the <body> tag
                setTimeout(() => {
                  focusEditor();
                }, 50);
              } else {
                e.stopPropagation();
              }
            }}
            onClick={() => {
              clearSelection();
              setSelected(true);
            }}
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              ...languageToSettings[language].basicSetup,
            }}
          />
          <footer className="flex justify-between gap-1.5 font-code text-xs pl-1 pr-2 py-1.5 border-t-1 border-t-zinc-200 dark:border-t-zinc-700"></footer>
          {/* <Button onClick={handleRunButtonClick}>Run</Button> */}
        </Suspense>
      </div>
    </div>
  );
}
