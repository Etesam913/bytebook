import { AnimatePresence, motion } from 'motion/react';
import { Dispatch, SetStateAction, useState } from 'react';
import { useRoute } from 'wouter';
import { SquareTerminal } from '../../icons/square-terminal';
import { PythonLogo } from '../../icons/python-logo';
import { GolangLogo } from '../../icons/golang-logo';
import { JavascriptLogo } from '../../icons/javascript-logo';
import { JavaLogo } from '../../icons/java-logo';
import { cn } from '../../utils/string-formatting';
import { Sidebar } from '../sidebar';
import { AccordionButton } from '../sidebar/accordion-button';
import { navigate } from 'wouter/use-browser-location';
import { useAtomValue, useSetAtom } from 'jotai';
import { contextMenuDataAtom, kernelsDataAtom } from '../../atoms';
import { handleContextMenuSelection } from '../../utils/selection';
import { KernelHeartbeat } from '../kernel-info';
import PowerOff from '../../icons/power-off';
import { Play } from '../../icons/circle-play';
import {
  useKernelHeartbeat,
  useKernelShutdown,
  useKernelStatus,
  useShutdownKernelMutation,
  useTurnOnKernelMutation,
} from '../../hooks/code';
import { isValidKernelLanguage, Languages, validLanguages } from '../../types';
import { CURRENT_ZOOM } from '../../hooks/resize';

export function MyKernelsAccordion() {
  const [isOpen, setIsOpen] = useState(false);
  const [, params] = useRoute('/kernels/:kernelName/:folder?/:note?');
  const kernelNameFromUrl = (params as { kernelName: string })?.kernelName;

  useKernelStatus();
  useKernelHeartbeat();
  useKernelShutdown();

  return (
    <section>
      <AccordionButton
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        icon={<SquareTerminal width={20} height={20} />}
        title={'Kernels'}
      />

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
            <Sidebar
              layoutId="kernels-sidebar"
              emptyElement={null}
              contentType="tag"
              renderLink={({
                dataItem: kernelName,
                selectionRange,
                setSelectionRange,
              }) => {
                if (!isValidKernelLanguage(kernelName)) {
                  return <></>;
                }
                return (
                  <KernelAccordionButton
                    selectionRange={selectionRange}
                    setSelectionRange={setSelectionRange}
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

function KernelAccordionButton({
  selectionRange,
  setSelectionRange,
  kernelName,
  kernelNameFromUrl,
}: {
  selectionRange: Set<string>;
  setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  kernelName: Languages;
  kernelNameFromUrl: string | undefined;
}) {
  const isActive = decodeURIComponent(kernelNameFromUrl ?? '') === kernelName;
  const isSelected = selectionRange.has(`kernel:${kernelName}`);
  const kernelsData = useAtomValue(kernelsDataAtom);
  const { status, heartbeat } = kernelsData[kernelName];
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const { mutate: shutdownKernel } = useShutdownKernelMutation(kernelName);
  const { mutate: turnOnKernel } = useTurnOnKernelMutation();

  const isKernelRunning = heartbeat === 'success';

  const getKernelIcon = (kernel: Languages) => {
    switch (kernel) {
      case 'python':
        return <PythonLogo height={18} width={18} />;
      case 'go':
        return <GolangLogo height={18} width={18} />;
      case 'javascript':
        return <JavascriptLogo height={18} width={18} />;
      case 'java':
        return <JavaLogo height={18} width={18} />;
      default:
        return <SquareTerminal height={16} width={16} />;
    }
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        'list-sidebar-item',
        isActive && 'bg-zinc-150 dark:bg-zinc-700',
        isSelected && 'bg-(--accent-color)! text-white'
      )}
      onClick={(e) => {
        if (e.metaKey || e.shiftKey) return;
        navigate(`/kernels/${encodeURIComponent(kernelName)}`);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        handleContextMenuSelection({
          setSelectionRange,
          itemType: 'kernel',
          itemName: kernelName,
          onlyOne: true,
        });
        setContextMenuData({
          x: e.clientX / CURRENT_ZOOM,
          y: e.clientY / CURRENT_ZOOM,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  {isKernelRunning ? (
                    <PowerOff height={12} width={12} />
                  ) : (
                    <Play height={18} width={18} />
                  )}
                  {isKernelRunning ? 'Stop Kernel' : 'Start Kernel'}
                </span>
              ),
              value: isKernelRunning ? 'stop-kernel' : 'start-kernel',
              onChange: () => {
                if (isKernelRunning) {
                  shutdownKernel(false);
                } else {
                  turnOnKernel(kernelName);
                }
              },
            },
          ],
        });
      }}
    >
      <div className="flex items-center gap-2">
        {getKernelIcon(kernelName)}
        <KernelHeartbeat
          status={status}
          heartbeat={heartbeat}
          isBlinking={false}
          className="h-2.25 w-2.25"
        />
      </div>
      <p className="whitespace-nowrap text-ellipsis overflow-hidden capitalize">
        {kernelName}
      </p>
    </button>
  );
}
