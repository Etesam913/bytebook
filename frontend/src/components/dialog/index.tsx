import { AnimatePresence, motion } from "framer-motion";
import { type FormEvent, type ReactNode, useRef } from "react";
import { XMark } from "../../icons/circle-xmark";
import { getDefaultButtonVariants } from "../../variants";
import { useTrapFocus } from "./hooks";

export function ErrorText({ errorText }: { errorText: string }) {
	return (
		<AnimatePresence>
			{errorText.length > 0 && (
				<motion.p
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={{ type: "spring" }}
					className="text-red-500 text-[0.85rem] text-left"
				>
					{errorText}
				</motion.p>
			)}
		</AnimatePresence>
	);
}

export function Dialog({
	title,
	isOpen,
	setIsOpen,
	children,
	handleSubmit,
}: {
	title: string;
	isOpen: boolean;
	setIsOpen: (r: boolean) => void;
	children: ReactNode;
	handleSubmit?: (e: FormEvent<HTMLFormElement>) => void;
}) {
	const modalRef = useRef<HTMLDivElement>(null);

	useTrapFocus(modalRef, isOpen);

	return (
		<div
			ref={modalRef}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					setIsOpen(false);
					e.preventDefault();
					e.stopPropagation();
				}
			}}
			onClick={(e) => e.stopPropagation()}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: we want trapped focus for dialogs
			tabIndex={0}
		>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed z-10 left-0 top-0 w-screen h-screen bg-[rgba(0,0,0,0.5)]"
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
						animate={{
							opacity: 1,
							scale: 1,
							transition: {
								scale: {
									type: "spring",
									damping: 15,
									stiffness: 190,
									mass: 0.7,
								},
							},
						}}
						exit={{
							opacity: 0,
							scale: 0.5,
							transition: { opacity: { duration: 0.225 } },
						}}
						className="absolute flex flex-col gap-3 bg-zinc-100 dark:bg-zinc-800 backdrop:bg-blue-500 z-20 top-2/4  py-3 px-4 max-w-[80vw] w-80 rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4"
					>
						<h2>{title}</h2>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (handleSubmit) {
									handleSubmit(e);
								}
							}}
							className="overflow-auto max-h-[60vh] px-1 pb-1"
						>
							{children}
						</form>
						<motion.button
							onClick={() => setIsOpen(false)}
							{...getDefaultButtonVariants(false, 1.075, 0.95, 1.075)}
							className="absolute top-2 right-2"
							type="button"
						>
							<XMark />
						</motion.button>
					</motion.div>
				</>
			)}
		</div>
	);
}
