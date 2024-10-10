import { useAtomValue } from "jotai";
import type { LegacyRef, MutableRefObject } from "react";
import {
	mostRecentNotesWithoutQueryParamsAtom,
	searchPanelDataAtom,
} from "../../atoms";
import { SearchItem } from "./search-item";

export function SearchItems({
	isShowingMostRecentNotes,
	virtualizationState,
	searchResultsRefs,
	searchResultsContainerRef,
}: {
	isShowingMostRecentNotes: boolean;
	virtualizationState: {
		onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
		listContainerHeight: string;
		listHeight: string;
		listTop: string;
		visibleItems: string[];
	};
	searchResultsRefs: MutableRefObject<(HTMLLIElement | null)[]>;
	searchResultsContainerRef: LegacyRef<HTMLMenuElement>;
}) {
	const { onScroll, listContainerHeight, listHeight, listTop, visibleItems } =
		virtualizationState;

	const searchPanelData = useAtomValue(searchPanelDataAtom);

	const mostRecentNotes = useAtomValue(mostRecentNotesWithoutQueryParamsAtom);

	const searchResultsElements = (
		isShowingMostRecentNotes ? mostRecentNotes : visibleItems
	).map((filePath, i) => (
		<SearchItem
			key={filePath}
			ref={(el) => {
				searchResultsRefs.current[i] = el;
			}}
			i={i}
			filePath={filePath}
		/>
	));

	return (
		<menu
			ref={searchResultsContainerRef}
			className="py-2 px-2 bg-zinc-50 max-h-[300px] dark:bg-zinc-800  absolute w-full border rounded-md rounded-tl-none rounded-tr-none border-zinc-300 dark:border-zinc-700 shadow-2xl overflow-y-auto overflow-x-hidden scroll-p-2"
			onScroll={isShowingMostRecentNotes ? undefined : onScroll}
		>
			{searchResultsElements.length === 0 ? (
				<p className="text-sm text-zinc-650 dark:text-zinc-300 pl-1.5">
					There are no notes named "{searchPanelData.query}"
				</p>
			) : isShowingMostRecentNotes ? (
				<div className="flex flex-col gap-1">
					<p className="text-xs text-zinc-500 dark:text-zinc-400 pl-1.5">
						Recent Notes
					</p>
					{searchResultsElements}
				</div>
			) : (
				<div>
					<div
						style={{
							height: visibleItems.length > 0 ? listContainerHeight : "auto",
						}}
					>
						<ul
							className="flex flex-col gap-1"
							style={{
								position: "relative",
								top: listTop,
								height: visibleItems.length > 0 ? listHeight : "auto",
							}}
						>
							{searchResultsElements}
						</ul>
					</div>
				</div>
			)}
		</menu>
	);
}
