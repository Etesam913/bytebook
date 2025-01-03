import { useAtomValue } from "jotai/react";
import { useMemo } from "react";
import { projectSettingsAtom } from "../../atoms";
import { useGithubRepositoriesQuery } from "../../hooks/github";
import { useUpdateProjectSettingsMutation } from "../../hooks/project-settings";
import { Loader } from "../../icons/loader";
import { Dropdown } from "../dropdown";
import { SettingsRow } from "./settings-row";

export function GithubPage() {
	const { data: repositories, isLoading } = useGithubRepositoriesQuery();
	const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
	const projectSettings = useAtomValue(projectSettingsAtom);

	const dropdownItems = useMemo(() => {
		return (
			repositories?.map((repo) => ({
				value: repo.clone_url,
				label: repo.name,
			})) || []
		);
	}, [repositories]);

	return (
		<SettingsRow
			title="Repository"
			description="Select the GitHub repository to sync your notes to."
		>
			{isLoading && <Loader />}
			{repositories && (
				<div className="flex flex-col gap-1">
					<Dropdown
						controlledValueIndex={dropdownItems.findIndex(
							(item) => item.value === projectSettings.repositoryToSyncTo,
						)}
						onChange={({ value }) =>
							updateProjectSettings({
								newProjectSettings: {
									...projectSettings,
									repositoryToSyncTo: value,
								},
							})
						}
						maxHeight={255}
						className="w-56"
						buttonClassName="w-56"
						items={dropdownItems}
					/>
				</div>
			)}
		</SettingsRow>
	);
}