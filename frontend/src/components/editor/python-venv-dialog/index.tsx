import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ChooseCustomVirtualEnvironmentPath,
  GetPythonVirtualEnvironments,
} from '../../../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { Loader } from '../../../icons/loader';
import { RadioButton } from '../../radio-button';
import { useAtomValue, useSetAtom } from 'jotai';
import { backendQueryAtom, projectSettingsAtom } from '../../../atoms';
import { ShareRight } from '../../../icons/share-right';
import { MotionButton, MotionIconButton } from '../../buttons';
import { getDefaultButtonVariants } from '../../../animations';
import { QueryError } from '../../../utils/query';
import { PlainCodeSnippet } from '../../plain-code-snippet';
import { FloppyDisk } from '../../../icons/floppy-disk';
import { DialogErrorText } from '../../dialog';
import { useState } from 'react';
import { SidebarAccordion } from '../../sidebar/accordion';
import { DesktopArrowDown } from '../../../icons/desktop-arrow-down';
import { cn } from '../../../utils/string-formatting';
import { useRevealInFinderMutation } from '../../../hooks/code';

export function PythonVenvDialog({ errorText }: { errorText: string }) {
  const [customVenvPath, setCustomVenvPath] = useState<string | null>(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const { data, error, isLoading } = useQuery({
    queryKey: ['python-venvs'],
    queryFn: () => GetPythonVirtualEnvironments(),
    refetchInterval: 3500,
  });
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setBackendQuery = useSetAtom(backendQueryAtom);
  const { mutate: revealInFinder } = useRevealInFinderMutation();

  const { mutateAsync: chooseCustomVirtualEnvironmentPath } = useMutation({
    mutationFn: async () => {
      const res = await ChooseCustomVirtualEnvironmentPath();
      if (!res.success) {
        throw new QueryError(res.message);
      }
      return res;
    },
    onSuccess: () => {
      setBackendQuery({
        isLoading: false,
        message: '',
      });
    },
    onError: () => {
      setBackendQuery({
        isLoading: false,
        message: '',
      });
    },
  });

  const pythonVenvPaths = data?.data ?? [];

  return (
    <section className="flex flex-col gap-3.5">
      <p>
        A Python virtual environment is required to run Python code so that
        dependencies can be isolated from the system Python installation.
      </p>

      <SidebarAccordion
        onClick={() => setIsInstructionsOpen((prev) => !prev)}
        isOpen={isInstructionsOpen}
        title="Virtual Environment Setup Instructions"
        icon={<DesktopArrowDown />}
        buttonClassName={cn(
          'text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-750 px-2.5 py-1.5 border-1 border-zinc-200 dark:border-zinc-600',
          isInstructionsOpen &&
            'rounded-br-none rounded-bl-none rounded-tr-md rounded-tl-md'
        )}
        listClassName="text-sm bg-zinc-100 dark:bg-zinc-750 p-1 rounded-bl-md rounded-br-md overflow-hidden px-2.5 py-1.5"
      >
        <div className="flex flex-col gap-3.5 pt-2">
          <p>
            A Python virtual environment can be created by running the below
            command in your terminal:
          </p>
          <PlainCodeSnippet
            code={`cd "${projectSettings.projectPath}/code" && python3 -m venv bytebook-venv`}
          />
          <p>
            To activate the virtual environment, run the below command in your
            terminal:
          </p>
          <PlainCodeSnippet
            code={`source "${projectSettings.projectPath}/code/bytebook-venv/bin/activate"`}
          />
          <p>
            The <code>ipykernel</code> package is required to run Python code in
            code blocks. Install it by running the below command in your
            terminal:
          </p>
          <PlainCodeSnippet code={`pip install ipykernel`} />
        </div>
      </SidebarAccordion>

      {isLoading && <Loader />}
      {data?.success &&
        (pythonVenvPaths?.length ? (
          <div className="flex flex-col gap-1.5">
            {pythonVenvPaths.map((venvPath) => (
              <span
                className="flex items-center gap-1.5 group py-1 px-2 bg-zinc-150 dark:bg-zinc-750 rounded-md "
                key={venvPath}
              >
                <RadioButton
                  name="venv-path-option"
                  value={venvPath}
                  defaultChecked={
                    venvPath === projectSettings.code.pythonVenvPath
                  }
                  label={
                    venvPath.split('/').length > 3
                      ? venvPath.split('/').slice(-3).join('/')
                      : venvPath
                  }
                  labelProps={{
                    className: '',
                  }}
                />
                <MotionIconButton
                  className="opacity-0 focus:opacity-100 group-hover:opacity-100 transition-opacity"
                  {...getDefaultButtonVariants()}
                  onClick={() => revealInFinder({ path: venvPath })}
                >
                  <ShareRight
                    height={16}
                    width={16}
                    title="Open In Default App"
                  />
                </MotionIconButton>
              </span>
            ))}
            <div className="flex flex-col group p-2 bg-zinc-150 dark:bg-zinc-750 rounded-md overflow-hidden">
              <RadioButton
                id="custom-venv-path"
                name="venv-path-option"
                value={customVenvPath ?? ''}
                label={'Or choose a custom virtual environment'}
                labelProps={{
                  className: '',
                }}
              />
              <footer>
                <div className="mt-2.5 flex items-center gap-3">
                  <MotionButton
                    {...getDefaultButtonVariants()}
                    className="w-fit text-nowrap"
                    onClick={async () => {
                      setBackendQuery({
                        isLoading: true,
                        message: 'Select a virtual environment folder',
                      });

                      const res = await chooseCustomVirtualEnvironmentPath();
                      if (res.success) {
                        setCustomVenvPath(res.data ?? null);
                      }
                    }}
                  >
                    Select a custom path
                  </MotionButton>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 overflow-hidden text-nowrap overflow-ellipsis">
                    {customVenvPath ?? 'No virtual environment selected'}
                  </p>
                </div>
              </footer>
            </div>
          </div>
        ) : (
          <p>No virtual environments found</p>
        ))}

      {(error || !data?.success) && (
        <DialogErrorText
          errorText={data?.message ?? ''}
          className="text-red-500 text-sm"
        />
      )}
      {errorText.length > 0 && (
        <DialogErrorText
          errorText={errorText}
          className="text-red-500 text-sm"
        />
      )}
      <MotionButton
        type="submit"
        {...getDefaultButtonVariants()}
        className="w-32 ml-auto flex items-center justify-center"
      >
        <FloppyDisk /> Save
      </MotionButton>
    </section>
  );
}
