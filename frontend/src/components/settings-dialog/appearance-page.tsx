import { useAtom } from "jotai/react";
import { darkModeAtom } from "../../atoms";
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
	const [darkModeData, setDarkModeData] = useAtom(darkModeAtom);
	return (
		<>
			<SettingsRow title="Interface" description="Customize your UI theme">
				<div className="flex gap-3">
					<DarkModeButton
						label="Light"
						imgSrc="https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/light-mode.jpg"
						imgAlt="light mode"
						onClick={() =>
							setDarkModeData({ isDarkModeOn: false, darkModeSetting: "light" })
						}
						isActive={darkModeData.darkModeSetting === "light"}
					/>
					<DarkModeButton
						label="Dark"
						imgSrc="https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/dark-mode.jpg"
						imgAlt="dark mode"
						onClick={() =>
							setDarkModeData({ isDarkModeOn: true, darkModeSetting: "dark" })
						}
						isActive={darkModeData.darkModeSetting === "dark"}
					/>
					<DarkModeButton
						label="System"
						imgSrc="https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/light-and-dark-mode.jpg"
						imgAlt="light and dark mode"
						onClick={() =>
							setDarkModeData((prev) => ({
								...prev,
								darkModeSetting: "system",
							}))
						}
						isActive={darkModeData.darkModeSetting === "system"}
					/>
				</div>
			</SettingsRow>
		</>
	);
}
