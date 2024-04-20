import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $wrapNodeInElement, mergeRegister } from "@lexical/utils";
import {
	$createParagraphNode,
	$insertNodes,
	$isRootOrShadowRoot,
	COMMAND_PRIORITY_EDITOR,
	type LexicalCommand,
	createCommand,
} from "lexical";
import { useEffect } from "react";
import { $createCodeNode, CodeNode, type CodePayload } from "../nodes/code";

export const INSERT_CODE_COMMAND: LexicalCommand<CodePayload> = createCommand(
	"INSERT_CODE_COMMAND",
);

export function CodePlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([CodeNode])) {
			throw new Error("CodePlugin: CodeNode not registered on editor");
		}

		return mergeRegister(
			editor.registerCommand<CodePayload>(
				INSERT_CODE_COMMAND,
				(payload) => {
					console.log("inserted");
					const codeNode = $createCodeNode(payload);
					$insertNodes([codeNode]);
					if ($isRootOrShadowRoot(codeNode.getParentOrThrow())) {
						$wrapNodeInElement(codeNode, $createParagraphNode).selectEnd();
					}

					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor]);

	return null;
}
