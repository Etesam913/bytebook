import { useAtomValue } from "jotai";
import { useState } from "react";
import {
	mostRecentNotesAtom,
	mostRecentNotesWithoutQueryParamsAtom,
} from "../../atoms.ts";
import HourglassStart from "../../icons/hourglass-start.tsx";
import { AccordionItem } from "../sidebar/accordion-item.tsx";
import { SidebarAccordion } from "../sidebar/accordion.tsx";

export function RecentNotesAccordion() {
	const [isRecentNotesOpen, setIsRecentNotesOpen] = useState(true);
	const mostRecentNotes = useAtomValue(mostRecentNotesAtom);
	const mostRecentNotesWithoutQueryParams = useAtomValue(
		mostRecentNotesWithoutQueryParamsAtom,
	);
	const mostRecentElements = mostRecentNotes.map((pathWithQueryParam, i) => {
		const itemName = mostRecentNotesWithoutQueryParams.at(i)?.split("/").pop();
		if (!itemName) return null;
		return (
			<AccordionItem
				key={pathWithQueryParam}
				to={pathWithQueryParam}
				itemName={itemName}
			/>
		);
	});

	if (mostRecentNotes.length === 0) {
		return <></>;
	}

	return (
		<SidebarAccordion
			onClick={() => setIsRecentNotesOpen((prev) => !prev)}
			title="Recent Notes"
			isOpen={isRecentNotesOpen}
			icon={
				<HourglassStart
					className="will-change-transform"
					height="1.1rem"
					width="1.1rem"
				/>
			}
		>
			{mostRecentElements.length > 0 ? (
				mostRecentElements
			) : (
				<p className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
					Visit a note to see it here
				</p>
			)}
		</SidebarAccordion>
	);
}
