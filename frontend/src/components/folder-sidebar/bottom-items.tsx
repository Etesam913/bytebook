import { type DragEvent, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";
import { MoveToTrash } from "../../../bindings/github.com/etesam913/bytebook/noteservice";
import { Trash } from "../../icons/trash";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc";
import {
	cn,
	getFileExtension,
	getInternalLinkType,
	isInternalLink,
} from "../../utils/string-formatting";
import { LoginButton } from "../buttons/login";
import { SyncChangesButton } from "../buttons/sync-changes";
import { SettingsButton } from "../buttons/settings";

export function BottomItems() {
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
					const [folder] = url.split("/").slice(-2);
					const { extension, fileName } = getFileExtension(url);
					const fullPath = `${folder}/${fileName}.${extension}`;
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
							DEFAULT_SONNER_OPTIONS,
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
		<section className="pb-3 pt-1 flex flex-col gap-1 px-[10px] border-t border-zinc-200 dark:border-zinc-700">
			<Link
				onDragOver={(e: DragEvent) => e.preventDefault()}
				onDragEnter={onDragEnter}
				onDragLeave={onDragLeave}
				onDrop={handleTrashButtonDrop}
				to="/trash"
				className={cn(
					"flex gap-1 items-center hover:bg-zinc-100 hover:dark:bg-zinc-650 p-1 rounded-md transition-colors",
					isTrashOpen && "!bg-zinc-150 dark:!bg-zinc-700",
					isNoteOver && "bg-blue-400 dark:bg-blue-600 text-white",
				)}
			>
				<Trash /> Trash
			</Link>
			<SettingsButton />
			<SyncChangesButton />
			<LoginButton />
		</section>
	);
}
