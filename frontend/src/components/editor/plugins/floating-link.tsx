import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { AnimatePresence, motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { SubmitLink } from "../../../icons/submit-link";
import type { FloatingLinkData } from "../../../types";
import { getDefaultButtonVariants } from "../../../variants";
import { MotionButton } from "../../buttons";

export function FloatingLinkPlugin({
	floatingLinkData,
	setFloatingLinkData,
}: {
	floatingLinkData: FloatingLinkData;
	setFloatingLinkData: Dispatch<SetStateAction<FloatingLinkData>>;
}) {
	const [editor] = useLexicalComposerContext();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (inputRef.current && floatingLinkData.isOpen) {
			inputRef.current.focus();
		}
	}, [floatingLinkData.isOpen]);

	return (
		<AnimatePresence>
			{floatingLinkData.isOpen && (
				<motion.form
					initial={{ opacity: 0 }}
					animate={{
						opacity: 1,
					}}
					exit={{ opacity: 0 }}
					style={{
						top: floatingLinkData.top + 25,
						left: floatingLinkData.left,
					}}
					className="absolute bg-zinc-100 dark:bg-zinc-750 p-2 rounded-md bg-opacity-95 shadow-lg flex items-center gap-2 z-50"
					onSubmit={(e) => {
						e.preventDefault();
						editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
							url: inputRef.current?.value ?? "",
						});
						setFloatingLinkData({ isOpen: false, left: 0, top: 0 });
					}}
					onBlur={() => setFloatingLinkData({ isOpen: false, left: 0, top: 0 })}
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
						className="!bg-zinc-750"
					>
						<SubmitLink />
					</MotionButton>
				</motion.form>
			)}
		</AnimatePresence>
	);
}
