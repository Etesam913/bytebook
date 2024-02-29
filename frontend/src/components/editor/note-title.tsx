import { AnimatePresence, motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { fileNameRegex } from "../../utils/string-formatting";

export function NoteTitle({
	note,
	setIsToolbarDisabled,
}: {
	note: string;
	setIsToolbarDisabled: Dispatch<SetStateAction<boolean>>;
}) {
	const [noteTitle, setNoteTitle] = useState(note);

	useEffect(() => {
		setNoteTitle(note);
	}, [note]);

	const errorText =
		"Note titles can only contain letters, numbers, spaces, hyphens, and underscores.";

	return (
		<div className="mt-2 mb-3 flex flex-col">
			<input
				className="bg-transparent text-3xl mb-1 transition-colors duration-300 outline-none font-semibold invalid:text-red-600 dark:invalid:text-red-500 w-full"
				onClick={(e) => e.stopPropagation()}
				value={noteTitle}
				onError={() => console.log("yo mama")}
				title={errorText}
				onChange={(e) => setNoteTitle(e.target.value)}
				placeholder="Untitled Note"
				onFocus={() => setIsToolbarDisabled(true)}
				onBlur={() => setIsToolbarDisabled(false)}
				pattern={fileNameRegex.source}
				maxLength={50}
				required
			/>
			<AnimatePresence>
				{!fileNameRegex.test(noteTitle) && (
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
