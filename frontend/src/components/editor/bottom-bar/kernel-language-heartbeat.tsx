import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { ChevronDown } from '../../../icons/chevron-down';
import { DropdownItems } from '../../dropdown/dropdown-items';
import PowerOff from '../../../icons/power-off';
import { useOnClickOutside } from '../../../hooks/general';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  dialogDataAtom,
  kernelsDataAtom,
  projectSettingsAtom,
} from '../../../atoms';
import { DropdownItem, Languages } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { KernelHeartbeat } from '../../kernel-info';
import { useQuery } from '@tanstack/react-query';
import { CreateSocketsAndListen } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import { FolderOpen } from '../../../icons/folder-open';
import { PythonVenvDialog } from '../python-venv-dialog';
import {
  usePythonVenvSubmitMutation,
  useShutdownKernelMutation,
  useTurnOnKernelMutation,
} from '../../../hooks/code';
import { QueryError } from '../../../utils/query';

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
            <FolderOpen
              className="will-change-transform"
              height={14.5}
              width={14.5}
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
  const [isOpen, setIsOpen] = useState(false);
  const setDialogData = useSetAtom(dialogDataAtom);
  const [focusIndex, setFocusIndex] = useState(0);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));
  const projectSettings = useAtomValue(projectSettingsAtom);
  const [kernelsData, setKernelsData] = useAtom(kernelsDataAtom);
  const { status, heartbeat, errorMessage } = kernelsData[language];
  const { mutate: shutdownKernel } = useShutdownKernelMutation(language);
  const { mutate: turnOnKernel } = useTurnOnKernelMutation();
  const { mutateAsync: submitPythonVenv } =
    usePythonVenvSubmitMutation(projectSettings);

  useQuery({
    queryKey: ['create-sockets-and-listen', language],
    queryFn: async () => {
      const res = await CreateSocketsAndListen(language);
      if (!res.success) {
        setKernelsData((prev) => ({
          ...prev,
          [language]: { ...prev[language], errorMessage: res.message },
        }));
        throw new QueryError(res.message);
      }
      return res;
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
        className="translate-y-[-2.25rem] w-60"
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        setFocusIndex={setFocusIndex}
        onChange={({ value }) => {
          switch (value) {
            case 'shut-down':
              shutdownKernel(false);
              break;
            case 'turn-on':
              turnOnKernel(language);
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
                onSubmit: async (e, setErrorText) => {
                  return await submitPythonVenv({ e, setErrorText });
                },
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
            <p
              className={cn(
                'px-2 pt-1 text-red-500',
                status === 'idle' && 'text-gray-500 dark:text-gray-300'
              )}
            >
              Error: <span className="text-xs">{errorMessage}</span>
            </p>
          )}
        </div>
      </DropdownItems>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 whitespace-nowrap"
      >
        <KernelHeartbeat
          status={status}
          heartbeat={heartbeat}
          isBlinking={true}
          className="h-2 w-2"
          loaderHeight={10}
          loaderWidth={10}
        />
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
