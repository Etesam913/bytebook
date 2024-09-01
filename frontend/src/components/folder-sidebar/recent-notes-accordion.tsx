import { useAtomValue } from "jotai";
import { useState } from "react";
import {
	mostRecentNotesAtom,
	mostRecentNotesWithoutQueryParamsAtom,
} from "../../atoms.ts";
import { AccordionItem } from "../sidebar/accordion-item.tsx";
import { SidebarAccordion } from "../sidebar/accordion.tsx";

export function RecentNotesAccordion() {
	const [isRecentNotesCollapsed, setIsRecentNotesCollapsed] = useState(false);
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
			onClick={() => setIsRecentNotesCollapsed((prev) => !prev)}
			title="Recent Notes"
			isOpen={!isRecentNotesCollapsed}
		>
			{mostRecentElements}
		</SidebarAccordion>
	);
}
