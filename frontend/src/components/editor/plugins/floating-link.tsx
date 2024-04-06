import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { AnimatePresence, motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useRef } from "react";
import { FloatingLinkData } from "../../../types";

export function FloatingLinkPlugin({
	floatingLinkData,
	setFloatingLinkData,
}: {
	floatingLinkData: FloatingLinkData;
	setFloatingLinkData: Dispatch<SetStateAction<FloatingLinkData>>;
}) {
	const [editor] = useLexicalComposerContext();
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<AnimatePresence>
			{floatingLinkData.isOpen && (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
							url: inputRef.current?.value ?? "",
						});
						setFloatingLinkData({ isOpen: false, left: 0, top: 0 });
					}}
				>
					<motion.input
						ref={inputRef}
						initial={{ opacity: 0 }}
						animate={{
							opacity: 1,
						}}
						exit={{ opacity: 0 }}
						autoFocus
						onBlur={() =>
							setFloatingLinkData({ isOpen: false, left: 0, top: 0 })
						}
						onClick={(e) => e.stopPropagation()}
						className="absolute bg-zinc-100 dark:bg-zinc-700 py-1 px-2 rounded-md bg-opacity-95 shadow-lg"
						style={{
							top: floatingLinkData.top + 25,
							left: floatingLinkData.left,
						}}
					/>
				</form>
			)}
		</AnimatePresence>
	);
}
