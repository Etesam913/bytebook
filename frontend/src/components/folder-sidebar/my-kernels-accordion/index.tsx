import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useRoute } from 'wouter';
import { SquareTerminal } from '../../../icons/square-terminal';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
import {
  useKernelHeartbeat,
  useKernelShutdown,
  useKernelStatus,
} from '../../../hooks/code';
import { isValidKernelLanguage, Languages, validLanguages } from '../../../types';
import { KernelAccordionButton } from './button';

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

