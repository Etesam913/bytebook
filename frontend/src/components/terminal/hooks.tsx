import { useEffect } from "react";

export function useFocusOnSelect(
	isSelected: boolean,
	terminalRef: React.RefObject<HTMLDivElement | null>,
) {
	useEffect(() => {
		if (isSelected && terminalRef.current) {
			const xtermTextareaHelper = terminalRef.current.querySelector(
				".xterm-helper-textarea",
			) as HTMLElement;
			if (xtermTextareaHelper) {
				xtermTextareaHelper.focus();
			}
		}
	}, [isSelected, terminalRef]);
}
