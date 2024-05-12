import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { AnimatePresence, motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { getDefaultButtonVariants } from "../../../animations";
import { SubmitLink } from "../../../icons/submit-link";
import type { FloatingDataType } from "../../../types";
import { MotionButton } from "../../buttons";
import { TOGGLE_LINK_COMMAND } from "../nodes/link";

export function FloatingLinkPlugin({
	floatingData,
	setFloatingData,
}: {
	floatingData: FloatingDataType;
	setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
}) {
	const [editor] = useLexicalComposerContext();
	const inputRef = useRef<HTMLInputElement>(null);

	const isOpen = floatingData.isOpen && floatingData.type === "link";

	useEffect(() => {
		if (inputRef.current && isOpen) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.form
					initial={{ opacity: 0 }}
					animate={{
						opacity: 1,
					}}
					exit={{ opacity: 0 }}
					style={{
						top: floatingData.top + 25,
						left: floatingData.left,
					}}
					className="fixed bg-zinc-100 dark:bg-zinc-750 p-2 rounded-md bg-opacity-95 shadow-lg flex items-center gap-2 z-50"
					onSubmit={(e) => {
						e.preventDefault();
						editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
							url: inputRef.current?.value ?? "",
						});
						setFloatingData((prev) => ({ ...prev, isOpen: false, type: null }));
					}}
					onBlur={() =>
						setFloatingData((prev) => ({ ...prev, isOpen: false, type: null }))
					}
				>
					<input
						ref={inputRef}
						defaultValue={"https://"}
						onClick={(e) => e.stopPropagation()}
						className="py-1 px-2 rounded-md dark:bg-zinc-750 w-96"
					/>
					<MotionButton
						type="submit"
						{...getDefaultButtonVariants()}
						className="!dark:bg-zinc-750"
					>
						<SubmitLink />
					</MotionButton>
				</motion.form>
			)}
		</AnimatePresence>
	);
}
