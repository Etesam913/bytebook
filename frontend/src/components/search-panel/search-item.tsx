import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { forwardRef } from "react";
import { easingFunctions } from "../../animations";
import { searchPanelDataAtom } from "../../atoms";
import { Folder } from "../../icons/folder";
import { Note } from "../../icons/page";

export const SearchItem = forwardRef<
	HTMLLIElement,
	{ i: number; filePath: string }
>(({ i, filePath }, ref) => {
	const searchPanelData = useAtomValue(searchPanelDataAtom);
	const [folder, note] = filePath.split("/");

	return (
		<li
			ref={ref}
			className="relative hover:bg-zinc-100 hover:dark:bg-zinc-750 rounded-md"
		>
			{searchPanelData.focusedIndex === i && (
				<motion.div
					transition={{ ease: easingFunctions["ease-out-quint"] }}
					layoutId="menu-highlight-test"
					className="absolute inset-0 w-full bg-zinc-200 dark:bg-zinc-700 z-30 rounded-md"
				/>
			)}

			<button
				tabIndex={-1}
				type="submit"
				className="relative flex items-center will-change-transform z-40 w-full text-left px-1.5 py-[0.225rem]"
			>
				<Folder width={16} height={16} className="mr-1.5 min-w-4 min-h-4" />{" "}
				<p className="whitespace-nowrap">{folder}</p>
				/
				<Note width="1rem" height="1rem" className="mx-1 min-w-4 min-h-4" />
				<p className="overflow-hidden whitespace-nowrap text-ellipsis">
					{note}
				</p>
			</button>
		</li>
	);
});