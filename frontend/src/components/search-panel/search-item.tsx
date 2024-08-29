import { motion } from "framer-motion";
import { easingFunctions } from "../../animations";
import { useAtom } from "jotai";
import { searchPanelDataAtom } from "../../atoms";
import { Note } from "../../icons/page";

export function SearchItem({
	i,
	filePath,
}: {
	i: number;
	filePath: string;
}) {
	const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);

	return (
		<motion.li
			className="relative"
			transition={{ type: "spring", damping: 18, stiffness: 115 }}
			onMouseEnter={() =>
				setSearchPanelData((prev) => ({ ...prev, focusedIndex: i }))
			}
			layout="position"
		>
			{searchPanelData.focusedIndex === i && (
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
				className="relative flex items-center gap-1.5 will-change-transform z-40 w-full text-left px-1.5 py-[0.225rem]"
			>
				<Note width="1rem" height="1rem" />
				{filePath}
			</button>
		</motion.li>
	);
}
