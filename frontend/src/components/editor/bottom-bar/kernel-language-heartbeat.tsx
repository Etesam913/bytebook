import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { ChevronDown } from '../../../icons/chevron-down';
import { DropdownItems } from '../../dropdown/dropdown-items';
import PowerOff from '../../../icons/power-off';
import { useOnClickOutside } from '../../../hooks/general';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  dialogDataAtom,
  kernelsDataAtom,
  projectSettingsAtom,
} from '../../../atoms';
import { DropdownItem, Languages } from '../../../types';
import { Loader } from '../../../icons/loader';
import { cn } from '../../../utils/string-formatting';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CreateSocketsAndListen,
  SendShutdownMessage,
} from '../../../../bindings/github.com/etesam913/bytebook/services/codeservice';
import { QueryError } from '../../../utils/query';
import { FolderOpen } from '../../../icons/folder-open';
import { PythonVenvDialog } from '../python-venv-dialog';
import { pythonVirtualEnvironmentSubmit } from '../../../utils/code';

const languageSpecificOptions: {
  heartbeatSuccess: Partial<Record<Languages, DropdownItem[]>>;
  heartbeatFailure: Partial<Record<Languages, DropdownItem[]>>;
} = {
  heartbeatSuccess: {
    python: [
      {
        value: 'change-venv',
        label: (
          <span className="flex items-center gap-1.5 will-change-transform">
            <FolderOpen height={14.5} width={14.5} />
            Change Virtual Environment
          </span>
        ),
      },
    ],
  },
  heartbeatFailure: {},
};

export function KernelLanguageHeartbeat({ language }: { language: Languages }) {
  const [isOpen, setIsOpen] = useState(false);
  const setDialogData = useSetAtom(dialogDataAtom);
  const [focusIndex, setFocusIndex] = useState(0);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));
  const kernelsData = useAtomValue(kernelsDataAtom);
  const { status, heartbeat, errorMessage } = kernelsData[language];

  // TODO: Remove the need to pass in the pythonVenvPath into the CreateSocketAndListen
  const projectSettings = useAtomValue(projectSettingsAtom);

  useQuery({
    queryKey: ['heartbeat', language],
    queryFn: async () => {
      const res = await CreateSocketsAndListen(
        language,
        projectSettings.code.pythonVenvPath
      );
      console.log(res);
      if (!res.success) {
        throw new QueryError(res.message);
      }
      return res;
    },
  });

  const { mutate: shutdownKernel } = useMutation({
    mutationFn: async (restart: boolean) => {
      const res = await SendShutdownMessage(restart);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });

  const { mutate: turnOnKernel } = useMutation({
    mutationFn: async () => {
      const res = await CreateSocketsAndListen(
        language,
        projectSettings.code.pythonVenvPath
      );
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });

  const heartbeatSuccessDropdownItems = languageSpecificOptions
    .heartbeatSuccess[language]
    ? [...(languageSpecificOptions.heartbeatSuccess[language] ?? [])]
    : [];

  const heartbeatFailureDropdownItems = languageSpecificOptions
    .heartbeatFailure[language]
    ? [...(languageSpecificOptions.heartbeatFailure[language] ?? [])]
    : [];

  const kernelOptions =
    heartbeat === 'success'
      ? [
          {
            value: 'shut-down',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <PowerOff height={10} width={10} />
                Shut Down
              </span>
            ),
          },
          ...heartbeatSuccessDropdownItems,
        ]
      : [
          {
            value: 'turn-on',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <PowerOff height={10} width={10} />
                Turn On
              </span>
            ),
          },
          ...heartbeatFailureDropdownItems,
        ];

  return (
    <div className="relative flex flex-col-reverse" ref={dropdownContainerRef}>
      <DropdownItems
        className="translate-y-[-2.25rem] w-auto"
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        setFocusIndex={setFocusIndex}
        onChange={({ value }) => {
          switch (value) {
            case 'shut-down':
              shutdownKernel(false);
              break;
            case 'turn-on':
              turnOnKernel();
              break;
            case 'change-venv':
              setDialogData({
                isOpen: true,
                isPending: false,
                title: 'Change Python Virtual Environment',
                dialogClassName: 'w-[min(40rem,90vw)]',
                children: (errorText) => (
                  <PythonVenvDialog errorText={errorText} />
                ),
                onSubmit: async (e, setErrorText) =>
                  pythonVirtualEnvironmentSubmit(e, setErrorText),
              });
              break;
            default:
              break;
          }
        }}
        focusIndex={focusIndex}
        items={kernelOptions}
      >
        <div>
          <p className="px-2 pt-1 text-gray-500 dark:text-gray-300">
            Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
          {errorMessage && (
            <p className="px-2 pt-1 text-red-500">
              Error: <span className="text-xs">{errorMessage}</span>
            </p>
          )}
        </div>
      </DropdownItems>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 whitespace-nowrap"
      >
        {status === 'idle' && (
          <span
            className={cn(
              'h-2 w-2 rounded-full kernel-heartbeat',
              heartbeat === 'success' && 'bg-green-600',
              heartbeat === 'failure' && 'bg-red-600'
            )}
          />
        )}
        {(status === 'busy' || status === 'starting') && (
          <Loader height={10} width={10} />
        )}
        <p>{language}</p>
        <motion.div
          initial={{ rotate: 0 }}
          className="ml-auto"
          animate={{ rotate: isOpen ? 0 : 180 }}
        >
          <ChevronDown
            className="text-zinc-500 dark:text-zinc-300 will-change-transform"
            strokeWidth="3.5px"
            width={9}
            height={9}
          />
        </motion.div>
      </button>
    </div>
  );
}
