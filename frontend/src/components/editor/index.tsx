import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import {
  albumDataAtom,
  draggableBlockElementAtom,
  draggedElementAtom,
  editorAtom,
} from './atoms';
import { isNoteMaximizedAtom } from '../../atoms';
import { projectSettingsAtom } from '../../atoms';
import type { FloatingDataType } from '../../types.ts';
import { handleEditorEscape } from '../../utils/selection.ts';
import { cn } from '../../utils/string-formatting';
import { BottomBar } from './bottom-bar';
import { editorConfig } from './editor-config';
import { NoteTitle } from './note-title';
import { CodePlugin } from './plugins/code';
import { ComponentPickerMenuPlugin } from './plugins/component-picker';
import { CustomMarkdownShortcutPlugin } from './plugins/custom-markdown-shortcut.tsx';
import { DraggableBlockPlugin } from './plugins/draggable-block.tsx';
import { FilesPlugin } from './plugins/file';
import { FilePickerMenuPlugin } from './plugins/file-picker.tsx';
import { FocusPlugin } from './plugins/focus.tsx';
import { LinkMatcherPlugin } from './plugins/link-matcher.tsx';
import { LinkPlugin } from './plugins/link.tsx';
import { SavePlugin } from './plugins/save.tsx';
import { TableOfContentsPlugin } from './plugins/table-of-contents.tsx';
// import TreeViewPlugin from './plugins/tree-view';
import { Toolbar } from './toolbar';
import { CUSTOM_TRANSFORMERS } from './transformers';
import { debouncedNoteHandleChange } from './utils/note-commands.ts';
import { Album } from './album/index.tsx';
import { useAutoScrollDuringDrag } from '../../hooks/draggable.tsx';
import { useCodeCleanup } from './hooks/code';
import { useNoteIntersectionObserver } from './hooks/intersection-observer';
import type { LegacyAnimationControls } from 'motion/react';
import { FilePath } from '../../utils/string-formatting';

export function NotesEditor({
  params,
  animationControls,
}: {
  params: { folder: string; note: string };
  animationControls: LegacyAnimationControls;
}) {
  const { folder, note } = params;
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setEditor = useSetAtom(editorAtom);
  const [isNoteMaximized, setIsNoteMaximized] = useAtom(isNoteMaximizedAtom);
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({});
  const [floatingData, setFloatingData] = useState<FloatingDataType>({
    isOpen: false,
    left: 0,
    top: 0,
    type: null,
  });
  const queryClient = useQueryClient();
  const overflowContainerRef = useRef<HTMLDivElement | null>(null);
  const noteContainerRef = useRef<HTMLDivElement | null>(null);
  const { isShowing: isAlbumShowing } = useAtomValue(albumDataAtom);
  const setDraggableBlockElement = useSetAtom(draggableBlockElementAtom);
  const [noteMarkdownString, setNoteMarkdownString] = useState('');
  const draggedElement = useAtomValue(draggedElementAtom);
  const { onDragOver, onDragLeave, onDrop } = useAutoScrollDuringDrag(
    overflowContainerRef,
    {
      threshold: 80,
      speed: 20,
    }
  );

  // Use custom hooks for code cleanup and intersection observer
  useCodeCleanup(noteContainerRef);
  useNoteIntersectionObserver(folder, note, noteContainerRef);

  return (
    <LexicalComposer initialConfig={editorConfig}>
      {isAlbumShowing && <Album />}
      <Toolbar
        overflowContainerRef={overflowContainerRef}
        noteContainerRef={noteContainerRef}
        animationControls={animationControls}
        folder={folder}
        note={note}
        floatingData={floatingData}
        setFloatingData={setFloatingData}
        frontmatter={frontmatter}
        setFrontmatter={setFrontmatter}
        setNoteMarkdownString={setNoteMarkdownString}
      />
      <div
        ref={overflowContainerRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="flex gap-2 overflow-y-auto h-[calc(100vh-2.18rem)]"
      >
        <div
          ref={noteContainerRef}
          style={{
            scrollbarGutter: 'stable',
            fontFamily: `"${projectSettings.appearance.editorFontFamily}", "Bricolage Grotesque"`,
          }}
          className={cn(
            'h-full relative py-6 px-12  flex-1 w-full flex flex-col',
            projectSettings.appearance.noteWidth === 'readability' &&
              'max-w-[704px] mx-auto'
          )}
        >
          <NoteTitle folder={folder} note={note} />
          <ComponentPickerMenuPlugin folder={folder} note={note} />
          <FilePickerMenuPlugin />
          {frontmatter.showTableOfContents === 'true' && (
            <TableOfContentsPlugin />
          )}

          <RichTextPlugin
            placeholder={null}
            contentEditable={
              <ContentEditable
                onContextMenu={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  handleEditorEscape(e, isNoteMaximized, setIsNoteMaximized);
                  setDraggableBlockElement(null);
                }}
                id="content-editable-editor"
                className="flex-1"
                spellCheck
                autoFocus
                autoCorrect="on"
                onClick={(e) => {
                  // Clicks should not propagate to the editor when something is being dragged
                  if (draggedElement) {
                    e.stopPropagation();
                  }
                }}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(_, editor, tag) =>
              debouncedNoteHandleChange(editor, tag, queryClient)
            }
          />
          <CustomMarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
          <ListPlugin />
          <LinkPlugin />
          <CheckListPlugin />
          <TabIndentationPlugin />
          <HistoryPlugin />
          <TablePlugin />
          <SavePlugin
            folder={folder}
            note={note}
            setFrontmatter={setFrontmatter}
            setNoteMarkdownString={setNoteMarkdownString}
          />
          <EditorRefPlugin
            editorRef={(editorRefValue) => {
              setEditor(editorRefValue);
            }}
          />
          <FilesPlugin />
          <CodePlugin />
          <DraggableBlockPlugin overflowContainerRef={overflowContainerRef} />
          <FocusPlugin />
          <LinkMatcherPlugin />
          {/* <TreeViewPlugin /> */}
        </div>
        {frontmatter.showMarkdown === 'true' && (
          <div className="w-[50%] bg-zinc-50 dark:bg-zinc-850 h-full font-code border-l border-zinc-200 dark:border-zinc-700 px-4 pt-3 pb-2 overflow-auto">
            <h3 className="text-2xl">Note Markdown</h3>
            <p className="text-sm whitespace-pre-wrap">{noteMarkdownString}</p>
          </div>
        )}
      </div>
      <BottomBar
        frontmatter={frontmatter}
        filePath={new FilePath({ folder, note: `${note}.md` })}
        isNoteEditor
      />
    </LexicalComposer>
  );
}
