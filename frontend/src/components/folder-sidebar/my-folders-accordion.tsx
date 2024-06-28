import { motion } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai";
import { type CSSProperties, useState } from "react";
import { Link } from "wouter";
import { WINDOW_ID } from "../../App.tsx";
import { alphabetizedFoldersAtom, draggedElementAtom } from "../../atoms.ts";
import { ChevronDown } from "../../icons/chevron-down.tsx";
import { FolderOpen } from "../../icons/folder-open.tsx";
import { Folder } from "../../icons/folder.tsx";
import { cn } from "../../utils/string-formatting.ts";
import { Sidebar } from "../sidebar/index.tsx";
import { handleDragStart } from "../sidebar/utils.tsx";

export function MyFoldersAccordion({
	folder,
}: {
	folder: string | undefined;
}) {
	const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
	const alphabetizedFolders = useAtomValue(alphabetizedFoldersAtom);
	const hasFolders = alphabetizedFolders && alphabetizedFolders.length > 0;
	const setDraggedElement = useSetAtom(draggedElementAtom);

	return (
		<section className="flex-1 overflow-y-auto flex flex-col gap-1.5">
			<button
				onClick={() => setIsFoldersCollapsed((prev) => !prev)}
				type="button"
				className="flex relative items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-1 px-1.5 rounded-md transition-colors"
			>
				<motion.span
					initial={{ rotateZ: isFoldersCollapsed ? 270 : 0 }}
					animate={{ rotateZ: isFoldersCollapsed ? 270 : 0 }}
				>
					<ChevronDown strokeWidth="2.5px" height="0.8rem" width="0.8rem" />
				</motion.span>

				<p>
					My Folders{" "}
					{hasFolders && (
						<span className="tracking-wider">
							({alphabetizedFolders.length})
						</span>
					)}
				</p>
			</button>

			<Sidebar
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
				}) => (
					<Link
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
						target="_blank"
						className={cn(
							"flex flex-1 gap-2 items-center px-2 py-1 rounded-md relative z-10 overflow-x-hidden transition-colors will-change-transform",
							folder &&
								decodeURIComponent(folder) === sidebarFolderName &&
								"bg-zinc-150 dark:bg-zinc-700",
							alphabetizedFolders?.at(i) &&
								selectionRange.has(alphabetizedFolders[i]) &&
								"!bg-blue-400 dark:!bg-blue-600 text-white",
						)}
						to={`/${encodeURIComponent(sidebarFolderName)}`}
						onContextMenu={() => {
							if (selectionRange.size === 0) {
								setSelectionRange(new Set([sidebarFolderName]));
							} else {
								setSelectionRange((prev) => {
									const tempSet = new Set(prev);
									tempSet.add(sidebarFolderName);
									return tempSet;
								});
							}
						}}
					>
						{folder && decodeURIComponent(folder) === sidebarFolderName ? (
							<FolderOpen title="" className="min-w-[1.25rem]" />
						) : (
							<Folder title="" className="min-w-[1.25rem]" />
						)}{" "}
						<p className="whitespace-nowrap text-ellipsis overflow-hidden">
							{sidebarFolderName}
						</p>
					</Link>
				)}
				isCollapsed={isFoldersCollapsed}
				data={alphabetizedFolders}
				getContextMenuStyle={(folderName) =>
					({
						"--custom-contextmenu": "folder-context-menu",
						// WINDOW_ID is needed to only show the delete modal on the current window
						"--custom-contextmenu-data": [folderName, WINDOW_ID],
					}) as CSSProperties
				}
			/>
		</section>
	);
}
