import { useAtomValue } from "jotai";
import {
	mostRecentNotesWithoutQueryParamsAtom,
	searchPanelDataAtom,
} from "../../atoms";
import { SearchItem } from "./search-item";

export function SearchItems({
	searchResults,
	isShowingMostRecentNotes,
}: {
	searchResults: string[];
	isShowingMostRecentNotes: boolean;
}) {
	const searchResultsElements = searchResults.map((filePath, i) => (
		<SearchItem key={filePath} i={i} filePath={filePath} />
	));
	const searchPanelData = useAtomValue(searchPanelDataAtom);
	const mostRecentNotes = useAtomValue(mostRecentNotesWithoutQueryParamsAtom);

	return (
		<menu className="py-2 px-2 bg-zinc-50 overflow-hidden dark:bg-zinc-800 flex flex-col gap-1 absolute w-full border rounded-md rounded-tl-none rounded-tr-none border-zinc-300 dark:border-zinc-700 shadow-2xl">
			{!isShowingMostRecentNotes ? (
				searchResultsElements.length === 0 ? (
					<p className="text-sm text-zinc-650 dark:text-zinc-300 pl-1.5">
						There are no notes named "{searchPanelData.query}"
					</p>
				) : (
					searchResultsElements
				)
			) : (
				<>
					<p className="text-xs text-zinc-500 dark:text-zinc-400 pl-1.5">
						Recent Notes
					</p>
					{mostRecentNotes.map((filePath, i) => (
						<SearchItem filePath={filePath} i={i} key={filePath} />
					))}
				</>
			)}
		</menu>
	);
}
