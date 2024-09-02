import { useAtomValue } from "jotai";
import { useState } from "react";
import {
	projectSettingsAtom,
	projectSettingsWithoutQueryParamsAtom,
} from "../../atoms";
import { PinTack2 } from "../../icons/pin-tack-2";
import { SidebarAccordion } from "../sidebar/accordion";
import { AccordionItem } from "../sidebar/accordion-item";

export function PinnedNotesAccordion() {
	const [isPinnedNotesOpen, setIsPinnedNotesOpen] = useState(true);
	const projectSettings = useAtomValue(projectSettingsAtom);
	const pinnedNotes = projectSettings.pinnedNotes;
	const projectSettingsWithoutQueryParams = useAtomValue(
		projectSettingsWithoutQueryParamsAtom,
	);
	const pinnedNotesArray = Array.from(pinnedNotes);
	const pinnedNotesWithoutQueryParamsArray = Array.from(
		projectSettingsWithoutQueryParams.pinnedNotes,
	);

	const pinnedNotesElements = pinnedNotesArray.map((pinnedNote, i) => {
		const itemName = pinnedNotesWithoutQueryParamsArray[i]?.split("/").pop();
		if (!itemName) return null;
		return (
			<AccordionItem
				key={pinnedNote}
				to={`${pinnedNote}`}
				itemName={itemName}
			/>
		);
	});

	return (
		<SidebarAccordion
			onClick={() => setIsPinnedNotesOpen((prev) => !prev)}
			title="Pinned Notes"
			isOpen={isPinnedNotesOpen}
			icon={<PinTack2 className="will-change-transform" />}
		>
			{pinnedNotesElements}
		</SidebarAccordion>
	);
}
