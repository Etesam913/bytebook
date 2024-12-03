import { useMutation } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { toast } from "sonner";
import {
	GetProjectSettings,
	UpdateProjectSettings,
} from "../../bindings/github.com/etesam913/bytebook/settingsservice";
import { projectSettingsAtom } from "../atoms";
import type { ProjectSettings } from "../types";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";

async function getProjectSettings(
	setProjectSettings: Dispatch<SetStateAction<ProjectSettings>>,
) {
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
export function useProjectSettings() {
	const setProjectSettings = useSetAtom(projectSettingsAtom);

	useEffect(() => {
		getProjectSettings(setProjectSettings);
	}, []);

	useWailsEvent("settings:update", (body) => {
		const projectSettings = (body.data as ProjectSettings[])[0];
		setProjectSettings({
			...projectSettings,
			pinnedNotes: new Set(projectSettings.pinnedNotes),
		});
	});
}

export function useUpdateProjectSettingsMutation() {
	return useMutation({
		mutationFn: async ({
			newProjectSettings,
		}: { newProjectSettings: ProjectSettings }) => {
			await UpdateProjectSettings({
				...newProjectSettings,
				pinnedNotes: [...newProjectSettings.pinnedNotes],
			});
		},
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			} else {
				toast.error(
					"An Unknown Error Occurred. Please Try Again Later",
					DEFAULT_SONNER_OPTIONS,
				);
			}
		},
	});
}
