import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai/react";
import { useState } from "react";
import { tagsAtom } from "../../atoms";
import { TagIcon } from "../../icons/tag";
import { Sidebar } from "../sidebar";
import { AccordionButton } from "../sidebar/accordion-button";

export function MyTagsAccordion() {
	const [isOpen, setIsOpen] = useState(true);

	const tags = useAtomValue(tagsAtom);

	return (
		<section className="flex-1 overflow-y-auto flex flex-col">
			<AccordionButton
				isOpen={isOpen}
				onClick={() => setIsOpen((prev) => !prev)}
				icon={<TagIcon width={18} height={18} strokeWidth={1.75} />}
				title="Tags"
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
						className="overflow-hidden hover:overflow-auto"
					>
						<Sidebar
							layoutId="my-tags-accordion"
							emptyElement={
								<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
									Type #tagName in a note to create a tag
								</li>
							}
							renderLink={({
								dataItem: sidebarTagName,
								i,
								selectionRange,
								setSelectionRange,
							}) => {
								return (
									<button
										type="button"
										draggable
										className="sidebar-item"
										// onDragStart={(e) =>
										// 	handleDragStart(
										// 		e,
										// 		setSelectionRange,
										// 		"folder",
										// 		alphabetizedFolders?.at(i) ?? "",
										// 		setDraggedElement,
										// 	)
										// }
										// className={cn(
										// 	"sidebar-item",
										// 	folder &&
										// 		decodeURIComponent(folder) === sidebarFolderName &&
										// 		"bg-zinc-150 dark:bg-zinc-700",
										// 	alphabetizedFolders?.at(i) &&
										// 		selectionRange.has(
										// 			`folder:${alphabetizedFolders[i]}`,
										// 		) &&
										// 		"!bg-blue-400 dark:!bg-blue-600 text-white",
										// )}
										// onClick={(e) => {
										// 	if (e.metaKey || e.shiftKey) return;
										// 	navigate(`/${encodeURIComponent(sidebarFolderName)}`);
										// }}
										onContextMenu={() => {
											// if (selectionRange.size === 0) {
											// 	setSelectionRange(
											// 		new Set([`folder:${sidebarFolderName}`]),
											// 	);
											// } else {
											// 	setSelectionRange((prev) => {
											// 		const setWithoutNotes =
											// 			removeNotesFromSelection(prev);
											// 		setWithoutNotes.add(`folder:${sidebarFolderName}`);
											// 		return setWithoutNotes;
											// 	});
											// }
										}}
									>
										{/* {folder &&
										decodeURIComponent(folder) === sidebarFolderName ? (
											<FolderOpen
												title=""
												className="min-w-5"
												width={20}
												height={20}
											/>
										) : (
											<Folder
												title=""
												className="min-w-5"
												width={20}
												height={20}
											/>
										)}{" "} */}
										<TagIcon />
										<p className="whitespace-nowrap text-ellipsis overflow-hidden">
											{sidebarTagName}
										</p>
									</button>
								);
							}}
							data={tags}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}
