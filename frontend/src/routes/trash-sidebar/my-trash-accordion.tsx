import { Link, useParams } from "wouter";
import { Sidebar } from "../../components/sidebar";
import { useSearchParamsEntries } from "../../utils/hooks";
import { cn, extractInfoFromNoteName } from "../../utils/string-formatting";
import { RenderNoteIcon } from "../notes-sidebar/render-note-icon";

export function MyTrashAccordion({ files }: { files: string[] }) {
	const { item: curNote } = useParams();
	const searchParams: { ext?: string } = useSearchParamsEntries();

	const noteNameWithExtension = `${curNote}?ext=${searchParams.ext}`;

	return (
		<section className={cn("flex flex-1 flex-col gap-2 overflow-y-auto")}>
			<Sidebar
				layoutId="my-trash-accordion"
				isCollapsed={false}
				data={files}
				emptyElement={
					<>
						<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs text-balance my-auto mb-2">
							There are currently no files here.
						</li>
						<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs my-auto">
							You can send a note here by right clicking on the note and
							selecting "Send to Trash".
						</li>
					</>
				}
				renderLink={({ dataItem: sidebarTrashedNoteNameWithExtension }) => {
					const { noteNameWithoutExtension: trashedNoteName, queryParams } =
						extractInfoFromNoteName(sidebarTrashedNoteNameWithExtension);
					return (
						<Link
							draggable={false}
							target="_blank"
							className={cn(
								"sidebar-item",
								sidebarTrashedNoteNameWithExtension === noteNameWithExtension &&
									"bg-zinc-150 dark:bg-zinc-700",
							)}
							to={`/trash/${sidebarTrashedNoteNameWithExtension}`}
						>
							<RenderNoteIcon
								sidebarNoteName={sidebarTrashedNoteNameWithExtension}
								fileExtension={queryParams.ext}
								noteNameWithExtension={noteNameWithExtension}
							/>
							<p className="whitespace-nowrap text-ellipsis overflow-hidden">
								{trashedNoteName}.{queryParams.ext}
							</p>
						</Link>
					);
				}}
			/>
		</section>
	);
}
