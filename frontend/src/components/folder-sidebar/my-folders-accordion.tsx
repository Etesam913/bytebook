import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";

import {
	alphabetizedFoldersAtom,
	contextMenuDataAtom,
	draggedElementAtom,
} from "../../atoms.ts";

import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen } from "../../icons/folder-open.tsx";
import { Folder } from "../../icons/folder.tsx";
import { useCustomNavigate } from "../../utils/routing.ts";

import { Finder } from "../../icons/finder.tsx";
import { FolderPen } from "../../icons/folder-pen.tsx";
import { FolderXMark } from "../../icons/folder-xmark.tsx";
import { removeNotesFromSelection } from "../../utils/selection.ts";
import { cn } from "../../utils/string-formatting.ts";
import { AccordionButton } from "../sidebar/accordion-button.tsx";
import { Sidebar } from "../sidebar/index.tsx";
import { handleDragStart } from "../sidebar/utils.tsx";

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
													},
												],
											});
											if (selectionRange.size === 0) {
												setSelectionRange(
													new Set([`folder:${sidebarFolderName}`]),
												);
											} else {
												setSelectionRange((prev) => {
													const setWithoutNotes =
														removeNotesFromSelection(prev);
													setWithoutNotes.add(`folder:${sidebarFolderName}`);
													return setWithoutNotes;
												});
											}
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
							// getContextMenuStyle={(folderName) =>
							// 	({
							// 		"--custom-contextmenu": "folder-context-menu",
							// 		// WINDOW_ID is needed to only show the delete modal on the current window
							// 		"--custom-contextmenu-data": [folderName, WINDOW_ID],
							// 	}) as CSSProperties
							// }
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}
