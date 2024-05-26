import { type DragEvent, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";
import { MoveToTrash } from "../../../bindings/github.com/etesam913/bytebook/noteservice";
import { Trash } from "../../icons/trash";
import {
	cn,
	getInternalLinkType,
	isInternalLink,
} from "../../utils/string-formatting";
import { SyncChangesButton } from "../buttons/sync-changes";

function handleTrashButtonDrop(e: DragEvent<HTMLAnchorElement>) {
	e.preventDefault();
	const urls: string = e.dataTransfer.getData("text/plain");
	const urlArray = urls.split(",");
	const paths: string[] = [];
	urlArray.forEach((url) => {
		if (isInternalLink(url)) {
			const { isNoteLink } = getInternalLinkType(url);
			if (isNoteLink) {
				const [folder, note] = url.split("/").slice(-2);
				const fullPath = `${folder}/${note}.md`;
				paths.push(fullPath);
			}
		}
	});
	if (paths.length > 0) {
		MoveToTrash(paths)
			.then((res) => {
				if (res.success)
					toast.success(
						`Successfully moved note${paths.length > 1 ? "s" : ""} to trash`,
					);
				else throw new Error(res.message);
			})
			.catch((err) => toast.error(err.message));
	}
}

export function BottomItems() {
	const [isSyncing, setIsSyncing] = useState(false);
	const [, params] = useRoute("/:folder/:note?");
	const base = params?.folder;

	const isTrashOpen = base === "trash";

	return (
		<section className="mt-auto pb-3 flex flex-col gap-1">
			<Link
				onDragOver={(e) => e.preventDefault()}
				onDrop={handleTrashButtonDrop}
				to="/trash"
				className={cn(
					"flex gap-1 items-center hover:bg-zinc-100 hover:dark:bg-zinc-650 p-1 rounded-md transition-colors ",
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
