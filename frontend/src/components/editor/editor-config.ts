import { ListItemNode, ListNode } from "@lexical/list";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { $getRoot, type EditorThemeClasses, ParagraphNode } from "lexical";
import { CodeNode } from "./nodes/code";
import { ExcalidrawNode } from "./nodes/excalidraw";
import { ImageNode } from "./nodes/image";
import { AutoLinkNode, LinkNode } from "./nodes/link";
import { UnknownAttachmentNode } from "./nodes/unknown-attachment";
import { VideoNode } from "./nodes/video";

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
	console.error(error);
}

export const theme: EditorThemeClasses = {
	internalLink: "link-internal",
	link: "link",
	table: "PlaygroundEditorTheme__table",
	tableAddColumns: "PlaygroundEditorTheme__tableAddColumns",
	tableAddRows: "PlaygroundEditorTheme__tableAddRows",
	tableCell: "PlaygroundEditorTheme__tableCell",
	tableCellActionButton: "PlaygroundEditorTheme__tableCellActionButton",
	tableCellActionButtonContainer:
		"PlaygroundEditorTheme__tableCellActionButtonContainer",
	tableCellEditing: "PlaygroundEditorTheme__tableCellEditing",
	tableCellHeader: "PlaygroundEditorTheme__tableCellHeader",
	tableCellPrimarySelected: "PlaygroundEditorTheme__tableCellPrimarySelected",
	tableCellResizer: "PlaygroundEditorTheme__tableCellResizer",
	tableCellSelected: "PlaygroundEditorTheme__tableCellSelected",
	tableCellSortedIndicator: "PlaygroundEditorTheme__tableCellSortedIndicator",
	tableResizeRuler: "PlaygroundEditorTheme__tableCellResizeRuler",
	tableSelected: "PlaygroundEditorTheme__tableSelected",
	tableSelection: "PlaygroundEditorTheme__tableSelection",
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
	editorState: () => {
		// This is a good place to set the initial state of the editor.
		$getRoot().selectStart();
	},
	// editable: false,
	onError,
	nodes: [
		HeadingNode,
		QuoteNode,
		HorizontalRuleNode,
		LinkNode,
		ListNode,
		ListItemNode,
		ParagraphNode,
		ImageNode,
		VideoNode,
		TableNode,
		TableCellNode,
		TableRowNode,
		UnknownAttachmentNode,
		CodeNode,
		ExcalidrawNode,
		AutoLinkNode,
	],
};

export const trashEditorConfig: InitialConfigType = {
	namespace: "trash-note-editor",
	theme: theme,
	// editorState: () => {
	// 	// This is a good place to set the initial state of the editor.
	// 	$getRoot().selectStart();
	// },
	// editable: false,
	onError,
	editable: false,
	nodes: [
		HeadingNode,
		QuoteNode,
		HorizontalRuleNode,
		LinkNode,
		ListNode,
		ListItemNode,
		ParagraphNode,
		ImageNode,
		VideoNode,
		TableNode,
		TableCellNode,
		TableRowNode,
		UnknownAttachmentNode,
		CodeNode,
		ExcalidrawNode,
	],
};
