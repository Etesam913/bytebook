import { Browser } from "@wailsio/runtime";
import { useAtomValue } from "jotai/react";
import { useMemo } from "react";
import { toast } from "sonner";
import { getDefaultButtonVariants } from "../../animations";
import { projectSettingsAtom } from "../../atoms";
import { CodeMerge } from "../../icons/code-merge";
import { Loader } from "../../icons/loader";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/general";
import { MotionButton } from "../buttons";
import { DialogErrorText } from "../dialog";

export function SyncChangesDialog({
	errorText,
	isPending,
}: { errorText: string; isPending: boolean }) {
	const { repositoryToSyncTo } = useAtomValue(projectSettingsAtom);

	// Memoize the current date and time in a localized format
	const formattedDate = useMemo(() => {
		const currentDate = new Date();
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		};
		return currentDate.toLocaleString(undefined, options).replace(",", "");
	}, []);

	const linkToRepository = useMemo(
		() => repositoryToSyncTo.replace(".git", ""),
		[repositoryToSyncTo],
	);

	return (
		<section className="flex flex-col gap-2">
			<label
				className="text-sm cursor-pointer pb-1 text-zinc-500 dark:text-zinc-300"
				htmlFor="commit-message"
			>
				Commit Message
			</label>
			<textarea
				className="bg-zinc-150 max-h-64 min-h-16 py-1 px-2 text-sm rounded-md dark:bg-zinc-700 font-mono border-2 outline-1 border-zinc-300 dark:border-zinc-600 focus-visible:!border-transparent"
				id="commit-message"
				name="commit-message"
				defaultValue={formattedDate}
			/>
			<p className="text-xs text-zinc-400">
				The changes will be pushed to{" "}
				<button
					type="button"
					className="link"
					onClick={() => {
						Browser.OpenURL(linkToRepository).catch(() => {
							toast.error("Failed to open link", DEFAULT_SONNER_OPTIONS);
						});
					}}
				>
					{repositoryToSyncTo}
				</button>
			</p>
			<DialogErrorText className="text-right" errorText={errorText} />
			<MotionButton
				type="submit"
				disabled={isPending}
				{...getDefaultButtonVariants(isPending)}
				className="ml-auto text-center flex justify-center w-48"
			>
				{isPending ? (
					<Loader />
				) : (
					<>
						<CodeMerge /> Commit and Push
					</>
				)}
			</MotionButton>
		</section>
	);
}
