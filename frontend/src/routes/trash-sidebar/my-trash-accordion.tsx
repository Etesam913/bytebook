import { Link } from "wouter";
import { Sidebar } from "../../components/sidebar";
import { cn } from "../../utils/string-formatting";

export function MyTrashAccordion({
	files,
	curFile,
}: { files: string[]; curFile: string | undefined }) {
	return (
		<section className={cn("flex flex-1 flex-col gap-2 overflow-y-auto")}>
			<Sidebar
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
				renderLink={({ dataItem: fileName }) => (
					<Link
						target="_blank"
						className={cn(
							"flex flex-1 gap-2 items-center px-2 py-1 rounded-md relative z-10 overflow-x-hidden transition-colors",
							fileName === curFile && "bg-zinc-150 dark:bg-zinc-700",
						)}
						to={`/trash/${fileName}`}
					>
						<p className="whitespace-nowrap text-ellipsis overflow-hidden">
							{fileName}
						</p>
					</Link>
				)}
			/>
		</section>
	);
}
