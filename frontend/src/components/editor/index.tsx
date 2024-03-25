import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import type { LexicalEditor } from "lexical";
import { useRef } from "react";
import { debounce } from "../../utils/draggable";
import { editorConfig } from "./editor-config";
import { NoteTitle } from "./note-title";
import { CodePlugin } from "./plugins/code";
import { ImagesPlugin } from "./plugins/image";
import { VideosPlugin } from "./plugins/video";
import { Toolbar } from "./toolbar";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { $convertToMarkdownStringCorrect } from "./utils";
import { SetNoteMarkdown } from "../../../bindings/main/NoteService";
import { useAtomValue } from "jotai";
import { isNoteMaximizedAtom } from "../../atoms";
import TreeViewPlugin from "./plugins/tree-view";
import { cn } from "../../utils/string-formatting";

const debouncedHandleChange = debounce(handleChange, 500);

function handleChange(folder: string, note: string, editor: LexicalEditor) {
	editor.update(() => {
		const markdown = $convertToMarkdownStringCorrect(CUSTOM_TRANSFORMERS);
		SetNoteMarkdown(folder, note, markdown);
	});
}

export function NotesEditor({
	params,
}: { params: { folder: string; note: string } }) {
	const { folder, note } = params;
	const editorRef = useRef<LexicalEditor | null | undefined>(null);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

	return (
		<div
			className={cn("flex-1 min-w-0 flex flex-col", isNoteMaximized && "mt-8")}
		>
			<LexicalComposer initialConfig={editorConfig}>
				<Toolbar folder={folder} note={note} />
				<div
					style={{ scrollbarGutter: "stable" }}
					className={cn(
						"p-2 h-[calc(100vh-38px)] overflow-y-auto",
						isNoteMaximized && "px-3",
					)}
					onClick={(e) => {
						const target = e.target as HTMLElement;
						if (target.dataset.lexicalDecorator !== "true") {
							editorRef.current?.focus(undefined, {
								defaultSelection: "rootStart",
							});
						}
					}}
					onKeyDown={() => {}}
				>
					<NoteTitle folder={folder} note={note} />

					<RichTextPlugin
						placeholder={null}
						contentEditable={<ContentEditable id="content-editable-editor" />}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<OnChangePlugin
						onChange={(_, editor) =>
							debouncedHandleChange(folder, note, editor)
						}
					/>
					<ListPlugin />
					<TabIndentationPlugin />
					<HistoryPlugin />
					<TablePlugin />
					<EditorRefPlugin editorRef={editorRef} />
					<MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
					<ImagesPlugin />
					<VideosPlugin />
					<CodePlugin />
					<TreeViewPlugin />
				</div>
			</LexicalComposer>
		</div>
	);
}
