import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";

import { attachmentsAtom } from "../../atoms";
import { ChevronDown } from "../../icons/chevron-down";
import { AttachmentItem } from "./attachment-item";

export function AttachmentsAccordion({
	folder,
	note,
	attachmentsSelectionRange,
	setAttachmentsSelectionRange,
}: {
	folder: string;
	note: string | undefined;
	attachmentsSelectionRange: Set<number>;
	setAttachmentsSelectionRange: Dispatch<SetStateAction<Set<number>>>;
}) {
	const [isAttachmentsCollapsed, setIsAttachmentsCollapsed] = useState(true);
	const attachments = useAtomValue(attachmentsAtom);
	const anchorSelectionIndex = useRef<number | null>(null);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	// Close attachments accordion when folder changes
	useEffect(() => {
		setIsAttachmentsCollapsed(true);
	}, [folder]);

	const attachmentElements = attachments?.map((attachmentFile, i) => (
		<AttachmentItem
			key={attachmentFile}
			attachmentFile={attachmentFile}
			attachments={attachments}
			attachmentsSelectionRange={attachmentsSelectionRange}
			setAttachmentsSelectionRange={setAttachmentsSelectionRange}
			anchorSelectionIndex={anchorSelectionIndex}
			folder={folder}
			note={note}
			i={i}
			hoveredIndex={hoveredIndex}
			setHoveredIndex={setHoveredIndex}
		/>
	));

	return (
		<section className="border-[1px] w-[calc(100%-0.8rem)] border-zinc-200 dark:border-zinc-600 flex flex-col absolute z-10 bottom-0 max-h-[calc(100vh-14rem)] bg-[white] dark:bg-zinc-800 rounded-md">
			<button
				className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-1 px-1.5 rounded-md transition-colors"
				onClick={() => setIsAttachmentsCollapsed((prev) => !prev)}
				type="button"
			>
				<motion.span
					initial={{ rotateZ: isAttachmentsCollapsed ? 270 : 0 }}
					animate={{ rotateZ: isAttachmentsCollapsed ? 270 : 0 }}
				>
					<ChevronDown strokeWidth="2.5px" height="0.8rem" width="0.8rem" />
				</motion.span>{" "}
				Attachments
			</button>
			<AnimatePresence>
				{!isAttachmentsCollapsed && (
					<motion.ul
						initial={{ height: 0 }}
						animate={{
							height: "auto",
						}}
						exit={{ height: 0, opacity: 0 }}
						transition={{ type: "spring", damping: 22, stiffness: 130 }}
						className="overflow-y-auto px-1.5"
					>
						{attachmentElements.length > 0 ? (
							<>{attachmentElements}</>
						) : (
							<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs py-1.5">
								{" "}
								Attachments appear here automatically when you add an attachment
								in a note.
							</li>
						)}
					</motion.ul>
				)}
			</AnimatePresence>
		</section>
	);
}
