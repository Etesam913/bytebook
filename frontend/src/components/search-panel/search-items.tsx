import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { easingFunctions } from "../../animations";

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
	setIsSearchPanelOpen,
}: {
	focusedIndex: number;
	setFocusedIndex: Dispatch<SetStateAction<number>>;
	setIsSearchPanelOpen: Dispatch<SetStateAction<boolean>>;
}) {
	const searchResults = searchResultsData.map((fileName, i) => {
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
					onClick={() => setIsSearchPanelOpen(false)}
					className="relative will-change-transform z-40 w-full text-left px-1.5 py-[0.225rem]"
				>
					{fileName}
				</button>
			</li>
		);
	});
	return <menu className="py-2 px-2 flex flex-col gap-1">{searchResults}</menu>;
}
