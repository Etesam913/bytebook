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

export const INSERT_IMAGES_COMMAND: LexicalCommand<FilePayload[]> =
	createCommand("INSERT_IMAGES_COMMAND");

export function ImagesPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([FileNode])) {
			throw new Error("ImagesPlugin: ImageNode not registered on editor");
		}

		return mergeRegister(
			editor.registerCommand<FilePayload[]>(
				INSERT_IMAGES_COMMAND,
				(payload) => {
					const nodes: ParagraphNode[] = [];
					for (const imageDataPayload of payload) {
						const imageParent = $createParagraphNode();
						const imageNode = $createFileNode(imageDataPayload);
						imageParent.append(imageNode);
						nodes.push(imageParent);
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
					if (topLevelElement) {
						nodes.forEach((node) => topLevelElement.insertAfter(node));
					} else {
						selection?.insertNodes(nodes);
					}

					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor]);

	return null;
}
