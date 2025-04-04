import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { ChevronDown } from '../../../icons/chevron-down';
import { DropdownItems } from '../../dropdown/dropdown-items';
import PowerOff from '../../../icons/power-off';
import { useOnClickOutside } from '../../../hooks/general';
import { useAtomValue } from 'jotai';
import { kernelsDataAtom } from '../../../atoms';
import { Languages } from '../../../types';
import { Loader } from '../../../icons/loader';
import { cn } from '../../../utils/string-formatting';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CreateSocketsAndListen,
  SendShutdownMessage,
} from '../../../../bindings/github.com/etesam913/bytebook/services/codeservice';
import { QueryError } from '../../../utils/query';

export function KernelLanguageHeartbeat({ language }: { language: Languages }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));
  const kernelsData = useAtomValue(kernelsDataAtom);
  const { status, heartbeat } = kernelsData[language];

  useQuery({
    queryKey: ['heartbeat', language],
    queryFn: () => CreateSocketsAndListen(language),
  });

  const shutdownMutation = useMutation({
    mutationFn: async (restart: boolean) => {
      const res = await SendShutdownMessage(restart);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });

  const turnOnMutation = useMutation({
    mutationFn: async () => {
      const res = await CreateSocketsAndListen(language);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });

  const kernelOptions =
    heartbeat === 'success'
      ? [
          // {
          //   value: 'restart',
          //   label: (
          //     <span className="flex items-center gap-1.5 will-change-transform">
          //       <RefreshAnticlockwise height={10} width={10} /> Restart
          //     </span>
          //   ),
          // },
          {
            value: 'shut-down',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <PowerOff height={10} width={10} />
                Shut Down
              </span>
            ),
          },
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
        ];

  return (
    <div className="relative flex flex-col-reverse" ref={dropdownContainerRef}>
      <DropdownItems
        className="translate-y-[-2.25rem] w-32"
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        setFocusIndex={setFocusIndex}
        onChange={({ value }) => {
          if (value === 'shut-down') {
            shutdownMutation.mutate(false);
          } else if (value === 'turn-on') {
            turnOnMutation.mutate();
          }
        }}
        focusIndex={focusIndex}
        items={kernelOptions}
      >
        <p className="px-2 pt-1 text-gray-500 dark:text-gray-300">
          Status: {status.charAt(0).toUpperCase() + status.slice(1)}
        </p>
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
