import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useRoute } from 'wouter';
import { useAtomValue } from 'jotai';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
import {
  useKernelHeartbeat,
  useKernelShutdown,
  useKernelStatus,
} from '../../../hooks/code';
import {
  isValidKernelLanguage,
  validLanguages,
  KernelsData,
} from '../../../types';
import {
  routeUrls,
  type KernelWithFilesRouteParams,
} from '../../../utils/routes';
import { KernelAccordionButton } from './kernel-accordion-button';
import { Tooltip } from '../../tooltip';
import { kernelsDataAtom } from '../../../atoms';
import { KernelHeartbeat } from '../../kernel-info';
import { SquareTerminal } from '../../../icons/square-terminal';
import { PythonLogo } from '../../../icons/python-logo';
import { GolangLogo } from '../../../icons/golang-logo';
import { JavascriptLogo } from '../../../icons/javascript-logo';
import { JavaLogo } from '../../../icons/java-logo';
import { Languages } from '../../../types';

export function getKernelIcon(kernel: Languages, size: number = 18) {
  switch (kernel) {
    case 'python':
      return <PythonLogo height={size} width={size} />;
    case 'go':
      return <GolangLogo height={size} width={size} />;
    case 'javascript':
      return <JavascriptLogo height={size} width={size} />;
    case 'java':
      return <JavaLogo height={size} width={size} />;
    default:
      return <SquareTerminal height={size - 2} width={size - 2} />;
  }
}

function KernelTooltipContent({ kernelsData }: { kernelsData: KernelsData }) {
  const activeKernels = [...validLanguages].filter(
    (kernel) => kernelsData[kernel].heartbeat === 'success'
  );

  if (activeKernels.length === 0) {
    return <div className="text-sm">No active kernels</div>;
  }

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium mb-2">Active Kernels</div>
      {activeKernels.map((kernel) => (
        <div key={kernel} className="flex items-center gap-2 text-sm">
          {getKernelIcon(kernel, 16)}
          <KernelHeartbeat
            status={kernelsData[kernel].status}
            heartbeat={kernelsData[kernel].heartbeat}
            isBlinking={false}
            className="h-2 w-2"
          />
          <span className="capitalize">{kernel}</span>
        </div>
      ))}
    </div>
  );
}

export function MyKernelsAccordion() {
  const [isOpen, setIsOpen] = useState(false);
  const [, params] = useRoute<KernelWithFilesRouteParams>(
    routeUrls.patterns.KERNELS_WITH_FILES
  );
  const kernelNameFromUrl = params?.kernelName;
  const kernelsData = useAtomValue(kernelsDataAtom);

  useKernelStatus();
  useKernelHeartbeat();
  useKernelShutdown();

  return (
    <section>
      <Tooltip
        content={<KernelTooltipContent kernelsData={kernelsData} />}
        placement="right"
      >
        <AccordionButton
          isOpen={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          icon={<SquareTerminal width={20} height={20} />}
          title={'Kernels'}
        />
      </Tooltip>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{
              height: 'auto',
              transition: { type: 'spring', damping: 16 },
            }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden hover:overflow-auto pl-1"
          >
            <Sidebar<Languages>
              layoutId="kernels-sidebar"
              emptyElement={null}
              contentType="tag"
              dataItemToString={(kernelName) => kernelName}
              dataItemToSelectionRangeEntry={(kernelName) => kernelName}
              renderLink={({ dataItem: kernelName }) => {
                if (!isValidKernelLanguage(kernelName)) {
                  return <></>;
                }
                return (
                  <KernelAccordionButton
                    kernelName={kernelName}
                    kernelNameFromUrl={kernelNameFromUrl}
                  />
                );
              }}
              data={[...validLanguages]}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
