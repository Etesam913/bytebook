import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useRef, useState } from "react";
import { EditorBlockTypes } from "../../types";
import { editorConfig } from "./editor-config";
import { Toolbar } from "./toolbar";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { type EditorState, type LexicalEditor } from "lexical";
import { debounce } from "../../utils/draggable";
import { SetNoteMarkdown } from "../../../wailsjs/go/main/App";
import { $convertToMarkdownString } from "@lexical/markdown";

const debouncedHandleChange = debounce(handleChange, 500);

function handleChange(
	folder: string,
	note: string,
	editorState: EditorState,
	editor: LexicalEditor,
	tags: Set<string>,
) {
	editor.update(() => {
		const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
		SetNoteMarkdown(folder, note, markdown);
	});
}

export function NotesEditor({
	folderParams,
	noteParams,
}: {
	folderParams: {
		folder: string;
	};
	noteParams: {
		note: string;
	};
}) {
	const [currentBlockType, setCurrentBlockType] = useState<EditorBlockTypes>();
	const { folder } = folderParams;
	const { note } = noteParams;

	const editorRef = useRef<LexicalEditor | null | undefined>(null);

	return (
		<div className="flex-1 min-w-0 flex flex-col">
			<LexicalComposer initialConfig={editorConfig}>
				<Toolbar
					folder={folder}
					note={note}
					currentBlockType={currentBlockType}
					setCurrentBlockType={setCurrentBlockType}
				/>

				<div
					className=" bg-zinc-200 dark:bg-zinc-700 p-2 h-[calc(100vh-38px)] overflow-auto"
					onClick={() => editorRef.current?.focus()}
				>
					<RichTextPlugin
						placeholder={null}
						contentEditable={<ContentEditable />}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<OnChangePlugin
						onChange={(editorState, editor, tags) =>
							debouncedHandleChange(folder, note, editorState, editor, tags)
						}
					/>
					<ListPlugin />
					<TabIndentationPlugin />
					<HistoryPlugin />
					<EditorRefPlugin editorRef={editorRef} />
					<MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
				</div>
			</LexicalComposer>
		</div>
	);
}
