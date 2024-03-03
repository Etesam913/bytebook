import {
	$getNodeByKey,
	CLEAR_HISTORY_COMMAND,
	FORMAT_TEXT_COMMAND,
	LexicalEditor,
	TextFormatType,
} from "lexical";
import { Dispatch, useEffect } from "react";
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
	setCurrentSelectionFormat: Dispatch<React.SetStateAction<TextFormatType[]>>,
) {
	useEffect(() => {
		GetNoteMarkdown(folder, note)
			.then((markdown) => {
				editor.setEditable(true);
				// You don't want a different note to access the same history when you switch notes
				editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);

				editor.update(() => {
					// Clear formatting
					setCurrentSelectionFormat((prev) => {
						for (const format of prev)
							editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);

						return [];
					});
					$convertFromMarkdownStringCorrect(markdown, CUSTOM_TRANSFORMERS);
				});
			})
			.catch((e) => {
				console.error(e);
				navigate("/");
			});
	}, [folder, note, editor, setCurrentSelectionFormat]);
}

export function useImageListener(editor: LexicalEditor) {
	useEffect(() => {
		const imageNodes = new Map<string, ImageNode>();
		return editor.registerMutationListener(ImageNode, (nodeMutations) => {
			for (const [nodeKey, mutation] of nodeMutations) {
				if (mutation === "created") {
					editor.update(() => {
						const imageNode = $getNodeByKey<ImageNode>(nodeKey);
						if (imageNode) {
							imageNodes.set(nodeKey, imageNode);
						}
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
