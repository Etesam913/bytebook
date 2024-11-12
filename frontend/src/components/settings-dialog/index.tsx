import { useState } from "react";
import { SettingsSidebar } from "./sidebar";

export type SettingsTab = "appearance" | "github" | "code-block";

export function SettingsDialog() {
	const [currentSettingsTab, setCurrentSettingsTab] =
		useState<SettingsTab>("appearance");
	return (
		<div className="flex gap-4">
			<SettingsSidebar
				currentSettingsTab={currentSettingsTab}
				setCurrentSettingsTab={setCurrentSettingsTab}
			/>
			<div>other content</div>
		</div>
	);
}
