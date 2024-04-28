import { Events } from "@wailsio/runtime";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import {
	type CSSProperties,
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { Link } from "wouter";
import { attachmentsAtom } from "../../atoms";
import { ChevronDown } from "../../icons/chevron-down";
import { ImageIcon } from "../../icons/image";
import { IMAGE_FILE_EXTENSIONS } from "../../types";
import { cn } from "../../utils/string-formatting";

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

	// Close attachments accordion when folder changes
	useEffect(() => {
		setIsAttachmentsCollapsed(true);
	}, [folder]);

	const attachmentElements = attachments?.map((attachmentFile, i) => (
		<li
			key={attachmentFile}
			onClick={(e) => {
				e.stopPropagation();
			}}
			style={
				{
					"--custom-contextmenu": "attachment-context-menu",
					"--custom-contextmenu-data": JSON.stringify({ file: attachmentFile }),
				} as CSSProperties
			}
			className="flex select-none items-center gap-2 overflow-hidden px-1"
		>
			<Link
				draggable
				onDragStart={(e) => {
					const selectedFiles = Array.from(attachmentsSelectionRange).map(
						(index) => attachments[index],
					);
					if (selectedFiles.length === 0) selectedFiles.push(attachmentFile);

					e.dataTransfer.setData("text/plain", selectedFiles.join(","));
				}}
				onMouseUp={(e) => {
					// shift + click
					if (e.shiftKey) {
						if (anchorSelectionIndex.current !== null) {
							const start = Math.min(anchorSelectionIndex.current, i);
							const end = Math.max(anchorSelectionIndex.current, i);
							setAttachmentsSelectionRange(
								new Set(
									Array.from({ length: end - start + 1 }, (_, i) => start + i),
								),
							);
						}
					} else {
						anchorSelectionIndex.current = i;
						// cmd + click
						if (e.metaKey) {
							e.stopPropagation();
							setAttachmentsSelectionRange((prev) => {
								const newSelection = new Set(prev);
								if (newSelection.has(i)) {
									newSelection.delete(i);
								} else {
									newSelection.add(i);
								}
								return newSelection;
							});
						} else {
							setAttachmentsSelectionRange(new Set([i]));
						}
					}
				}}
				target="_blank"
				to={`/${folder}/${attachmentFile}?ext=.${attachmentFile
					.split(".")
					.pop()}`}
				onDoubleClick={(e) => {
					if (!e.metaKey) {
						Events.Emit({
							name: "open-note-in-new-window-backend",
							data: { folder, note },
						});
					}
				}}
				title={attachmentFile}
				type="button"
				className={cn(
					"my-[0.1rem] flex flex-1 items-center gap-2 overflow-x-auto rounded-md px-2.5 py-[0.35rem]",
					attachmentFile === note && "bg-zinc-100 dark:bg-zinc-700",
					attachmentsSelectionRange.has(i) && "bg-zinc-100 dark:bg-zinc-700",
				)}
			>
				{IMAGE_FILE_EXTENSIONS.some((ext) => attachmentFile.endsWith(ext)) && (
					<ImageIcon className="min-w-[1.25rem]" title="" />
				)}

				<p className="overflow-hidden text-ellipsis whitespace-nowrap">
					{attachmentFile}
				</p>
			</Link>
		</li>
	));

	return (
		<section className="shadow-2xl border-[1px] w-[calc(100%-0.8rem)] border-zinc-200 dark:border-zinc-600 flex flex-col absolute bottom-0 max-h-[calc(100vh-14rem)] bg-zinc-50 dark:bg-zinc-800 rounded-md">
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
