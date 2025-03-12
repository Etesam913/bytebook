import { Suspense, lazy, useRef } from 'react';
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
const CodeMirror = lazy(() => import('@uiw/react-codemirror'));

type Languages = 'python'; //| 'go';
type LanguageSetting = {
  basicSetup?: BasicSetupOptions;
  extension: () => LanguageSupport;
};

const languageToSettings: Record<Languages, LanguageSetting> = {
  python: {
    basicSetup: { tabSize: 4 },
    extension: langs.python,
  },
};

export function Code() {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const currentLanguage = 'python';

  return (
    <div className="border-2 bg-[#2e3440] border-zinc-700 rounded-md">
      <Suspense fallback={<div>Loading...</div>}>
        <header className="flex justify-between gap-1.5 font-code text-xs px-2 py-0.5 border-b-2 border-b-zinc-700">
          <span className="flex items-center gap-1.5">
            <PythonLogo width={14} height={14} />
            <p>code-block-1.py</p>
          </span>
          <span>
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
          </span>
        </header>
        <CodeMirror
          ref={editorRef}
          value={`
print("Hello World")
          `}
          extensions={[languageToSettings[currentLanguage].extension()]}
          theme={nord}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            ...languageToSettings[currentLanguage].basicSetup,
          }}
        />
        {/* <Button onClick={handleRunButtonClick}>Run</Button> */}
      </Suspense>
    </div>
  );
}
