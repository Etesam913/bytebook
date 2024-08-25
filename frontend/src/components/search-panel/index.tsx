import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { useRef, useState } from "react";
import { easingFunctions } from "../../animations";
import { isSearchPanelOpenAtom } from "../../atoms";
import { useTrapFocus } from "../dialog/hooks";
import { Shade } from "../dialog/shade";
import { SearchItems } from "./search-items";

const NUM_SEARCH_RESULTS = 5;

export function SearchPanel() {
	const [isSearchPanelOpen, setIsSearchPanelOpen] = useAtom(
		isSearchPanelOpenAtom,
	);
	const searchPanelRef = useRef<HTMLFormElement>(null);
	const [focusedIndex, setFocusedIndex] = useState(0);
	useTrapFocus(searchPanelRef, isSearchPanelOpen);

	return (
		<AnimatePresence>
			{isSearchPanelOpen && (
				<>
					<Shade
						onClick={() => setIsSearchPanelOpen(false)}
						className="bg-transparent"
					/>

					<motion.form
						initial={{ opacity: 0, scale: 0.5, translate: "-50% -30%" }}
						animate={{
							opacity: 1,
							scale: 1,
							transition: { ease: easingFunctions["ease-out-circ"] },
						}}
						exit={{
							opacity: 0,
							scale: 0.5,
							transition: { ease: easingFunctions["ease-out-circ"] },
						}}
						ref={searchPanelRef}
						className="absolute bg-zinc-50 dark:bg-zinc-800 translate-x-[-50%] translate-y-[-50%] z-40 top-[35%] w-[min(29rem,90vw)] overflow-hidden rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4"
						onSubmit={(e) => {
							e.preventDefault();
						}}
					>
						<input
							type="text"
							autoFocus
							placeholder="Search Files"
							className="py-3 px-4 outline-none will-change-transform bg-transparent w-full border-b border-zinc-300 dark:border-zinc-700 "
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									setIsSearchPanelOpen(false);
								} else if (e.key === "ArrowDown") {
									e.preventDefault();
									setFocusedIndex((prev) =>
										Math.min(prev + 1, NUM_SEARCH_RESULTS - 1),
									);
								} else if (e.key === "ArrowUp") {
									e.preventDefault();
									setFocusedIndex((prev) => Math.max(prev - 1, 0));
								}
							}}
						/>
						<SearchItems
							setIsSearchPanelOpen={setIsSearchPanelOpen}
							focusedIndex={focusedIndex}
							setFocusedIndex={setFocusedIndex}
						/>
					</motion.form>
				</>
			)}
		</AnimatePresence>
	);
}
