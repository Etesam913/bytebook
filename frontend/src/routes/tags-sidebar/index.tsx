import { type MotionValue, motion } from "framer-motion";
import { useAtomValue } from "jotai/react";
import { useRef } from "react";
import { isNoteMaximizedAtom } from "../../atoms";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { useNotesFromTag } from "../../hooks/notes";
import { TagIcon } from "../../icons/tag";
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
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	// If the fileExtension is undefined, then it is a markdown file
	const fileExtension = searchParams?.ext;

	const noteQueryResult = useNotesFromTag(tagName, note, fileExtension);

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
										noteQueryResult={noteQueryResult}
										fileExtension={fileExtension}
										layoutId="tags-sidebar"
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
