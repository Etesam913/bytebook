import { AnimatePresence, motion } from "framer-motion";
import { useSetAtom } from "jotai";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getDefaultButtonVariants } from "../../animations";
import {
	contextMenuDataAtom,
	dialogDataAtom,
	draggedElementAtom,
} from "../../atoms";
import {
	useFolderDialogSubmit,
	useFolderRevealInFinderMutation,
	useFolders,
	useMoveNoteIntoFolder,
} from "../../hooks/folders";
import { Finder } from "../../icons/finder";
import { Folder } from "../../icons/folder";
import { FolderOpen } from "../../icons/folder-open";
import { FolderPen } from "../../icons/folder-pen";
import { FolderRefresh } from "../../icons/folder-refresh";
import { Loader } from "../../icons/loader";
import { Trash } from "../../icons/trash";
import { BYTEBOOK_DRAG_DATA_FORMAT } from "../../utils/draggable";
import { useCustomNavigate } from "../../utils/routing";
import {
	handleKeyNavigation,
	keepSelectionNotesWithPrefix,
} from "../../utils/selection";
import { cn } from "../../utils/string-formatting";
import { MotionButton } from "../buttons";
import { Sidebar } from "../sidebar";
import { AccordionButton } from "../sidebar/accordion-button";
import { handleDragStart } from "../sidebar/utils";
import { FolderDialogChildren } from "./folder-dialog-children";

export function MyFoldersAccordion({ folder }: { folder: string | undefined }) {
	const [isOpen, setIsOpen] = useState(true);
	const { alphabetizedFolders, isLoading, isError, refetch } =
		useFolders(folder);

	return (
		<section>
			<AccordionButton
				isOpen={isOpen}
				onClick={() => setIsOpen((prev) => !prev)}
				icon={<Folder width={20} height={20} strokeWidth={1.75} />}
				title={
					<>
						Folders{" "}
						{alphabetizedFolders && alphabetizedFolders.length > 0 && (
							<span className="tracking-wider">
								({alphabetizedFolders.length})
							</span>
						)}
					</>
				}
			/>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ height: 0 }}
						animate={{
							height: "auto",
							transition: { type: "spring", damping: 16 },
						}}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden hover:overflow-auto pl-1"
					>
						{isError && (
							<div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance">
								<p className="text-red-500">
									Something went wrong when fetching the folders
								</p>
								<MotionButton
									{...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
									className="mx-2.5 flex text-center"
									onClick={() => refetch()}
								>
									<span>Retry</span>{" "}
									<FolderRefresh
										className="will-change-transform"
										width={16}
										height={16}
									/>
								</MotionButton>
							</div>
						)}
						{!isError &&
							(isLoading ? (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.35 }}
								>
									<Loader width={20} height={20} className="mx-auto my-3" />
								</motion.div>
							) : (
								<Sidebar
									contentType="folder"
									layoutId="folder-sidebar"
									emptyElement={
										<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
											Create a folder with the "Create Folder" button above
										</li>
									}
									renderLink={({
										dataItem: sidebarFolderName,
										i,
										selectionRange,
										setSelectionRange,
									}) => {
										return (
											<FolderAccordionButton
												folderFromUrl={folder}
												sidebarFolderName={sidebarFolderName}
												i={i}
												selectionRange={selectionRange}
												setSelectionRange={setSelectionRange}
												alphabetizedFolders={alphabetizedFolders}
											/>
										);
									}}
									data={alphabetizedFolders}
								/>
							))}
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}

