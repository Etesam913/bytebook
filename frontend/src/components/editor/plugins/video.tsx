import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $wrapNodeInElement, mergeRegister } from "@lexical/utils";
import {
	$createParagraphNode,
	$insertNodes,
	$isRootOrShadowRoot,
	COMMAND_PRIORITY_EDITOR,
	LexicalCommand,
	createCommand,
} from "lexical";
import { useEffect } from "react";
import { $createVideoNode, VideoNode, VideoPayload } from "../nodes/video";

export const INSERT_VIDEO_COMMAND: LexicalCommand<VideoPayload> = createCommand(
	"INSERT_VIDEO_COMMAND",
);

export function VideosPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([VideoNode])) {
			throw new Error("VideoPlugin: VideoNode not registered on editor");
		}

		return mergeRegister(
			editor.registerCommand<VideoPayload>(
				INSERT_VIDEO_COMMAND,
				(payload) => {
					const videoNode = $createVideoNode(payload);
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
