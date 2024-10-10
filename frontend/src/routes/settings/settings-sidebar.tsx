import { Sidebar } from "../../components/sidebar";
import { cn } from "../../utils/string-formatting";

const settingsOptions = [
	{ name: "Appearance", to: "/settings/appearance" },
	{ name: "Editor", to: "/settings/editor" },
	{ name: "Keyboard Shortcuts", to: "/settings/keyboard-shortcuts" },
];

export function SettingsSidebar({ currentOption }: { currentOption: string }) {
	return (
		<div className="w-fit">
			<Sidebar
				layoutId="settings-sidebar"
				data={settingsOptions.map(({ name }) => name)}
				renderLink={({ dataItem: setting, i }) => {
					return (
						<button
							type="button"
							className={cn(
								"sidebar-item whitespace-nowrap",
								currentOption === settingsOptions[i].to.split("/").pop() &&
									"bg-zinc-150 dark:bg-zinc-700",
							)}
						>
							{setting}
						</button>
					);
				}}
			/>
		</div>
	);
}
