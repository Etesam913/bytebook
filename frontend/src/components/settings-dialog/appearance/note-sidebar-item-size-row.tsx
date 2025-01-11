import { useAtomValue } from "jotai/react";
import { useLocation } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { projectSettingsAtom } from "../../../atoms";
import { useUpdateProjectSettingsMutation } from "../../../hooks/project-settings";
import { useSearchParamsEntries } from "../../../utils/hooks";
import { cn } from "../../../utils/string-formatting";
import { SettingsRow } from "../settings-row";

function NoteSidebarItemSizeRowItem({
	isActive,
	onClick,
	label,
}: { isActive: boolean; onClick: () => void; label: string }) {
	return (
		<button type="button" onClick={onClick}>
			<p
				className={cn(
					"text-sm text-zinc-500 dark:text-zinc-400",
					isActive && "text-zinc-950 dark:text-zinc-100 ",
				)}
			>
				{label}
			</p>
		</button>
	);
}

export function NoteSidebarItemSizeRow() {
	const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
	const projectSettings = useAtomValue(projectSettingsAtom);
	const [location] = useLocation();
	const searchParams: { ext?: string } = useSearchParamsEntries();
	return (
		<SettingsRow
			title="Note Sidebar Item Size"
			description="Change the note sidebar item size type"
		>
			<div className="flex gap-3">
				<NoteSidebarItemSizeRowItem
					isActive={projectSettings.noteSidebarItemSize === "card"}
					onClick={() => {
						navigate(`${location}?ext=${searchParams.ext}&focus=true`);
						updateProjectSettings({
							newProjectSettings: {
								...projectSettings,
								noteSidebarItemSize: "card",
							},
						});
					}}
					label="Card"
				/>

				<NoteSidebarItemSizeRowItem
					isActive={projectSettings.noteSidebarItemSize === "list"}
					onClick={() => {
						navigate(`${location}?ext=${searchParams.ext}&focus=true`);
						updateProjectSettings({
							newProjectSettings: {
								...projectSettings,
								noteSidebarItemSize: "list",
							},
						});
					}}
					label="List"
				/>
			</div>
		</SettingsRow>
	);
}
