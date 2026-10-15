import type { LegacyAnimationControls } from 'motion/react';
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
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useRef, useState, type SetStateAction } from 'react';
import { useDebouncedCallback } from '@hooks/debounce';
import {
  draggableBlockElementAtom,
  draggedGhostElementAtom,
  editorAtom,
} from './atoms';
import { isFileMaximizedAtom } from '@/atoms';
import { projectSettingsAtom } from '@/atoms';
import type { FloatingDataType, Frontmatter } from '@/types';
import { isTableOfContentsVisible } from '@utils/project-settings';
import { cn } from '@utils/string-formatting';
import { BottomBar } from './bottom-bar';
import { editorConfig } from './editor-config';
import { NoteTitle } from './note-title';
import { AutosaveFlush } from './plugins/autosave-flush';
import { CodePlugin } from './plugins/code';
import { ComponentPickerMenuPlugin } from './plugins/component-picker';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { DraggableBlockPlugin } from './plugins/draggable-block';
import { EmptyLinePlaceholderPlugin } from './plugins/empty-line-placeholder';
import { FilesPlugin } from './plugins/file';
import { FilePickerMenuPlugin } from './plugins/file-picker';
import { FocusPlugin } from './plugins/focus';
import { LinkedMentions } from './linked-mentions';
import { Tags } from './tags';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LinkClickPlugin } from './plugins/link-click';
import { LINK_MATCHERS } from './utils/link';
import { SavePlugin } from './plugins/save';
import { TableOfContentsPlugin } from './plugins/table-of-contents';
import { Toolbar } from './toolbar';
import { CUSTOM_TRANSFORMERS } from './transformers';
import { noteHandleChange } from './utils/note-commands.ts';
import { useAutoScrollDuringDrag } from '@hooks/draggable';
import { useCodeCleanup } from './hooks/code';
import { useLspNoteLifecycle } from '@hooks/lsp';
import { useNoteIntersectionObserver } from './hooks/intersection-observer';
import { FilePath } from '@utils/path';
import type { PlaceholderLineData } from './types';
import { TableHoverActionsPlugin } from './plugins/table/table-hover-actions';
import { TableActionMenuPlugin } from './plugins/table/table-actions-menu';
import { usePreventBoundaryOverscrollFlicker } from '@components/virtualized/virtualized-list/hooks';
// import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
// import { TreeView } from '@lexical/react/LexicalTreeView';

// Inlined TreeViewPlugin
// function InlineTreeViewPlugin() {
//   const [editor] = useLexicalComposerContext();
//   return <TreeView editor={editor} />;
// }

