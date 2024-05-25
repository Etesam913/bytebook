import { useState } from "react";
import { Link, useRoute } from "wouter";
import { Trash } from "../../icons/trash";
import { cn } from "../../utils/string-formatting";
import { SyncChangesButton } from "../buttons/sync-changes";

export function BottomItems() {
	const [isSyncing, setIsSyncing] = useState(false);
	const [, params] = useRoute("/:folder/:note?");
	const base = params?.folder;

	const isTrashOpen = base === "trash";

	return (
		<section className="mt-auto pb-3 flex flex-col gap-1">
			<Link
				to="/trash"
				className={cn(
					"flex gap-1 items-center hover:bg-zinc-100 hover:dark:bg-zinc-650 p-1 rounded-md transition-colors",
					isTrashOpen && "bg-zinc-150 dark:bg-zinc-700",
				)}
			>
				<>
					<Trash /> Trash
				</>
			</Link>
			<SyncChangesButton isSyncing={isSyncing} setIsSyncing={setIsSyncing} />
		</section>
	);
}
