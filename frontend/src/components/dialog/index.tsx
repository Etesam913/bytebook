import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import useMeasure from "react-use-measure";
import { easingFunctions, getDefaultButtonVariants } from "../../animations";
import { backendQueryAtom, dialogDataAtom } from "../../atoms";
import { XMark } from "../../icons/circle-xmark";
import type { DialogDataType } from "../../types";
import { cn } from "../../utils/string-formatting";
import { MotionIconButton } from "../buttons";
import { useTrapFocus } from "./hooks";

export function DialogErrorText({ errorText }: { errorText: string }) {
	const [elementRef, bounds] = useMeasure();
	return (
		<AnimatePresence>
			{errorText.length > 0 && (
				<motion.div
					initial={{ height: 0, opacity: 0 }}
					animate={{
						height: bounds.height,
						opacity: 1,
						transition: { type: "spring" },
					}}
					exit={{
						height: 0,
						opacity: 0,
						transition: {
							ease: easingFunctions["ease-out-cubic"],
						},
					}}
					className="text-red-500 text-[0.85rem] text-left"
				>
					<p ref={elementRef} className="pt-2">
						{errorText}
					</p>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

export function resetDialogState(
	setErrorText: Dispatch<SetStateAction<string>>,
	setDialogData: Dispatch<SetStateAction<DialogDataType>>,
) {
	setDialogData({
		isOpen: false,
		onSubmit: null,
		title: "",
		children: null,
	});
	setErrorText("");
}

function handleDialogKeyDown(
	e: globalThis.KeyboardEvent,
	setErrorText: Dispatch<SetStateAction<string>>,
	setDialogData: Dispatch<SetStateAction<DialogDataType>>,
) {
	if (e.key === "Escape") {
		resetDialogState(setErrorText, setDialogData);
	}
}

export function Dialog() {
	const [dialogData, setDialogData] = useAtom(dialogDataAtom);
	const backendQuery = useAtomValue(backendQueryAtom);
	const [errorText, setErrorText] = useState("");
	const modalRef = useRef<HTMLFormElement>(null);
	useTrapFocus(modalRef, dialogData.isOpen);

	// Handles escape key when dialog is open
	useEffect(() => {
		const keyDownHandler = (e: globalThis.KeyboardEvent) =>
			handleDialogKeyDown(e, setErrorText, setDialogData);

		if (dialogData.isOpen) {
			document.addEventListener("keydown", keyDownHandler);
		}
		return () => {
			document.removeEventListener("keydown", keyDownHandler);
		};
	}, [dialogData.isOpen]);

	return (
		<AnimatePresence>
			{dialogData.isOpen && !backendQuery.isLoading && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{
							opacity: 0,
						}}
						className="fixed z-30 left-0 top-0 w-screen h-screen bg-[rgba(0,0,0,0.5)]"
					/>
					<motion.form
						ref={modalRef}
						onSubmit={(e) => {
							e.preventDefault();
							if (dialogData.onSubmit) dialogData.onSubmit(e, setErrorText);
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
						className={cn(
							"absolute flex flex-col gap-5 bg-zinc-50 dark:bg-zinc-800 z-40 top-2/4 py-3 px-4 w-[min(23rem,90vw)]  rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4",
							dialogData.dialogClassName,
						)}
					>
						<h2 className=" text-xl">{dialogData.title}</h2>
						{dialogData.children?.(errorText)}
						<MotionIconButton
							autoFocus
							{...getDefaultButtonVariants()}
							onClick={() => resetDialogState(setErrorText, setDialogData)}
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
