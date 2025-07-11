import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useRoute } from 'wouter';
import { SquareTerminal } from '../../icons/square-terminal';
import { PythonLogo } from '../../icons/python-logo';
import { GolangLogo } from '../../icons/golang-logo';
import { cn } from '../../utils/string-formatting';
import { Sidebar } from '../sidebar';
import { AccordionButton } from '../sidebar/accordion-button';
import { navigate } from 'wouter/use-browser-location';

const KERNELS: string[] = ['python', 'go'];
type KernelType = 'python' | 'go';

export function MyKernelsAccordion() {
  const [isOpen, setIsOpen] = useState(false);
  const [, params] = useRoute('/kernels/:kernelName/:folder?/:note?');
  const kernelNameFromUrl = (params as { kernelName: string })?.kernelName;

  return (
    <section className="pb-1.5">
      <AccordionButton
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        icon={<SquareTerminal width={18} height={18} />}
        title={
          <>
            Kernels <span className="tracking-wider">({KERNELS.length})</span>
          </>
        }
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
                i,
                selectionRange,
                setSelectionRange,
              }) => {
                return (
                  <KernelAccordionButton
                    i={i}
                    selectionRange={selectionRange}
                    setSelectionRange={setSelectionRange}
                    kernelName={kernelName as KernelType}
                    kernelNameFromUrl={kernelNameFromUrl}
                  />
                );
              }}
              data={KERNELS}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function KernelAccordionButton({
  i,
  selectionRange,
  setSelectionRange,
  kernelName,
  kernelNameFromUrl,
}: {
  i: number;
  selectionRange: Set<string>;
  setSelectionRange: React.Dispatch<React.SetStateAction<Set<string>>>;
  kernelName: KernelType;
  kernelNameFromUrl: string | undefined;
}) {
  const isActive = decodeURIComponent(kernelNameFromUrl ?? '') === kernelName;
  const isSelected = selectionRange.has(`kernel:${kernelName}`);

  const getKernelIcon = (kernel: KernelType) => {
    switch (kernel) {
      case 'python':
        return <PythonLogo height={18} width={18} />;
      case 'go':
        return <GolangLogo height={20} width={20} />;
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
    >
      {getKernelIcon(kernelName)}
      <p className="whitespace-nowrap text-ellipsis overflow-hidden capitalize">
        {kernelName}
      </p>
    </button>
  );
}
