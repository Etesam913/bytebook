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
				SyncChangesWithRepo().then(() => {
					setTimeout(() => {
						setIsSyncing(false);
						toast.success("Successfully Synced Changes.", {
							position: "bottom-right",
						});
						// Need to re-fetch all the folder names and the note names for the current folder
						updateFolders(setFolders);
						if (folder) updateNotes(folder, setNotes);
					}, 1000);
				});
			}}
			disabled={isSyncing}
			className={cn(
				"w-full bg-transparent flex justify-between align-center",
				isSyncing && "justify-center",
			)}
		>
			{isSyncing ? (
				<Loader />
			) : (
				<>
					Sync Changes <FileRefresh />
				</>
			)}
		</MotionButton>
	);
}
