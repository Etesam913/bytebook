import { motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import { SearchFileNamesFromQuery } from "../../../bindings/github.com/etesam913/bytebook/searchservice";
import { easingFunctions } from "../../animations";
import {
	mostRecentNotesWithoutQueryParamsAtom,
	searchPanelDataAtom,
} from "../../atoms";
import { useListVirtualization } from "../../utils/hooks";
import { getFileExtension } from "../../utils/string-formatting";
import { useTrapFocus } from "../dialog/hooks";
import { SearchItems } from "./search-items";

const SIDEBAR_ITEM_HEIGHT = 34;
const VIRUTALIZATION_HEIGHT = 8;

export function SearchPanelForm() {
	const [searchResults, setSearchResults] = useState<string[]>([]);
	const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);
	const searchPanelRef = useRef<HTMLFormElement>(null);
	useTrapFocus(searchPanelRef, searchPanelData.isOpen);

	const mostRecentNotes = useAtomValue(mostRecentNotesWithoutQueryParamsAtom);
	const isShowingMostRecentNotes = useMemo(() => {
		return (
			searchResults.length === 0 && searchPanelData.query.trim().length === 0
		);
	}, [searchResults.length, searchPanelData.query]);
	const searchResultsContainerRef = useRef<HTMLMenuElement | null>(null);
	const searchResultsRefs = useRef<(HTMLLIElement | null)[]>([]);

	const { visibleItems, onScroll, listContainerHeight, listHeight, listTop } =
		useListVirtualization(
			searchResults,
			SIDEBAR_ITEM_HEIGHT,
			VIRUTALIZATION_HEIGHT,
			searchResultsContainerRef,
		);

	async function handleSearch(query: string) {
		try {
			const results = await SearchFileNamesFromQuery(query);
			setSearchResults(results);
		} catch (error) {
			console.error("Error searching files:", error);
			setSearchResults([]);
		}
	}

	function handleArrowKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		e.preventDefault();
		if (searchResultsContainerRef.current) {
			const resultRect =
				searchResultsRefs.current[
					searchPanelData.focusedIndex
				]?.getBoundingClientRect();
			if (resultRect) {
				const containerRect =
					searchResultsContainerRef.current?.getBoundingClientRect();
				const distancetoEndOfContainer =
					containerRect?.bottom - resultRect.bottom;
				// 50 is the magic number, lol. Not a a very good explanation
				if (distancetoEndOfContainer < 50) {
					searchResultsContainerRef.current?.scrollBy(0, SIDEBAR_ITEM_HEIGHT);
				}
			}
		}

		setSearchPanelData((prev) => ({
			...prev,
			focusedIndex: Math.min(
				searchPanelData.focusedIndex + 1,
				isShowingMostRecentNotes
					? mostRecentNotes.length - 1
					: visibleItems.length - 5,
			),
		}));
	}

	function handleArrowKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
		e.preventDefault();

		if (searchResultsContainerRef.current) {
			const resultRect =
				searchResultsRefs.current[
					searchPanelData.focusedIndex
				]?.getBoundingClientRect();
			if (resultRect) {
				const containerRect =
					searchResultsContainerRef.current?.getBoundingClientRect();
				const distanceToTopOfContainer = resultRect.top - containerRect.top;
				// 50 is the magic number, lol. Not a a very good explanation
				if (distanceToTopOfContainer < 50) {
					searchResultsContainerRef.current?.scrollBy(0, -SIDEBAR_ITEM_HEIGHT);
				}
			}
		}

		setSearchPanelData((prev) => ({
			...prev,
			focusedIndex: Math.max(searchPanelData.focusedIndex - 1, 0),
		}));
	}

	return (
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
			onSubmit={(e: FormEvent<HTMLFormElement>) => {
				e.preventDefault();

				if (!isShowingMostRecentNotes && searchResults.length === 0) return;

				const selectedResult = !isShowingMostRecentNotes
					? visibleItems[searchPanelData.focusedIndex]
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
				onFocus={async (e) => {
					e.target.select();
					await handleSearch(e.target.value);
				}}
				onChange={async (e) => {
					setSearchPanelData((prev) => ({
						...prev,
						query: e.target.value,
						focusedIndex: 0,
					}));
					await handleSearch(e.target.value);
				}}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						setSearchPanelData((prev) => ({
							...prev,
							isOpen: false,
							focusedIndex: 0,
						}));
					} else if (e.key === "ArrowDown") handleArrowKeyDown(e);
					else if (e.key === "ArrowUp") handleArrowKeyUp(e);
				}}
			/>
			<SearchItems
				searchResults={searchResults}
				isShowingMostRecentNotes={isShowingMostRecentNotes}
				searchResultsContainerRef={searchResultsContainerRef}
				searchResultsRefs={searchResultsRefs}
				virtualizationState={{
					onScroll,
					listContainerHeight,
					listHeight,
					listTop,
					visibleItems,
				}}
			/>
		</motion.form>
	);
}
