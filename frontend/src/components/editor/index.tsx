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
import { useAtomValue, useSetAtom } from "jotai";
import type { LexicalEditor } from "lexical";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { SetNoteMarkdown } from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";
import { WINDOW_ID } from "../../App.tsx";
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

import { BottomBar } from "./bottom-bar.tsx";
import { DraggableBlockPlugin } from "./plugins/draggable-block.tsx";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import {
	$convertToMarkdownStringCorrect,
	handleATag,
	replaceFrontMatter,
} from "./utils";

const debouncedHandleChange = debounce(handleChange, 275);

function handleChange(
	folder: string,
	note: string,
	editor: LexicalEditor,
	tags: Set<string>,
	frontmatter: Record<string, string>,
	setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>,
) {
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
			const markdown = $convertToMarkdownStringCorrect(CUSTOM_TRANSFORMERS);
			const frontmatterCopy = { ...frontmatter };
			frontmatterCopy.lastUpdated = new Date().toISOString();
			const markdownWithFrontmatter = replaceFrontMatter(
				markdown,
				frontmatterCopy,
			);
			Events.Emit({
				name: "note:changed",
				data: {
					folder,
					note,
					markdown: markdownWithFrontmatter,
					oldWindowAppId: WINDOW_ID,
				},
			});
			setFrontmatter(frontmatterCopy);
			SetNoteMarkdown(
				decodeURIComponent(folder),
				decodeURIComponent(note),
				markdownWithFrontmatter,
			);
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

	useMostRecentNotes(folder, note);

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
					setFrontmatter={setFrontmatter}
				/>
				<div
					ref={noteContainerRef}
					style={{ scrollbarGutter: "stable" }}
					className={cn(
						"h-[calc(100vh-38px)] overflow-y-auto py-2 px-4 relative",
						isNoteMaximized && "px-6",
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
						contentEditable={
							<ContentEditable
								onKeyDown={() => setDraggableBlockElement(null)}
								id="content-editable-editor"
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck="false"
							/>
						}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<OnChangePlugin
						ignoreSelectionChange
						onChange={(_, editor, tag) =>
							debouncedHandleChange(
								folder,
								note,
								editor,
								tag,
								frontmatter,
								setFrontmatter,
							)
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
					<DraggableBlockPlugin />
					{/* <TreeViewPlugin /> */}
				</div>
				<BottomBar frontmatter={frontmatter} folder={folder} note={note} />
			</LexicalComposer>
		</motion.div>
	);
}
