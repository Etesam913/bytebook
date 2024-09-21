import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import type { AnimationControls } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai";
import type { LexicalEditor } from "lexical";
import { useEffect, useRef, useState } from "react";
import {
	draggableBlockElementAtom,
	isNoteMaximizedAtom,
	noteContainerRefAtom,
} from "../../atoms";
import type { FloatingDataType } from "../../types.ts";
import { debounce } from "../../utils/draggable";
import useHotkeys from "../../utils/hooks.tsx";
import { cn } from "../../utils/string-formatting";
import { editorConfig } from "./editor-config";

import { NoteTitle } from "./note-title";
import { CodePlugin } from "./plugins/code";
import { ComponentPickerMenuPlugin } from "./plugins/component-picker";
import { CustomMarkdownShortcutPlugin } from "./plugins/custom-markdown-shortcut.tsx";
import { FilesPlugin } from "./plugins/file";
import { LinkPlugin } from "./plugins/link.tsx";
import { NoteFindPlugin } from "./plugins/note-find.tsx";
import TreeViewPlugin from "./plugins/tree-view";
import { VideosPlugin } from "./plugins/video";
import { Toolbar } from "./toolbar";

import { BottomBar } from "./bottom-bar.tsx";
import { DraggableBlockPlugin } from "./plugins/draggable-block.tsx";
import { FocusPlugin } from "./plugins/focus.tsx";
import { LinkMatcherPlugin } from "./plugins/link-matcher.tsx";
import { SAVE_MARKDOWN_CONTENT, SavePlugin } from "./plugins/save.tsx";
import { TableOfContentsPlugin } from "./plugins/table-of-contents.tsx";
import { CUSTOM_TRANSFORMERS } from "./transformers";

const debouncedHandleChange = debounce(handleChange, 275);

function handleChange(editor: LexicalEditor, tags: Set<string>) {
	/*
    If the note was changed from another window, don't update it again
    If a new note is loaded for the first time, we don't need this func to run
  */
	if (
		tags.has("note:changed-from-other-window") ||
		tags.has("note:initial-load")
	)
		return;
	editor.update(
		() => {
			editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, undefined);
		},
		{ tag: "note:changed-from-other-window" },
	);
}

export function NotesEditor({
	params,
	animationControls,
}: {
	params: { folder: string; note: string };
	animationControls: AnimationControls;
}) {
	const { folder, note } = params;
	const editorRef = useRef<LexicalEditor | null | undefined>(null);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const [frontmatter, setFrontmatter] = useState<Record<string, string>>({});
	const [floatingData, setFloatingData] = useState<FloatingDataType>({
		isOpen: false,
		left: 0,
		top: 0,
		type: null,
	});
	const [isFindOpen, setIsFindOpen] = useState(false);
	const noteContainerRef = useRef<HTMLDivElement | null>(null);
	const setNoteContainerRef = useSetAtom(noteContainerRefAtom);
	const setDraggableBlockElement = useSetAtom(draggableBlockElementAtom);

	useHotkeys({
		"Meta+f": () => {
			// const isFound = window.find("Etesam")
			setIsFindOpen((prev) => !prev);
		},
	});

	useEffect(() => {
		setNoteContainerRef(noteContainerRef);
	}, [noteContainerRef]);

	useEffect(() => {
		setFrontmatter({});
	}, [note]);

	return (
		<LexicalComposer initialConfig={editorConfig}>
			<Toolbar
				noteContainerRef={noteContainerRef}
				animationControls={animationControls}
				folder={folder}
				note={note}
				floatingData={floatingData}
				setFloatingData={setFloatingData}
				frontmatter={frontmatter}
				setFrontmatter={setFrontmatter}
			/>
			<div
				ref={noteContainerRef}
				style={{
					scrollbarGutter: "stable",
					fontFamily: `"${frontmatter.fontFamily}", "Bricolage Grotesque"`,
				}}
				className={cn(
					"h-[calc(100vh-38px)] overflow-x-hidden overflow-y-auto py-2 px-4 relative",
					isNoteMaximized && "px-6",
				)}
				onClick={(e) => {
					const target = e.target as HTMLElement & { ariaChecked?: string };
					if (target.parentElement?.tagName === "A") {
						return;
					}

					if (
						target.dataset.lexicalDecorator !== "true" &&
						target.ariaChecked === null
					) {
						editorRef.current?.focus(undefined, {
							defaultSelection: "rootStart",
						});
					}
				}}
			>
				<NoteTitle folder={folder} note={note} />
				<ComponentPickerMenuPlugin folder={folder} note={note} />
				{frontmatter.showTableOfContents === "true" && (
					<TableOfContentsPlugin />
				)}

				<RichTextPlugin
					placeholder={null}
					contentEditable={
						<ContentEditable
							onKeyDown={() => setDraggableBlockElement(null)}
							id="content-editable-editor"
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							// spellCheck="false"
						/>
					}
					ErrorBoundary={LexicalErrorBoundary}
				/>
				<OnChangePlugin
					ignoreSelectionChange
					onChange={(_, editor, tag) => debouncedHandleChange(editor, tag)}
				/>
				<CustomMarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
				<ListPlugin />
				<LinkPlugin />
				<NoteFindPlugin isOpen={isFindOpen} setIsOpen={setIsFindOpen} />
				<CheckListPlugin />
				<TabIndentationPlugin />
				<HistoryPlugin />
				<TablePlugin />
				<SavePlugin
					folder={folder}
					note={note}
					frontmatter={frontmatter}
					setFrontmatter={setFrontmatter}
				/>
				<EditorRefPlugin editorRef={editorRef} />
				<FilesPlugin />
				<VideosPlugin />
				<CodePlugin />
				<DraggableBlockPlugin />
				<FocusPlugin />

				<LinkMatcherPlugin />
				<TreeViewPlugin />
			</div>
			<BottomBar frontmatter={frontmatter} folder={folder} note={note} />
		</LexicalComposer>
	);
}
