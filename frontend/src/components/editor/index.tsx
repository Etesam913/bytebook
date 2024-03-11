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
import { useRef, useState } from "react";
import { SetNoteMarkdown } from "../../../wailsjs/go/main/App";
import { debounce } from "../../utils/draggable";
import { editorConfig } from "./editor-config";
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
}: { params: { folder: string; note: string } }) {
	const { folder, note } = params;
	const editorRef = useRef<LexicalEditor | null | undefined>(null);
	const [isToolbarDisabled, setIsToolbarDisabled] = useState(false);

	return (
		<div className="flex-1 min-w-0 flex flex-col">
			<LexicalComposer initialConfig={editorConfig}>
				<Toolbar disabled={isToolbarDisabled} folder={folder} note={note} />

				<div
					style={{ scrollbarGutter: "stable" }}
					className="py-2 pl-2 pr-[10px] h-[calc(100vh-38px)] overflow-y-auto"
					onClick={(e) => {
						const target = e.target as HTMLElement;
						if (target.dataset.lexicalDecorator !== "true") {
							editorRef.current?.focus();
						}
					}}
					onKeyDown={() => {}}
				>
					<NoteTitle
						folder={folder}
						editorRef={editorRef}
						note={note}
						setIsToolbarDisabled={setIsToolbarDisabled}
					/>

					<RichTextPlugin
						placeholder={null}
						contentEditable={<ContentEditable />}
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
					{/* <TreeViewPlugin /> */}
				</div>
			</LexicalComposer>
		</div>
	);
}
