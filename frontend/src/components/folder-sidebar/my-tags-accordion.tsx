import { AnimatePresence, motion } from "framer-motion";

import { useState } from "react";

import { useTagsQuery } from "../../hooks/tag-events";
import { TagIcon } from "../../icons/tag";
import { useCustomNavigate } from "../../utils/routing";
import { Sidebar } from "../sidebar";
import { AccordionButton } from "../sidebar/accordion-button";
import { cn } from "../../utils/string-formatting";

export function MyTagsAccordion() {
	const [isOpen, setIsOpen] = useState(false);
	const { data: tags } = useTagsQuery();
	const alphabetizedTags = tags?.sort((a, b) => a.localeCompare(b));
	const hasTags = alphabetizedTags && alphabetizedTags.length > 0;
	const { navigate } = useCustomNavigate();

	return (
		<section className="pb-1.5">
			<AccordionButton
				isOpen={isOpen}
				onClick={() => setIsOpen((prev) => !prev)}
				icon={<TagIcon width={18} height={18} strokeWidth={1.75} />}
				title={
					<>
						Tags{" "}
						{hasTags && (
							<span className="tracking-wider">
								({alphabetizedTags.length})
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
							layoutId="tags-sidebar"
							emptyElement={
								<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
									Type #tagName in a note to create a tag
								</li>
							}
							contentType="tag"
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
										onDragStart={(e) => e.preventDefault()}
										className={cn(
											"list-sidebar-item",
											alphabetizedTags?.at(i) &&
												selectionRange.has(`tag:${alphabetizedTags[i]}`) &&
												"!bg-blue-400 dark:!bg-blue-600 text-white",
										)}
										onClick={(e) => {
											if (e.metaKey || e.shiftKey) return;
											navigate(`/tags/${encodeURIComponent(sidebarTagName)}`);
										}}
										onContextMenu={() => {
											let newSelectionRange = new Set([
												`tag:${sidebarTagName}`,
											]);
											if (selectionRange.size === 0) {
											}
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
										<TagIcon height={16} width={16} strokeWidth={1.75} />
										<p className="whitespace-nowrap text-ellipsis overflow-hidden">
											{sidebarTagName}
										</p>
									</button>
								);
							}}
							data={alphabetizedTags ?? null}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}
