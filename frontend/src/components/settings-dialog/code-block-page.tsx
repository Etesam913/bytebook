import { Toggle } from '../toggle';
import { SettingsRow } from './settings-row';
import { useAtomValue, useSetAtom } from 'jotai';
import { dialogDataAtom, projectSettingsAtom } from '../../atoms';
import { useUpdateProjectSettingsMutation } from '../../hooks/project-settings';
import { MotionButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { PythonVenvDialog } from '../editor/python-venv-dialog';
import { FolderOpen } from '../../icons/folder-open';
import { usePythonVenvSubmitMutation } from '../../hooks/code';

export function CodeBlockPage() {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const setDialogData = useSetAtom(dialogDataAtom);
  const { mutateAsync: submitPythonVenv } =
    usePythonVenvSubmitMutation(projectSettings);

  return (
    <>
      <SettingsRow
        title="Python Virtual Environment"
        description="The path to the virtual environment that is used by Python in code blocks."
      >
        <div className="text-sm gap-2">
          <div className="mb-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-300">
              Virtual environment path:
            </p>
            <p>
              {projectSettings.code.pythonVenvPath.length === 0
                ? 'Environment is not set'
                : projectSettings.code.pythonVenvPath}
            </p>
          </div>
          <MotionButton
            className="text-center"
            {...getDefaultButtonVariants()}
            onClick={() => {
              setDialogData({
                isOpen: true,
                isPending: false,
                title: 'Change Python Virtual Environment',
                dialogClassName: 'w-[min(40rem,90vw)]',
                children: (errorText) => (
                  <PythonVenvDialog errorText={errorText} />
                ),
                onSubmit: async (e, setErrorText) => {
                  return await submitPythonVenv({ e, setErrorText });
                },
              });
            }}
          >
            <FolderOpen />
            Update Environment
          </MotionButton>
        </div>
      </SettingsRow>
      <SettingsRow
        title="Vim Mode"
        description="Enable Vim Mode in code blocks"
      >
        <div className="flex items-center gap-1.5">
          <Toggle
            checked={projectSettings.code.codeBlockVimMode}
            onChange={() => {
              updateProjectSettings({
                newProjectSettings: {
                  ...projectSettings,
                  code: {
                    ...projectSettings.code,
                    codeBlockVimMode: !projectSettings.code.codeBlockVimMode,
                  },
                },
              });
            }}
          />
        </div>
      </SettingsRow>
    </>
  );
}
