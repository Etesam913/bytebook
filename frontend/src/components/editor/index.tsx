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
import { useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import {
  draggableBlockElementAtom,
  draggedGhostElementAtom,
  editorAtom,
} from './atoms';
import { isNoteMaximizedAtom } from '../../atoms';
import { projectSettingsAtom } from '../../atoms';
import type { FloatingDataType, Frontmatter } from '../../types.ts';
import { handleEditorEscape } from '../../utils/selection.ts';
import { cn } from '../../utils/string-formatting';
import { BottomBar } from './bottom-bar';
import { editorConfig } from './editor-config';
import { NoteTitle } from './note-title';
import { CodePlugin } from './plugins/code';
import { ComponentPickerMenuPlugin } from './plugins/component-picker';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { CustomMarkdownShortcutPlugin } from './plugins/custom-markdown-shortcut.tsx';
import { DraggableBlockPlugin } from './plugins/draggable-block.tsx';
import { EmptyLinePlaceholderPlugin } from './plugins/empty-line-placeholder.tsx';
import { FilesPlugin } from './plugins/file';
import { FilePickerMenuPlugin } from './plugins/file-picker.tsx';
import { FocusPlugin } from './plugins/focus.tsx';
import { LinkedMentions } from './linked-mentions';
import { LinkMatcherPlugin } from './plugins/link-matcher.tsx';
import { LinkPlugin } from './plugins/link.tsx';
import { SavePlugin } from './plugins/save.tsx';
import { TableOfContentsPlugin } from './plugins/table-of-contents.tsx';
import { Toolbar } from './toolbar';
import { CUSTOM_TRANSFORMERS } from './transformers';
import { debouncedNoteHandleChange } from './utils/note-commands.ts';
import { useAutoScrollDuringDrag } from '../../hooks/draggable.tsx';
import { useCodeCleanup } from './hooks/code';
import { useNoteIntersectionObserver } from './hooks/intersection-observer';
import { FilePath } from '../../utils/path';
import type { PlaceholderLineData } from './types';
import TableHoverActionsV2Plugin from './plugins/table/table-hover-actions.tsx';
import TableActionMenuPlugin from './plugins/table/table-actions-menu.tsx';
import { usePreventBoundaryOverscrollFlicker } from '../virtualized/virtualized-list/hooks.tsx';

export function NotesEditor({
  filePath,
  animationControls,
}: {
  filePath: FilePath;
  animationControls: LegacyAnimationControls;
}) {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const queryClient = useQueryClient();
  const setEditor = useSetAtom(editorAtom);

  const tableActionsRef = useRef<HTMLButtonElement | null>(null);

  const noteContainerRef = useRef<HTMLDivElement | null>(null);
  const [editorAnchorElem, setEditorAnchorElem] = useState<HTMLElement | null>(
    null
  );
  const [isNoteMaximized, setIsNoteMaximized] = useAtom(isNoteMaximizedAtom);
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({});

  const draggedGhostElement = useAtomValue(draggedGhostElementAtom);
  // Overflow container ref is used to handle the auto-scroll during drag
  const overflowContainerRef = useRef<HTMLDivElement | null>(null);
  const { onDragOver, onDragLeave, onDrop } = useAutoScrollDuringDrag(
    overflowContainerRef,
    {
      threshold: 80,
      speed: 20,
    }
  );
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
  useNoteIntersectionObserver(folder, note, noteContainerRef);

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="flex h-full min-h-0 flex-col">
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
          tableActionsRef={tableActionsRef}
          setPlaceholderLineData={setPlaceholderLineData}
        />
        <div
          ref={overflowContainerRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className="flex-1 min-h-0 overflow-y-auto flex flex-col"
        >
          <div
            style={{
              scrollbarGutter: 'stable',
            }}
            className={cn(
              'py-6 px-12 flex flex-col w-full min-w-72 flex-1',
              projectSettings.appearance.noteWidth === 'readability' &&
                'max-w-[56.25rem] mx-auto'
            )}
          >
            <div
              ref={(node) => {
                noteContainerRef.current = node;
                setEditorAnchorElem(node);
              }}
              id="note-container"
              className="relative flex flex-col w-full flex-1"
              style={{
                fontFamily: `"${projectSettings.appearance.editorFontFamily}", "Bricolage Grotesque"`,
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
              {frontmatter.showTableOfContents === 'true' && (
                <TableOfContentsPlugin />
              )}

              <RichTextPlugin
                placeholder={null}
                contentEditable={
                  <ContentEditable
                    onContextMenu={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      handleEditorEscape(
                        e,
                        isNoteMaximized,
                        setIsNoteMaximized
                      );
                      setDraggableBlockElement(null);
                    }}
                    id="content-editable-editor"
                    className="flex-1"
                    spellCheck
                    autoCorrect="on"
                    onClick={(e) => {
                      // Clicks should not propagate to the editor when something is being dragged
                      if (draggedGhostElement) {
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
              <CustomMarkdownShortcutPlugin
                transformers={CUSTOM_TRANSFORMERS}
              />
              <ListPlugin />
              <LinkPlugin />
              <CheckListPlugin />
              <TabIndentationPlugin />
              <HistoryPlugin />
              <TablePlugin />
              <TableActionMenuPlugin
                anchorElem={editorAnchorElem ?? document.body}
              />
              <TableHoverActionsV2Plugin
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
              />
              <FocusPlugin />
              <LinkMatcherPlugin />
            </div>
            <LinkedMentions filePath={filePath} />
          </div>
        </div>
        <BottomBar frontmatter={frontmatter} filePath={filePath} isNoteEditor />
      </div>
    </LexicalComposer>
  );
}
