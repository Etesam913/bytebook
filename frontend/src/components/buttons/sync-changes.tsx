import { useMutation } from "@tanstack/react-query";
import { useAtomValue } from "jotai/react";
import { toast } from "sonner";
import { SyncChangesWithRepo } from "../../../bindings/github.com/etesam913/bytebook/nodeservice";
import { projectSettingsAtom, userDataAtomWithLocalStorage } from "../../atoms";
import { FileRefresh } from "../../icons/file-refresh";
import { Loader } from "../../icons/loader";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc";

export function SyncChangesButton() {
	const userData = useAtomValue(userDataAtomWithLocalStorage);
	const { repositoryToSyncTo } = useAtomValue(projectSettingsAtom);
	const syncChangesWithRepoMutation = useMutation({
		mutationFn: async ({
			login,
			accessToken,
		}: { login: string; accessToken: string }) => {
			const res = await SyncChangesWithRepo(
				login,
				accessToken,
				repositoryToSyncTo,
			);
			if (!res.success) throw new Error(res.message);
			return res.message;
		},
		onSuccess: (message) => {
			toast.success(message, DEFAULT_SONNER_OPTIONS);
		},
		onError: (error) => {
			if (error instanceof Error) {
				toast.error(error.message, DEFAULT_SONNER_OPTIONS);
			}
		},
	});

	return (
		<button
			type="button"
			disabled={syncChangesWithRepoMutation.isPending}
			className="flex gap-1 items-center hover:bg-zinc-100 hover:dark:bg-zinc-650 p-1 rounded-md transition-colors"
			onClick={() => {
				syncChangesWithRepoMutation.mutate({
					login: userData?.login ?? "",
					accessToken: userData?.accessToken ?? "",
				});
			}}
		>
			{syncChangesWithRepoMutation.isPending ? (
				<Loader height={20} width={20} className="my-0.5 mx-auto" />
			) : (
				<>
					<FileRefresh /> Sync Changes
				</>
			)}
		</button>
	);
}
