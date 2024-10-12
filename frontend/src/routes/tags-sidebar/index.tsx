import { type MotionValue, motion } from "framer-motion";
import { useAtom } from "jotai/react";
import { useEffect, useRef } from "react";
import { notesAtom } from "../../atoms";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { TagIcon } from "../../icons/tag";
import { updateTagNotes } from "../../utils/fetch-functions";
import { MyNotesAccordion } from "../notes-sidebar/my-notes-accordion";

export function TagsSidebar({
	params,
	width,
	leftWidth,
}: {
	params: { tagName: string; folder?: string; note?: string };
	width: MotionValue<number>;
	leftWidth: MotionValue<number>;
}) {
	const sidebarRef = useRef<HTMLElement>(null);
	const { tagName, note, folder } = params;
	const [notes, setNotes] = useAtom(notesAtom);

	useEffect(() => {
		updateTagNotes(tagName, setNotes);
	}, [tagName]);

	return (
		<>
			<motion.aside
				ref={sidebarRef}
				style={{ width }}
				className="text-md flex h-screen flex-col  pb-3.5"
			>
				<div className="flex h-full flex-col overflow-y-auto pl-1.5 pr-2.5 relative">
					<section className="flex items-center min-h-[3.625rem] gap-2">
						<TagIcon className="min-w-[1.25rem]" width={20} height={20} />
						{tagName}
					</section>

					<section className="flex flex-col gap-2 overflow-y-auto flex-1">
						<div className="flex h-full flex-col overflow-y-auto">
							<MyNotesAccordion
								tagState={{
									tagName,
								}}
								notes={notes}
								noteCount={10}
								curFolder={folder ?? ""}
								curNote={note ?? ""}
							/>
						</div>
					</section>
				</div>
			</motion.aside>
			<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
		</>
	);
}
