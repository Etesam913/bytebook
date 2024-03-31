import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { InitialConfigType } from "@lexical/react/LexicalComposer";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { EditorThemeClasses, ParagraphNode } from "lexical";
import { CodeNode } from "./nodes/code";
import { ImageNode } from "./nodes/image";
import { VideoNode } from "./nodes/video";

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
	console.error(error);
}

export const theme: EditorThemeClasses = {
	link: "link",
	list: {
		ulDepth: ["root-ul", "ul-1"],
		olDepth: ["root-ol", "ol-1"],
		listitem: "root-li",
		nested: {
			listitem: "nested-li",
		},
		checklist: "check-list",
		listitemChecked: "PlaygroundEditorTheme__listItemChecked",
		listitemUnchecked: "PlaygroundEditorTheme__listItemUnchecked",
	},
	text: {
		bold: "text-bold",
		italic: "text-italic",
		underline: "text-underline",
		strikethrough: "text-strikethrough",
	},
};

export const editorConfig: InitialConfigType = {
	namespace: "note-editor",
	theme: theme,
	// editable: false,
	onError,
	nodes: [
		HeadingNode,
		QuoteNode,
		HorizontalRuleNode,
		CodeNode,
		LinkNode,
		ListNode,
		ListItemNode,
		ParagraphNode,
		ImageNode,
		VideoNode,
		TableNode,
		TableCellNode,
		TableRowNode,
		CodeNode,
	],
};
