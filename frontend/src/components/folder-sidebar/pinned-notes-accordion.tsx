import { useAtomValue } from "jotai";
import { useState } from "react";
import {
	projectSettingsAtom,
	projectSettingsWithQueryParamsAtom,
} from "../../atoms";
import { PinTack2 } from "../../icons/pin-tack-2";
import { SidebarAccordion } from "../sidebar/accordion";
import { AccordionItem } from "../sidebar/accordion-item";

export function PinnedNotesAccordion() {
	const [isPinnedNotesOpen, setIsPinnedNotesOpen] = useState(true);
	const projectSettings = useAtomValue(projectSettingsAtom);
	const pinnedNotes = projectSettings.pinnedNotes;
	const projectSettingsWithQueryParams = useAtomValue(
		projectSettingsWithQueryParamsAtom,
	);
	const pinnedNotesArray = Array.from(pinnedNotes);
	const pinnedNotesWithQueryParamsArray = Array.from(
		projectSettingsWithQueryParams.pinnedNotes,
	);

	const pinnedNotesElements = pinnedNotesArray.map((pinnedNote, i) => {
		// const url = pinnedNotesWithQueryParamsArray[i]?.split("/").pop();
		const itemName = pinnedNote.split("/").pop();
		if (!itemName) return null;
		const url = pinnedNotesWithQueryParamsArray[i];
		return <AccordionItem key={url} to={url} itemName={itemName} />;
	});

	return (
		<SidebarAccordion
			onClick={() => setIsPinnedNotesOpen((prev) => !prev)}
			title="Pinned Notes"
			isOpen={isPinnedNotesOpen}
			icon={<PinTack2 className="will-change-transform" />}
		>
			{pinnedNotesElements.length > 0 ? (
				pinnedNotesElements
			) : (
				<p
					style={{ textWrap: "balance" }}
					className="list-none pl-2 text-zinc-500 dark:text-zinc-300 text-xs"
				>
					Use a note's menu to pin it here
				</p>
			)}
		</SidebarAccordion>
	);
}
