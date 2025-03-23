import { motion } from 'motion/react';
import { useSetAtom } from 'jotai';
import { getDefaultButtonVariants } from '../../animations';
import { searchPanelDataAtom } from '../../atoms';
import { Command } from '../../icons/command';
import { Magnifier } from '../../icons/magnifier';

export function SearchBar() {
  const setSearchPanelData = useSetAtom(searchPanelDataAtom);
  return (
    <motion.button
      {...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
      type="button"
      className="w-full mb-2.5 text-left flex items-center gap-2 text-zinc-600 dark:text-zinc-300 text-xs py-1.5 px-2 dark:bg-zinc-700 border-[1.25px] border-zinc-300 dark:border-zinc-600 rounded-md transition-colors"
      onClick={() => setSearchPanelData((prev) => ({ ...prev, isOpen: true }))}
    >
      <Magnifier className="will-change-transform" width={12.8} height={12.8} />
      <p>Search</p>
      <span className="flex items-center ml-auto">
        <Command className="will-change-transform" width={12.8} height={12.8} />
        <p className="ml-0.5">P</p>
      </span>
    </motion.button>
  );
}
