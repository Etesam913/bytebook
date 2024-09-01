import { useAtomValue } from "jotai";
import { useState } from "react";
import { projectSettingsAtom } from "../../atoms";
import { PinTack2 } from "../../icons/pin-tack-2";
import { SidebarAccordion } from "../sidebar/accordion";
import { AccordionItem } from "../sidebar/accordion-item";

export function PinnedNotesAccordion() {
	const [isPinnedNotesOpen, setIsPinnedNotesOpen] = useState(true);
	const projectSettings = useAtomValue(projectSettingsAtom);
	const pinnedNotes = projectSettings.pinnedNotes;

	const pinnedNotesElements = [...pinnedNotes].map((pinnedNote) => (
		<AccordionItem
			key={pinnedNote}
			to={`/${pinnedNote}`}
			itemName={pinnedNote}
		/>
	));

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
