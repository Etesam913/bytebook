import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";
import { GetProjectSettings } from "../../bindings/github.com/etesam913/bytebook/settingsservice";
import { projectSettingsAtom } from "../atoms";
import type { ProjectSettings } from "../types";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";

export function useProjectSettings() {
	const setProjectSettings = useSetAtom(projectSettingsAtom);

	async function getProjectSettings() {
		try {
			const projectSettingsResponse = await GetProjectSettings();
			if (!projectSettingsResponse.success) {
				throw new Error(projectSettingsResponse.message);
			}
			const { projectPath, pinnedNotes } = projectSettingsResponse.data;

			setProjectSettings({
				projectPath,
				pinnedNotes: new Set(pinnedNotes),
			});
		} catch (err) {
			if (err instanceof Error) {
				toast.error(err.message, DEFAULT_SONNER_OPTIONS);
			}
		}
	}
	useEffect(() => {
		getProjectSettings();
	}, [getProjectSettings, setProjectSettings]);

	useWailsEvent("settings:update", (body) => {
		const projectSettings = (body.data as ProjectSettings[])[0];
		setProjectSettings({
			...projectSettings,
			pinnedNotes: new Set(projectSettings.pinnedNotes),
		});
	});
}
