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
import { Events } from "@wailsio/runtime";
import { motion, useAnimationControls } from "framer-motion";
import { useAtomValue } from "jotai";
import type { LexicalEditor } from "lexical";
import { useRef, useState } from "react";
import { SetNoteMarkdown } from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";
import { WINDOW_ID } from "../../App.tsx";
import { isNoteMaximizedAtom } from "../../atoms";
import type { FloatingDataType } from "../../types.ts";
import { debounce } from "../../utils/draggable";
import useHotkeys from "../../utils/hooks.tsx";
import { cn } from "../../utils/string-formatting";
import { editorConfig } from "./editor-config";
import { useMostRecentNotes } from "./hooks.tsx";
import { NoteTitle } from "./note-title";
import { CodePlugin } from "./plugins/code";
import { ComponentPickerMenuPlugin } from "./plugins/component-picker";
import { CustomMarkdownShortcutPlugin } from "./plugins/custom-markdown-shortcut.tsx";
import { ImagesPlugin } from "./plugins/image";
import { LinkPlugin } from "./plugins/link.tsx";
import { NoteFindPlugin } from "./plugins/note-find.tsx";
import TreeViewPlugin from "./plugins/tree-view";
import { VideosPlugin } from "./plugins/video";
import { Toolbar } from "./toolbar";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { $convertToMarkdownStringCorrect, handleATag } from "./utils";

const debouncedHandleChange = debounce(handleChange, 275);

function handleChange(
	folder: string,
	note: string,
	editor: LexicalEditor,
	tags: Set<string>,
) {
	// If the note was changed from another window, don't update it again
	if (tags.has("note:changed-from-other-window")) return;
	editor.update(
		() => {
			const markdown = $convertToMarkdownStringCorrect(CUSTOM_TRANSFORMERS);
			Events.Emit({
				name: "note:changed",
				data: { folder, note, markdown, oldWindowAppId: WINDOW_ID },
			});
			SetNoteMarkdown(folder, note, markdown);
		},
		{ tag: "note:changed-from-other-window" },
	);
}

export function NotesEditor({
	params,
}: {
	params: { folder: string; note: string };
}) {
	const { folder, note } = params;
	const editorAnimationControls = useAnimationControls();
	const editorRef = useRef<LexicalEditor | null | undefined>(null);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

	const [floatingData, setFloatingData] = useState<FloatingDataType>({
		isOpen: false,
		left: 0,
		top: 0,
		type: null,
	});
	const [isFindOpen, setIsFindOpen] = useState(false);

	const noteContainerRef = useRef<HTMLDivElement | null>(null);
	useMostRecentNotes(folder, note);

	useHotkeys({
		"Meta+f": () => {
			// const isFound = window.find("Etesam")
			setIsFindOpen((prev) => !prev);
		},
	});

	return (
		<motion.div
			className={cn(
				"flex min-w-0 flex-1 flex-col leading-7",
				isNoteMaximized && "mt-[1px]",
			)}
			animate={editorAnimationControls}
		>
			<LexicalComposer initialConfig={editorConfig}>
				<Toolbar
					noteContainerRef={noteContainerRef}
					editorAnimationControls={editorAnimationControls}
					folder={folder}
					note={note}
					floatingData={floatingData}
					setFloatingData={setFloatingData}
				/>
				<div
					ref={noteContainerRef}
					style={{ scrollbarGutter: "stable" }}
					className={cn(
						"h-[calc(100vh-38px)] overflow-y-auto py-2 px-3 relative",
						isNoteMaximized && "px-5",
					)}
					onClick={(e) => {
						const target = e.target as HTMLElement & { ariaChecked?: string };
						if (target.parentElement?.tagName === "A") {
							handleATag(target);
						} else if (
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
					<RichTextPlugin
						placeholder={null}
						contentEditable={<ContentEditable id="content-editable-editor" />}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<OnChangePlugin
						ignoreSelectionChange
						onChange={(_, editor, tag) =>
							debouncedHandleChange(folder, note, editor, tag)
						}
					/>
					<CustomMarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
					<ListPlugin />
					<LinkPlugin />
					<NoteFindPlugin isOpen={isFindOpen} setIsOpen={setIsFindOpen} />
					<CheckListPlugin />
					<TabIndentationPlugin />
					<HistoryPlugin />
					<TablePlugin />
					<EditorRefPlugin editorRef={editorRef} />
					<ImagesPlugin />
					<VideosPlugin />
					<CodePlugin />
					<TablePlugin />
					{/* <TreeViewPlugin /> */}
				</div>
			</LexicalComposer>
		</motion.div>
	);
}
