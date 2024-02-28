import { $getNodeByKey, CLEAR_HISTORY_COMMAND, LexicalEditor } from "lexical";
import { useEffect } from "react";
import { navigate } from "wouter/use-browser-location";
import { DeleteFolder, GetNoteMarkdown } from "../../../wailsjs/go/main/App";
import { ImageNode } from "./nodes/image";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { $convertFromMarkdownStringCorrect } from "./utils";

/** Gets note markdown from local system */
export function useNoteMarkdown(
	editor: LexicalEditor,
	folder: string,
	note: string,
) {
	useEffect(() => {
		GetNoteMarkdown(folder, note)
			.then((markdown) => {
				editor.setEditable(true);
				// You don't want a different note to access the same history when you switch notes
				editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
				editor.update(() => {
					$convertFromMarkdownStringCorrect(markdown, CUSTOM_TRANSFORMERS);
				});
			})
			.catch((e) => {
				console.error(e);
				navigate("/");
			});
	}, [folder, note, editor]);
}

export function useImageListener(editor: LexicalEditor) {
	useEffect(() => {
		const imageNodes = new Map<string, ImageNode>();
		return editor.registerMutationListener(ImageNode, (nodeMutations) => {
			for (const [nodeKey, mutation] of nodeMutations) {
				console.log(nodeKey, mutation);
				if (mutation === "created") {
					editor.update(() => {
						const imageNode = $getNodeByKey<ImageNode>(nodeKey);
						if (imageNode) {
							imageNodes.set(nodeKey, imageNode);
							console.log("updated map", imageNodes);
						}
						console.log(imageNode, mutation);
					});
				} else if (mutation === "destroyed") {
					const imageNode = imageNodes.get(nodeKey);

					editor.update(() => {
						if (imageNode) {
							const imageSrc = imageNode.getSrc();
							const parts = imageSrc.split("/");
							const fileName = parts.at(parts.length - 1);
							const note = parts.at(parts.length - 2);
							const folder = parts.at(parts.length - 3);
							if (!fileName || !note || !folder) {
								return;
							}
							DeleteFolder(`${folder}/${note}/${fileName}`).then(() => {
								console.log("deleted success");
							});
						}
					});
				}
			}
		});
	}, [editor]);
}
