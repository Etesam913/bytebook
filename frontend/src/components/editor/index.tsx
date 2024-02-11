import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { useState } from "react";
import { EditorBlockTypes } from "../../types";
import { editorConfig } from "./editor-config";
import { Toolbar } from "./toolbar";
import { CUSTOM_TRANSFORMERS } from "./transformers";

export function NotesEditor() {
	const [currentBlockType, setCurrentBlockType] = useState<EditorBlockTypes>();
	const [noteTitle, setNoteTitle] = useState("");

	return (
		<LexicalComposer initialConfig={editorConfig}>
			<label htmlFor="note-title">Note Title</label>
			<input
				className="block"
				id="note-title"
				value={noteTitle}
				onChange={(e) => setNoteTitle(e.target.value)}
			/>
			<Toolbar
				noteTitle={noteTitle}
				currentBlockType={currentBlockType}
				setCurrentBlockType={setCurrentBlockType}
			/>
			<div className="bg-zinc-200  p-2">
				<RichTextPlugin
					placeholder={null}
					contentEditable={<ContentEditable />}
					ErrorBoundary={LexicalErrorBoundary}
				/>
				<ListPlugin />
				<TabIndentationPlugin />
				<HistoryPlugin />

				<MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
			</div>
		</LexicalComposer>
	);
}
