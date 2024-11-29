import { useAtomValue, useSetAtom } from "jotai";
import { $nodesOfType } from "lexical";
import { useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { ShutoffTerminals } from "../../bindings/github.com/etesam913/bytebook/terminalservice";
import { noteEditorAtom, noteSortAtom, notesAtom } from "../atoms";
import { CodeNode } from "../components/editor/nodes/code";
import { SAVE_MARKDOWN_CONTENT } from "../components/editor/plugins/save";
import { updateNotes } from "./fetch-functions";

/**
 * Custom navigation hook that handles saving the current directory of terminals when navigating away from a note.
 *
 * This hook uses useParams to get the current folder and note from the URL parameters. It also uses useLexicalComposerContext
 * to access the editor context. When navigating away from a note, it reads the editor state to find all CodeNode instances,
 * extracts their keys, and uses those keys to fetch the current directories of the terminals. The current directories are then
 * logged to the console.
 *
 * @returns A function that navigates to a given URL or URL object with optional replace and state parameters.
 */
export function useCustomNavigate() {
	const [folderNoteMatch, _] = useRoute("/:folder/:note");
	const editor = useAtomValue(noteEditorAtom);
	const noteSort = useAtomValue(noteSortAtom);
	const setNotes = useSetAtom(notesAtom);
	return {
		// biome-ignore lint/suspicious/noExplicitAny: Any makes sense here
		navigate: async <S = any>(
			to: string,
			options?: { replace?: boolean; state?: S; type?: "folder" },
		) => {
			// You are navigating to a note by clicking on a folder
			if (options?.type === "folder") {
				const folder = to.split("/")[1];
				updateNotes(folder, undefined, setNotes, noteSort);
				return;
			}

			// If you are on a note and you are navigating away you want to shutoff the terminals and save their current directory
			if (folderNoteMatch && editor) {
				let codeNodes: CodeNode[] = [];
				let nodeKeys: string[] = [];

				editor.read(() => {
					codeNodes = $nodesOfType(CodeNode);
					nodeKeys = codeNodes.map((node) => node.getKey());
				});

				// Switch off any running terminals
				const currentDirectories = await ShutoffTerminals(nodeKeys);

				// Store the current directory of each code node terminal
				codeNodes.forEach((node, i) =>
					node.setStartDirectory(currentDirectories[i], editor),
				);
				editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, undefined);
			}

			navigate(to, options);
		},
	};
}
