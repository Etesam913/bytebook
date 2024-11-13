import { useSetAtom } from "jotai/react";
import { darkModeAtom } from "../../atoms";
import { SettingsRow } from "./settings-row";

export function AppearancePage() {
	const setDarkModeData = useSetAtom(darkModeAtom);
	return (
		<>
			<SettingsRow title="Interface" description="Customize your UI theme">
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() =>
							setDarkModeData({ isDarkModeOn: false, darkModeSetting: "light" })
						}
					>
						Light
					</button>
					<button
						onClick={() =>
							setDarkModeData({ isDarkModeOn: true, darkModeSetting: "dark" })
						}
						type="button"
					>
						Dark
					</button>
					<button
						onClick={() =>
							setDarkModeData((prev) => ({
								...prev,
								darkModeSetting: "system",
							}))
						}
						type="button"
					>
						System
					</button>
				</div>
			</SettingsRow>
		</>
	);
}
