import { LoginButton } from "../buttons/login";
import { SettingsButton } from "../buttons/settings";

export function BottomItems() {
	return (
		<section className="pb-3 pt-1 flex flex-col gap-1 px-[10px] border-t border-zinc-200 dark:border-zinc-700">
			<SettingsButton />
			{/* <SyncChangesButton /> */}
			<LoginButton />
		</section>
	);
}
