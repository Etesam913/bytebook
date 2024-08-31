import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { easingFunctions } from "../../animations";
import { searchPanelDataAtom } from "../../atoms";
import { Folder } from "../../icons/folder";
import { Note } from "../../icons/page";

export function SearchItem({
	i,
	filePath,
}: {
	i: number;
	filePath: string;
}) {
	const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);

	const [folder, note] = filePath.split("/");

	return (
		<li
			className="relative"
			onMouseEnter={() =>
				setSearchPanelData((prev) => ({ ...prev, focusedIndex: i }))
			}
		>
			{searchPanelData.focusedIndex === i && (
				<motion.div
					transition={{ ease: easingFunctions["ease-out-quint"] }}
					layoutId="menu-highlight-test"
					className="absolute inset-0 rounded-md w-full bg-zinc-150 dark:bg-zinc-750 z-30"
				/>
			)}

			<button
				tabIndex={-1}
				type="submit"
				className="relative flex items-center will-change-transform z-40 w-full text-left px-1.5 py-[0.225rem]"
			>
				<Folder width={16} height={16} className="mr-1.5" /> {folder} /
				<Note width="1rem" height="1rem" className="mx-1" />
				{note}
			</button>
		</li>
	);
}
