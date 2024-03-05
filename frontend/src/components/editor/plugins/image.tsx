import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
	$getSelection,
	COMMAND_PRIORITY_EDITOR,
	LexicalCommand,
	createCommand,
} from "lexical";
import { useEffect } from "react";
import { $createImageNode, ImageNode, ImagePayload } from "../nodes/image";

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
	"INSERT_IMAGE_COMMAND",
);

export function ImagesPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([ImageNode])) {
			throw new Error("ImagesPlugin: ImageNode not registered on editor");
		}

		return mergeRegister(
			editor.registerCommand<ImagePayload>(
				INSERT_IMAGE_COMMAND,
				(payload) => {
					const imageNode = $createImageNode(payload);
					const selectionNode = $getSelection()?.getNodes().at(0);
					// Replaces the p node with an image node
					if (selectionNode) {
						selectionNode.replace(imageNode);
					}
					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor]);

	return null;
}
