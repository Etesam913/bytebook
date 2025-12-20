import { useAtom, useAtomValue } from 'jotai';
import { useRoute } from 'wouter';
import { VirtualizedListAccordion } from '../../virtualized-list/accordion';
import { AccordionButton } from '../../accordion/accordion-button';
import {
  useKernelHeartbeat,
  useKernelShutdown,
  useKernelStatus,
} from '../../../hooks/code';
import {
  isValidKernelLanguage,
  KernelsData,
  languagesWithKernelsSet,
} from '../../../types';
import {
  routeUrls,
  type KernelWithFilesRouteParams,
} from '../../../utils/routes';
import { KernelAccordionButton } from './kernel-accordion-button';
import { Tooltip } from '../../tooltip';
import { folderSidebarOpenStateAtom } from '../../../atoms';
import { kernelsDataAtom } from '../../../atoms';
import { SquareTerminal } from '../../../icons/square-terminal';
import { PythonLogo } from '../../../icons/python-logo';
import { GolangLogo } from '../../../icons/golang-logo';
import { JavascriptLogo } from '../../../icons/javascript-logo';
import { JavaLogo } from '../../../icons/java-logo';
import { Languages } from '../../../types';
import { KernelHeartbeat } from './kernel-heartbeat';

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
  const activeKernels = [...languagesWithKernelsSet].filter(
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
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isOpen = openState.kernels;
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
          data-testid="kernels-accordion"
          isOpen={isOpen}
          onClick={() =>
            setOpenState((prev) => ({
              ...prev,
              kernels: !prev.kernels,
            }))
          }
          icon={<SquareTerminal width={20} height={20} />}
          title={'Kernels'}
        />
      </Tooltip>

      <VirtualizedListAccordion<Languages>
        isOpen={isOpen}
        layoutId="kernels-sidebar"
        emptyElement={null}
        className="scrollbar-hidden"
        contentType="kernel"
        dataItemToString={(kernelName) => kernelName}
        dataItemToKey={(kernelName) => kernelName}
        selectionOptions={{
          dataItemToSelectionRangeEntry: (kernelName) => kernelName,
        }}
        isItemActive={(kernelName) => kernelName === kernelNameFromUrl}
        maxHeight="480px"
        renderItem={({ dataItem: kernelName }) => {
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
        data={[...languagesWithKernelsSet]}
      />
    </section>
  );
}
