import { motion, useAnimationControls } from "framer-motion";
import { useAtomValue } from "jotai";
import { getDefaultButtonVariants } from "../../animations";
import { draggedElementAtom, isNoteMaximizedAtom } from "../../atoms";
import { MotionIconButton } from "../../components/buttons";
import { MaximizeNoteButton } from "../../components/buttons/maximize-note";
import { NotesEditor } from "../../components/editor";
import { BottomBar } from "../../components/editor/bottom-bar";
import { useMostRecentNotes } from "../../components/editor/hooks/note-metadata";
import { useCreateNoteDialog } from "../../hooks/dialogs";
import { useNoteRevealInFinderMutation } from "../../hooks/notes";
import { Compose } from "../../icons/compose";
import { FileBan } from "../../icons/file-ban";
import { ShareRight } from "../../icons/share-right";
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from "../../types";
import { FILE_SERVER_URL } from "../../utils/general";
import { cn } from "../../utils/string-formatting";
import { SidebarImage } from "./sidebar-image";
import { SidebarVideo } from "./sidebar-video";

export function RenderNote({
	folder,
	note,
	fileExtension,
}: {
	folder: string;
	note: string | undefined;
	fileExtension: string | undefined;
}) {
	const animationControls = useAnimationControls();
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const normalizedExtension = fileExtension?.toLowerCase().trim();
	const hasCustomToolbar = normalizedExtension === "md";

	const isPdf = normalizedExtension === "pdf";
	const isMarkdown = normalizedExtension === "md";
	const isImage =
		normalizedExtension && IMAGE_FILE_EXTENSIONS.includes(normalizedExtension);
	const isVideo =
		normalizedExtension && VIDEO_FILE_EXTENSIONS.includes(normalizedExtension);
	const isUnknownFile =
		!isPdf && !isMarkdown && !isImage && !isVideo && normalizedExtension;
	const draggedElement = useAtomValue(draggedElementAtom);

	const fileUrl = `${FILE_SERVER_URL}/notes/${folder}/${note}.${normalizedExtension}`;

	const createNoteDialog = useCreateNoteDialog();
	useMostRecentNotes(folder, note, normalizedExtension);
	const { mutate: revealInFinder } = useNoteRevealInFinderMutation();

	if (!note)
		return (
			<div className="flex flex-col items-center justify-center h-screen flex-1 gap-3 pb-16 px-3 text-center">
				<Compose width={48} height={48} />
				<h1 className="text-2xl font-bold ">
					{" "}
					Click the{" "}
					<button
						type="button"
						className="link inline"
						onClick={() => createNoteDialog(folder)}
					>
						"Create Note"
					</button>{" "}
					button to get started
				</h1>
			</div>
		);
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
					<MaximizeNoteButton animationControls={animationControls} />
					<h1 className="text-base overflow-ellipsis overflow-hidden ">
						{folder}/{note}.{normalizedExtension}
					</h1>
					<MotionIconButton
						title="Open In Default App"
						{...getDefaultButtonVariants()}
						className="ml-auto"
						onClick={() => {
							revealInFinder({
								folder,
								selectionRange: new Set([
									`note:${note}?ext=${normalizedExtension}`,
								]),
							});
						}}
					>
						<ShareRight title="Open In Default App" />
					</MotionIconButton>
				</header>
			)}
			{isMarkdown && (
				<NotesEditor
					params={{ folder, note }}
					animationControls={animationControls}
				/>
			)}

			{isPdf && (
				<>
					<iframe
						title={note}
						className={cn(
							"flex-1 overflow-auto mr-1 dark:invert",
							isNoteMaximized && "w-full mr-0",
							draggedElement !== null && "pointer-events-none",
						)}
						src={fileUrl}
					/>
					<BottomBar folder={folder} note={note} ext={normalizedExtension} />
				</>
			)}

			{isImage && (
				<SidebarImage
					key={`folder-${folder}-note-${note}-video`}
					folder={folder}
					note={note}
					fileUrl={fileUrl}
					fileExtension={normalizedExtension}
					isNoteMaximized={isNoteMaximized}
				/>
			)}

			{isVideo && (
				<SidebarVideo
					key={`folder-${folder}-note-${note}-video`}
					folder={folder}
					note={note}
					fileUrl={fileUrl}
					fileExtension={normalizedExtension}
					isNoteMaximized={isNoteMaximized}
					draggedElement={draggedElement}
				/>
			)}

			{isUnknownFile && (
				<>
					<section className="flex-1 flex flex-col items-center justify-center text-center px-3 pb-16 gap-3">
						<FileBan width={48} height={48} />
						<h1 className="text-2xl font-bold">
							This file type is not supported.
						</h1>
					</section>
					<BottomBar folder={folder} note={note} ext={normalizedExtension} />
				</>
			)}
		</motion.div>
	);
}
