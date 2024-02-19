import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { useEffect, useState } from "react";
import { EditorBlockTypes } from "../../types";
import { editorConfig } from "./editor-config";
import { Toolbar } from "./toolbar";
import { CUSTOM_TRANSFORMERS } from "./transformers";

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

	return (
		<div className="flex-1">
			<LexicalComposer initialConfig={editorConfig}>
				<Toolbar
					folder={folder}
					note={note}
					currentBlockType={currentBlockType}
					setCurrentBlockType={setCurrentBlockType}
				/>

				<div className=" bg-zinc-200 dark:bg-zinc-700 p-2">
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
		</div>
	);
}
