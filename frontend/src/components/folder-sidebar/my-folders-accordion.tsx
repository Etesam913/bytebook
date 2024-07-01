import { useAtomValue, useSetAtom } from "jotai";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { WINDOW_ID } from "../../App.tsx";
import { alphabetizedFoldersAtom, draggedElementAtom } from "../../atoms.ts";

import { FolderOpen } from "../../icons/folder-open.tsx";
import { Folder } from "../../icons/folder.tsx";
import { removeNotesFromSelection } from "../../utils/selection.ts";
import { cn } from "../../utils/string-formatting.ts";
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

	return (
		<section className="flex-1 overflow-y-auto flex flex-col gap-1.5">
			<p className="flex items-center gap-1.5 py-1 rounded-md px-0.5 transition-colors">
				My Folders{" "}
				{hasFolders && (
					<span className="tracking-wider">({alphabetizedFolders.length})</span>
				)}
			</p>

			<Sidebar
				layoutId="my-folders-accordion"
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
							"sidebar-item",
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
									const setWithoutNotes = removeNotesFromSelection(prev);
									setWithoutNotes.add(sidebarFolderName);
									return setWithoutNotes;
								});
							}
						}}
					>
						{folder && decodeURIComponent(folder) === sidebarFolderName ? (
							<FolderOpen title="" width={20} height={20} />
						) : (
							<Folder title="" width={20} height={20} />
						)}{" "}
						<p className="whitespace-nowrap text-ellipsis overflow-hidden">
							{sidebarFolderName}
						</p>
					</Link>
				)}
				isCollapsed={false}
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
