import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "../../icons/chevron-down.tsx";
import { useState } from "react";
import { Link } from "wouter";
import { cn } from "../../utils/string-formatting.ts";
import { useAtomValue } from "jotai";
import { mostRecentNotesAtom } from "../../atoms.ts";
import { Note } from "../../icons/page.tsx";

export function RecentNotesAccordion() {
  const [isRecentNotesCollapsed, setIsRecentNotesCollapsed] = useState(false);
  const mostRecentNotes = useAtomValue(mostRecentNotesAtom);

  const mostRecentElements = mostRecentNotes.map((path) => (
    <motion.li
      layout
      transition={{ type: "spring", damping: 15 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={path}
    >
      <div
        id="folder"
        className="flex select-none items-center gap-2 overflow-hidden pr-1 text-zinc-600 dark:text-zinc-300"
      >
        <Link
          className={cn(
            "flex flex-1 items-center gap-2 overflow-x-hidden rounded-md px-3 py-1",
          )}
          to={`/${encodeURI(path)}`}
        >
          <Note width="1rem" height="1rem" />
          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
            {path.slice(path.lastIndexOf("/") + 1)}
          </p>
        </Link>
      </div>
    </motion.li>
  ));

  return (
    <section className="flex flex-col overflow-y-auto">
      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
        onClick={() => setIsRecentNotesCollapsed((prev) => !prev)}
      >
        <motion.span
          initial={{ rotateZ: isRecentNotesCollapsed ? 270 : 0 }}
          animate={{ rotateZ: isRecentNotesCollapsed ? 270 : 0 }}
        >
          <ChevronDown strokeWidth="2.5px" height="0.8rem" width="0.8rem" />
        </motion.span>
        <p>Recent Notes</p>
      </button>
      <AnimatePresence>
        {!isRecentNotesCollapsed && (
          <motion.ul
            layout
            initial={{ height: 0 }}
            animate={{
              height: "auto",
              transition: { type: "spring", damping: 16 },
            }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden hover:overflow-auto"
          >
            {mostRecentElements}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}