export function NotesEditor({
  filePath,
  animationControls,
}: {
  filePath: FilePath;
  animationControls: LegacyAnimationControls;
}) {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setEditor = useSetAtom(editorAtom);
  const autosave = useDebouncedCallback(noteHandleChange, 150);

  const noteContainerRef = useRef<HTMLDivElement | null>(null);
  const [editorAnchorElem, setEditorAnchorElem] = useState<HTMLElement | null>(
    null
  );
  const [isFileMaximized, setIsFileMaximized] = useAtom(isFileMaximizedAtom);
  const [frontmatter, setNoteFrontmatter] = useState<Frontmatter>({});
  const [frontmatterNotePath, setFrontmatterNotePath] = useState(
    filePath.fullPath
  );

  function setFrontmatter(value: SetStateAction<Frontmatter>) {
    setNoteFrontmatter(value);
    // Reset TOC presence with the loaded metadata, which arrives after navigation.
    setFrontmatterNotePath(filePath.fullPath);
  }

  const draggedGhostElement = useAtomValue(draggedGhostElementAtom);
  // Overflow container ref is used to handle the auto-scroll during drag
  const overflowContainerRef = useRef<HTMLDivElement | null>(null);
  useAutoScrollDuringDrag(overflowContainerRef, { threshold: 80, speed: 20 });
  usePreventBoundaryOverscrollFlicker({
    scrollElementRef: overflowContainerRef,
  });
  const setDraggableBlockElement = useSetAtom(draggableBlockElementAtom);
  const [floatingData, setFloatingData] = useState<FloatingDataType>({
    isOpen: false,
    left: 0,
    top: 0,
    type: null,
    previousSelection: null,
  });
  const [placeholderLineData, setPlaceholderLineData] =
    useState<PlaceholderLineData>({
      show: false,
      position: { top: 0, left: 0 },
      parentKey: null,
    });

  // Extract folder and note from filePath
  const folder = filePath.folder;
  const note = filePath.noteWithoutExtension;

  // Use custom hooks for code cleanup and intersection observer
  useCodeCleanup(noteContainerRef);
  useNoteIntersectionObserver({ folder, note, noteContainerRef });
  useLspNoteLifecycle();

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="flex h-full min-h-0 flex-col">
        <Toolbar
          overflowContainerRef={overflowContainerRef}
          noteContainerRef={noteContainerRef}
          animationControls={animationControls}
          filePath={filePath}
          floatingData={floatingData}
          setFloatingData={setFloatingData}
          frontmatter={frontmatter}
          setFrontmatter={setFrontmatter}
          setPlaceholderLineData={setPlaceholderLineData}
        />
        <div
          ref={overflowContainerRef}
          className="flex-1 min-h-0 overflow-y-auto flex flex-col @container"
        >
          <div
            style={{
              scrollbarGutter: 'stable',
            }}
            className={cn(
              'py-6 pl-10 pr-6 @md:px-10 @lg:px-14 flex flex-col w-full min-w-72 flex-1',
              projectSettings.appearance.noteWidth === 'readability' &&
                'max-w-225 mx-auto'
            )}
          >
            <div
              ref={(node) => {
                noteContainerRef.current = node;
                setEditorAnchorElem(node);
              }}
              id="note-container"
              data-file-drop-target
              className="relative flex flex-col w-full flex-1"
              style={{
                fontFamily:
                  projectSettings.appearance.editorFontFamily ||
                  'var(--editor-default-font-family)',
              }}
            >
              <NoteTitle key={note} filePath={filePath} />
              <ComponentPickerMenuPlugin folder={folder} />
              <FilePickerMenuPlugin />
              <EmptyLinePlaceholderPlugin
                noteContainerRef={noteContainerRef}
                note={note}
                placeholderLineData={placeholderLineData}
                setPlaceholderLineData={setPlaceholderLineData}
              />
              <HorizontalRulePlugin />
              <TableOfContentsPlugin
                key={`table-of-contents:${frontmatterNotePath}`}
                isVisible={isTableOfContentsVisible({
                  frontmatter,
                  projectSettings,
                })}
              />

              <RichTextPlugin
                placeholder={null}
                contentEditable={
                  <div className="flex-1">
                    <ContentEditable
                      onContextMenu={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' && isFileMaximized) {
                          setIsFileMaximized(false);
                        }
                        setDraggableBlockElement(null);
                      }}
                      id="content-editable-editor"
                      className="editor-content min-h-full"
                      spellCheck
                      autoCorrect="on"
                      onClick={(e) => {
                        // Clicks should not propagate to the editor when something is being dragged
                        if (draggedGhostElement) {
                          e.stopPropagation();
                        }
                      }}
                    />
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <OnChangePlugin
                ignoreSelectionChange
                onChange={(_, editor, tags) => autosave(editor, tags)}
              />
              <AutosaveFlush
                key={`autosave:${filePath.fullPath}`}
                autosave={autosave}
                filePath={filePath}
              />
              <MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
              <ListPlugin />
              <LinkPlugin />
              <CheckListPlugin />
              <TabIndentationPlugin />
              <HistoryPlugin />
              <TablePlugin hasHorizontalScroll />
              <TableActionMenuPlugin
                anchorElem={editorAnchorElem ?? document.body}
              />
              <TableHoverActionsPlugin
                anchorElem={editorAnchorElem ?? document.body}
              />
              <SavePlugin filePath={filePath} setFrontmatter={setFrontmatter} />
              <EditorRefPlugin
                editorRef={(editorRefValue) => {
                  setEditor(editorRefValue);
                }}
              />
              <FilesPlugin />
              <CodePlugin />
              <DraggableBlockPlugin
                overflowContainerRef={overflowContainerRef}
                filePath={filePath}
              />
              <FocusPlugin />
              <AutoLinkPlugin matchers={LINK_MATCHERS} />
              <LinkClickPlugin />
              {/* <InlineTreeViewPlugin /> */}
            </div>
            <Tags filePath={filePath} />
            <LinkedMentions filePath={filePath} />
          </div>
        </div>
        <BottomBar frontmatter={frontmatter} filePath={filePath} isNoteEditor />
      </div>
    </LexicalComposer>
  );
}
