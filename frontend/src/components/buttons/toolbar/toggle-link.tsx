import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { MotionIconButton } from "..";
import { getDefaultButtonVariants } from "../../../animations";
import { Link } from "../../../icons/link";
import type { FloatingLinkData } from "../../../types";
export function ToggleLinkButton({
	disabled,
	setFloatingLinkData,
}: {
	disabled: boolean;
	setFloatingLinkData: Dispatch<SetStateAction<FloatingLinkData>>;
}) {
	const [editor] = useLexicalComposerContext();

	return (
		<MotionIconButton
			{...getDefaultButtonVariants(disabled)}
			disabled={disabled}
			type="button"
			onClick={() => {
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						const nativeSelection = window.getSelection()?.getRangeAt(0);
						const selectionText = selection.getTextContent().trim();
						if (selectionText.length === 0) {
							toast.error("You must select some text to create a link.", {
								position: "top-right",
								duration: 3000,
							});
							return;
						}
						const domRect = nativeSelection?.getBoundingClientRect();
						if (domRect) {
							const { top, left } = domRect;
							setFloatingLinkData({ isOpen: true, top, left });
						}
					}
				});
			}}
		>
			<Link />
		</MotionIconButton>
	);
}
