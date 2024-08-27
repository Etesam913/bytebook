import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { useRef, useState } from "react";
import { SearchFileNamesFromQuery } from "../../../bindings/github.com/etesam913/bytebook/searchservice";
import { easingFunctions } from "../../animations";
import { searchPanelDataAtom } from "../../atoms";
import { useTrapFocus } from "../dialog/hooks";
import { Shade } from "../dialog/shade";
import { SearchItems } from "./search-items";

export function SearchPanel() {
	const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);
	const [searchResults, setSearchResults] = useState<string[]>([]);
	const searchPanelRef = useRef<HTMLFormElement>(null);
	const [focusedIndex, setFocusedIndex] = useState(0);
	useTrapFocus(searchPanelRef, searchPanelData.isOpen);

	return (
		<AnimatePresence>
			{searchPanelData.isOpen && (
				<>
					<Shade
						onClick={() =>
							setSearchPanelData((prev) => ({ ...prev, isOpen: false }))
						}
						className="bg-transparent"
					/>

					<motion.form
						initial={{ opacity: 0, scale: 0.5, translate: "-50% -35%" }}
						animate={{
							opacity: 1,
							scale: 1,
							transition: {
								ease: easingFunctions["ease-out-circ"],
								duration: 0.2,
							},
						}}
						exit={{
							opacity: 0,
							scale: 0.5,
							transition: {
								ease: easingFunctions["ease-out-circ"],
								duration: 0.3,
							},
						}}
						ref={searchPanelRef}
						className="absolute bg-zinc-50 dark:bg-zinc-800 translate-x-[-50%] translate-y-[-50%] z-40 top-[35%] w-[min(29rem,90vw)] overflow-hidden rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4"
						onSubmit={(e) => {
							e.preventDefault();
							// const formData = new FormData(e.target as HTMLFormElement);
							// const searchQuery = formData.get("search-query") as string;
							// console.log(searchQuery);
						}}
					>
						<input
							type="text"
							autoFocus
							name="search-query"
							placeholder="Search Files"
							className="py-3 px-4 outline-none will-change-transform bg-transparent w-full border-b border-zinc-300 dark:border-zinc-700 "
							value={searchPanelData.query}
							onFocus={(e) => {
								e.target.select();
							}}
							onChange={async (e) => {
								setSearchPanelData((prev) => ({
									...prev,
									query: e.target.value,
								}));
								try {
									const newSearchResults = await SearchFileNamesFromQuery(
										e.target.value,
									);
									console.log(newSearchResults);
									setSearchResults(newSearchResults);
								} catch (err) {
									console.error(err);
								}
							}}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									setSearchPanelData((prev) => ({ ...prev, isOpen: false }));
								} else if (e.key === "ArrowDown") {
									e.preventDefault();
									setFocusedIndex((prev) =>
										Math.min(prev + 1, searchResults.length - 1),
									);
								} else if (e.key === "ArrowUp") {
									e.preventDefault();
									setFocusedIndex((prev) => Math.max(prev - 1, 0));
								}
							}}
						/>
						<SearchItems
							setSearchPanelData={setSearchPanelData}
							focusedIndex={focusedIndex}
							searchResults={searchResults}
							setFocusedIndex={setFocusedIndex}
						/>
					</motion.form>
				</>
			)}
		</AnimatePresence>
	);
}
