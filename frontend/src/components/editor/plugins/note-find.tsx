import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { AnimatePresence, motion } from "framer-motion";
import type { LexicalEditor } from "lexical";
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useRef,
} from "react";
import { XMark } from "../../../icons/circle-xmark";
import { debounce } from "../../../utils/draggable";
import { clearHighlights, searchWithinNote } from "../utils/note-search";

const debouncedSearch = debounce(
	//@ts-ignore - A weird debounce error, I need to redo this function types
	(
		searchText: string,
		editor: LexicalEditor,
		inputRef: RefObject<HTMLInputElement>,
	) => {
		searchWithinNote(editor, searchText, () => {
			// Give focus back to the search input so that it is not focused on the editor
			setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
				}
			}, 10);
		});
	},
	100,
);

export function NoteFindPlugin({
	isOpen,
	setIsOpen,
}: { isOpen: boolean; setIsOpen: Dispatch<SetStateAction<boolean>> }) {
	const [editor] = useLexicalComposerContext();
	const inputRef = useRef<HTMLInputElement>(null);

	function closeFindPanel() {
		clearHighlights(editor);
		setIsOpen(false);
		editor.focus(undefined, {
			defaultSelection: "rootStart",
		});
	}

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.form
					onClick={(e: Event) => e.stopPropagation()}
					className="fixed top-16 right-4 bg-zinc-100 dark:bg-zinc-850 rounded-md text-sm border border-zinc-200 dark:border-zinc-750 shadow:sm dark:shadow-md"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0 }}
					onBlur={() => clearHighlights(editor, () => {})}
					onSubmit={(e: Event) => {
						e.preventDefault();
						const formData = new FormData(e.target as HTMLFormElement);
						const inputValue = formData.get("searchInput");
						if (inputValue) {
							// Call find method on editor instance
							const searchText = inputValue.toString();
							debouncedSearch(searchText, editor, inputRef);
						}
					}}
				>
					<input
						ref={inputRef}
						type="text"
						name="searchInput"
						autoFocus
						onKeyDown={(e) => e.key === "Escape" && closeFindPanel()}
						className="px-2 py-1 bg-transparent rounded-sm pr-[1.85rem]"
						placeholder="Find in note"
					/>
					<button
						type="button"
						onClick={() => {
							setIsOpen(false);
							editor.focus(undefined, {
								defaultSelection: "rootStart",
							});
						}}
						className="absolute top-1.5 right-1.5 text-zinc-700 dark:text-zinc-300"
					>
						<XMark height="0.95	rem" width="0.95rem" />
					</button>
				</motion.form>
			)}
		</AnimatePresence>
	);
}
