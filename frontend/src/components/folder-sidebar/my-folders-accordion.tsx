import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai";
import { useMemo, useState } from "react";
import {
	alphabetizedFoldersAtom,
	contextMenuDataAtom,
	dialogDataAtom,
	draggedElementAtom,
} from "../../atoms";
import {
	useFolderDialogSubmit,
	useFolderRevealInFinderMutation,
} from "../../hooks/folder-events";
import { Finder } from "../../icons/finder";
import { Folder } from "../../icons/folder";
import { FolderOpen } from "../../icons/folder-open";
import { FolderPen } from "../../icons/folder-pen";
import { Trash } from "../../icons/trash";
import { useCustomNavigate } from "../../utils/routing";
import {
	handleKeyNavigation,
	keepSelectionNotesWithPrefix,
} from "../../utils/selection";
import { cn } from "../../utils/string-formatting";
import { Sidebar } from "../sidebar";
import { AccordionButton } from "../sidebar/accordion-button";
import { handleDragStart } from "../sidebar/utils";
import { FolderDialogChildren } from "./folder-dialog-children";

export function MyFoldersAccordion({ folder }: { folder: string | undefined }) {
	const alphabetizedFolders = useAtomValue(alphabetizedFoldersAtom);
	const hasFolders = alphabetizedFolders && alphabetizedFolders.length > 0;
	const [isOpen, setIsOpen] = useState(true);

	return (
		<section>
			<AccordionButton
				isOpen={isOpen}
				onClick={() => setIsOpen((prev) => !prev)}
				icon={<Folder width={20} height={20} strokeWidth={1.75} />}
				title={
					<>
						Folders{" "}
						{hasFolders && (
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
	const isActive = useMemo(
		() => decodeURIComponent(folderFromUrl ?? "") === sidebarFolderName,
		[folderFromUrl, sidebarFolderName],
	);

	const isSelected = useMemo(() => {
		const currentFolder = alphabetizedFolders?.at(i);
		if (!currentFolder) return false;
		return selectionRange.has(`folder:${currentFolder}`);
	}, [alphabetizedFolders, i, selectionRange]);

	return (
		<button
			type="button"
			draggable
			onDragStart={(e) =>
				handleDragStart(
					e,
					setSelectionRange,
					"folder",
					alphabetizedFolders?.at(i) ?? "",
					setDraggedElement,
				)
			}
			onKeyDown={(e) => handleKeyNavigation(e)}
			className={cn(
				"list-sidebar-item",
				isActive && "bg-zinc-150 dark:bg-zinc-700",
				isSelected && "!bg-[var(--accent-color)]",
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
									<Finder width={17} height={17} /> Reveal In Finder
								</span>
							),
							value: "reveal-in-finder",
							onChange: () =>
								revealInFinder({ selectionRange: newSelectionRange }),
						},
						{
							label: (
								<span className="flex items-center gap-1.5">
									<FolderPen width={17} height={17} /> Rename Folder
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
									<Trash width={17} height={17} /> Move to Trash
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
