import { AnimatePresence, motion } from 'motion/react';
import { useAtom } from 'jotai';
import { useRoute } from 'wouter';
import { SquareTerminal } from '../../../icons/square-terminal';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
import {
  useKernelHeartbeat,
  useKernelShutdown,
  useKernelStatus,
} from '../../../hooks/code';
import {
  isValidKernelLanguage,
  Languages,
  validLanguages,
} from '../../../types';
import {
  routeUrls,
  type KernelWithFilesRouteParams,
} from '../../../utils/routes';
import { KernelAccordionButton } from './kernel-accordion-button';
import { folderSidebarOpenStateAtom } from '../../../atoms';

export function MyKernelsAccordion() {
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isOpen = openState.kernels;
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
        onClick={() =>
          setOpenState((prev) => ({
            ...prev,
            kernels: !prev.kernels,
          }))
        }
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
