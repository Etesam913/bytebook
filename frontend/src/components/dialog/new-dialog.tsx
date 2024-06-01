import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { easingFunctions, getDefaultButtonVariants } from "../../animations";
import { dialogDataAtom } from "../../atoms";
import { XMark } from "../../icons/circle-xmark";
import { FolderPlus } from "../../icons/folder-plus";
import { IconButton, MotionButton, MotionIconButton } from "../buttons";

export function NewDialog() {
	const [dialogData, setDialogData] = useAtom(dialogDataAtom);

	return (
		<AnimatePresence>
			{dialogData.isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed z-30 left-0 top-0 w-screen h-screen bg-[rgba(0,0,0,0.5)]"
					/>
					<motion.form
						onSubmit={(e) => {
							e.preventDefault();
						}}
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
						className="absolute flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-800 backdrop:bg-blue-500 z-40 top-2/4 py-3 px-4 max-w-[80vw] w-80 rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4"
					>
						<h2 className=" text-xl">{dialogData.title}</h2>
						{dialogData.children}

						<MotionIconButton
							{...getDefaultButtonVariants()}
							onClick={() => setDialogData({ ...dialogData, isOpen: false })}
							className="absolute top-2 right-2"
							type="button"
						>
							<XMark />
						</MotionIconButton>
					</motion.form>
				</>
			)}
		</AnimatePresence>
	);
}
