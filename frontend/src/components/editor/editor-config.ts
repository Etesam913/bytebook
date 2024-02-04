import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { InitialConfigType } from "@lexical/react/LexicalComposer";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { EditorThemeClasses } from "lexical";

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
	console.error(error);
}

export const theme: EditorThemeClasses = {
	list: {
		ulDepth: ["root-ul", "ul-1"],
		olDepth: ["root-ol", "ol-1"],
		listitem: "root-li",
		nested: {
			listitem: "nested-li",
		},
	},
};

export const editorConfig: InitialConfigType = {
	namespace: "note-editor",
	theme: theme,
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
};