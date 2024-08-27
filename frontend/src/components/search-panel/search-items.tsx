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
			<li
				className="relative"
				key={fileName}
				onMouseEnter={() => setFocusedIndex(i)}
			>
				{focusedIndex === i && (
					<motion.div
						transition={{ ease: easingFunctions["ease-out-expo"] }}
						layoutId="menu-highlight-test"
						className="absolute inset-0 z-[-5] rounded-md w-full bg-zinc-150 dark:bg-zinc-750"
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
			</li>
		);
	});
	return (
		<menu className="py-2 px-2 flex flex-col gap-1">
			{searchResultsElements}
		</menu>
	);
}
