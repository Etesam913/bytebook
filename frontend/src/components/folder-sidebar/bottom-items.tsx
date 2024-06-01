import { motion } from "framer-motion";
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

const MotionLink = motion(Link);

export function BottomItems() {
	const [isSyncing, setIsSyncing] = useState(false);
	const [, params] = useRoute("/:folder/:note?");
	const base = params?.folder;
	const [isNoteOver, setIsNoteOver] = useState(false);

	const isTrashOpen = base === "trash";

	function handleTrashButtonDrop(e: DragEvent<HTMLAnchorElement>) {
		const urls: string = e.dataTransfer.getData("text/plain");
		const urlArray = urls.split(",");
		const paths: string[] = [];
		setIsNoteOver(false);

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

	function onDragEnter(e: DragEvent<HTMLAnchorElement>) {
		e.preventDefault();
		setIsNoteOver(true);
	}

	function onDragLeave(e: DragEvent<HTMLAnchorElement>) {
		e.preventDefault();
		setIsNoteOver(false);
	}

	return (
		<section className="mt-auto pb-3 flex flex-col gap-1">
			<MotionLink
				onDragOver={(e) => e.preventDefault()}
				onDragEnter={onDragEnter}
				onDragLeave={onDragLeave}
				onDrop={handleTrashButtonDrop}
				to="/trash"
				transition={{ repeat: isNoteOver ? Number.POSITIVE_INFINITY : 1 }}
				className={cn(
					"flex gap-1 items-center hover:bg-zinc-100 hover:dark:bg-zinc-650 p-1 rounded-md transition-colors ",
					isTrashOpen && "!bg-zinc-150 dark:!bg-zinc-700",
					isNoteOver && "bg-blue-400 dark:bg-blue-600 text-white",
				)}
			>
				<>
					<Trash /> Trash
				</>
			</MotionLink>
			<SyncChangesButton isSyncing={isSyncing} setIsSyncing={setIsSyncing} />
		</section>
	);
}