function FolderAccordionButton({
	folderFromUrl,
	sidebarFolderName,
	i,
	selectionRange,
	setSelectionRange,
	alphabetizedFolders,
}: {
	folderFromUrl: string | undefined;
	sidebarFolderName: string;
	i: number;
	selectionRange: Set<string>;
	setSelectionRange: React.Dispatch<React.SetStateAction<Set<string>>>;
	alphabetizedFolders: string[] | null;
}) {
	const { navigate } = useCustomNavigate();
	const setDraggedElement = useSetAtom(draggedElementAtom);
	const setContextMenuData = useSetAtom(contextMenuDataAtom);
	const { mutate: revealInFinder } = useFolderRevealInFinderMutation();
	const setDialogData = useSetAtom(dialogDataAtom);
	const { mutateAsync: folderDialogSubmit } = useFolderDialogSubmit();
	const { mutateAsync: moveNoteIntoFolder } = useMoveNoteIntoFolder();
	const isActive = useMemo(
		() => decodeURIComponent(folderFromUrl ?? "") === sidebarFolderName,
		[folderFromUrl, sidebarFolderName],
	);

	const isSelected = useMemo(() => {
		const currentFolder = alphabetizedFolders?.at(i);
		if (!currentFolder) return false;
		return selectionRange.has(`folder:${currentFolder}`);
	}, [alphabetizedFolders, i, selectionRange]);

	const [isDraggedOver, setIsDraggedOver] = useState(false);

	return (
		<button
			type="button"
			draggable
			onDrop={(e) => {
				setIsDraggedOver(false);
				if (!e.dataTransfer.types.includes(BYTEBOOK_DRAG_DATA_FORMAT)) return;
				const jsonString = e.dataTransfer.getData(BYTEBOOK_DRAG_DATA_FORMAT);
				try {
					const data = JSON.parse(jsonString);
					if (!data?.fileData) throw new Error();
					moveNoteIntoFolder({
						backendNotePaths: data.fileData.map(
							({
								folder,
								note,
								extension,
							}: { folder: string; note: string; extension: string }) => {
								return `${folder}/${note}.${extension}`;
							},
						),
						newFolder: sidebarFolderName,
					});
				} catch {
					toast.error(`Failed to move to ${sidebarFolderName}/`);
				}
			}}
			onDragLeave={() => {
				setIsDraggedOver(false);
			}}
			onDragOver={(e) => {
				if (e.dataTransfer.types.includes(BYTEBOOK_DRAG_DATA_FORMAT)) {
					e.preventDefault();
					setIsDraggedOver(true);
					e.dataTransfer.dropEffect = "copy";
				}
			}}
			onDragStart={(e) =>
				handleDragStart({
					e,
					setSelectionRange,
					contentType: "folder",
					draggedItem: alphabetizedFolders?.at(i) ?? "",
					setDraggedElement,
				})
			}
			onKeyDown={(e) => handleKeyNavigation(e)}
			className={cn(
				"list-sidebar-item",
				isActive && "bg-zinc-150 dark:bg-zinc-700",
				(isSelected || isDraggedOver) && "bg-(--accent-color)! text-white",
			)}
			onClick={(e) => {
				if (e.metaKey || e.shiftKey) return;
				(e.target as HTMLButtonElement).focus();
				navigate(`/${encodeURIComponent(sidebarFolderName)}`, {
					type: "folder",
				});
			}}
			onContextMenu={(e) => {
				e.preventDefault();
				let newSelectionRange = new Set([`folder:${sidebarFolderName}`]);
				if (selectionRange.size === 0) {
					setSelectionRange(newSelectionRange);
				} else {
					setSelectionRange((prev) => {
						const setWithoutNotes = keepSelectionNotesWithPrefix(
							prev,
							"folder",
						);
						setWithoutNotes.add(`folder:${sidebarFolderName}`);
						newSelectionRange = setWithoutNotes;
						return setWithoutNotes;
					});
				}
				setContextMenuData({
					x: e.clientX,
					y: e.clientY,
					isShowing: true,
					items: [
						{
							label: (
								<span className="flex items-center gap-1.5">
									<Finder
										width={17}
										height={17}
										className="will-change-transform"
									/>{" "}
									Reveal In Finder
								</span>
							),
							value: "reveal-in-finder",
							onChange: () =>
								revealInFinder({ selectionRange: newSelectionRange }),
						},
						{
							label: (
								<span className="flex items-center gap-1.5">
									<FolderPen
										width={17}
										height={17}
										className="will-change-transform"
									/>{" "}
									Rename Folder
								</span>
							),
							value: "rename-folder",
							onChange: () => {
								setDialogData({
									isOpen: true,
									isPending: true,
									title: "Rename Folder",
									children: (errorText) => (
										<FolderDialogChildren
											errorText={errorText}
											action="rename"
											folderName={sidebarFolderName}
										/>
									),
									onSubmit: async (evt, setErrorText) =>
										folderDialogSubmit({
											e: evt,
											setErrorText,
											action: "rename",
											folderFromSidebar: sidebarFolderName,
										}),
								});
							},
						},
						{
							label: (
								<span className="flex items-center gap-1.5">
									<Trash
										width={17}
										height={17}
										className="will-change-transform"
									/>{" "}
									Move to Trash
								</span>
							),
							value: "move-to-trash",
							onChange: () => {
								setDialogData({
									isOpen: true,
									title: "Move to Trash",
									isPending: false,
									children: (errorText) => (
										<FolderDialogChildren
											errorText={errorText}
											action="delete"
											folderName={sidebarFolderName}
										/>
									),
									onSubmit: async (evt, setErrorText) =>
										folderDialogSubmit({
											e: evt,
											setErrorText,
											action: "delete",
											folderFromSidebar: sidebarFolderName,
										}),
								});
							},
						},
					],
				});
			}}
		>
			{isActive ? (
				<FolderOpen
					title=""
					className="min-w-[18px] pointer-events-none"
					width={18}
					height={18}
					strokeWidth={1.7}
				/>
			) : (
				<Folder
					title=""
					className="min-w-[18px] pointer-events-none"
					width={18}
					height={18}
					strokeWidth={1.7}
				/>
			)}
			<p className="whitespace-nowrap text-ellipsis overflow-hidden pointer-events-none">
				{sidebarFolderName}
			</p>
		</button>
	);
}
