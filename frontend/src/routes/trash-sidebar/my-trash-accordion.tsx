import { Link } from "wouter";
import { Sidebar } from "../../components/sidebar";
import { cn } from "../../utils/string-formatting";

export function MyTrashAccordion() {
	return (
		<section className="flex flex-1 flex-col gap-2 overflow-y-auto">
			<Sidebar
				isCollapsed={false}
				data={["test"]}
				renderLink={({
					dataItem: noteName,
					// i,
					// selectionRange,
					// setSelectionRange,
				}) => (
					<Link
						target="_blank"
						className={cn(
							"flex flex-1 gap-2 items-center px-2 py-1 rounded-md relative z-10 overflow-x-hidden transition-colors",
							// noteName === note && "bg-zinc-150 dark:bg-zinc-700",
							// selectionRange.has(i) &&
							//   "!bg-blue-400 dark:!bg-blue-600 text-white",
						)}
						to="/"
						// to={`/${folder}/${noteName}`}
					>
						{/* {note === noteName ? (
            <FilePen title="" className="min-w-[1.25rem]" />
          ) : (
            <Note title="" className="min-w-[1.25rem]" />
          )}{" "} */}
						<p className="whitespace-nowrap text-ellipsis overflow-hidden">
							{noteName}
						</p>
					</Link>
				)}
			/>
		</section>
	);
}
