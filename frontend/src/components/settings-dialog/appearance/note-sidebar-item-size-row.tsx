import { useAtomValue } from "jotai/react";
import { projectSettingsAtom } from "../../../atoms";
import { useUpdateProjectSettingsMutation } from "../../../hooks/project-settings";
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

	return (
		<SettingsRow
			title="Note Sidebar Item Size"
			description={"Change the note sidebar item size compactness"}
		>
			<div className="flex gap-3">
				<NoteSidebarItemSizeRowItem
					isActive={projectSettings.noteSidebarItemSize === "compact"}
					onClick={() =>
						updateProjectSettings({
							newProjectSettings: {
								...projectSettings,
								noteSidebarItemSize: "compact",
							},
						})
					}
					label="Compact"
				/>
				<NoteSidebarItemSizeRowItem
					isActive={projectSettings.noteSidebarItemSize === "regular"}
					onClick={() =>
						updateProjectSettings({
							newProjectSettings: {
								...projectSettings,
								noteSidebarItemSize: "regular",
							},
						})
					}
					label="Regular"
				/>
			</div>
		</SettingsRow>
	);
}
