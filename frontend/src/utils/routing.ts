import { useAtomValue } from "jotai";
import { $nodesOfType } from "lexical";
import { useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { ShutoffTerminals } from "../../bindings/github.com/etesam913/bytebook/terminalservice";
import { noteEditorAtom } from "../atoms";
import { CodeNode } from "../components/editor/nodes/code";
import { SAVE_MARKDOWN_CONTENT } from "../components/editor/plugins/save";

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
	const [match, _] = useRoute("/:folder/:note");
	const editor = useAtomValue(noteEditorAtom);
	return {
		// biome-ignore lint/suspicious/noExplicitAny: Any makes sense here
		navigate: async <S = any>(
			to: string | URL,
			options?: { replace?: boolean; state?: S },
		) => {
			// If you are on a note and you are navigating away you want to shutoff the terminals and save their current directory
			if (match && editor) {
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
					node.setCommand(`cd ${currentDirectories[i]}`, editor),
				);
				editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, undefined);
			}

			navigate(to, options);
		},
	};
}
