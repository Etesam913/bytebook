import { Events } from "@wailsio/runtime";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { attachmentsAtom } from "../../atoms";
import { ChevronDown } from "../../icons/chevron-down";
import { cn } from "../../utils/string-formatting";

export function AttachmentsAccordion({
	folder,
	note,
}: { folder: string; note: string | undefined }) {
	const [isAttachmentsCollapsed, setIsAttachmentsCollapsed] = useState(true);
	const attachments = useAtomValue(attachmentsAtom);

	const attachmentElements = attachments?.map((attachmentPath) => (
		<li key={attachmentPath}>
			<div
				className="flex select-none items-center gap-2 overflow-hidden pr-1"
				// style={
				// 	{
				// 		"--custom-contextmenu": "note-context-menu",
				// 		"--custom-contextmenu-data": noteName,
				// 	} as CSSProperties
				// }
			>
				<button
					onDoubleClick={() => {
						Events.Emit({
							name: "open-note-in-new-window-backend",
							data: { folder, note },
						});
					}}
					title={attachmentPath}
					type="button"
					className={cn(
						"mb-[0.15rem] flex flex-1 items-center gap-2 overflow-auto rounded-md px-2.5 py-[0.35rem]",
						// noteName === note && "bg-zinc-100 dark:bg-zinc-700",
					)}
				>
					{/* {noteName === note ? (
						<FilePen title="" className="min-w-[1.25rem]" />
					) : (
						<Note title="" className="min-w-[1.25rem]" />
					)}{" "} */}
					<p className="overflow-hidden text-ellipsis whitespace-nowrap">
						{attachmentPath}
					</p>
				</button>
			</div>
		</li>
	));

	return (
		<section className="shadow-2xl border-[1px] border-zinc-200 dark:border-zinc-600 flex flex-col absolute bottom-0 w-full max-h-[calc(100vh-14rem)] bg-zinc-50 dark:bg-zinc-800 rounded-md">
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
						className="overflow-y-auto"
					>
						{attachmentElements}
					</motion.ul>
				)}
			</AnimatePresence>
		</section>
	);
}
