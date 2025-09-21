import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useRoute } from 'wouter';
import { SquareTerminal } from '../../../icons/square-terminal';
import { PythonLogo } from '../../../icons/python-logo';
import { GolangLogo } from '../../../icons/golang-logo';
import { JavascriptLogo } from '../../../icons/javascript-logo';
import { JavaLogo } from '../../../icons/java-logo';
import { cn } from '../../../utils/string-formatting';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
import { navigate } from 'wouter/use-browser-location';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  contextMenuDataAtom,
  kernelsDataAtom,
  selectionRangeAtom,
} from '../../../atoms';
import { handleContextMenuSelection } from '../../../utils/selection';
import { KernelHeartbeat } from '../../kernel-info';
import PowerOff from '../../../icons/power-off';
import { Play } from '../../../icons/circle-play';
import {
  useKernelHeartbeat,
  useKernelShutdown,
  useKernelStatus,
  useShutdownKernelMutation,
  useTurnOnKernelMutation,
} from '../../../hooks/code';
import { isValidKernelLanguage, Languages, validLanguages } from '../../../types';
import { currentZoomAtom } from '../../../hooks/resize';
import { routeUrls, type KernelWithFilesRouteParams } from '../../../utils/routes';
import { KernelAccordionButton } from './kernel-accordion-button';

export function MyKernelsAccordion() {
  const [isOpen, setIsOpen] = useState(false);
  const [, params] = useRoute<KernelWithFilesRouteParams>(
    routeUrls.patterns.KERNELS_WITH_FILES
  );
  const kernelNameFromUrl = params?.kernelName;

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