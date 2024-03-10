import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $wrapNodeInElement, mergeRegister } from "@lexical/utils";
import {
	$getSelection,
	COMMAND_PRIORITY_EDITOR,
	type LexicalCommand,
	createCommand,
	$insertNodes,
	$isRootOrShadowRoot,
	$createParagraphNode,
} from "lexical";
import { useEffect } from "react";
import { $createImageNode, ImageNode, type ImagePayload } from "../nodes/image";
import { insertRangeAfter } from "lexical/LexicalNode";

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
					const selection = $getSelection();
					selection?.insertNodes([imageNode]);
					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor]);

	return null;
}
