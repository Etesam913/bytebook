import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import { useRef, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import { SearchFileNamesFromQuery } from "../../../bindings/github.com/etesam913/bytebook/searchservice";
import { easingFunctions } from "../../animations";
import {
	mostRecentNotesWithoutQueryParamsAtom,
	searchPanelDataAtom,
} from "../../atoms";
import { getFileExtension } from "../../utils/string-formatting";
import { useTrapFocus } from "../dialog/hooks";
import { Shade } from "../dialog/shade";
import { SearchItems } from "./search-items";

export function SearchPanel() {
	const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);
	const [searchResults, setSearchResults] = useState<string[]>([]);
	const searchPanelRef = useRef<HTMLFormElement>(null);
	useTrapFocus(searchPanelRef, searchPanelData.isOpen);

	const isShowingMostRecentNotes =
		searchResults.length === 0 && searchPanelData.query.trim().length === 0;
	const mostRecentNotes = useAtomValue(mostRecentNotesWithoutQueryParamsAtom);

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
						className="absolute translate-x-[-50%] translate-y-[-50%] z-40 top-[25%] w-[min(29rem,90vw)] left-2/4"
						onSubmit={(e) => {
							e.preventDefault();

							if (!isShowingMostRecentNotes && searchResults.length === 0)
								return;

							const selectedResult = !isShowingMostRecentNotes
								? searchResults[searchPanelData.focusedIndex]
								: mostRecentNotes[searchPanelData.focusedIndex];
							const [folder, note] = selectedResult.split("/");
							const { extension, fileName } = getFileExtension(note);
							setSearchPanelData((prev) => ({ ...prev, isOpen: false }));
							navigate(`/${folder}/${fileName}?ext=${extension}`);
						}}
					>
						<input
							spellCheck="false"
							type="text"
							autoFocus
							name="search-query"
							placeholder="Search Files"
							className="py-3 px-4 bg-zinc-50 dark:bg-zinc-800 outline-none will-change-transform bg-transparent w-full border-zinc-300 rounded-bl-none rounded-br-none border-b-0 dark:border-zinc-700 rounded-lg shadow-2xl border-[1.25px] "
							value={searchPanelData.query}
							onFocus={(e) => {
								e.target.select();
							}}
							onChange={async (e) => {
								setSearchPanelData((prev) => ({
									...prev,
									query: e.target.value,
									focusedIndex: 0,
								}));

								try {
									const newSearchResults = await SearchFileNamesFromQuery(
										e.target.value.trim(),
									);
									setSearchResults(newSearchResults);
								} catch (err) {
									console.error(err);
								}
							}}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									setSearchPanelData((prev) => ({
										...prev,
										isOpen: false,
										focusedIndex: 0,
									}));
								} else if (e.key === "ArrowDown") {
									e.preventDefault();

									setSearchPanelData((prev) => ({
										...prev,
										focusedIndex: Math.min(
											searchPanelData.focusedIndex + 1,
											isShowingMostRecentNotes
												? mostRecentNotes.length - 1
												: searchResults.length - 1,
										),
									}));
								} else if (e.key === "ArrowUp") {
									e.preventDefault();
									setSearchPanelData((prev) => ({
										...prev,
										focusedIndex: Math.max(searchPanelData.focusedIndex - 1, 0),
									}));
								}
							}}
						/>
						<SearchItems
							searchResults={searchResults}
							isShowingMostRecentNotes={isShowingMostRecentNotes}
						/>
					</motion.form>
				</>
			)}
		</AnimatePresence>
	);
}
