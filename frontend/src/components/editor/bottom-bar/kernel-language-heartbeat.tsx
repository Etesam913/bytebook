import { motion } from 'motion/react';
import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  dialogDataAtom,
  projectSettingsAtom,
  kernelsDataAtom,
} from '../../../atoms';
import type { Languages, LanguagesWithKernels } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { FolderOpen } from '../../../icons/folder-open';
import { ChevronDown } from '../../../icons/chevron-down';
import PowerOff from '../../../icons/power-off';
import { PythonVenvDialog } from '../python-venv-dialog';
import {
  usePythonVenvSubmitMutation,
  useShutdownKernelMutation,
  useTurnOnKernelMutation,
} from '../../../hooks/code';
import { KernelHeartbeat } from '../../file-sidebar/my-kernels-accordion/kernel-heartbeat';
import {
  AppMenu,
  AppMenuItem,
  AppMenuPopover,
  AppMenuTrigger,
} from '../../menu';

interface KernelOption {
  id: string;
  label: React.ReactNode;
}

const languageSpecificOptions: {
  heartbeatSuccess: Partial<Record<Languages, KernelOption[]>>;
  heartbeatFailure: Partial<Record<Languages, KernelOption[]>>;
} = {
  heartbeatSuccess: {
    python: [
      {
        id: 'change-venv',
        label: (
          <span className="flex items-center gap-1.5 will-change-transform">
            <FolderOpen
              className="will-change-transform"
              height="0.90625rem"
              width="0.90625rem"
            />
            Change Virtual Environment
          </span>
        ),
      },
    ],
  },
  heartbeatFailure: {},
};

export function KernelLanguageHeartbeat({ language }: { language: Languages }) {
  const setDialogData = useSetAtom(dialogDataAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const kernelsData = useAtomValue(kernelsDataAtom);
  const kernelData = kernelsData[language as LanguagesWithKernels];
  const status = kernelData.status;
  const heartbeat = kernelData.heartbeat;
  const errorMessage = kernelData.errorMessage;
  const { mutate: shutdownKernel } = useShutdownKernelMutation(language);
  const { mutate: turnOnKernel } = useTurnOnKernelMutation({ language });
  const { mutateAsync: submitPythonVenv } =
    usePythonVenvSubmitMutation(projectSettings);

  const heartbeatSuccessOptions =
    languageSpecificOptions.heartbeatSuccess[language] ?? [];
  const heartbeatFailureOptions =
    languageSpecificOptions.heartbeatFailure[language] ?? [];

  const kernelOptions: KernelOption[] =
    heartbeat === 'success'
      ? [
          {
            id: 'shut-down',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <PowerOff height="0.625rem" width="0.625rem" />
                Shut Down
              </span>
            ),
          },
          ...heartbeatSuccessOptions,
        ]
      : [
          {
            id: 'turn-on',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <PowerOff height="0.625rem" width="0.625rem" />
                Turn On
              </span>
            ),
          },
          ...heartbeatFailureOptions,
        ];

  function handleAction(key: Key) {
    switch (key) {
      case 'shut-down':
        shutdownKernel(false);
        break;
      case 'turn-on':
        turnOnKernel({});
        break;
      case 'change-venv':
        setDialogData({
          isOpen: true,
          isPending: false,
          title: 'Change Python Virtual Environment',
          dialogClassName: 'w-[min(40rem,90vw)]',
          children: (errorText) => <PythonVenvDialog errorText={errorText} />,
          onSubmit: async (e, setErrorText) => {
            return await submitPythonVenv({ e, setErrorText });
          },
        });
        break;
    }
  }

  return (
    <AppMenuTrigger>
      <Button
        aria-label={`${language} kernel options`}
        className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 whitespace-nowrap outline-hidden"
      >
        {({ isPressed }) => (
          <>
            <KernelHeartbeat
              status={status}
              heartbeat={heartbeat}
              isBlinking={true}
              className="h-2 w-2"
              loaderHeight="0.625rem"
              loaderWidth="0.625rem"
            />
            <p>{language}</p>
            <motion.div
              initial={{ rotate: 0 }}
              className="ml-auto"
              animate={{ rotate: isPressed ? 0 : 180 }}
              aria-hidden="true"
            >
              <ChevronDown
                className="text-zinc-500 dark:text-zinc-300 will-change-transform"
                strokeWidth="3.5px"
                width="0.5625rem"
                height="0.5625rem"
              />
            </motion.div>
          </>
        )}
      </Button>
      <AppMenuPopover placement="top" className="w-60">
        <div>
          <p className="px-2 pt-1 text-gray-500 dark:text-gray-300 text-sm">
            Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
          {errorMessage && (
            <p
              className={cn(
                'px-2 pt-1 text-red-500 text-sm',
                status === 'idle' && 'text-gray-500 dark:text-gray-300'
              )}
            >
              Error: <span className="text-xs">{errorMessage}</span>
            </p>
          )}
        </div>
        <AppMenu onAction={handleAction}>
          {kernelOptions.map((option) => (
            <AppMenuItem key={option.id} id={option.id}>
              {option.label}
            </AppMenuItem>
          ))}
        </AppMenu>
      </AppMenuPopover>
    </AppMenuTrigger>
  );
}
