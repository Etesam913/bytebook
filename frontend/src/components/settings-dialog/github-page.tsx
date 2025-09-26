import { useAtomValue } from 'jotai/react';
import { projectSettingsAtom } from '../../atoms';
import { useGithubRepositoriesQuery } from '../../hooks/github';
import { useUpdateProjectSettingsMutation } from '../../hooks/project-settings';
import { Loader } from '../../icons/loader';
import { Dropdown } from '../dropdown';
import { SettingsRow } from './settings-row';

export function GithubPage() {
  const {
    data: repositories,
    isLoading,
    isError,
    error,
  } = useGithubRepositoriesQuery();
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);

  const dropdownItems =
    repositories?.map((repo) => ({
      value: repo.clone_url,
      label: repo.name,
    })) || [];

  return (
    <SettingsRow
      title="Repository"
      description="Select the GitHub repository to sync your notes to."
    >
      {isLoading && <Loader />}
      {isError && <p className="text-sm text-red-500">{error.message}</p>}
      {repositories && dropdownItems.length > 0 && (
        <div className="flex flex-col gap-1">
          <Dropdown
            controlledValueIndex={dropdownItems.findIndex(
              (item) => item.value === projectSettings.repositoryToSyncTo
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
            aria-label="Select GitHub repository"
            id="github-repository-dropdown"
          />
        </div>
      )}
    </SettingsRow>
  );
}
