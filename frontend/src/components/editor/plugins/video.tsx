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
import { $createFileNode, FileNode, type FilePayload } from "../nodes/file";

export const INSERT_VIDEO_COMMAND: LexicalCommand<VideoPayload> = createCommand(
	"INSERT_VIDEO_COMMAND",
);

export function VideosPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([FileNode])) {
			throw new Error("VideoPlugin: VideoNode not registered on editor");
		}

		return mergeRegister(
			editor.registerCommand<FilePayload>(
				INSERT_VIDEO_COMMAND,
				(payload) => {
					const videoNode = $createFileNode(payload);
					$insertNodes([videoNode]);
					if ($isRootOrShadowRoot(videoNode.getParentOrThrow())) {
						$wrapNodeInElement(videoNode, $createParagraphNode).selectEnd();
					}

					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor]);

	return null;
}
