import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai/index";
import { type CSSProperties, useState } from "react";
import { Link } from "wouter";
import { alphabetizedFoldersAtom } from "../../atoms.ts";
import { ChevronDown } from "../../icons/chevron-down.tsx";
import { FolderOpen } from "../../icons/folder-open.tsx";
import { Folder } from "../../icons/folder.tsx";
import { cn } from "../../utils/string-formatting.ts";

export function MyFoldersAccordion({
	folder,
}: {
	folder: string | undefined;
}) {
	const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
	const alphabetizedFolders = useAtomValue(alphabetizedFoldersAtom);
	const hasFolders = alphabetizedFolders && alphabetizedFolders.length > 0;
	const folderElements = alphabetizedFolders?.map((folderName) => (
		<li key={folderName}>
			<div
				id="folder"
				className="flex items-center gap-2 overflow-hidden pr-1 select-none"
				style={
					{
						"--custom-contextmenu": "folder-context-menu",
						"--custom-contextmenu-data": folderName,
					} as CSSProperties
				}
			>
				<Link
					data-testid={`folder_link-${folderName}`}
					className={cn(
						"flex flex-1 gap-2 items-center px-3 py-[0.45rem] rounded-md overflow-x-hidden",
						folderName === folder && "bg-zinc-100 dark:bg-zinc-700",
					)}
					to={`/${encodeURI(folderName)}`}
				>
					{folderName === folder ? (
						<FolderOpen className="min-w-[1.25rem]" />
					) : (
						<Folder className="min-w-[1.25rem]" />
					)}{" "}
					<p className="whitespace-nowrap text-ellipsis overflow-hidden">
						{folderName}
					</p>
				</Link>
			</div>
		</li>
	));

	return (
		<section className="flex-1 overflow-y-auto flex flex-col gap-1.5">
			{hasFolders && (
				<button
					onClick={() => setIsFoldersCollapsed((prev) => !prev)}
					type="button"
					className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-1 px-1.5 rounded-md transition-colors"
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
							<span className="tracking-wider">({folderElements?.length})</span>
						)}
					</p>
				</button>
			)}

			<AnimatePresence>
				{!isFoldersCollapsed && (
					<motion.ul
						initial={{ height: 0 }}
						animate={{
							height: "auto",
							transition: { type: "spring", damping: 16 },
						}}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden hover:overflow-auto"
					>
						<div>{folderElements}</div>
					</motion.ul>
				)}
			</AnimatePresence>
			{!hasFolders && (
				<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
					Create a folder with the "Create Folder" button above
				</li>
			)}
		</section>
	);
}
