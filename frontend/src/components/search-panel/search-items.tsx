import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { easingFunctions } from "../../animations";
import type { SearchPanelDataType } from "../../types";

const searchResultsData = [
	"file1.md",
	"file2.md",
	"file3.md",
	"file4.md",
	"file5.md",
];

export function SearchItems({
	focusedIndex,
	setFocusedIndex,
	setSearchPanelData,
	searchResults,
}: {
	focusedIndex: number;
	setFocusedIndex: Dispatch<SetStateAction<number>>;
	setSearchPanelData: Dispatch<SetStateAction<SearchPanelDataType>>;
	searchResults: string[];
}) {
	const searchResultsElements = searchResults.map((fileName, i) => {
		return (
			<motion.li
				className="relative"
				key={fileName}
				transition={{ type: "spring", damping: 18, stiffness: 115 }}
				onMouseEnter={() => setFocusedIndex(i)}
				layout="position"
			>
				{focusedIndex === i && (
					<motion.div
						transition={{ ease: easingFunctions["ease-out-expo"] }}
						layoutId="menu-highlight-test"
						className="absolute inset-0 rounded-md w-full bg-zinc-150 dark:bg-zinc-750 z-30"
					/>
				)}

				<button
					tabIndex={-1}
					type="button"
					onClick={() =>
						setSearchPanelData((prev) => ({ ...prev, isOpen: false }))
					}
					className="relative will-change-transform z-40 w-full text-left px-1.5 py-[0.225rem]"
				>
					{fileName}
				</button>
			</motion.li>
		);
	});
	return (
		<menu className="py-2 px-2 bg-zinc-50 overflow-hidden dark:bg-zinc-800 flex flex-col gap-1 absolute w-full border rounded-md rounded-tl-none rounded-tr-none border-zinc-300 dark:border-zinc-700 shadow-2xl">
			{searchResultsElements.length > 0 ? (
				searchResultsElements
			) : (
				<p className="text-xs text-zinc-500 dark:text-zinc-400">Recent Notes</p>
			)}
		</menu>
	);
}
