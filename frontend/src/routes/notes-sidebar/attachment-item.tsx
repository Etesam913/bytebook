import { Events } from "@wailsio/runtime";
import { AnimatePresence } from "framer-motion";
import type {
	CSSProperties,
	Dispatch,
	DragEvent,
	RefObject,
	SetStateAction,
} from "react";
import ReactDOM from "react-dom";
import { Link } from "wouter";
import { SidebarHighlight } from "../../components/sidebar/highlight";
import { ImageIcon } from "../../icons/image";
import { IMAGE_FILE_EXTENSIONS } from "../../types";
import { cn } from "../../utils/string-formatting";

function handleDragStart(
	e: DragEvent<HTMLAnchorElement>,
	attachmentsSelectionRange: Set<number>,
	attachments: string[],
	attachmentFile: string,
) {
	const selectedFiles = Array.from(attachmentsSelectionRange).map(
		(index) => attachments[index],
	);
	if (selectedFiles.length === 0) selectedFiles.push(attachmentFile);
	// Setting the data for the CONTROLLED_TEXT_INSERTION_COMMAND
	e.dataTransfer.setData("text/plain", selectedFiles.join(","));

	// Adding the children to the drag element in the case where there are multiple attachments selected
	const dragElement = e.target as HTMLElement;
	const ghostElement = dragElement.cloneNode(true) as HTMLElement;
	ghostElement.classList.add("dragging", "drag-grid");

	const children = selectedFiles.map((file) => {
		return (
			<>
				{IMAGE_FILE_EXTENSIONS.some((ext) => attachmentFile.endsWith(ext)) && (
					<ImageIcon className="min-w-[1.25rem]" title="" />
				)}

				<p className="overflow-hidden text-ellipsis whitespace-nowrap">
					{file}
				</p>
			</>
		);
	});

	document.body.appendChild(ghostElement);
	ReactDOM.render(children, ghostElement);
	e.dataTransfer.setDragImage(ghostElement, -25, -25);

	// Cleaning up the ghost element after the drag ends
	function handleDragEnd() {
		ghostElement.remove();
		dragElement.removeEventListener("dragEnd", handleDragEnd);
	}

	dragElement.addEventListener("dragend", handleDragEnd);
}

export function AttachmentItem({
	attachmentFile,
	attachments,
	attachmentsSelectionRange,
	setAttachmentsSelectionRange,
	anchorSelectionIndex,
	folder,
	note,
	i,
	hoveredIndex,
	setHoveredIndex,
}: {
	attachmentFile: string;
	attachments: string[];
	attachmentsSelectionRange: Set<number>;
	setAttachmentsSelectionRange: Dispatch<SetStateAction<Set<number>>>;
	anchorSelectionIndex: RefObject<number | null>;
	folder: string;
	note: string | undefined;
	i: number;
	hoveredIndex: number | null;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
}) {
	return (
		<li
			onMouseEnter={() => setHoveredIndex(i)}
			onMouseLeave={() => setHoveredIndex(null)}
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
			className="py-[.1rem]"
		>
			<div className="flex items-center relative select-none rounded-md mx-1.5">
				<AnimatePresence>
					{hoveredIndex === i && attachmentFile !== note && (
						<SidebarHighlight layoutId="folder-highlight" />
					)}
				</AnimatePresence>
				<Link
					draggable
					onDragStart={(e) => {
						handleDragStart(
							e,
							attachmentsSelectionRange,
							attachments,
							attachmentFile,
						);
					}}
					onMouseUp={(e) => {
						// shift + click
						if (e.shiftKey) {
							if (anchorSelectionIndex.current !== null) {
								const start = Math.min(anchorSelectionIndex.current, i);
								const end = Math.max(anchorSelectionIndex.current, i);
								setAttachmentsSelectionRange(
									new Set(
										Array.from(
											{ length: end - start + 1 },
											(_, i) => start + i,
										),
									),
								);
							}
						} else {
							// anchorSelectionIndex.current = i;
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
					// onDoubleClick={(e) => {
					// 	if (!e.metaKey) {
					// 		Events.Emit({
					// 			name: "open-note-in-new-window-backend",
					// 			data: { folder, note },
					// 		});
					// 	}
					// }}
					title={attachmentFile}
					type="button"
					className={cn(
						"flex flex-1 gap-2 items-center px-2 py-1 rounded-md relative z-10 overflow-x-hidden",
						attachmentFile === note && "bg-zinc-100 dark:bg-zinc-700",
						attachmentsSelectionRange.has(i) && "bg-zinc-100 dark:bg-zinc-700",
					)}
				>
					{IMAGE_FILE_EXTENSIONS.some((ext) =>
						attachmentFile.endsWith(ext),
					) && <ImageIcon className="min-w-[1.25rem]" title="" />}

					<p className="overflow-hidden text-ellipsis whitespace-nowrap">
						{attachmentFile}
					</p>
				</Link>
			</div>
		</li>
	);
}
