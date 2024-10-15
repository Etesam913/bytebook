import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RevealFolderInFinder } from "../../../bindings/github.com/etesam913/bytebook/folderservice";
import {
	contextMenuDataAtom,
	contextMenuRefAtom,
	selectionRangeAtom,
} from "../../atoms";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc";
import { DropdownItems } from "../dropdown/dropdown-items";

export function ContextMenu() {
	const { isShowing, items, x, y } = useAtomValue(contextMenuDataAtom);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
	const setContextMenuRef = useSetAtom(contextMenuRefAtom);
	const contextMenuRefLocal = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setContextMenuRef(contextMenuRefLocal);
	}, [contextMenuRefLocal]);

	return (
		<div className="text-sm" ref={contextMenuRefLocal}>
			<DropdownItems
				onChange={async (item) => {
					switch (item.value) {
						case "rename-folder":
							break;
						case "delete-folder":
							break;
						case "reveal-in-finder":
							try {
								console.log("deez nuts");
								const selectedFolders = [...selectionRange].slice(0, 5);
								console.log(selectionRange);
								const res = await Promise.all(
									selectedFolders.map(async (folder) => {
										const folderWithoutPrefix = folder.split(":")[1];
										const b = await RevealFolderInFinder(folderWithoutPrefix);
										console.log(b);
										return b;
									}),
								);
								if (res.some((r) => !r.success)) {
									throw new Error("Failed to reveal folder in finder");
								}
								console.log("success", res);
							} catch (e) {
								if (e instanceof Error) {
									toast.error(e.message, DEFAULT_SONNER_OPTIONS);
								}
							}
							break;
					}
					setSelectionRange(new Set());
				}}
				style={{ transform: `translate(${x}px, ${y}px)` }}
				className="absolute w-fit"
				items={items}
				isOpen={isShowing}
				setIsOpen={() => {}}
				setFocusIndex={setFocusedIndex}
				focusIndex={focusedIndex}
			/>
		</div>
	);
}
