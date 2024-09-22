import { useAtomValue } from "jotai";
import type { LegacyRef, MutableRefObject } from "react";
import {
	mostRecentNotesWithoutQueryParamsAtom,
	searchPanelDataAtom,
} from "../../atoms";
import { SearchItem } from "./search-item";

export function SearchItems({
	searchResults,
	isShowingMostRecentNotes,
	virtualizationState,
	searchResultsRefs,
	searchResultsContainerRef,
}: {
	searchResults: string[];
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

	const searchResultsElements = visibleItems.map((filePath, i) => (
		<SearchItem
			key={filePath}
			ref={(el) => {
				searchResultsRefs.current[i] = el;
			}}
			i={i}
			filePath={filePath}
		/>
	));

	const mostRecentNotes = useAtomValue(mostRecentNotesWithoutQueryParamsAtom);

	return (
		<menu
			ref={searchResultsContainerRef}
			className="py-2 px-2 bg-zinc-50 max-h-[303px] dark:bg-zinc-800  absolute w-full border rounded-md rounded-tl-none rounded-tr-none border-zinc-300 dark:border-zinc-700 shadow-2xl overflow-y-auto overflow-x-hidden"
			onScroll={onScroll}
		>
			<div>
				<div
					style={{
						height: visibleItems.length > 0 ? listContainerHeight : "auto",
					}}
				>
					<div
						className="flex flex-col gap-1"
						style={{
							position: "relative",
							top: listTop,
							height: visibleItems.length > 0 ? listHeight : "auto",
						}}
					>
						{searchResultsElements}
					</div>
				</div>
			</div>
		</menu>
	);
}
