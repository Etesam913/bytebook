import { AnimatePresence, motion } from 'motion/react';
import { useContext, type JSX, type ReactNode } from 'react';
import {
  Button,
  Disclosure,
  DisclosurePanel,
  DisclosureStateContext,
  Heading,
} from 'react-aria-components';
import { ChevronDown } from '../../icons/chevron-down';
import { cn } from '../../utils/string-formatting';

function DisclosureChevron() {
  const state = useContext(DisclosureStateContext);
  const isExpanded = state?.isExpanded ?? false;
  return (
    <motion.span
      className="ml-auto"
      animate={{ rotateZ: isExpanded ? 180 : 0 }}
    >
      <ChevronDown strokeWidth="2.5px" className="will-change-transform" />
    </motion.span>
  );
}

export function SidebarAccordion({
  onClick,
  isOpen,
  children,
  title,
  icon,
  buttonClassName,
  listClassName,
}: {
  onClick: () => void;
  isOpen: boolean;
  children: ReactNode;
  title: string;
  icon?: JSX.Element;
  buttonClassName?: string;
  listClassName?: string;
}) {
  return (
    <Disclosure isExpanded={isOpen} onExpandedChange={() => onClick()}>
      <Heading className="m-0">
        <Button
          slot="trigger"
          className={cn(
            'relative flex items-center w-full gap-1.5 px-2 py-1.25 bg-zinc-50 border-zinc-200 dark:border-zinc-600 border-y-[1.25px] dark:bg-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color)',
            buttonClassName
          )}
        >
          {icon}
          <p>{title}</p>
          <DisclosureChevron />
        </Button>
      </Heading>
      <DisclosurePanel>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.ul
              initial={{ height: 0 }}
              animate={{
                height: 'auto',
                transition: { type: 'spring', damping: 16 },
              }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                'pl-1 overflow-hidden scrollbar-hidden',
                listClassName
              )}
            >
              {children}
            </motion.ul>
          )}
        </AnimatePresence>
      </DisclosurePanel>
    </Disclosure>
  );
}
