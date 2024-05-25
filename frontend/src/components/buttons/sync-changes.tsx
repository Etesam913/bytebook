import { useSetAtom } from "jotai";
import type { ButtonHTMLAttributes, Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";
import { SyncChangesWithRepo } from "../../../bindings/github.com/etesam913/bytebook/nodeservice";
import { foldersAtom, notesAtom } from "../../atoms";
import { FileRefresh } from "../../icons/file-refresh";
import { Loader } from "../../icons/loader";
import { updateFolders, updateNotes } from "../../utils/fetch-functions";
import { cn } from "../../utils/string-formatting";

interface SyncButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	isSyncing: boolean;
	setIsSyncing: Dispatch<SetStateAction<boolean>>;
}

export function SyncChangesButton(props: SyncButtonProps) {
	const { isSyncing, setIsSyncing } = props;
	const setNotes = useSetAtom(notesAtom);
	const [, params] = useRoute("/:folder/:note?");
	const setFolders = useSetAtom(foldersAtom);
	const folder = params?.folder;
	const note = params?.note;

	return (
		<button
			type="button"
			onClick={() => {
				setIsSyncing(true);
				SyncChangesWithRepo()
					.then((r) => {
						setTimeout(() => {
							if (r.status === "success") {
								toast.success(r.message, {
									position: "bottom-right",
									duration: 3250,
								});
								// Need to re-fetch all the folder names and the note names for the current folder
								updateFolders(setFolders);
								if (folder) updateNotes(folder, note, setNotes);
							} else if (r.status === "info") {
								toast.info(r.message, {
									position: "bottom-right",
								});
							} else {
								toast.error(r.message, {
									position: "bottom-right",
								});
							}
							setIsSyncing(false);
						}, 1000);
					})
					.catch((err) => {
						toast.error(err.message, {
							position: "bottom-right",
						});
						setIsSyncing(false);
					});
			}}
			disabled={isSyncing}
			className={cn(
				"w-full bg-transparent flex gap-1.5 align-center hover:bg-zinc-100 hover:dark:bg-zinc-650 p-1 transition-colors",
				isSyncing && "justify-center",
			)}
		>
			{isSyncing ? (
				<Loader className="h-[20px] w-[20px]" />
			) : (
				<>
					<FileRefresh /> Sync Changes
				</>
			)}
		</button>
	);
}
