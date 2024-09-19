import { Events } from "@wailsio/runtime";
import { motion, useAnimationControls } from "framer-motion";
import { useAtomValue } from "jotai";
import { draggedElementAtom, isNoteMaximizedAtom } from "../../atoms";
import { MaximizeNoteButton } from "../../components/buttons/maximize-note";
import { NotesEditor } from "../../components/editor";
import { useMostRecentNotes } from "../../components/editor/hooks/note-metadata";
import { TrashEditor } from "../../components/editor/trash-editor";
import { TerminalComponent } from "../../components/terminal";
import { FileBan } from "../../icons/file-ban";
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from "../../types";
import { FILE_SERVER_URL } from "../../utils/misc";
import { cn } from "../../utils/string-formatting";

export function RenderNote({
	folder,
	note,
	fileExtension,
}: {
	folder: string;
	note: string | undefined;
	fileExtension: string | undefined;
}) {
	if (!note) return <></>;
	const animationControls = useAnimationControls();
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const hasCustomToolbar = fileExtension === "md";

	const isInTrash = folder === "trash";

	const isPdf = fileExtension === "pdf";
	const isMarkdown = fileExtension === "md";
	const isImage =
		fileExtension && IMAGE_FILE_EXTENSIONS.includes(fileExtension);
	const isVideo =
		fileExtension && VIDEO_FILE_EXTENSIONS.includes(fileExtension);
	const isUnknownFile = !isPdf && !isMarkdown && !isImage && !isVideo;
	const draggedElement = useAtomValue(draggedElementAtom);

	const fileUrl = `${FILE_SERVER_URL}/${
		isInTrash ? "" : "notes"
	}/${folder}/${note}.${fileExtension}`;

	useMostRecentNotes(folder, note, fileExtension);

	return (
		<motion.div
			className="flex min-w-0 flex-1 flex-col leading-7 h-screen "
			animate={animationControls}
		>
			{!hasCustomToolbar && (
				<header
					className={cn(
						"flex  items-center gap-1.5 border-b px-2 pb-1 pt-2.5 h-12 border-zinc-200 dark:border-b-zinc-700 whitespace-nowrap ml-[-4.5px]",
						isNoteMaximized && "!pl-[5.75rem]",
					)}
				>
					{!isInTrash && (
						<MaximizeNoteButton animationControls={animationControls} />
					)}
					<h1 className="text-base overflow-ellipsis overflow-hidden ">
						{folder}/{note}.{fileExtension}
					</h1>
				</header>
			)}
			{/* {isMarkdown &&
				(isInTrash ? (
					<TrashEditor curFile={`${note}.${fileExtension}`} />
				) : (
					<NotesEditor
						params={{ folder, note }}
						animationControls={animationControls}
					/>
				))} */}
			<TerminalComponent nodeKey="10" />
			<button
				type="button"
				onClick={() => {
					Events.Emit({
						name: "terminal:create",
						data: "10",
					});
				}}
			>
				create terminal
			</button>

			<button
				type="button"
				onClick={() => {
					Events.Emit({
						name: "test",
						data: [],
					});
				}}
			>
				event for terminal
			</button>

			{isPdf && (
				<iframe
					title={note}
					className={cn(
						"flex-1 overflow-auto mr-1 dark:invert",
						isNoteMaximized && "w-full mr-0",
						draggedElement !== null && "pointer-events-none",
					)}
					src={fileUrl}
				/>
			)}

			{isImage && (
				<img
					className={cn(
						"flex-1 overflow-auto object-contain my-auto mr-1",
						isNoteMaximized && "w-full",
					)}
					alt={note}
					title={note}
					src={fileUrl}
				/>
			)}

			{isVideo && (
				<video
					controls
					title={note}
					className={cn(
						"flex-1 overflow-auto mr-1 bg-black",
						isNoteMaximized && "w-full mr-0",
						draggedElement !== null && "pointer-events-none",
					)}
					src={fileUrl}
				/>
			)}

			{isUnknownFile && (
				<section className="flex-1 flex flex-col items-center justify-center text-center px-3 pb-16 gap-3">
					<FileBan width="3rem" height="3rem" />
					<h1 className="text-2xl font-bold">
						This file type is not supported.
					</h1>
				</section>
			)}
		</motion.div>
	);
}
