import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { first } from "cypress/types/lodash";
import { AnimatePresence, motion } from "framer-motion";
import { useSetAtom } from "jotai";
import { $getRoot, type LexicalEditor } from "lexical";
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useEffect,
	useState,
} from "react";
import { navigate } from "wouter/use-browser-location";
import { RenameNoteTitle } from "../../../wailsjs/go/main/App";
import { isToolbarDisabled, notesAtom } from "../../atoms";
import { cn, fileNameRegex } from "../../utils/string-formatting";

export function NoteTitle({
	note,
	folder,
}: {
	note: string;
	folder: string;
}) {
	const [editor] = useLexicalComposerContext();
	const [noteTitle, setNoteTitle] = useState(note);
	const setNotes = useSetAtom(notesAtom);
	const [errorText, setErrorText] = useState("");
	const setIsToolbarDisabled = useSetAtom(isToolbarDisabled);

	useEffect(() => {
		setNoteTitle(note);
		setErrorText("");
	}, [note]);

	return (
		<div className="mt-2 mb-3 flex flex-col">
			<input
				className={cn(
					"bg-transparent text-3xl mb-1 transition-colors duration-300 outline-none font-semibold w-full",
					errorText.length > 0 && "text-red-600 dark:text-red-500",
				)}
				onClick={(e) => e.stopPropagation()}
				value={noteTitle}
				title={errorText}
				onChange={(e) => {
					const name = e.target.value.trim();
					setNoteTitle(e.target.value);
					if (!fileNameRegex.test(name)) {
						setErrorText(
							"Note titles can only contain letters, numbers, spaces, hyphens, and underscores.",
						);
					} else {
						setErrorText("");
					}
				}}
				placeholder="Untitled Note"
				onFocus={() => setIsToolbarDisabled(true)}
				onBlur={() => {
					setIsToolbarDisabled(false);
					if (noteTitle === note || errorText.length > 0) return;
					RenameNoteTitle(folder, note, noteTitle)
						.then(() => {
							setNotes(
								(prev) =>
									prev?.map((v) => (v === note ? noteTitle : v)) ?? [noteTitle],
							);
							navigate(`/${folder}/${noteTitle}`);
						})
						.catch((e) => {
							console.error(e);
							if (e?.includes("file exists")) {
								setErrorText(
									`A note with the name "${noteTitle}" already exists.`,
								);
							}
						});
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						// Selects first child of the editor
						editor.update(() => {
							const firstChild = $getRoot().getFirstChild();
							if (firstChild) {
								e.preventDefault();
								firstChild.selectEnd();
							}
						});
					}
				}}
				pattern={fileNameRegex.source}
				maxLength={50}
				required
			/>
			<AnimatePresence>
				{errorText.length > 0 && (
					<motion.p
						initial={{ height: 0 }}
						animate={{ height: "auto" }}
						exit={{ height: 0, opacity: 0, transition: { opacity: 0.2 } }}
						transition={{ type: "spring", damping: 12, stiffness: 130 }}
						className="text-red-600 overflow-auto dark:text-red-500 text-xs pointer-events-none select-none"
					>
						{errorText}
					</motion.p>
				)}
			</AnimatePresence>
		</div>
	);
}
