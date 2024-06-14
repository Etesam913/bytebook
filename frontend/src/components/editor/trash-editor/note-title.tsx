import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { navigate } from "wouter/use-browser-location";
import { GetNoteMarkdown } from "../../../../bindings/github.com/etesam913/bytebook/noteservice";
import { CUSTOM_TRANSFORMERS } from "../transformers";
import { $convertFromMarkdownStringCorrect } from "../utils/note-metadata";

export function TrashNoteTitle({ curFile }: { curFile: string }) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		GetNoteMarkdown(`trash/${curFile}`)
			.then((res) => {
				if (res.success) {
					editor.update(() => {
						$convertFromMarkdownStringCorrect(res.data, CUSTOM_TRANSFORMERS);
					});
				} else {
					throw new Error("Failed in retrieving note markdown");
				}
			})
			.catch(() => navigate("/not-found", { replace: true }));
	}, [curFile]);

	return (
		<input
			disabled
			type="text"
			value={curFile}
			className="bg-transparent text-3xl mb-1 transition-colors duration-300 outline-none font-semibold w-full"
		/>
	);
}
