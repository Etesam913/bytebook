import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { TRANSFORMERS } from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { useEffect, useState } from "react";
import { EditorBlockTypes } from "../../types";
import { Toolbar } from "./toolbar";
import { CUSTOM_TRANSFORMERS } from "./transformers";

const theme = {};

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
	console.error(error);
}

export function NotesEditor() {
	const [currentBlockType, setCurrentBlockType] = useState<EditorBlockTypes>();

	return (
		<LexicalComposer
			initialConfig={{
				namespace: "MyEditor",
				theme,
				onError,
				nodes: [
					HeadingNode,
					QuoteNode,
					HorizontalRuleNode,
					CodeNode,
					LinkNode,
					ListNode,
					ListItemNode,
				],
			}}
		>
			<Toolbar
				currentBlockType={currentBlockType}
				setCurrentBlockType={setCurrentBlockType}
			/>
			<div className="bg-zinc-200  p-2">
				<RichTextPlugin
					placeholder={null}
					contentEditable={<ContentEditable />}
					ErrorBoundary={LexicalErrorBoundary}
				/>
				<HistoryPlugin />
				<CheckListPlugin />
				<MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
			</div>
		</LexicalComposer>
	);
}
