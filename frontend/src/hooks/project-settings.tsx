import { useEffect } from "react";
import { GetProjectSettings } from "../../bindings/github.com/etesam913/bytebook/settingsservice";
import { toast } from "sonner";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";
import { useSetAtom } from "jotai";
import { projectSettingsAtom } from "../atoms";

export function useProjectSettings() {
	const setProjectSettings = useSetAtom(projectSettingsAtom);

	async function getProjectSettings() {
		try {
			const projectSettingsResponse = await GetProjectSettings();
			if (!projectSettingsResponse.success) {
				throw new Error(projectSettingsResponse.message);
			}
			setProjectSettings(projectSettingsResponse.data);
		} catch (err) {
			if (err instanceof Error) {
				toast.error(err.message, DEFAULT_SONNER_OPTIONS);
			}
		}
	}
	useEffect(() => {
		getProjectSettings();
	}, []);
}
