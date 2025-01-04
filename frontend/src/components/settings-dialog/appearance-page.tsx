import { useAtomValue } from "jotai/react";
import { projectSettingsAtom } from "../../atoms";
import { useUpdateProjectSettingsMutation } from "../../hooks/project-settings";
import { cn } from "../../utils/string-formatting";
import { SettingsRow } from "./settings-row";

function DarkModeButton({
	label,
	imgSrc,
	imgAlt,
	onClick,
	isActive,
}: {
	label: string;
	imgSrc: string;
	imgAlt: string;
	onClick: () => void;
	isActive: boolean;
}) {
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

export function AppearancePage() {
	const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
	const projectSettings = useAtomValue(projectSettingsAtom);
	return (
		<SettingsRow title="Theme" description="Customize your UI theme">
			<div className="flex gap-3">
				<DarkModeButton
					label="Light"
					imgSrc="https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/light-mode.jpg"
					imgAlt="light mode"
					onClick={() => {
						updateProjectSettings({
							newProjectSettings: {
								...projectSettings,
								darkMode: "light",
							},
						});
					}}
					isActive={projectSettings.darkMode === "light"}
				/>
				<DarkModeButton
					label="Dark"
					imgSrc="https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/dark-mode.jpg"
					imgAlt="dark mode"
					onClick={() => {
						updateProjectSettings({
							newProjectSettings: {
								...projectSettings,
								darkMode: "dark",
							},
						});
					}}
					isActive={projectSettings.darkMode === "dark"}
				/>
				<DarkModeButton
					label="System"
					imgSrc="https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/light-and-dark-mode.jpg"
					imgAlt="light and dark mode"
					onClick={() => {
						updateProjectSettings({
							newProjectSettings: {
								...projectSettings,
								darkMode: "system",
							},
						});
					}}
					isActive={projectSettings.darkMode === "system"}
				/>
			</div>
		</SettingsRow>
	);
}
