import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
	alphabetizedFoldersAtom,
	contextMenuDataAtom,
	dialogDataAtom,
	draggedElementAtom,
} from "../../atoms.ts";
import {
	useFolderDialogSubmit,
	useFolderRevealInFinderMutation,
} from "../../hooks/folder-events.tsx";
import { Finder } from "../../icons/finder.tsx";
import { FolderOpen } from "../../icons/folder-open.tsx";
import { FolderPen } from "../../icons/folder-pen.tsx";
import { FolderXMark } from "../../icons/folder-xmark.tsx";
import { Folder } from "../../icons/folder.tsx";
import { useCustomNavigate } from "../../utils/routing.ts";
import { removeNotesFromSelection } from "../../utils/selection.ts";
import { cn } from "../../utils/string-formatting.ts";
import { AccordionButton } from "../sidebar/accordion-button.tsx";
import { Sidebar } from "../sidebar/index.tsx";
import { handleDragStart } from "../sidebar/utils.tsx";
import { FolderDialogChildren } from "./folder-dialog-children.tsx";

export function MyFoldersAccordion({
	folder,
}: {
	folder: string | undefined;
}) {
	const alphabetizedFolders = useAtomValue(alphabetizedFoldersAtom);
	const hasFolders = alphabetizedFolders && alphabetizedFolders.length > 0;
	const setDraggedElement = useSetAtom(draggedElementAtom);
	const { navigate } = useCustomNavigate();
	const [isOpen, setIsOpen] = useState(true);
	const setContextMenuData = useSetAtom(contextMenuDataAtom);
	const { mutate: revealInFinder } = useFolderRevealInFinderMutation();
	const setDialogData = useSetAtom(dialogDataAtom);

	const { mutateAsync: folderDialogSubmit } = useFolderDialogSubmit();

	return (
		<section>
			<AccordionButton
				isOpen={isOpen}
				onClick={() => setIsOpen((prev) => !prev)}
				icon={
					<Folder
						width={20}
						height={20}
						strokeWidth={1.75}
						className="will-change-transform"
					/>
				}
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
							layoutId="folder-sidebar "
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
										className={cn(
											"sidebar-item",
											folder &&
												decodeURIComponent(folder) === sidebarFolderName &&
												"bg-zinc-150 dark:bg-zinc-700",
											alphabetizedFolders?.at(i) &&
												selectionRange.has(
													`folder:${alphabetizedFolders[i]}`,
												) &&
												"!bg-blue-400 dark:!bg-blue-600 text-white",
										)}
										onClick={(e) => {
											if (e.metaKey || e.shiftKey) return;
											navigate(`/${encodeURIComponent(sidebarFolderName)}`);
										}}
										onContextMenu={(e) => {
											let newSelectionRange = new Set([
												`folder:${sidebarFolderName}`,
											]);
											if (selectionRange.size === 0) {
												setSelectionRange(
													new Set([`folder:${sidebarFolderName}`]),
												);
											} else {
												setSelectionRange((prev) => {
													const setWithoutNotes =
														removeNotesFromSelection(prev);
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
															revealInFinder({
																selectionRange: newSelectionRange,
															}),
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
																title: "Rename Folder",
																children: (errorText) => (
																	<FolderDialogChildren
																		errorText={errorText}
																		action="rename"
																		folderName={sidebarFolderName}
																	/>
																),
																onSubmit: async (e, setErrorText) =>
																	folderDialogSubmit({
																		e,
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
																<FolderXMark
																	width={17}
																	height={17}
																	className="will-change-transform"
																/>{" "}
																Delete Folder
															</span>
														),
														value: "delete-folder",
														onChange: () => {
															setDialogData({
																isOpen: true,
																title: "Delete Folder",
																children: (errorText) => (
																	<FolderDialogChildren
																		errorText={errorText}
																		action="delete"
																		folderName={sidebarFolderName}
																	/>
																),
																onSubmit: async (e, setErrorText) =>
																	folderDialogSubmit({
																		e,
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
										{folder &&
										decodeURIComponent(folder) === sidebarFolderName ? (
											<FolderOpen
												title=""
												className="min-w-[18px]"
												width={18}
												height={18}
												strokeWidth={1.7}
											/>
										) : (
											<Folder
												title=""
												className="min-w-[18px]"
												width={18}
												height={18}
												strokeWidth={1.7}
											/>
										)}{" "}
										<p className="whitespace-nowrap text-ellipsis overflow-hidden">
											{sidebarFolderName}
										</p>
									</button>
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
