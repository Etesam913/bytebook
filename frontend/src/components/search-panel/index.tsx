import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { easingFunctions } from "../../animations";
import { isSearchPanelOpenAtom } from "../../atoms";
import { Shade } from "../dialog/shade";

export function SearchPanel() {
	const [isSearchPanelOpen, setIsSearchPanelOpen] = useAtom(
		isSearchPanelOpenAtom,
	);

	return (
		<AnimatePresence>
			{isSearchPanelOpen && (
				<>
					<Shade
						onClick={() => setIsSearchPanelOpen(false)}
						className="bg-transparent"
					/>

					<motion.form
						className="absolute bg-zinc-50 dark:bg-zinc-800 z-40 top-[35%] w-[min(23rem,90vw)] overflow-hidden rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4"
						initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
						animate={{
							opacity: 1,
							scale: 1,
							transition: { ease: easingFunctions["ease-out-circ"] },
						}}
						exit={{
							opacity: 0,
							scale: 0.5,
							transition: { ease: easingFunctions["ease-out-quint"] },
						}}
						onSubmit={(e) => {
							e.preventDefault();
						}}
					>
						<input
							type="text"
							autoFocus
							placeholder="Search Files"
							className="py-3 px-4 bg-transparent w-full"
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									setIsSearchPanelOpen(false);
								}
							}}
						/>
					</motion.form>
				</>
			)}
		</AnimatePresence>
	);
}
