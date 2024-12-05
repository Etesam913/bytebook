import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import {
	projectSettingsAtom,
	projectSettingsWithQueryParamsAtom,
} from "../../atoms";
import { useListVirtualization } from "../../hooks/observers";
import { PinTack2 } from "../../icons/pin-tack-2";
import { AccordionButton } from "../sidebar/accordion-button";
import { AccordionItem } from "../sidebar/accordion-item";

const SIDEBAR_ITEM_HEIGHT = 28;
const VIRUTALIZATION_HEIGHT = 8;

function VirtualizedPinnedNotes({
	isPinnedNotesOpen,
}: { isPinnedNotesOpen: boolean }) {
	const projectSettings = useAtomValue(projectSettingsAtom);
	const pinnedNotes = projectSettings.pinnedNotes;
	const projectSettingsWithQueryParams = useAtomValue(
		projectSettingsWithQueryParamsAtom,
	);
	const listScrollContainerRef = useRef<HTMLDivElement>(null);
	const pinnedNotesArray = Array.from(pinnedNotes);
	const pinnedNotesWithQueryParamsArray = Array.from(
		projectSettingsWithQueryParams.pinnedNotes,
	);

	const { visibleItems, onScroll, listContainerHeight, listHeight, listTop } =
		useListVirtualization(
			pinnedNotesArray,
			SIDEBAR_ITEM_HEIGHT,
			VIRUTALIZATION_HEIGHT,
			listScrollContainerRef,
		);

	const pinnedNotesElements = visibleItems.map((pinnedNote, i) => {
		const itemName = pinnedNote.split("/").pop();
		if (!itemName) return null;
		const url = pinnedNotesWithQueryParamsArray[i];
		return <AccordionItem key={url} to={url} itemName={itemName} />;
	});

	return (
		<motion.div
			className="overflow-y-auto max-h-[35vh] mt-1"
			ref={listScrollContainerRef}
			onScroll={onScroll}
			initial={{ height: 0 }}
			animate={{
				height: "auto",
				transition: { type: "spring", damping: 16 },
			}}
			exit={{ height: 0, opacity: 0 }}
		>
			<div
				style={{
					height: pinnedNotesArray.length > 0 ? listContainerHeight : "auto",
				}}
			>
				<ul
					style={{
						position: "relative",
						height: visibleItems.length > 0 ? listHeight : "auto",
						top: listTop,
					}}
				>
					{isPinnedNotesOpen && pinnedNotesElements}
				</ul>
			</div>
		</motion.div>
	);
}

export function PinnedNotesAccordion() {
	const [isPinnedNotesOpen, setIsPinnedNotesOpen] = useState(true);

	return (
		<section>
			<AccordionButton
				onClick={() => setIsPinnedNotesOpen((prev) => !prev)}
				icon={<PinTack2 className="will-change-transform" />}
				title="Pinned Notes"
				isOpen={isPinnedNotesOpen}
			/>
			<AnimatePresence>
				{isPinnedNotesOpen && (
					<VirtualizedPinnedNotes isPinnedNotesOpen={isPinnedNotesOpen} />
				)}
			</AnimatePresence>
		</section>
	);
}
