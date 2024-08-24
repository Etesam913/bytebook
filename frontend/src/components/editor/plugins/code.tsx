import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
	$insertNodes,
	COMMAND_PRIORITY_EDITOR,
	type LexicalCommand,
	createCommand,
} from "lexical";
import { useEffect } from "react";
import { $createCodeNode, CodeNode, type CodePayload } from "../nodes/code";
import { FOCUS_NODE_COMMAND } from "./focus";

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
					const codeNode = $createCodeNode(payload);
					$insertNodes([codeNode]);
					editor.dispatchCommand(FOCUS_NODE_COMMAND, codeNode);
					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor]);

	return null;
}
