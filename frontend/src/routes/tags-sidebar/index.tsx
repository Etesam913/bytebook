import { type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai/react";
import { useEffect, useRef } from "react";
import { isNoteMaximizedAtom, noteSortAtom, notesAtom } from "../../atoms";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { TagIcon } from "../../icons/tag";
import { updateTagNotes } from "../../utils/fetch-functions";
import { useSearchParamsEntries } from "../../utils/routing";
import { MyNotesAccordion } from "../notes-sidebar/my-notes-accordion";
import { RenderNote } from "../notes-sidebar/render-note";

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
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const noteSort = useAtomValue(noteSortAtom);

	useEffect(() => {
		updateTagNotes(tagName, setNotes, noteSort);
	}, [tagName, setNotes, noteSort]);

	return (
		<>
			{!isNoteMaximized && (
				<>
					<motion.aside
						ref={sidebarRef}
						style={{ width }}
						className="text-md flex h-screen flex-col pb-3.5"
					>
						<div className="flex h-full flex-col overflow-y-auto relative">
							<header className="pl-1.5 pr-2.5 flex items-center min-h-[3.625rem] gap-2">
								<TagIcon className="min-w-[1.25rem]" width={20} height={20} />
								{tagName}
							</header>
							<section className="flex flex-col gap-2 overflow-y-auto flex-1">
								<div className="flex h-full flex-col overflow-y-auto">
									<MyNotesAccordion
										tagState={{
											tagName,
										}}
										layoutId="tags-sidebar"
										notes={notes}
										curFolder={folder ?? ""}
										curNote={note ?? ""}
									/>
								</div>
							</section>
						</div>
					</motion.aside>
					<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
				</>
			)}
			{folder && note && (
				<RenderNote
					folder={folder}
					note={note}
					fileExtension={searchParams.ext}
				/>
			)}
		</>
	);
}
