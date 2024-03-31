import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { Browser } from "@wailsio/runtime";
import { useAtomValue } from "jotai";
import type { LexicalEditor } from "lexical";
import { useRef } from "react";
import { toast } from "sonner";
import { SetNoteMarkdown } from "../../../bindings/main/NoteService";
import { isNoteMaximizedAtom } from "../../atoms";
import { debounce } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";
import { editorConfig } from "./editor-config";
import { useMostRecentNotes } from "./hooks.tsx";
import { NoteTitle } from "./note-title";
import { CodePlugin } from "./plugins/code";
import { ImagesPlugin } from "./plugins/image";
import TreeViewPlugin from "./plugins/tree-view";
import { VideosPlugin } from "./plugins/video";
import { Toolbar } from "./toolbar";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { $convertToMarkdownStringCorrect } from "./utils";

const debouncedHandleChange = debounce(handleChange, 500);

function handleChange(folder: string, note: string, editor: LexicalEditor) {
	editor.update(() => {
		const markdown = $convertToMarkdownStringCorrect(CUSTOM_TRANSFORMERS);
		SetNoteMarkdown(folder, note, markdown);
	});
}

export function NotesEditor({
	params,
}: {
	params: { folder: string; note: string };
}) {
	const { folder, note } = params;
	const editorRef = useRef<LexicalEditor | null | undefined>(null);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

	useMostRecentNotes(folder, note);

	return (
		<div
			className={cn("flex min-w-0 flex-1 flex-col", isNoteMaximized && "mt-8")}
		>
			<LexicalComposer initialConfig={editorConfig}>
				<Toolbar folder={folder} note={note} />
				<div
					style={{ scrollbarGutter: "stable" }}
					className={cn(
						"h-[calc(100vh-38px)] overflow-y-auto p-2",
						isNoteMaximized && "px-3",
					)}
					onClick={(e) => {
						const target = e.target as HTMLElement & { ariaChecked?: string };
						// Handling A tags
						if (target.parentElement?.tagName === "A") {
							const parentElement = target.parentElement as HTMLLinkElement;
							Browser.OpenURL(parentElement.href).catch(() => {
								toast.error("Failed to open link");
							});
						} else if (
							target.dataset.lexicalDecorator !== "true" ||
							target.ariaChecked !== null
						) {
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
					<MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
					<ListPlugin />
					<LinkPlugin />
					<CheckListPlugin />
					<TabIndentationPlugin />
					<HistoryPlugin />
					<TablePlugin />
					<EditorRefPlugin editorRef={editorRef} />
					<ImagesPlugin />
					<VideosPlugin />
					<CodePlugin />
					<TreeViewPlugin />
				</div>
			</LexicalComposer>
		</div>
	);
}
