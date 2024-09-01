import { useState } from "react";
import { SidebarAccordion } from "../sidebar/accordion";
import { AccordionItem } from "../sidebar/accordion-item";
import { PinTack2 } from "../../icons/pin-tack-2";

export function PinnedNotesAccordion() {
	const [isPinnedNotesOpen, setIsPinnedNotesOpen] = useState(true);

	return (
		<SidebarAccordion
			onClick={() => setIsPinnedNotesOpen((prev) => !prev)}
			title="Pinned Notes"
			isOpen={isPinnedNotesOpen}
			icon={<PinTack2 className="will-change-transform" />}
		>
			<AccordionItem to={"/"} itemName="Test Note" />
		</SidebarAccordion>
	);
}
