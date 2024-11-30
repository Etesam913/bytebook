import { $isListItemNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
	$createParagraphNode,
	$getSelection,
	COMMAND_PRIORITY_EDITOR,
	type ElementNode,
	type LexicalCommand,
	type ParagraphNode,
	createCommand,
} from "lexical";
import { useEffect } from "react";
import { $createFileNode, FileNode, type FilePayload } from "../nodes/file";

type InsertFilesCommandPayload = FilePayload[];

export const INSERT_FILES_COMMAND: LexicalCommand<InsertFilesCommandPayload> =
	createCommand("INSERT_FILES_COMMAND");

export function FilesPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([FileNode])) {
			throw new Error("FilesPlugin: FileNode not registered on editor");
		}

		return mergeRegister(
			editor.registerCommand<InsertFilesCommandPayload>(
				INSERT_FILES_COMMAND,
				(payload) => {
					const nodes: ParagraphNode[] = [];
					for (const fileDataPayload of payload) {
						const fileParent = $createParagraphNode();
						const fileNode = $createFileNode(fileDataPayload);
						fileParent.append(fileNode);
						nodes.push(fileParent);
					}

					const selection = $getSelection();
					const selectionNodes = selection?.getNodes();
					let topLevelElement: ElementNode | null = null;
					if (selectionNodes) {
						for (const node of selectionNodes) {
							if ($isListItemNode(node)) {
								topLevelElement = node.getTopLevelElement();
							}
							node.remove();
						}
					}
					// We use the top level element when the selection is inside a list item as we don't want the image to be a child of a list item
					if (topLevelElement)
						nodes.forEach((node) => topLevelElement.insertAfter(node));
					else selection?.insertNodes(nodes);

					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor]);

	return null;
}
