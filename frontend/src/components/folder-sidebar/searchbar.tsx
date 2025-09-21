import { motion } from 'motion/react';
import { getDefaultButtonVariants } from '../../animations';
import { Command } from '../../icons/command';
import { Magnifier } from '../../icons/magnifier';
import { navigate } from 'wouter/use-browser-location';

export function SearchBar() {
  return (
    <motion.button
      {...getDefaultButtonVariants({ disabled: false, whileHover: 1.025, whileTap: 0.975, whileFocus: 1.025 })}
      type="button"
      className="w-full mb-2.5 text-left flex items-center gap-2 text-zinc-600 dark:text-zinc-300 text-xs py-1.5 px-2 dark:bg-zinc-700 border-[1.25px] border-zinc-300 dark:border-zinc-600 rounded-md transition-colors"
      onClick={() => navigate(`/search`)}
    >
      <Magnifier className="will-change-transform" width={12.8} height={12.8} />
      <p>Search</p>
      <span className="flex items-center ml-auto">
        <Command className="will-change-transform" width={12.8} height={12.8} />
        <p className="ml-0.5">K</p>
      </span>
    </motion.button>
  );
}
