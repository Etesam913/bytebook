import { useAtomValue } from "jotai/react";
import { useLocation } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { isDarkModeOnAtom, projectSettingsAtom } from "../../../atoms";
import { useUpdateProjectSettingsMutation } from "../../../hooks/project-settings";
import { useSearchParamsEntries } from "../../../utils/hooks";
import { cn } from "../../../utils/string-formatting";
import { SettingsRow } from "../settings-row";

function NoteSidebarItemSizeRowItem({
	isActive,
	onClick,
	label,
	imgSrc,
	imgAlt,
}: {
	isActive: boolean;
	onClick: () => void;
	label: string;
	imgSrc: string;
	imgAlt: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="h-full text-center flex flex-col items-center"
		>
			<p
				className={cn(
					"text-sm text-zinc-500 dark:text-zinc-400",
					isActive && "text-zinc-950 dark:text-zinc-100 ",
				)}
			>
				{label}
			</p>

			<img
				draggable="false"
				className={cn(
					"border-[3px] rounded-md p-1 border-zinc-200 dark:border-zinc-750",
					isActive && "border-blue-400 dark:border-blue-500",
				)}
				src={imgSrc}
				alt={imgAlt}
			/>
		</button>
	);
}

export function NoteSidebarItemSizeRow() {
	const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
	const projectSettings = useAtomValue(projectSettingsAtom);
	const [location] = useLocation();
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
	return (
		<SettingsRow
			title="Note Sidebar Item Type"
			description="Change the note sidebar item size type"
		>
			<div className="flex gap-3 items-start">
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
					imgAlt="Card sidebar item type"
					imgSrc={
						isDarkModeOn
							? "https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/card-sidebar-item-dark-mode.webp"
							: "https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/card-sidebar-item-light-mode.webp"
					}
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
					imgAlt="List sidebar item type"
					imgSrc={
						isDarkModeOn
							? "https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/list-sidebar-item-dark-mode.webp"
							: "https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/list-sidebar-item-light-mode.webp"
					}
					label="List"
				/>
			</div>
		</SettingsRow>
	);
}
