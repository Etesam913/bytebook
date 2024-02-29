import { useSetAtom } from "jotai";
import { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";
import { MotionButton } from ".";
import { SyncChangesWithRepo } from "../../../wailsjs/go/main/App";
import { foldersAtom, notesAtom } from "../../atoms";
import { FileRefresh } from "../../icons/file-refresh";
import { Loader } from "../../icons/loader";
import { updateFolders, updateNotes } from "../../utils/fetch-functions";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";

interface SyncButtonProps {
	isSyncing: boolean;
	setIsSyncing: Dispatch<SetStateAction<boolean>>;
}

export function SyncChangesButton(props: SyncButtonProps) {
	const { isSyncing, setIsSyncing } = props;
	const setNotes = useSetAtom(notesAtom);
	const [, params] = useRoute("/:folder/:note?");
	const setFolders = useSetAtom(foldersAtom);
	const folder = params?.folder;

	return (
		<MotionButton
			{...getDefaultButtonVariants(isSyncing)}
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
								if (folder) updateNotes(folder, setNotes);
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
				"w-full bg-transparent flex justify-between align-center",
				isSyncing && "justify-center",
			)}
		>
			{isSyncing ? (
				<Loader className="h-[20px] w-[20px]" />
			) : (
				<>
					Sync Changes <FileRefresh />
				</>
			)}
		</MotionButton>
	);
}
